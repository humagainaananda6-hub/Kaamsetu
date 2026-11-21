import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import { getDb, PRIVATE_DOCS_DIR } from './db.ts';
import {
  SESSION_COOKIE_NAME,
  hashPassword,
  optionalAuth,
  rateLimit,
  requireAuth,
  requireRole,
  signDocAccessToken,
  signSessionToken,
  verifyDocAccessToken,
  verifyPassword,
  type AuthedRequest,
} from './auth.ts';
import {
  attachMatchToJob,
  calculateJobMatch,
  calculateProfileCompletion,
} from '../lib/matching-engine.ts';
import { normalizeNepalPhone } from '../lib/nepal-locations.ts';
import type {
  ApplicationStatus,
  EducationLevel,
  EmploymentType,
  Job,
  JobSeekerProfile,
  UserRole,
  VerificationStatus,
  WorkMode,
} from '../types.ts';

const ALLOWED_DOC_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
]);
const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5MB

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function writeAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(uid('aud'), actorId, action, entityType, entityId, JSON.stringify(metadata), nowIso());
}

function createNotification(
  userId: string,
  title: string,
  message: string,
  notificationType: string,
  referenceId: string | null = null,
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO notifications (id, user_id, title, message, notification_type, reference_id, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
  ).run(uid('not'), userId, title, message, notificationType, referenceId, nowIso());
}

function saveBase64PrivateDoc(base64Data: string, mimeType: string, prefix: string): { filePath: string; fileSize: number } {
  if (!ALLOWED_DOC_MIME.has(mimeType)) {
    throw new Error('Unsupported file type. Allowed: PNG, JPG, WEBP, PDF.');
  }
  const cleanB64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const buffer = Buffer.from(cleanB64, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_DOC_BYTES) {
    throw new Error('File must be between 1 byte and 5 MB.');
  }
  const ext =
    mimeType === 'application/pdf'
      ? 'pdf'
      : mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/webp'
          ? 'webp'
          : mimeType === 'image/svg+xml'
            ? 'svg'
            : 'jpg';
  const fileName = `${prefix}_${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(PRIVATE_DOCS_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return { filePath, fileSize: buffer.length };
}

function getCandidateMatchInput(userId: string) {
  const db = getDb();
  const profile = db
    .prepare('SELECT * FROM job_seeker_profiles WHERE user_id = ?')
    .get(userId) as Record<string, any> | undefined;
  if (!profile) return null;

  const skillRows = db
    .prepare(
      `SELECT s.skill_name FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ?`,
    )
    .all(userId) as Array<{ skill_name: string }>;

  return {
    skills: skillRows.map((r) => r.skill_name),
    educationLevel: profile.education_level as EducationLevel,
    yearsOfExperience: Number(profile.years_of_experience || 0),
    province: String(profile.province || 'Bagmati Province'),
    district: String(profile.district || 'Kathmandu'),
    preferredLocation: String(profile.preferred_location || ''),
    employmentPreference: (profile.employment_preference || 'Full-time') as EmploymentType,
    availability: (profile.availability || 'Immediate') as JobSeekerProfile['availability'],
  };
}

function recomputeProfileCompletion(userId: string) {
  const db = getDb();
  const user = db.prepare('SELECT profile_photo_url FROM users WHERE id = ?').get(userId) as
    | { profile_photo_url: string | null }
    | undefined;
  const profile = db.prepare('SELECT * FROM job_seeker_profiles WHERE user_id = ?').get(userId) as
    | Record<string, any>
    | undefined;
  if (!profile) return 0;

  const skillsCount = (
    db.prepare('SELECT COUNT(*) as c FROM user_skills WHERE user_id = ?').get(userId) as { c: number }
  ).c;
  const educationCount = (
    db.prepare('SELECT COUNT(*) as c FROM education_records WHERE user_id = ?').get(userId) as { c: number }
  ).c;
  const experienceCount = (
    db.prepare('SELECT COUNT(*) as c FROM work_experiences WHERE user_id = ?').get(userId) as { c: number }
  ).c;
  const portfolioCount = (
    db.prepare('SELECT COUNT(*) as c FROM portfolios WHERE user_id = ?').get(userId) as { c: number }
  ).c;
  const identitySubmitted = !!(
    db.prepare('SELECT id FROM identity_verifications WHERE user_id = ?').get(userId)
  );
  const academicDocSubmitted = !!(
    db.prepare('SELECT id FROM academic_documents WHERE user_id = ?').get(userId)
  );

  const { percentage } = calculateProfileCompletion({
    hasPhoto: !!user?.profile_photo_url,
    hasHeadline: String(profile.professional_headline || '').trim().length > 3,
    hasAbout: String(profile.about || '').trim().length > 10,
    hasLocation: !!profile.province && !!profile.district,
    skillsCount,
    educationCount,
    experienceCount,
    portfolioCount,
    identitySubmitted,
    academicDocSubmitted,
  });

  db.prepare('UPDATE job_seeker_profiles SET profile_completion_percentage = ? WHERE user_id = ?').run(
    percentage,
    userId,
  );
  return percentage;
}

function hydrateJobRow(row: Record<string, any>, viewerUserId?: string): Job {
  const db = getDb();
  const skillRows = db
    .prepare(
      `SELECT s.skill_name FROM job_required_skills jrs JOIN skills s ON s.id = jrs.skill_id WHERE jrs.job_id = ?`,
    )
    .all(row.id) as Array<{ skill_name: string }>;

  const appCount = (
    db.prepare('SELECT COUNT(*) as c FROM job_applications WHERE job_id = ?').get(row.id) as { c: number }
  ).c;

  let hasApplied = false;
  let isSaved = false;
  if (viewerUserId) {
    hasApplied = !!db
      .prepare('SELECT id FROM job_applications WHERE job_id = ? AND applicant_id = ?')
      .get(row.id, viewerUserId);
    isSaved = !!db
      .prepare('SELECT id FROM saved_jobs WHERE job_id = ? AND user_id = ?')
      .get(row.id, viewerUserId);
  }

  return {
    id: row.id,
    employerId: row.employer_id,
    organizationName: row.organization_name || 'Verified Employer',
    employerVerified: row.employer_verification_status === 'verified',
    employerType: row.employer_type || 'Company / Startup',
    title: row.title,
    categoryId: row.category_id,
    categoryName: row.category_name || 'Other',
    description: row.description,
    responsibilities: row.responsibilities,
    benefits: row.benefits || '',
    employmentType: row.employment_type as EmploymentType,
    requiredEducation: row.required_education as EducationLevel,
    minimumExperience: Number(row.minimum_experience || 0),
    salaryMin: Number(row.salary_min),
    salaryMax: Number(row.salary_max),
    paymentFrequency: row.payment_frequency || 'Monthly',
    currency: 'NPR',
    province: row.province,
    district: row.district,
    municipality: row.municipality,
    workMode: row.work_mode as WorkMode,
    vacancies: Number(row.vacancies || 1),
    requiredVerificationLevel: row.required_verification_level || 'Any',
    applicationDeadline: row.application_deadline,
    status: row.status,
    requiredSkills: skillRows.map((s) => s.skill_name),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hasApplied,
    isSaved,
    applicantCount: appCount,
  };
}

function setSessionCookie(res: Response, userId: string, role: UserRole) {
  const token = signSessionToken({ userId, role });
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
  return token;
}

export function createApiRouter() {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'kaamsetu-api' });
  });

  // Meta: Categories, Skills & Public Platform Counts
  router.get('/meta', (_req, res) => {
    const db = getDb();
    const categories = db.prepare('SELECT id, name, name_ne as nameNe, type FROM categories ORDER BY type, name').all();
    const skills = db.prepare('SELECT id, skill_name as skillName, category_id as categoryId FROM skills ORDER BY skill_name').all();
    const stats = {
      activeJobs: (db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'Active' AND deleted_at IS NULL").get() as { c: number }).c,
      openGigs: (db.prepare("SELECT COUNT(*) as c FROM micro_tasks WHERE status = 'Open' AND deleted_at IS NULL").get() as { c: number }).c,
      verifiedSeekers: (db.prepare("SELECT COUNT(*) as c FROM identity_verifications WHERE verification_status = 'verified'").get() as { c: number }).c,
      verifiedEmployers: (db.prepare("SELECT COUNT(*) as c FROM employer_profiles WHERE verification_status = 'verified'").get() as { c: number }).c,
    };
    res.json({ categories, skills, stats });
  });

  // ---------------- AUTHENTICATION ----------------
  router.post('/auth/register', rateLimit('auth_reg', 20, 60_000), (req: Request, res: Response) => {
    const { fullName, email, phoneNumber, password, role } = req.body || {};
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      return;
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    const chosenRole: UserRole = role === 'employer' ? 'employer' : 'job_seeker';
    let normalizedPhone: string | null = null;
    if (phoneNumber && String(phoneNumber).trim()) {
      const check = normalizeNepalPhone(String(phoneNumber));
      if (!check.valid) {
        res.status(400).json({ error: 'Please enter a valid Nepali mobile number (+977-98XXXXXXXX).' });
        return;
      }
      normalizedPhone = check.normalized;
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(email.trim());
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    if (normalizedPhone) {
      const phoneTaken = db.prepare('SELECT id FROM users WHERE phone_number = ?').get(normalizedPhone);
      if (phoneTaken) {
        res.status(409).json({ error: 'This phone number is already registered.' });
        return;
      }
    }

    const userId = uid('usr');
    const now = nowIso();
    db.prepare(`
      INSERT INTO users (id, full_name, email, phone_number, password_hash, role, account_status, email_verified, phone_verified, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?, 0, ?, ?)
    `).run(userId, fullName.trim(), email.trim().toLowerCase(), normalizedPhone, hashPassword(password), chosenRole, normalizedPhone ? 1 : 0, now, now);

    if (chosenRole === 'job_seeker') {
      db.prepare(`INSERT INTO job_seeker_profiles (id, user_id) VALUES (?, ?)`).run(uid('jsp'), userId);
    } else {
      db.prepare(
        `INSERT INTO employer_profiles (id, user_id, organization_name, contact_person, created_at) VALUES (?, ?, ?, ?, ?)`,
      ).run(uid('emp'), userId, `${fullName.trim()} Enterprise`, fullName.trim(), now);
    }

    setSessionCookie(res, userId, chosenRole);
    const user = db
      .prepare('SELECT id, full_name as fullName, email, phone_number as phoneNumber, role, profile_photo_url as profilePhotoUrl, date_of_birth as dateOfBirth, account_status as accountStatus, email_verified as emailVerified, phone_verified as phoneVerified, onboarding_completed as onboardingCompleted, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?')
      .get(userId);
    res.status(201).json({ user });
  });

  router.post('/auth/login', rateLimit('auth_login', 30, 60_000), (req: Request, res: Response) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const db = getDb();
    const row = db
      .prepare('SELECT * FROM users WHERE lower(email) = lower(?) AND deleted_at IS NULL')
      .get(String(email).trim()) as Record<string, any> | undefined;

    if (!row || !verifyPassword(String(password), row.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (row.account_status === 'suspended') {
      res.status(403).json({ error: 'This account has been suspended by an administrator.' });
      return;
    }

    setSessionCookie(res, row.id, row.role as UserRole);
    res.json({
      user: {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phoneNumber: row.phone_number,
        role: row.role,
        profilePhotoUrl: row.profile_photo_url,
        dateOfBirth: row.date_of_birth,
        accountStatus: row.account_status,
        emailVerified: !!row.email_verified,
        phoneVerified: !!row.phone_verified,
        onboardingCompleted: !!row.onboarding_completed,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  });

  router.post('/auth/otp/send', rateLimit('otp_send', 10, 60_000), (req: Request, res: Response) => {
    const { phoneNumber } = req.body || {};
    const check = normalizeNepalPhone(String(phoneNumber || ''));
    if (!check.valid) {
      res.status(400).json({ error: 'Enter a valid Nepal mobile number (+977-98XXXXXXXX).' });
      return;
    }
    const code = '482910';
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
    const db = getDb();
    db.prepare('INSERT INTO otp_codes (id, phone_number, code, expires_at, used) VALUES (?, ?, ?, ?, 0)').run(
      uid('otp'),
      check.normalized,
      code,
      expiresAt,
    );
    res.json({
      sent: true,
      phoneNumber: check.normalized,
      devPreviewNotice: 'SMS gateway is in development sandbox mode. Use verification code 482910.',
    });
  });

  router.post('/auth/otp/verify', rateLimit('otp_verify', 15, 60_000), (req: Request, res: Response) => {
    const { phoneNumber, code, fullName, role } = req.body || {};
    const check = normalizeNepalPhone(String(phoneNumber || ''));
    if (!check.valid || !code) {
      res.status(400).json({ error: 'Valid phone number and 6-digit OTP code are required.' });
      return;
    }
    const db = getDb();
    const otpRow = db
      .prepare('SELECT * FROM otp_codes WHERE phone_number = ? AND code = ? AND used = 0 ORDER BY expires_at DESC LIMIT 1')
      .get(check.normalized, String(code).trim()) as Record<string, any> | undefined;

    if (!otpRow || otpRow.expires_at < nowIso()) {
      res.status(400).json({ error: 'Invalid or expired OTP code.' });
      return;
    }
    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpRow.id);

    let userRow = db
      .prepare('SELECT * FROM users WHERE phone_number = ? AND deleted_at IS NULL')
      .get(check.normalized) as Record<string, any> | undefined;

    if (!userRow) {
      const userId = uid('usr');
      const chosenRole: UserRole = role === 'employer' ? 'employer' : 'job_seeker';
      const displayName = (fullName && String(fullName).trim()) || `KaamSetu User (${check.normalized.slice(-4)})`;
      const syntheticEmail = `${check.normalized.replace(/\D/g, '')}@phone.kaamsetu.np`;
      const now = nowIso();
      db.prepare(`
        INSERT INTO users (id, full_name, email, phone_number, password_hash, role, account_status, email_verified, phone_verified, onboarding_completed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', 0, 1, 0, ?, ?)
      `).run(userId, displayName, syntheticEmail, check.normalized, hashPassword(crypto.randomUUID()), chosenRole, now, now);

      if (chosenRole === 'job_seeker') {
        db.prepare('INSERT INTO job_seeker_profiles (id, user_id) VALUES (?, ?)').run(uid('jsp'), userId);
      } else {
        db.prepare(
          'INSERT INTO employer_profiles (id, user_id, organization_name, contact_person, created_at) VALUES (?, ?, ?, ?, ?)',
        ).run(uid('emp'), userId, `${displayName} Enterprise`, displayName, now);
      }
      userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as Record<string, any>;
    }

    if (userRow.account_status === 'suspended') {
      res.status(403).json({ error: 'This account is suspended.' });
      return;
    }

    setSessionCookie(res, userRow.id, userRow.role as UserRole);
    res.json({
      user: {
        id: userRow.id,
        fullName: userRow.full_name,
        email: userRow.email,
        phoneNumber: userRow.phone_number,
        role: userRow.role,
        profilePhotoUrl: userRow.profile_photo_url,
        dateOfBirth: userRow.date_of_birth,
        accountStatus: userRow.account_status,
        emailVerified: !!userRow.email_verified,
        phoneVerified: !!userRow.phone_verified,
        onboardingCompleted: !!userRow.onboarding_completed,
        createdAt: userRow.created_at,
        updatedAt: userRow.updated_at,
      },
    });
  });

  router.post('/auth/forgot-password', rateLimit('forgot_pw', 10, 60_000), (req: Request, res: Response) => {
    const { email } = req.body || {};
    if (!email || !String(email).includes('@')) {
      res.status(400).json({ error: 'Valid email is required.' });
      return;
    }
    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(String(email).trim());
    const resetToken = 'KS-RESET-2026';
    if (user) {
      db.prepare('INSERT INTO password_resets (id, email, token, expires_at, used) VALUES (?, ?, ?, ?, 0)').run(
        uid('pwr'),
        String(email).trim().toLowerCase(),
        resetToken,
        new Date(Date.now() + 30 * 60_000).toISOString(),
      );
    }
    res.json({
      sent: true,
      devPreviewNotice: 'Email delivery is in local sandbox mode. Use reset token KS-RESET-2026.',
    });
  });

  router.post('/auth/reset-password', (req: Request, res: Response) => {
    const { email, token, newPassword } = req.body || {};
    if (!email || !token || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'Email, valid reset token, and new password (6+ chars) are required.' });
      return;
    }
    const db = getDb();
    const row = db
      .prepare('SELECT * FROM password_resets WHERE lower(email) = lower(?) AND token = ? AND used = 0 ORDER BY expires_at DESC LIMIT 1')
      .get(String(email).trim(), String(token).trim()) as Record<string, any> | undefined;
    if (!row || row.expires_at < nowIso()) {
      res.status(400).json({ error: 'Invalid or expired password reset token.' });
      return;
    }
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(row.id);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE lower(email) = lower(?)').run(
      hashPassword(String(newPassword)),
      nowIso(),
      String(email).trim(),
    );
    res.json({ ok: true });
  });

  router.post('/auth/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  });

  router.get('/auth/me', optionalAuth, (req: AuthedRequest, res: Response) => {
    if (!req.authUser) {
      res.json({ user: null });
      return;
    }
    const db = getDb();
    const row = db
      .prepare('SELECT id, full_name as fullName, email, phone_number as phoneNumber, role, profile_photo_url as profilePhotoUrl, date_of_birth as dateOfBirth, account_status as accountStatus, email_verified as emailVerified, phone_verified as phoneVerified, onboarding_completed as onboardingCompleted, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?')
      .get(req.authUser.id) as Record<string, any>;
    res.json({
      user: {
        ...row,
        emailVerified: !!row.emailVerified,
        phoneVerified: !!row.phoneVerified,
        onboardingCompleted: !!row.onboardingCompleted,
      },
    });
  });

  // Role selection & Onboarding
  router.post('/onboarding/seeker', requireAuth, (req: AuthedRequest, res: Response) => {
    const userId = req.authUser!.id;
    const {
      fullName,
      phoneNumber,
      province,
      district,
      municipality,
      preferredLocation,
      dateOfBirth,
      educationLevel,
      skills,
      employmentPreference,
      professionalHeadline,
      saveOnly,
    } = req.body || {};

    const db = getDb();
    db.prepare("UPDATE users SET role = 'job_seeker', full_name = COALESCE(?, full_name), phone_number = COALESCE(?, phone_number), date_of_birth = COALESCE(?, date_of_birth), onboarding_completed = ?, updated_at = ? WHERE id = ?").run(
      fullName?.trim() || null,
      phoneNumber ? normalizeNepalPhone(String(phoneNumber)).normalized : null,
      dateOfBirth || null,
      saveOnly ? 0 : 1,
      nowIso(),
      userId,
    );

    const existingProfile = db.prepare('SELECT id FROM job_seeker_profiles WHERE user_id = ?').get(userId);
    if (!existingProfile) {
      db.prepare('INSERT INTO job_seeker_profiles (id, user_id) VALUES (?, ?)').run(uid('jsp'), userId);
    }

    db.prepare(`
      UPDATE job_seeker_profiles SET
        province = COALESCE(?, province),
        district = COALESCE(?, district),
        municipality = COALESCE(?, municipality),
        preferred_location = COALESCE(?, preferred_location),
        education_level = COALESCE(?, education_level),
        employment_preference = COALESCE(?, employment_preference),
        professional_headline = COALESCE(?, professional_headline)
      WHERE user_id = ?
    `).run(
      province || null,
      district || null,
      municipality || null,
      preferredLocation || null,
      educationLevel || null,
      employmentPreference || null,
      professionalHeadline || null,
      userId,
    );

    if (Array.isArray(skills) && skills.length > 0) {
      const findSkill = db.prepare('SELECT id FROM skills WHERE lower(skill_name) = lower(?)');
      const insertUserSkill = db.prepare('INSERT OR IGNORE INTO user_skills (id, user_id, skill_id, proficiency_level, years_experience) VALUES (?, ?, ?, ?, 1)');
      for (const sName of skills) {
        const sk = findSkill.get(String(sName)) as { id: string } | undefined;
        if (sk) {
          insertUserSkill.run(uid('us'), userId, sk.id, 'Intermediate');
        }
      }
    }

    const completion = recomputeProfileCompletion(userId);
    setSessionCookie(res, userId, 'job_seeker');
    res.json({ ok: true, profileCompletionPercentage: completion });
  });

  router.post('/onboarding/employer', requireAuth, (req: AuthedRequest, res: Response) => {
    const userId = req.authUser!.id;
    const {
      organizationName,
      employerType,
      businessCategory,
      contactPerson,
      phoneNumber,
      province,
      district,
      municipality,
      website,
      description,
      saveOnly,
    } = req.body || {};

    if (!saveOnly && (!organizationName || String(organizationName).trim().length < 2)) {
      res.status(400).json({ error: 'Organization or individual hiring name is required.' });
      return;
    }

    const db = getDb();
    db.prepare("UPDATE users SET role = 'employer', phone_number = COALESCE(?, phone_number), onboarding_completed = ?, updated_at = ? WHERE id = ?").run(
      phoneNumber ? normalizeNepalPhone(String(phoneNumber)).normalized : null,
      saveOnly ? 0 : 1,
      nowIso(),
      userId,
    );

    const existing = db.prepare('SELECT id FROM employer_profiles WHERE user_id = ?').get(userId);
    if (!existing) {
      db.prepare(`
        INSERT INTO employer_profiles (id, user_id, employer_type, organization_name, business_category, contact_person, description, website, province, district, municipality, verification_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_submitted', ?)
      `).run(
        uid('emp'),
        userId,
        employerType || 'Company / Startup',
        organizationName?.trim() || 'New Employer',
        businessCategory || 'Information Technology',
        contactPerson || req.authUser!.fullName,
        description || '',
        website || null,
        province || 'Bagmati Province',
        district || 'Kathmandu',
        municipality || 'Kathmandu Metropolitan City',
        nowIso(),
      );
    } else {
      db.prepare(`
        UPDATE employer_profiles SET
          employer_type = COALESCE(?, employer_type),
          organization_name = COALESCE(?, organization_name),
          business_category = COALESCE(?, business_category),
          contact_person = COALESCE(?, contact_person),
          description = COALESCE(?, description),
          website = COALESCE(?, website),
          province = COALESCE(?, province),
          district = COALESCE(?, district),
          municipality = COALESCE(?, municipality)
        WHERE user_id = ?
      `).run(
        employerType || null,
        organizationName?.trim() || null,
        businessCategory || null,
        contactPerson || null,
        description || null,
        website || null,
        province || null,
        district || null,
        municipality || null,
        userId,
      );
    }

    setSessionCookie(res, userId, 'employer');
    res.json({ ok: true });
  });

  // ---------------- JOB SEEKER PROFILE & VAULT ----------------
  router.get('/seeker/profile', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const userId = req.authUser!.id;
    const db = getDb();

    const user = db
      .prepare('SELECT id, full_name as fullName, email, phone_number as phoneNumber, role, profile_photo_url as profilePhotoUrl, date_of_birth as dateOfBirth, account_status as accountStatus FROM users WHERE id = ?')
      .get(userId);
    const profileRow = db.prepare('SELECT * FROM job_seeker_profiles WHERE user_id = ?').get(userId) as Record<string, any> | undefined;
    const skills = db
      .prepare(
        `SELECT us.id, us.skill_id as skillId, s.skill_name as skillName, s.category_id as categoryId, us.proficiency_level as proficiencyLevel, us.years_experience as yearsExperience
         FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ? ORDER BY s.skill_name`,
      )
      .all(userId);
    const eduRows = db
      .prepare('SELECT id, user_id as userId, qualification_level as qualificationLevel, institution_name as institutionName, board_or_university as boardOrUniversity, completion_year as completionYear, gpa_or_percentage as gpaOrPercentage, verification_status as verificationStatus, created_at as createdAt FROM education_records WHERE user_id = ? ORDER BY completion_year DESC')
      .all(userId) as Array<Record<string, any>>;
    const docRows = db
      .prepare('SELECT id, education_record_id as educationRecordId, user_id as userId, title, document_type as documentType, file_name as fileName, mime_type as mimeType, file_size as fileSize, verification_status as verificationStatus, submitted_at as submittedAt, reviewed_at as reviewedAt, reviewer_id as reviewerId, rejection_reason as rejectionReason FROM academic_documents WHERE user_id = ?')
      .all(userId) as Array<Record<string, any>>;

    const educations = eduRows.map((e) => ({
      ...e,
      document: docRows.find((d) => d.educationRecordId === e.id) || null,
    }));

    const experiences = db
      .prepare('SELECT id, user_id as userId, company_name as companyName, job_title as jobTitle, description, start_date as startDate, end_date as endDate, currently_working as currentlyWorking FROM work_experiences WHERE user_id = ? ORDER BY start_date DESC')
      .all(userId)
      .map((ex: any) => ({ ...ex, currentlyWorking: !!ex.currentlyWorking }));

    const portfolios = db
      .prepare('SELECT id, user_id as userId, title, description, project_url as projectUrl, image_url as imageUrl, created_at as createdAt FROM portfolios WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId);

    const identity = db
      .prepare('SELECT id, user_id as userId, document_type as documentType, document_number_masked as documentNumberMasked, file_name as fileName, mime_type as mimeType, verification_status as verificationStatus, submitted_at as submittedAt, reviewed_at as reviewedAt, reviewer_id as reviewerId, rejection_reason as rejectionReason, consent_timestamp as consentTimestamp FROM identity_verifications WHERE user_id = ?')
      .get(userId) || null;

    const applications = db
      .prepare(
        `SELECT ja.id, ja.job_id as jobId, j.title as jobTitle, ep.organization_name as organizationName, ja.cover_message as coverMessage, ja.status, ja.status_history_json as statusHistoryJson, ja.applied_at as appliedAt, ja.updated_at as updatedAt
         FROM job_applications ja
         JOIN jobs j ON j.id = ja.job_id
         LEFT JOIN employer_profiles ep ON ep.user_id = j.employer_id
         WHERE ja.applicant_id = ? ORDER BY ja.applied_at DESC`,
      )
      .all(userId)
      .map((a: any) => ({
        ...a,
        statusHistory: JSON.parse(a.statusHistoryJson || '[]'),
      }));

    const savedJobs = db
      .prepare(
        `SELECT j.*, ep.organization_name, ep.verification_status as employer_verification_status, ep.employer_type, c.name as category_name
         FROM saved_jobs sj
         JOIN jobs j ON j.id = sj.job_id
         LEFT JOIN employer_profiles ep ON ep.user_id = j.employer_id
         LEFT JOIN categories c ON c.id = j.category_id
         WHERE sj.user_id = ? ORDER BY sj.created_at DESC`,
      )
      .all(userId)
      .map((row: any) => hydrateJobRow(row, userId));

    const completionInfo = calculateProfileCompletion({
      hasPhoto: !!(user as any)?.profilePhotoUrl,
      hasHeadline: String(profileRow?.professional_headline || '').trim().length > 3,
      hasAbout: String(profileRow?.about || '').trim().length > 10,
      hasLocation: !!profileRow?.province && !!profileRow?.district,
      skillsCount: skills.length,
      educationCount: educations.length,
      experienceCount: experiences.length,
      portfolioCount: portfolios.length,
      identitySubmitted: !!identity,
      academicDocSubmitted: docRows.length > 0,
    });

    res.json({
      user,
      profile: profileRow
        ? {
            id: profileRow.id,
            userId: profileRow.user_id,
            professionalHeadline: profileRow.professional_headline,
            about: profileRow.about,
            province: profileRow.province,
            district: profileRow.district,
            municipality: profileRow.municipality,
            preferredLocation: profileRow.preferred_location,
            educationLevel: profileRow.education_level,
            yearsOfExperience: profileRow.years_of_experience,
            employmentPreference: profileRow.employment_preference,
            availability: profileRow.availability,
            expectedMinSalary: profileRow.expected_min_salary,
            expectedMaxSalary: profileRow.expected_max_salary,
            languages: JSON.parse(profileRow.languages_json || '["Nepali","English"]'),
            profileCompletionPercentage: completionInfo.percentage,
          }
        : null,
      completionSuggestions: completionInfo.suggestions,
      skills,
      educations,
      experiences,
      portfolios,
      identity,
      applications,
      savedJobs,
    });
  });

  router.put('/seeker/profile', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const userId = req.authUser!.id;
    const {
      fullName,
      phoneNumber,
      dateOfBirth,
      professionalHeadline,
      about,
      province,
      district,
      municipality,
      preferredLocation,
      educationLevel,
      yearsOfExperience,
      employmentPreference,
      availability,
      expectedMinSalary,
      expectedMaxSalary,
      languages,
    } = req.body || {};

    const db = getDb();
    if (fullName && String(fullName).trim().length < 2) {
      res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      return;
    }

    let phoneNormalized: string | null = null;
    if (phoneNumber) {
      const pCheck = normalizeNepalPhone(String(phoneNumber));
      if (!pCheck.valid) {
        res.status(400).json({ error: 'Invalid Nepal mobile number (+977-98XXXXXXXX).' });
        return;
      }
      phoneNormalized = pCheck.normalized;
    }

    db.prepare('UPDATE users SET full_name = COALESCE(?, full_name), phone_number = COALESCE(?, phone_number), date_of_birth = COALESCE(?, date_of_birth), updated_at = ? WHERE id = ?').run(
      fullName?.trim() || null,
      phoneNormalized,
      dateOfBirth || null,
      nowIso(),
      userId,
    );

    db.prepare(`
      UPDATE job_seeker_profiles SET
        professional_headline = COALESCE(?, professional_headline),
        about = COALESCE(?, about),
        province = COALESCE(?, province),
        district = COALESCE(?, district),
        municipality = COALESCE(?, municipality),
        preferred_location = COALESCE(?, preferred_location),
        education_level = COALESCE(?, education_level),
        years_of_experience = COALESCE(?, years_of_experience),
        employment_preference = COALESCE(?, employment_preference),
        availability = COALESCE(?, availability),
        expected_min_salary = COALESCE(?, expected_min_salary),
        expected_max_salary = COALESCE(?, expected_max_salary),
        languages_json = COALESCE(?, languages_json)
      WHERE user_id = ?
    `).run(
      professionalHeadline ?? null,
      about ?? null,
      province ?? null,
      district ?? null,
      municipality ?? null,
      preferredLocation ?? null,
      educationLevel ?? null,
      yearsOfExperience !== undefined ? Number(yearsOfExperience) : null,
      employmentPreference ?? null,
      availability ?? null,
      expectedMinSalary !== undefined ? Number(expectedMinSalary) : null,
      expectedMaxSalary !== undefined ? Number(expectedMaxSalary) : null,
      Array.isArray(languages) ? JSON.stringify(languages) : null,
      userId,
    );

    const completion = recomputeProfileCompletion(userId);
    res.json({ ok: true, profileCompletionPercentage: completion });
  });

  router.post('/seeker/skills', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const userId = req.authUser!.id;
    const { skillId, skillName, proficiencyLevel, yearsExperience } = req.body || {};
    const db = getDb();

    let resolvedSkillId = skillId;
    if (!resolvedSkillId && skillName) {
      const existing = db.prepare('SELECT id FROM skills WHERE lower(skill_name) = lower(?)').get(String(skillName).trim()) as
        | { id: string }
        | undefined;
      if (existing) {
        resolvedSkillId = existing.id;
      } else {
        resolvedSkillId = uid('sk');
        db.prepare('INSERT INTO skills (id, skill_name, category_id) VALUES (?, ?, ?)').run(
          resolvedSkillId,
          String(skillName).trim(),
          'cat_other',
        );
      }
    }
    if (!resolvedSkillId) {
      res.status(400).json({ error: 'Skill selection is required.' });
      return;
    }

    db.prepare(`
      INSERT INTO user_skills (id, user_id, skill_id, proficiency_level, years_experience)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, skill_id) DO UPDATE SET proficiency_level = excluded.proficiency_level, years_experience = excluded.years_experience
    `).run(uid('us'), userId, resolvedSkillId, proficiencyLevel || 'Intermediate', Number(yearsExperience || 1));

    recomputeProfileCompletion(userId);
    res.status(201).json({ ok: true });
  });

  router.delete('/seeker/skills/:id', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const db = getDb();
    db.prepare('DELETE FROM user_skills WHERE id = ? AND user_id = ?').run(req.params.id, req.authUser!.id);
    recomputeProfileCompletion(req.authUser!.id);
    res.json({ ok: true });
  });

  router.post('/seeker/education', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const userId = req.authUser!.id;
    const { qualificationLevel, institutionName, boardOrUniversity, completionYear, gpaOrPercentage } = req.body || {};
    if (!qualificationLevel || !institutionName || !boardOrUniversity || !completionYear) {
      res.status(400).json({ error: 'All education fields are required.' });
      return;
    }
    const id = uid('edu');
    const db = getDb();
    db.prepare(`
      INSERT INTO education_records (id, user_id, qualification_level, institution_name, board_or_university, completion_year, gpa_or_percentage, verification_status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'not_submitted', ?)
    `).run(id, userId, qualificationLevel, institutionName.trim(), boardOrUniversity.trim(), Number(completionYear), gpaOrPercentage || 'Passed', nowIso());

    recomputeProfileCompletion(userId);
    res.status(201).json({ ok: true, id });
  });

  router.delete('/seeker/education/:id', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const db = getDb();
    db.prepare('DELETE FROM education_records WHERE id = ? AND user_id = ?').run(req.params.id, req.authUser!.id);
    recomputeProfileCompletion(req.authUser!.id);
    res.json({ ok: true });
  });

  router.post('/seeker/academic-doc', requireAuth, requireRole('job_seeker'), rateLimit('upload_doc', 15, 60_000), (req: AuthedRequest, res: Response) => {
    const userId = req.authUser!.id;
    const { educationRecordId, title, documentType, fileName, mimeType, fileBase64 } = req.body || {};
    if (!educationRecordId || !title || !fileName || !mimeType || !fileBase64) {
      res.status(400).json({ error: 'Education record, document title, and valid file are required.' });
      return;
    }

    const db = getDb();
    const edu = db.prepare('SELECT id FROM education_records WHERE id = ? AND user_id = ?').get(educationRecordId, userId);
    if (!edu) {
      res.status(404).json({ error: 'Education record not found.' });
      return;
    }

    try {
      const { filePath, fileSize } = saveBase64PrivateDoc(String(fileBase64), String(mimeType), 'acad');
      const existing = db.prepare('SELECT id, private_storage_path FROM academic_documents WHERE education_record_id = ? AND user_id = ?').get(educationRecordId, userId) as
        | { id: string; private_storage_path: string }
        | undefined;

      const now = nowIso();
      if (existing) {
        if (fs.existsSync(existing.private_storage_path)) fs.unlinkSync(existing.private_storage_path);
        db.prepare(`
          UPDATE academic_documents SET title = ?, private_storage_path = ?, document_type = ?, file_name = ?, mime_type = ?, file_size = ?, verification_status = 'pending_review', submitted_at = ?, reviewed_at = NULL, reviewer_id = NULL, rejection_reason = NULL
          WHERE id = ?
        `).run(title.trim(), filePath, documentType || 'Academic Certificate', fileName, mimeType, fileSize, now, existing.id);
      } else {
        db.prepare(`
          INSERT INTO academic_documents (id, education_record_id, user_id, title, private_storage_path, document_type, file_name, mime_type, file_size, verification_status, submitted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?)
        `).run(uid('adoc'), educationRecordId, userId, title.trim(), filePath, documentType || 'Academic Certificate', fileName, mimeType, fileSize, now);
      }

      db.prepare("UPDATE education_records SET verification_status = 'pending_review' WHERE id = ?").run(educationRecordId);
      recomputeProfileCompletion(userId);
      res.status(201).json({ ok: true, verificationStatus: 'pending_review' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to upload document.' });
    }
  });

  router.post('/seeker/identity', requireAuth, requireRole('job_seeker'), rateLimit('upload_id', 10, 60_000), (req: AuthedRequest, res: Response) => {
    const userId = req.authUser!.id;
    const { documentType, documentNumber, fileName, mimeType, fileBase64, consentAccepted } = req.body || {};
    if (!consentAccepted) {
      res.status(400).json({ error: 'Explicit consent is required before processing identity documents.' });
      return;
    }
    if (!documentType || !documentNumber || !fileName || !mimeType || !fileBase64) {
      res.status(400).json({ error: 'Document type, reference number, and file upload are required.' });
      return;
    }

    const rawNum = String(documentNumber).trim();
    const masked = rawNum.length > 4 ? `${'X'.repeat(Math.max(2, rawNum.length - 4))}-${rawNum.slice(-4)}` : 'XXXX';

    try {
      const { filePath } = saveBase64PrivateDoc(String(fileBase64), String(mimeType), 'idv');
      const db = getDb();
      const existing = db.prepare('SELECT id, private_storage_path FROM identity_verifications WHERE user_id = ?').get(userId) as
        | { id: string; private_storage_path: string }
        | undefined;
      const now = nowIso();
      if (existing) {
        if (fs.existsSync(existing.private_storage_path)) fs.unlinkSync(existing.private_storage_path);
        db.prepare(`
          UPDATE identity_verifications SET document_type = ?, document_number_masked = ?, private_storage_path = ?, file_name = ?, mime_type = ?, verification_status = 'pending_review', submitted_at = ?, reviewed_at = NULL, reviewer_id = NULL, rejection_reason = NULL, consent_timestamp = ?
          WHERE id = ?
        `).run(documentType, masked, filePath, fileName, mimeType, now, now, existing.id);
      } else {
        db.prepare(`
          INSERT INTO identity_verifications (id, user_id, document_type, document_number_masked, private_storage_path, file_name, mime_type, verification_status, submitted_at, consent_timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?)
        `).run(uid('idv'), userId, documentType, masked, filePath, fileName, mimeType, now, now);
      }
      recomputeProfileCompletion(userId);
      res.status(201).json({ ok: true, verificationStatus: 'pending_review' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Identity upload failed.' });
    }
  });

  router.delete('/seeker/identity', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const userId = req.authUser!.id;
    const db = getDb();
    const existing = db.prepare('SELECT id, private_storage_path FROM identity_verifications WHERE user_id = ?').get(userId) as
      | { id: string; private_storage_path: string }
      | undefined;
    if (existing) {
      if (fs.existsSync(existing.private_storage_path)) fs.unlinkSync(existing.private_storage_path);
      db.prepare('DELETE FROM identity_verifications WHERE id = ?').run(existing.id);
      writeAudit(userId, 'DELETE_IDENTITY_DOCUMENT', 'identity_verification', existing.id, { userInitiated: true });
    }
    recomputeProfileCompletion(userId);
    res.json({ ok: true });
  });

  router.post('/seeker/experience', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const { companyName, jobTitle, description, startDate, endDate, currentlyWorking } = req.body || {};
    if (!companyName || !jobTitle || !startDate) {
      res.status(400).json({ error: 'Company name, job title, and start date are required.' });
      return;
    }
    const db = getDb();
    db.prepare(`
      INSERT INTO work_experiences (id, user_id, company_name, job_title, description, start_date, end_date, currently_working)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uid('exp'), req.authUser!.id, companyName.trim(), jobTitle.trim(), description || '', startDate, currentlyWorking ? null : endDate || null, currentlyWorking ? 1 : 0);
    recomputeProfileCompletion(req.authUser!.id);
    res.status(201).json({ ok: true });
  });

  router.delete('/seeker/experience/:id', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const db = getDb();
    db.prepare('DELETE FROM work_experiences WHERE id = ? AND user_id = ?').run(req.params.id, req.authUser!.id);
    recomputeProfileCompletion(req.authUser!.id);
    res.json({ ok: true });
  });

  router.post('/seeker/portfolio', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const { title, description, projectUrl } = req.body || {};
    if (!title || !description) {
      res.status(400).json({ error: 'Project title and description are required.' });
      return;
    }
    const db = getDb();
    db.prepare('INSERT INTO portfolios (id, user_id, title, description, project_url, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      uid('port'),
      req.authUser!.id,
      title.trim(),
      description.trim(),
      projectUrl?.trim() || null,
      nowIso(),
    );
    recomputeProfileCompletion(req.authUser!.id);
    res.status(201).json({ ok: true });
  });

  router.delete('/seeker/portfolio/:id', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const db = getDb();
    db.prepare('DELETE FROM portfolios WHERE id = ? AND user_id = ?').run(req.params.id, req.authUser!.id);
    recomputeProfileCompletion(req.authUser!.id);
    res.json({ ok: true });
  });

  // Public Sanitized Resume Profile (STRICTLY NO citizenship numbers, private docs, DOB, or raw email)
  router.get('/profiles/:userId/public', optionalAuth, (req: AuthedRequest, res: Response) => {
    const targetId = req.params.userId;
    const db = getDb();
    const user = db
      .prepare("SELECT id, full_name as fullName, role, profile_photo_url as profilePhotoUrl, account_status FROM users WHERE id = ? AND deleted_at IS NULL")
      .get(targetId) as Record<string, any> | undefined;
    if (!user || user.account_status === 'suspended') {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }
    const profile = db.prepare('SELECT * FROM job_seeker_profiles WHERE user_id = ?').get(targetId) as Record<string, any> | undefined;
    const idv = db.prepare('SELECT verification_status FROM identity_verifications WHERE user_id = ?').get(targetId) as
      | { verification_status: VerificationStatus }
      | undefined;
    const educations = db
      .prepare('SELECT id, qualification_level as qualificationLevel, institution_name as institutionName, board_or_university as boardOrUniversity, completion_year as completionYear, gpa_or_percentage as gpaOrPercentage, verification_status as verificationStatus FROM education_records WHERE user_id = ? ORDER BY completion_year DESC')
      .all(targetId);
    const skills = db
      .prepare('SELECT s.skill_name as skillName, us.proficiency_level as proficiencyLevel, us.years_experience as yearsExperience FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ?')
      .all(targetId);
    const experiences = db
      .prepare('SELECT id, company_name as companyName, job_title as jobTitle, description, start_date as startDate, end_date as endDate, currently_working as currentlyWorking FROM work_experiences WHERE user_id = ? ORDER BY start_date DESC')
      .all(targetId);
    const portfolios = db
      .prepare('SELECT id, title, description, project_url as projectUrl, created_at as createdAt FROM portfolios WHERE user_id = ? ORDER BY created_at DESC')
      .all(targetId);
    const reviews = db
      .prepare('SELECT r.id, r.rating, r.review_text as reviewText, r.created_at as createdAt, u.full_name as reviewerName FROM reviews r JOIN users u ON u.id = r.reviewer_id WHERE r.reviewed_user_id = ? ORDER BY r.created_at DESC')
      .all(targetId);

    res.json({
      profile: {
        userId: user.id,
        fullName: user.fullName,
        profilePhotoUrl: user.profilePhotoUrl,
        identityVerified: idv?.verification_status === 'verified',
        professionalHeadline: profile?.professional_headline || '',
        about: profile?.about || '',
        province: profile?.province || '',
        district: profile?.district || '',
        municipality: profile?.municipality || '',
        educationLevel: profile?.education_level || 'SEE',
        yearsOfExperience: profile?.years_of_experience || 0,
        employmentPreference: profile?.employment_preference || 'Full-time',
        availability: profile?.availability || 'Immediate',
        languages: JSON.parse(profile?.languages_json || '["Nepali","English"]'),
        educations,
        skills,
        experiences,
        portfolios,
        reviews,
      },
    });
  });

  // ---------------- JOBS & MATCHING ----------------
  router.get('/jobs', optionalAuth, (req: AuthedRequest, res: Response) => {
    const db = getDb();
    const { q, category, province, district, employmentType, education, workMode, skill, minSalary } = req.query;

    const rows = db
      .prepare(
        `SELECT j.*, ep.organization_name, ep.verification_status as employer_verification_status, ep.employer_type, c.name as category_name
         FROM jobs j
         LEFT JOIN employer_profiles ep ON ep.user_id = j.employer_id
         LEFT JOIN categories c ON c.id = j.category_id
         WHERE j.status = 'Active' AND j.deleted_at IS NULL
         ORDER BY j.created_at DESC`,
      )
      .all() as Array<Record<string, any>>;

    const candInput = req.authUser?.role === 'job_seeker' ? getCandidateMatchInput(req.authUser.id) : null;
    let jobs = rows.map((r) => attachMatchToJob(hydrateJobRow(r, req.authUser?.id), candInput));

    if (q && String(q).trim()) {
      const term = String(q).trim().toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(term) ||
          j.organizationName.toLowerCase().includes(term) ||
          j.description.toLowerCase().includes(term) ||
          j.requiredSkills.some((s) => s.toLowerCase().includes(term)),
      );
    }
    if (category && category !== 'all') {
      jobs = jobs.filter((j) => j.categoryId === category || j.categoryName === category);
    }
    if (province && province !== 'all') {
      jobs = jobs.filter((j) => j.province === province);
    }
    if (district && district !== 'all') {
      jobs = jobs.filter((j) => j.district === district);
    }
    if (employmentType && employmentType !== 'all') {
      jobs = jobs.filter((j) => j.employmentType === employmentType);
    }
    if (education && education !== 'all') {
      jobs = jobs.filter((j) => j.requiredEducation === education);
    }
    if (workMode && workMode !== 'all') {
      jobs = jobs.filter((j) => j.workMode === workMode);
    }
    if (skill && skill !== 'all') {
      const skLower = String(skill).toLowerCase();
      jobs = jobs.filter((j) => j.requiredSkills.some((s) => s.toLowerCase() === skLower));
    }
    if (minSalary && Number(minSalary) > 0) {
      jobs = jobs.filter((j) => j.salaryMax >= Number(minSalary));
    }

    if (candInput) {
      jobs.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
    }

    res.json({ jobs });
  });

  router.get('/jobs/:id', optionalAuth, (req: AuthedRequest, res: Response) => {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT j.*, ep.organization_name, ep.verification_status as employer_verification_status, ep.employer_type, ep.description as employer_description, ep.website as employer_website, c.name as category_name
         FROM jobs j
         LEFT JOIN employer_profiles ep ON ep.user_id = j.employer_id
         LEFT JOIN categories c ON c.id = j.category_id
         WHERE j.id = ? AND j.deleted_at IS NULL`,
      )
      .get(req.params.id) as Record<string, any> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }
    const candInput = req.authUser?.role === 'job_seeker' ? getCandidateMatchInput(req.authUser.id) : null;
    const job = attachMatchToJob(hydrateJobRow(row, req.authUser?.id), candInput);
    res.json({
      job,
      employerDetails: {
        organizationName: row.organization_name,
        description: row.employer_description,
        website: row.employer_website,
        verified: row.employer_verification_status === 'verified',
      },
    });
  });

  router.post('/jobs', requireAuth, requireRole('employer'), (req: AuthedRequest, res: Response) => {
    const userId = req.authUser!.id;
    const {
      title,
      categoryId,
      employmentType,
      vacancies,
      description,
      responsibilities,
      benefits,
      requiredEducation,
      minimumExperience,
      requiredSkills,
      salaryMin,
      salaryMax,
      paymentFrequency,
      province,
      district,
      municipality,
      workMode,
      applicationDeadline,
      requiredVerificationLevel,
      status,
    } = req.body || {};

    if (!title || !categoryId || !description || !province || !district) {
      res.status(400).json({ error: 'Title, category, description, and Nepal location are required.' });
      return;
    }
    if (Number(salaryMin) < 0 || Number(salaryMax) < Number(salaryMin)) {
      res.status(400).json({ error: 'Maximum salary must be greater than or equal to minimum salary.' });
      return;
    }

    const db = getDb();
    const jobId = uid('job');
    const now = nowIso();
    const finalStatus = status === 'Draft' ? 'Draft' : 'Active';

    db.prepare(`
      INSERT INTO jobs (
        id, employer_id, title, category_id, description, responsibilities, benefits,
        employment_type, required_education, minimum_experience, salary_min, salary_max,
        payment_frequency, currency, province, district, municipality, work_mode, vacancies,
        required_verification_level, application_deadline, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NPR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobId,
      userId,
      title.trim(),
      categoryId,
      description.trim(),
      (responsibilities || description).trim(),
      benefits || '',
      employmentType || 'Full-time',
      requiredEducation || "Bachelor's",
      Number(minimumExperience || 0),
      Number(salaryMin || 15000),
      Number(salaryMax || 35000),
      paymentFrequency || 'Monthly',
      province,
      district,
      municipality || district,
      workMode || 'On-site',
      Number(vacancies || 1),
      requiredVerificationLevel || 'Any',
      applicationDeadline || new Date(Date.now() + 21 * 86400_000).toISOString().slice(0, 10),
      finalStatus,
      now,
      now,
    );

    if (Array.isArray(requiredSkills)) {
      const findSk = db.prepare('SELECT id FROM skills WHERE lower(skill_name) = lower(?)');
      const insSk = db.prepare('INSERT INTO skills (id, skill_name, category_id) VALUES (?, ?, ?)');
      const insJrs = db.prepare('INSERT OR IGNORE INTO job_required_skills (id, job_id, skill_id, importance) VALUES (?, ?, ?, ?)');
      for (const sName of requiredSkills) {
        const clean = String(sName).trim();
        if (!clean) continue;
        let sk = findSk.get(clean) as { id: string } | undefined;
        if (!sk) {
          const newSkId = uid('sk');
          insSk.run(newSkId, clean, categoryId);
          sk = { id: newSkId };
        }
        insJrs.run(uid('jrs'), jobId, sk.id, 'Required');
      }
    }

    writeAudit(userId, 'CREATE_JOB', 'job', jobId, { title, status: finalStatus });
    res.status(201).json({ ok: true, id: jobId });
  });

  router.patch('/jobs/:id', requireAuth, requireRole('employer'), (req: AuthedRequest, res: Response) => {
    const db = getDb();
    const job = db.prepare('SELECT id, employer_id FROM jobs WHERE id = ?').get(req.params.id) as
      | { id: string; employer_id: string }
      | undefined;
    if (!job || job.employer_id !== req.authUser!.id) {
      res.status(404).json({ error: 'Job not found or access denied.' });
      return;
    }
    const { status } = req.body || {};
    if (status && ['Draft', 'Active', 'Paused', 'Filled'].includes(status)) {
      db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), job.id);
    }
    res.json({ ok: true });
  });

  router.post('/jobs/:id/apply', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const userId = req.authUser!.id;
    const jobId = req.params.id;
    const { coverMessage } = req.body || {};
    if (!coverMessage || String(coverMessage).trim().length < 10) {
      res.status(400).json({ error: 'Please include a short cover note (at least 10 characters).' });
      return;
    }
    const db = getDb();
    const job = db.prepare("SELECT id, title, employer_id, status FROM jobs WHERE id = ? AND deleted_at IS NULL").get(jobId) as
      | { id: string; title: string; employer_id: string; status: string }
      | undefined;
    if (!job || job.status !== 'Active') {
      res.status(404).json({ error: 'This vacancy is no longer accepting applications.' });
      return;
    }
    const duplicate = db.prepare('SELECT id FROM job_applications WHERE job_id = ? AND applicant_id = ?').get(jobId, userId);
    if (duplicate) {
      res.status(409).json({ error: 'You have already applied to this vacancy.' });
      return;
    }

    const appId = uid('app');
    const now = nowIso();
    db.prepare(`
      INSERT INTO job_applications (id, job_id, applicant_id, cover_message, resume_reference, status, status_history_json, applied_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'New', ?, ?, ?)
    `).run(appId, jobId, userId, String(coverMessage).trim(), `kaamsetu://profile/${userId}`, JSON.stringify([{ status: 'New', changedAt: now }]), now, now);

    createNotification(
      job.employer_id,
      'New Job Application Received',
      `${req.authUser!.fullName} applied for ${job.title}.`,
      'application_received',
      jobId,
    );

    res.status(201).json({ ok: true, id: appId });
  });

  router.post('/jobs/:id/save', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM saved_jobs WHERE user_id = ? AND job_id = ?').get(req.authUser!.id, req.params.id);
    if (existing) {
      db.prepare('DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?').run(req.authUser!.id, req.params.id);
      res.json({ saved: false });
      return;
    }
    db.prepare('INSERT INTO saved_jobs (id, user_id, job_id, created_at) VALUES (?, ?, ?, ?)').run(
      uid('sav'),
      req.authUser!.id,
      req.params.id,
      nowIso(),
    );
    res.json({ saved: true });
  });

  // ---------------- MICRO-TASKS & GIGS ----------------
  router.get('/gigs', optionalAuth, (req: AuthedRequest, res: Response) => {
    const db = getDb();
    const { q, category, province, district, locationType, urgency, minPay } = req.query;

    const rows = db
      .prepare(
        `SELECT mt.*, COALESCE(ep.organization_name, u.full_name) as poster_name, COALESCE(ep.verification_status, 'not_submitted') as poster_ver
         FROM micro_tasks mt
         JOIN users u ON u.id = mt.employer_id
         LEFT JOIN employer_profiles ep ON ep.user_id = mt.employer_id
         WHERE mt.status IN ('Open', 'Assigned', 'In Progress', 'Completed') AND mt.deleted_at IS NULL
         ORDER BY mt.created_at DESC`,
      )
      .all() as Array<Record<string, any>>;

    let gigs = rows.map((r) => {
      const interestedCount = (
        db.prepare('SELECT COUNT(*) as c FROM task_applications WHERE task_id = ?').get(r.id) as { c: number }
      ).c;
      const hasExpressedInterest = req.authUser
        ? !!db.prepare('SELECT id FROM task_applications WHERE task_id = ? AND applicant_id = ?').get(r.id, req.authUser.id)
        : false;
      const assignment = db
        .prepare('SELECT ta.worker_id, u.full_name as worker_name FROM task_assignments ta JOIN users u ON u.id = ta.worker_id WHERE ta.task_id = ?')
        .get(r.id) as { worker_id: string; worker_name: string } | undefined;

      return {
        id: r.id,
        employerId: r.employer_id,
        posterName: r.poster_name,
        posterVerified: r.poster_ver === 'verified',
        title: r.title,
        description: r.description,
        category: r.category,
        paymentAmount: Number(r.payment_amount),
        currency: 'NPR' as const,
        estimatedDuration: r.estimated_duration,
        locationType: r.location_type,
        province: r.province,
        district: r.district,
        municipality: r.municipality,
        workersRequired: Number(r.workers_required),
        requiredSkills: JSON.parse(r.required_skills_json || '[]'),
        urgency: r.urgency,
        deadline: r.deadline,
        status: r.status,
        createdAt: r.created_at,
        interestedCount,
        hasExpressedInterest,
        assignedWorkerId: assignment?.worker_id || null,
        assignedWorkerName: assignment?.worker_name || null,
      };
    });

    if (q && String(q).trim()) {
      const term = String(q).trim().toLowerCase();
      gigs = gigs.filter(
        (g) =>
          g.title.toLowerCase().includes(term) ||
          g.description.toLowerCase().includes(term) ||
          g.requiredSkills.some((s: string) => s.toLowerCase().includes(term)),
      );
    }
    if (category && category !== 'all') gigs = gigs.filter((g) => g.category === category);
    if (province && province !== 'all') gigs = gigs.filter((g) => g.province === province);
    if (district && district !== 'all') gigs = gigs.filter((g) => g.district === district);
    if (locationType && locationType !== 'all') gigs = gigs.filter((g) => g.locationType === locationType);
    if (urgency && urgency !== 'all') gigs = gigs.filter((g) => g.urgency === urgency);
    if (minPay && Number(minPay) > 0) gigs = gigs.filter((g) => g.paymentAmount >= Number(minPay));

    res.json({ gigs });
  });

  router.get('/gigs/:id', optionalAuth, (req: AuthedRequest, res: Response) => {
    const db = getDb();
    const r = db
      .prepare(
        `SELECT mt.*, COALESCE(ep.organization_name, u.full_name) as poster_name, COALESCE(ep.verification_status, 'not_submitted') as poster_ver
         FROM micro_tasks mt
         JOIN users u ON u.id = mt.employer_id
         LEFT JOIN employer_profiles ep ON ep.user_id = mt.employer_id
         WHERE mt.id = ? AND mt.deleted_at IS NULL`,
      )
      .get(req.params.id) as Record<string, any> | undefined;
    if (!r) {
      res.status(404).json({ error: 'Micro-task not found.' });
      return;
    }

    const assignment = db
      .prepare('SELECT ta.worker_id, u.full_name as worker_name FROM task_assignments ta JOIN users u ON u.id = ta.worker_id WHERE ta.task_id = ?')
      .get(r.id) as { worker_id: string; worker_name: string } | undefined;

    const hasExpressedInterest = req.authUser
      ? !!db.prepare('SELECT id FROM task_applications WHERE task_id = ? AND applicant_id = ?').get(r.id, req.authUser.id)
      : false;

    let applicants: any[] = [];
    if (req.authUser && (req.authUser.id === r.employer_id || req.authUser.role === 'admin')) {
      applicants = db
        .prepare(
          `SELECT ta.id, ta.task_id as taskId, ta.applicant_id as applicantId, u.full_name as applicantName, COALESCE(jsp.professional_headline, '') as applicantHeadline, u.profile_photo_url as applicantPhotoUrl, (SELECT verification_status FROM identity_verifications WHERE user_id = u.id) as idv_status, ta.message, ta.status, ta.applied_at as appliedAt
           FROM task_applications ta
           JOIN users u ON u.id = ta.applicant_id
           LEFT JOIN job_seeker_profiles jsp ON jsp.user_id = u.id
           WHERE ta.task_id = ? ORDER BY ta.applied_at DESC`,
        )
        .all(r.id)
        .map((a: any) => ({ ...a, applicantVerified: a.idv_status === 'verified' }));
    }

    const reviews = db
      .prepare('SELECT rev.id, rev.rating, rev.review_text as reviewText, rev.created_at as createdAt, u.full_name as reviewerName FROM reviews rev JOIN users u ON u.id = rev.reviewer_id WHERE rev.task_id = ?')
      .all(r.id);

    res.json({
      gig: {
        id: r.id,
        employerId: r.employer_id,
        posterName: r.poster_name,
        posterVerified: r.poster_ver === 'verified',
        title: r.title,
        description: r.description,
        category: r.category,
        paymentAmount: Number(r.payment_amount),
        currency: 'NPR',
        estimatedDuration: r.estimated_duration,
        locationType: r.location_type,
        province: r.province,
        district: r.district,
        municipality: r.municipality,
        workersRequired: Number(r.workers_required),
        requiredSkills: JSON.parse(r.required_skills_json || '[]'),
        urgency: r.urgency,
        deadline: r.deadline,
        status: r.status,
        createdAt: r.created_at,
        hasExpressedInterest,
        assignedWorkerId: assignment?.worker_id || null,
        assignedWorkerName: assignment?.worker_name || null,
      },
      applicants,
      reviews,
    });
  });

  router.post('/gigs', requireAuth, requireRole('employer'), (req: AuthedRequest, res: Response) => {
    const {
      title,
      description,
      category,
      paymentAmount,
      estimatedDuration,
      locationType,
      province,
      district,
      municipality,
      workersRequired,
      requiredSkills,
      urgency,
      deadline,
    } = req.body || {};

    if (!title || !description || !paymentAmount || Number(paymentAmount) < 100) {
      res.status(400).json({ error: 'Task title, description, and payment amount (min रु 100) are required.' });
      return;
    }

    const db = getDb();
    const id = uid('task');
    db.prepare(`
      INSERT INTO micro_tasks (
        id, employer_id, title, description, category, payment_amount, currency,
        estimated_duration, location_type, province, district, municipality,
        workers_required, required_skills_json, urgency, deadline, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'NPR', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?)
    `).run(
      id,
      req.authUser!.id,
      title.trim(),
      description.trim(),
      category || 'Local Tasks',
      Number(paymentAmount),
      estimatedDuration || '1 day',
      locationType === 'Online' ? 'Online' : 'Local',
      province || 'Bagmati Province',
      district || 'Kathmandu',
      municipality || 'Kathmandu Metropolitan City',
      Number(workersRequired || 1),
      JSON.stringify(Array.isArray(requiredSkills) ? requiredSkills : []),
      urgency === 'Urgent' ? 'Urgent' : 'Normal',
      deadline || new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
      nowIso(),
    );

    res.status(201).json({ ok: true, id });
  });

  router.post('/gigs/:id/interest', requireAuth, requireRole('job_seeker'), (req: AuthedRequest, res: Response) => {
    const { message } = req.body || {};
    if (!message || String(message).trim().length < 5) {
      res.status(400).json({ error: 'Please include a short note about your availability or relevant skill.' });
      return;
    }
    const db = getDb();
    const task = db.prepare("SELECT id, title, employer_id, status FROM micro_tasks WHERE id = ? AND deleted_at IS NULL").get(req.params.id) as
      | { id: string; title: string; employer_id: string; status: string }
      | undefined;
    if (!task || task.status !== 'Open') {
      res.status(404).json({ error: 'This task is no longer open for interest.' });
      return;
    }
    const dup = db.prepare('SELECT id FROM task_applications WHERE task_id = ? AND applicant_id = ?').get(task.id, req.authUser!.id);
    if (dup) {
      res.status(409).json({ error: 'You have already expressed interest in this task.' });
      return;
    }

    db.prepare("INSERT INTO task_applications (id, task_id, applicant_id, message, status, applied_at) VALUES (?, ?, ?, ?, 'Interested', ?)").run(
      uid('ta'),
      task.id,
      req.authUser!.id,
      String(message).trim(),
      nowIso(),
    );

    createNotification(
      task.employer_id,
      'New Micro-Task Interest',
      `${req.authUser!.fullName} expressed interest in "${task.title}".`,
      'task_match',
      task.id,
    );

    res.status(201).json({ ok: true });
  });

  router.post('/gigs/:id/assign', requireAuth, requireRole('employer'), (req: AuthedRequest, res: Response) => {
    const { workerId } = req.body || {};
    const db = getDb();
    const task = db.prepare('SELECT id, title, employer_id FROM micro_tasks WHERE id = ?').get(req.params.id) as
      | { id: string; title: string; employer_id: string }
      | undefined;
    if (!task || task.employer_id !== req.authUser!.id) {
      res.status(404).json({ error: 'Task not found or unauthorized.' });
      return;
    }
    if (!workerId) {
      res.status(400).json({ error: 'Worker selection is required.' });
      return;
    }

    const now = nowIso();
    db.prepare("UPDATE task_applications SET status = CASE WHEN applicant_id = ? THEN 'Selected' ELSE 'Declined' END WHERE task_id = ?").run(
      workerId,
      task.id,
    );
    db.prepare(`
      INSERT INTO task_assignments (id, task_id, worker_id, employer_id, assigned_at, completion_status)
      VALUES (?, ?, ?, ?, ?, 'Assigned')
      ON CONFLICT(task_id) DO UPDATE SET worker_id = excluded.worker_id, assigned_at = excluded.assigned_at
    `).run(uid('tassign'), task.id, workerId, req.authUser!.id, now);

    db.prepare("UPDATE micro_tasks SET status = 'Assigned' WHERE id = ?").run(task.id);
    createNotification(workerId, 'Task Assigned to You', `You were selected for "${task.title}".`, 'task_update', task.id);
    res.json({ ok: true });
  });

  router.patch('/gigs/:id/status', requireAuth, (req: AuthedRequest, res: Response) => {
    const { status } = req.body || {};
    const allowed = ['In Progress', 'Completed', 'Cancelled', 'Disputed'];
    if (!allowed.includes(status)) {
      res.status(400).json({ error: 'Invalid status transition.' });
      return;
    }
    const db = getDb();
    const task = db.prepare('SELECT id, title, employer_id FROM micro_tasks WHERE id = ?').get(req.params.id) as
      | { id: string; title: string; employer_id: string }
      | undefined;
    const assign = db.prepare('SELECT worker_id FROM task_assignments WHERE task_id = ?').get(req.params.id) as
      | { worker_id: string }
      | undefined;
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }
    const isOwner = task.employer_id === req.authUser!.id;
    const isWorker = assign?.worker_id === req.authUser!.id;
    if (!isOwner && !isWorker && req.authUser!.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized to update task status.' });
      return;
    }

    db.prepare('UPDATE micro_tasks SET status = ? WHERE id = ?').run(status, task.id);
    if (status === 'Completed') {
      db.prepare("UPDATE task_assignments SET completion_status = 'Completed', completed_at = ? WHERE task_id = ?").run(
        nowIso(),
        task.id,
      );
      if (assign?.worker_id) {
        createNotification(assign.worker_id, 'Task Marked Completed', `"${task.title}" has been confirmed completed.`, 'task_update', task.id);
      }
    }
    res.json({ ok: true });
  });

  router.post('/gigs/:id/review', requireAuth, (req: AuthedRequest, res: Response) => {
    const { reviewedUserId, rating, reviewText } = req.body || {};
    if (!reviewedUserId || !rating || Number(rating) < 1 || Number(rating) > 5 || !reviewText) {
      res.status(400).json({ error: 'Rating (1-5) and review text are required.' });
      return;
    }
    const db = getDb();
    db.prepare(`
      INSERT INTO reviews (id, reviewer_id, reviewed_user_id, task_id, rating, review_text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uid('rev'), req.authUser!.id, reviewedUserId, req.params.id, Number(rating), String(reviewText).trim(), nowIso());
    res.status(201).json({ ok: true });
  });

  // ---------------- EMPLOYER WORKSPACE ----------------
  router.get('/employer/workspace', requireAuth, requireRole('employer'), (req: AuthedRequest, res: Response) => {
    const empId = req.authUser!.id;
    const db = getDb();

    const company = db
      .prepare('SELECT id, user_id as userId, employer_type as employerType, organization_name as organizationName, business_category as businessCategory, contact_person as contactPerson, description, website, province, district, municipality, verification_status as verificationStatus, verification_doc_name as verificationDocName, rejection_reason as rejectionReason, created_at as createdAt FROM employer_profiles WHERE user_id = ?')
      .get(empId);

    const jobs = db
      .prepare(
        `SELECT j.*, ep.organization_name, ep.verification_status as employer_verification_status, ep.employer_type, c.name as category_name
         FROM jobs j
         LEFT JOIN employer_profiles ep ON ep.user_id = j.employer_id
         LEFT JOIN categories c ON c.id = j.category_id
         WHERE j.employer_id = ? AND j.deleted_at IS NULL ORDER BY j.created_at DESC`,
      )
      .all(empId)
      .map((r: any) => hydrateJobRow(r));

    const gigs = db
      .prepare(
        `SELECT mt.*, (SELECT COUNT(*) FROM task_applications ta WHERE ta.task_id = mt.id) as interested_count,
         (SELECT u.full_name FROM task_assignments tas JOIN users u ON u.id = tas.worker_id WHERE tas.task_id = mt.id) as assigned_worker_name
         FROM micro_tasks mt WHERE mt.employer_id = ? AND mt.deleted_at IS NULL ORDER BY mt.created_at DESC`,
      )
      .all(empId)
      .map((g: any) => ({
        id: g.id,
        employerId: g.employer_id,
        title: g.title,
        description: g.description,
        category: g.category,
        paymentAmount: g.payment_amount,
        currency: 'NPR',
        estimatedDuration: g.estimated_duration,
        locationType: g.location_type,
        province: g.province,
        district: g.district,
        municipality: g.municipality,
        workersRequired: g.workers_required,
        requiredSkills: JSON.parse(g.required_skills_json || '[]'),
        urgency: g.urgency,
        deadline: g.deadline,
        status: g.status,
        createdAt: g.created_at,
        interestedCount: g.interested_count,
        assignedWorkerName: g.assigned_worker_name || null,
      }));

    const applications = db
      .prepare(
        `SELECT ja.*, j.title as job_title, j.required_education, j.minimum_experience, j.province as job_province, j.district as job_district, j.work_mode, j.employment_type,
         u.full_name as applicant_name, u.email as applicant_email, u.profile_photo_url as applicant_photo_url,
         jsp.professional_headline, jsp.district as applicant_district, jsp.province as applicant_province, jsp.education_level, jsp.years_of_experience, jsp.employment_preference, jsp.availability, jsp.preferred_location,
         (SELECT verification_status FROM identity_verifications WHERE user_id = u.id) as idv_status,
         (SELECT COUNT(*) FROM education_records WHERE user_id = u.id AND verification_status = 'verified') as verified_edu_cnt
         FROM job_applications ja
         JOIN jobs j ON j.id = ja.job_id
         JOIN users u ON u.id = ja.applicant_id
         LEFT JOIN job_seeker_profiles jsp ON jsp.user_id = u.id
         WHERE j.employer_id = ? ORDER BY ja.updated_at DESC`,
      )
      .all(empId)
      .map((row: any) => {
        const reqSkills = (
          db.prepare('SELECT s.skill_name FROM job_required_skills jrs JOIN skills s ON s.id = jrs.skill_id WHERE jrs.job_id = ?').all(row.job_id) as Array<{ skill_name: string }>
        ).map((s) => s.skill_name);
        const candSkills = (
          db.prepare('SELECT s.skill_name FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ?').all(row.applicant_id) as Array<{ skill_name: string }>
        ).map((s) => s.skill_name);
        const match = calculateJobMatch(
          {
            skills: candSkills,
            educationLevel: (row.education_level || 'SEE') as EducationLevel,
            yearsOfExperience: Number(row.years_of_experience || 0),
            province: row.applicant_province || 'Bagmati Province',
            district: row.applicant_district || 'Kathmandu',
            preferredLocation: row.preferred_location || '',
            employmentPreference: (row.employment_preference || 'Full-time') as EmploymentType,
            availability: (row.availability || 'Immediate') as JobSeekerProfile['availability'],
          },
          {
            requiredSkills: reqSkills,
            requiredEducation: row.required_education as EducationLevel,
            minimumExperience: Number(row.minimum_experience || 0),
            province: row.job_province,
            district: row.job_district,
            workMode: row.work_mode as WorkMode,
            employmentType: row.employment_type as EmploymentType,
          },
        );
        return {
          id: row.id,
          jobId: row.job_id,
          jobTitle: row.job_title,
          applicantId: row.applicant_id,
          applicantName: row.applicant_name,
          applicantEmail: row.applicant_email,
          applicantHeadline: row.professional_headline || '',
          applicantPhotoUrl: row.applicant_photo_url,
          applicantLocation: `${row.applicant_district || 'Kathmandu'}, ${row.applicant_province || 'Bagmati Province'}`,
          applicantIdentityVerified: row.idv_status === 'verified',
          applicantEducationVerified: Number(row.verified_edu_cnt || 0) > 0,
          coverMessage: row.cover_message,
          resumeReference: row.resume_reference,
          status: row.status as ApplicationStatus,
          matchScore: match.score,
          appliedAt: row.applied_at,
          updatedAt: row.updated_at,
          statusHistory: JSON.parse(row.status_history_json || '[]'),
        };
      });

    res.json({ company, jobs, gigs, applications });
  });

  router.put('/employer/company', requireAuth, requireRole('employer'), (req: AuthedRequest, res: Response) => {
    const { organizationName, employerType, businessCategory, contactPerson, description, website, province, district, municipality } = req.body || {};
    const db = getDb();
    db.prepare(`
      UPDATE employer_profiles SET
        organization_name = COALESCE(?, organization_name),
        employer_type = COALESCE(?, employer_type),
        business_category = COALESCE(?, business_category),
        contact_person = COALESCE(?, contact_person),
        description = COALESCE(?, description),
        website = COALESCE(?, website),
        province = COALESCE(?, province),
        district = COALESCE(?, district),
        municipality = COALESCE(?, municipality)
      WHERE user_id = ?
    `).run(organizationName ?? null, employerType ?? null, businessCategory ?? null, contactPerson ?? null, description ?? null, website ?? null, province ?? null, district ?? null, municipality ?? null, req.authUser!.id);
    res.json({ ok: true });
  });

  router.post('/employer/verification', requireAuth, requireRole('employer'), (req: AuthedRequest, res: Response) => {
    const { fileName, mimeType, fileBase64 } = req.body || {};
    if (!fileName || !mimeType || !fileBase64) {
      res.status(400).json({ error: 'Valid business registration or ID document is required.' });
      return;
    }
    try {
      const { filePath } = saveBase64PrivateDoc(String(fileBase64), String(mimeType), 'emp');
      const db = getDb();
      db.prepare("UPDATE employer_profiles SET verification_status = 'pending_review', verification_doc_path = ?, verification_doc_name = ?, rejection_reason = NULL WHERE user_id = ?").run(
        filePath,
        fileName,
        req.authUser!.id,
      );
      res.status(201).json({ ok: true, verificationStatus: 'pending_review' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Verification upload failed.' });
    }
  });

  router.patch('/employer/applications/:id/status', requireAuth, requireRole('employer'), (req: AuthedRequest, res: Response) => {
    const { status, note } = req.body || {};
    const valid: ApplicationStatus[] = ['New', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];
    if (!valid.includes(status)) {
      res.status(400).json({ error: 'Invalid application stage.' });
      return;
    }
    const db = getDb();
    const row = db
      .prepare(
        `SELECT ja.id, ja.applicant_id, ja.status_history_json, j.title, j.employer_id
         FROM job_applications ja JOIN jobs j ON j.id = ja.job_id WHERE ja.id = ?`,
      )
      .get(req.params.id) as Record<string, any> | undefined;

    if (!row || row.employer_id !== req.authUser!.id) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    const history = JSON.parse(row.status_history_json || '[]');
    history.push({ status, changedAt: nowIso(), note: note || undefined });
    db.prepare('UPDATE job_applications SET status = ?, status_history_json = ?, updated_at = ? WHERE id = ?').run(
      status,
      JSON.stringify(history),
      nowIso(),
      row.id,
    );

    createNotification(
      row.applicant_id,
      `Application Update: ${status}`,
      `Your application for ${row.title} moved to ${status}.`,
      'application_status',
      row.id,
    );

    res.json({ ok: true, status, statusHistory: history });
  });

  router.get('/employer/candidates', requireAuth, requireRole('employer'), (req: AuthedRequest, res: Response) => {
    const db = getDb();
    const { q, skill, education, province, verifiedOnly } = req.query;

    const rows = db
      .prepare(
        `SELECT u.id as user_id, u.full_name, u.profile_photo_url, jsp.*,
         (SELECT verification_status FROM identity_verifications WHERE user_id = u.id) as idv_status,
         (SELECT COUNT(*) FROM portfolios WHERE user_id = u.id) as portfolio_count
         FROM users u
         JOIN job_seeker_profiles jsp ON jsp.user_id = u.id
         WHERE u.role = 'job_seeker' AND u.account_status = 'active' AND u.deleted_at IS NULL`,
      )
      .all() as Array<Record<string, any>>;

    const shortlistedSet = new Set(
      (
        db.prepare('SELECT candidate_id FROM shortlisted_candidates WHERE employer_id = ?').all(req.authUser!.id) as Array<{
          candidate_id: string;
        }>
      ).map((r) => r.candidate_id),
    );

    let candidates = rows.map((r) => {
      const skills = (
        db.prepare('SELECT s.skill_name FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ?').all(r.user_id) as Array<{ skill_name: string }>
      ).map((s) => s.skill_name);
      const verifiedEdu = (
        db.prepare("SELECT qualification_level FROM education_records WHERE user_id = ? AND verification_status = 'verified'").all(r.user_id) as Array<{ qualification_level: string }>
      ).map((e) => e.qualification_level);

      return {
        userId: r.user_id,
        fullName: r.full_name,
        profilePhotoUrl: r.profile_photo_url,
        professionalHeadline: r.professional_headline || 'Job Seeker',
        province: r.province,
        district: r.district,
        municipality: r.municipality,
        educationLevel: r.education_level,
        yearsOfExperience: Number(r.years_of_experience || 0),
        employmentPreference: r.employment_preference,
        availability: r.availability,
        skills,
        identityVerified: r.idv_status === 'verified',
        educationVerified: verifiedEdu.length > 0,
        verifiedQualifications: verifiedEdu,
        portfolioCount: Number(r.portfolio_count || 0),
        isShortlisted: shortlistedSet.has(r.user_id),
      };
    });

    if (q && String(q).trim()) {
      const term = String(q).trim().toLowerCase();
      candidates = candidates.filter(
        (c) =>
          c.fullName.toLowerCase().includes(term) ||
          c.professionalHeadline.toLowerCase().includes(term) ||
          c.skills.some((s) => s.toLowerCase().includes(term)),
      );
    }
    if (skill && skill !== 'all') {
      const sk = String(skill).toLowerCase();
      candidates = candidates.filter((c) => c.skills.some((s) => s.toLowerCase() === sk));
    }
    if (education && education !== 'all') {
      candidates = candidates.filter((c) => c.educationLevel === education);
    }
    if (province && province !== 'all') {
      candidates = candidates.filter((c) => c.province === province);
    }
    if (verifiedOnly === 'true') {
      candidates = candidates.filter((c) => c.identityVerified);
    }

    res.json({ candidates });
  });

  router.post('/employer/shortlist/:candidateId', requireAuth, requireRole('employer'), (req: AuthedRequest, res: Response) => {
    const db = getDb();
    const existing = db
      .prepare('SELECT id FROM shortlisted_candidates WHERE employer_id = ? AND candidate_id = ?')
      .get(req.authUser!.id, req.params.candidateId);
    if (existing) {
      db.prepare('DELETE FROM shortlisted_candidates WHERE employer_id = ? AND candidate_id = ?').run(
        req.authUser!.id,
        req.params.candidateId,
      );
      res.json({ shortlisted: false });
      return;
    }
    db.prepare('INSERT INTO shortlisted_candidates (id, employer_id, candidate_id, created_at) VALUES (?, ?, ?, ?)').run(
      uid('shl'),
      req.authUser!.id,
      req.params.candidateId,
      nowIso(),
    );
    res.json({ shortlisted: true });
  });

  // ---------------- MESSAGING & NOTIFICATIONS ----------------
  router.get('/conversations', requireAuth, (req: AuthedRequest, res: Response) => {
    const userId = req.authUser!.id;
    const db = getDb();
    const convRows = db
      .prepare(
        `SELECT c.id, c.context_title, c.created_at
         FROM conversations c
         JOIN conversation_participants cp ON cp.conversation_id = c.id
         WHERE cp.user_id = ?
         ORDER BY c.created_at DESC`,
      )
      .all(userId) as Array<Record<string, any>>;

    const conversations = convRows.map((c) => {
      const other = db
        .prepare(
          `SELECT u.id, u.full_name, u.role, u.profile_photo_url,
           (SELECT verification_status FROM identity_verifications WHERE user_id = u.id) as idv_status,
           (SELECT verification_status FROM employer_profiles WHERE user_id = u.id) as emp_status
           FROM conversation_participants cp
           JOIN users u ON u.id = cp.user_id
           WHERE cp.conversation_id = ? AND cp.user_id != ? LIMIT 1`,
        )
        .get(c.id, userId) as Record<string, any> | undefined;

      const lastMsg = db
        .prepare('SELECT message_text, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1')
        .get(c.id) as { message_text: string; created_at: string } | undefined;

      const unreadCount = (
        db.prepare('SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL').get(c.id, userId) as {
          cnt: number;
        }
      ).cnt;

      return {
        id: c.id,
        otherUserId: other?.id || '',
        otherUserName: other?.full_name || 'KaamSetu User',
        otherUserRole: other?.role || 'job_seeker',
        otherUserPhotoUrl: other?.profile_photo_url || null,
        otherUserVerified: other?.idv_status === 'verified' || other?.emp_status === 'verified',
        contextTitle: c.context_title,
        lastMessage: lastMsg?.message_text || null,
        lastMessageAt: lastMsg?.created_at || c.created_at,
        unreadCount,
      };
    });

    res.json({ conversations });
  });

  router.post('/conversations', requireAuth, (req: AuthedRequest, res: Response) => {
    const { recipientId, contextTitle, initialMessage } = req.body || {};
    if (!recipientId || recipientId === req.authUser!.id) {
      res.status(400).json({ error: 'Valid recipient is required.' });
      return;
    }
    const db = getDb();
    const existing = db
      .prepare(
        `SELECT cp1.conversation_id as id FROM conversation_participants cp1
         JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
         WHERE cp1.user_id = ? AND cp2.user_id = ? LIMIT 1`,
      )
      .get(req.authUser!.id, recipientId) as { id: string } | undefined;

    let convId = existing?.id;
    const now = nowIso();
    if (!convId) {
      convId = uid('conv');
      db.prepare('INSERT INTO conversations (id, context_title, created_at) VALUES (?, ?, ?)').run(
        convId,
        contextTitle || null,
        now,
      );
      db.prepare('INSERT INTO conversation_participants (id, conversation_id, user_id) VALUES (?, ?, ?)').run(
        uid('cp'),
        convId,
        req.authUser!.id,
      );
      db.prepare('INSERT INTO conversation_participants (id, conversation_id, user_id) VALUES (?, ?, ?)').run(
        uid('cp'),
        convId,
        recipientId,
      );
    }

    if (initialMessage && String(initialMessage).trim()) {
      db.prepare('INSERT INTO messages (id, conversation_id, sender_id, message_text, created_at) VALUES (?, ?, ?, ?, ?)').run(
        uid('msg'),
        convId,
        req.authUser!.id,
        String(initialMessage).trim(),
        now,
      );
      createNotification(recipientId, `Message from ${req.authUser!.fullName}`, String(initialMessage).trim().slice(0, 120), 'message', convId);
    }

    res.status(201).json({ id: convId });
  });

  router.get('/conversations/:id/messages', requireAuth, (req: AuthedRequest, res: Response) => {
    const db = getDb();
    const participant = db
      .prepare('SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?')
      .get(req.params.id, req.authUser!.id);
    if (!participant) {
      res.status(403).json({ error: 'Access denied to conversation.' });
      return;
    }
    db.prepare('UPDATE messages SET read_at = ? WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL').run(
      nowIso(),
      req.params.id,
      req.authUser!.id,
    );
    const messages = db
      .prepare('SELECT id, conversation_id as conversationId, sender_id as senderId, message_text as messageText, attachment_reference as attachmentReference, read_at as readAt, created_at as createdAt FROM messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .all(req.params.id);
    res.json({ messages });
  });

  router.post('/conversations/:id/messages', requireAuth, (req: AuthedRequest, res: Response) => {
    const { messageText, attachmentReference } = req.body || {};
    if (!messageText || !String(messageText).trim()) {
      res.status(400).json({ error: 'Message text cannot be empty.' });
      return;
    }
    const db = getDb();
    const participant = db
      .prepare('SELECT id FROM conversation_participants WHERE conversation_id = ? AND user_id = ?')
      .get(req.params.id, req.authUser!.id);
    if (!participant) {
      res.status(403).json({ error: 'Access denied to conversation.' });
      return;
    }

    const msgId = uid('msg');
    const now = nowIso();
    db.prepare('INSERT INTO messages (id, conversation_id, sender_id, message_text, attachment_reference, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      msgId,
      req.params.id,
      req.authUser!.id,
      String(messageText).trim(),
      attachmentReference?.trim() || null,
      now,
    );

    const others = db
      .prepare('SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ?')
      .all(req.params.id, req.authUser!.id) as Array<{ user_id: string }>;
    for (const o of others) {
      createNotification(o.user_id, `New Message from ${req.authUser!.fullName}`, String(messageText).trim().slice(0, 100), 'message', req.params.id);
    }

    res.status(201).json({ ok: true, id: msgId });
  });

  router.get('/notifications', requireAuth, (req: AuthedRequest, res: Response) => {
    const db = getDb();
    const notifications = db
      .prepare('SELECT id, user_id as userId, title, message, notification_type as notificationType, reference_id as referenceId, is_read as isRead, created_at as createdAt FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(req.authUser!.id)
      .map((n: any) => ({ ...n, isRead: !!n.isRead }));
    res.json({ notifications });
  });

  router.patch('/notifications/read-all', requireAuth, (req: AuthedRequest, res: Response) => {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.authUser!.id);
    res.json({ ok: true });
  });

  router.patch('/notifications/:id/read', requireAuth, (req: AuthedRequest, res: Response) => {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.authUser!.id);
    res.json({ ok: true });
  });

  // ---------------- REPORTS ----------------
  router.post('/reports', requireAuth, (req: AuthedRequest, res: Response) => {
    const { jobId, taskId, reportedUserId, targetTitle, reason, description } = req.body || {};
    if (!reason || !description) {
      res.status(400).json({ error: 'Reason and description are required.' });
      return;
    }
    const db = getDb();
    db.prepare(`
      INSERT INTO reports (id, reporter_id, reported_user_id, job_id, task_id, target_title, reason, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?)
    `).run(uid('rep'), req.authUser!.id, reportedUserId || null, jobId || null, taskId || null, targetTitle || 'Listing / User', reason, description, nowIso());
    res.status(201).json({ ok: true });
  });

  // ---------------- SIGNED PRIVATE DOCUMENT VIEWING ----------------
  router.get('/documents/signed-url/:kind/:id', requireAuth, (req: AuthedRequest, res: Response) => {
    const { kind, id } = req.params;
    const db = getDb();
    let ownerId: string | null = null;

    if (kind === 'identity') {
      const row = db.prepare('SELECT user_id FROM identity_verifications WHERE id = ?').get(id) as { user_id: string } | undefined;
      ownerId = row?.user_id || null;
    } else if (kind === 'academic') {
      const row = db.prepare('SELECT user_id FROM academic_documents WHERE id = ?').get(id) as { user_id: string } | undefined;
      ownerId = row?.user_id || null;
    } else if (kind === 'employer') {
      const row = db.prepare('SELECT user_id FROM employer_profiles WHERE id = ?').get(id) as { user_id: string } | undefined;
      ownerId = row?.user_id || null;
    }

    if (!ownerId) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }
    if (req.authUser!.role !== 'admin' && req.authUser!.id !== ownerId) {
      res.status(403).json({ error: 'Forbidden: unauthorized document access.' });
      return;
    }

    const token = signDocAccessToken({
      docKind: kind as 'identity' | 'academic' | 'employer',
      docId: id,
      viewerId: req.authUser!.id,
    });
    res.json({ url: `/api/documents/file/${token}` });
  });

  router.get('/documents/file/:token', (req: Request, res: Response) => {
    const payload = verifyDocAccessToken(req.params.token);
    if (!payload) {
      res.status(403).send('Expired or invalid document access token.');
      return;
    }
    const db = getDb();
    let filePath: string | null = null;
    let mimeType = 'application/octet-stream';

    if (payload.docKind === 'identity') {
      const row = db.prepare('SELECT private_storage_path, mime_type FROM identity_verifications WHERE id = ?').get(payload.docId) as
        | { private_storage_path: string; mime_type: string }
        | undefined;
      filePath = row?.private_storage_path || null;
      mimeType = row?.mime_type || mimeType;
    } else if (payload.docKind === 'academic') {
      const row = db.prepare('SELECT private_storage_path, mime_type FROM academic_documents WHERE id = ?').get(payload.docId) as
        | { private_storage_path: string; mime_type: string }
        | undefined;
      filePath = row?.private_storage_path || null;
      mimeType = row?.mime_type || mimeType;
    } else if (payload.docKind === 'employer') {
      const row = db.prepare('SELECT verification_doc_path FROM employer_profiles WHERE id = ?').get(payload.docId) as
        | { verification_doc_path: string | null }
        | undefined;
      filePath = row?.verification_doc_path || null;
      mimeType = filePath?.endsWith('.svg') ? 'image/svg+xml' : 'application/pdf';
    }

    if (!filePath || !fs.existsSync(filePath)) {
      res.status(404).send('Document binary not found.');
      return;
    }

    db.prepare('INSERT INTO document_access_logs (id, actor_id, document_kind, document_id, accessed_at) VALUES (?, ?, ?, ?, ?)').run(
      uid('dal'),
      payload.viewerId,
      payload.docKind,
      payload.docId,
      nowIso(),
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(path.resolve(filePath));
  });

  // ---------------- ADMIN DASHBOARD (PROTECTED) ----------------
  router.get('/admin/overview', requireAuth, requireRole('admin'), (_req: AuthedRequest, res: Response) => {
    const db = getDb();
    const metrics = {
      totalUsers: (db.prepare('SELECT COUNT(*) as c FROM users WHERE deleted_at IS NULL').get() as { c: number }).c,
      pendingIdentity: (db.prepare("SELECT COUNT(*) as c FROM identity_verifications WHERE verification_status = 'pending_review'").get() as { c: number }).c,
      pendingAcademic: (db.prepare("SELECT COUNT(*) as c FROM academic_documents WHERE verification_status = 'pending_review'").get() as { c: number }).c,
      pendingEmployers: (db.prepare("SELECT COUNT(*) as c FROM employer_profiles WHERE verification_status = 'pending_review'").get() as { c: number }).c,
      pendingJobs: (db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'Pending Approval' AND deleted_at IS NULL").get() as { c: number }).c,
      openReports: (db.prepare("SELECT COUNT(*) as c FROM reports WHERE status IN ('Open', 'Under Review')").get() as { c: number }).c,
      activeJobs: (db.prepare("SELECT COUNT(*) as c FROM jobs WHERE status = 'Active' AND deleted_at IS NULL").get() as { c: number }).c,
      totalApplications: (db.prepare('SELECT COUNT(*) as c FROM job_applications').get() as { c: number }).c,
    };

    const users = db
      .prepare('SELECT id, full_name as fullName, email, phone_number as phoneNumber, role, account_status as accountStatus, created_at as createdAt FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC')
      .all();

    const identityQueue = db
      .prepare(
        `SELECT iv.id, iv.user_id as userId, u.full_name as userName, u.email as userEmail, iv.document_type as documentType, iv.document_number_masked as documentNumberMasked, iv.file_name as fileName, iv.mime_type as mimeType, iv.verification_status as verificationStatus, iv.submitted_at as submittedAt, iv.rejection_reason as rejectionReason, iv.consent_timestamp as consentTimestamp
         FROM identity_verifications iv JOIN users u ON u.id = iv.user_id ORDER BY CASE WHEN iv.verification_status = 'pending_review' THEN 0 ELSE 1 END, iv.submitted_at DESC`,
      )
      .all();

    const academicQueue = db
      .prepare(
        `SELECT ad.id, ad.education_record_id as educationRecordId, ad.user_id as userId, u.full_name as userName, ad.title, ad.document_type as documentType, er.qualification_level as qualificationLevel, er.institution_name as institutionName, er.board_or_university as boardOrUniversity, er.completion_year as completionYear, er.gpa_or_percentage as gpaOrPercentage, ad.file_name as fileName, ad.verification_status as verificationStatus, ad.submitted_at as submittedAt, ad.rejection_reason as rejectionReason
         FROM academic_documents ad
         JOIN education_records er ON er.id = ad.education_record_id
         JOIN users u ON u.id = ad.user_id
         ORDER BY CASE WHEN ad.verification_status = 'pending_review' THEN 0 ELSE 1 END, ad.submitted_at DESC`,
      )
      .all();

    const employerQueue = db
      .prepare(
        `SELECT ep.id, ep.user_id as userId, ep.organization_name as organizationName, ep.employer_type as employerType, ep.business_category as businessCategory, ep.contact_person as contactPerson, ep.district, ep.province, ep.verification_status as verificationStatus, ep.verification_doc_name as verificationDocName, ep.rejection_reason as rejectionReason, ep.created_at as createdAt
         FROM employer_profiles ep
         ORDER BY CASE WHEN ep.verification_status = 'pending_review' THEN 0 ELSE 1 END, ep.created_at DESC`,
      )
      .all();

    const jobsModeration = db
      .prepare(
        `SELECT j.id, j.title, j.status, j.employment_type as employmentType, j.district, j.province, j.salary_min as salaryMin, j.salary_max as salaryMax, j.created_at as createdAt, ep.organization_name as organizationName
         FROM jobs j LEFT JOIN employer_profiles ep ON ep.user_id = j.employer_id
         WHERE j.deleted_at IS NULL ORDER BY CASE WHEN j.status = 'Pending Approval' THEN 0 ELSE 1 END, j.created_at DESC`,
      )
      .all();

    const gigsModeration = db
      .prepare(
        `SELECT mt.id, mt.title, mt.status, mt.category, mt.payment_amount as paymentAmount, mt.district, mt.created_at as createdAt, u.full_name as posterName
         FROM micro_tasks mt JOIN users u ON u.id = mt.employer_id
         WHERE mt.deleted_at IS NULL ORDER BY mt.created_at DESC`,
      )
      .all();

    const reports = db
      .prepare(
        `SELECT r.id, r.reporter_id as reporterId, u.full_name as reporterName, r.reported_user_id as reportedUserId, r.job_id as jobId, r.task_id as taskId, r.target_title as targetTitle, r.reason, r.description, r.status, r.created_at as createdAt
         FROM reports r JOIN users u ON u.id = r.reporter_id ORDER BY r.created_at DESC`,
      )
      .all();

    const reviews = db
      .prepare(
        `SELECT rev.id, u1.full_name as reviewerName, u2.full_name as reviewedName, rev.rating, rev.review_text as reviewText, rev.created_at as createdAt
         FROM reviews rev JOIN users u1 ON u1.id = rev.reviewer_id JOIN users u2 ON u2.id = rev.reviewed_user_id ORDER BY rev.created_at DESC`,
      )
      .all();

    const auditLogs = db
      .prepare(
        `SELECT al.id, al.actor_id as actorId, u.full_name as actorName, al.action, al.entity_type as entityType, al.entity_id as entityId, al.metadata_json as metadataJson, al.created_at as createdAt
         FROM audit_logs al JOIN users u ON u.id = al.actor_id ORDER BY al.created_at DESC LIMIT 60`,
      )
      .all()
      .map((a: any) => ({ ...a, metadata: JSON.parse(a.metadataJson || '{}') }));

    res.json({
      metrics,
      users,
      identityQueue,
      academicQueue,
      employerQueue,
      jobsModeration,
      gigsModeration,
      reports,
      reviews,
      auditLogs,
    });
  });

  router.patch('/admin/users/:id/status', requireAuth, requireRole('admin'), (req: AuthedRequest, res: Response) => {
    const { accountStatus } = req.body || {};
    if (!['active', 'suspended'].includes(accountStatus)) {
      res.status(400).json({ error: 'Invalid account status.' });
      return;
    }
    const db = getDb();
    db.prepare('UPDATE users SET account_status = ?, updated_at = ? WHERE id = ?').run(accountStatus, nowIso(), req.params.id);
    writeAudit(req.authUser!.id, `USER_${accountStatus.toUpperCase()}`, 'user', req.params.id);
    res.json({ ok: true });
  });

  router.post('/admin/verifications/:type/:id/review', requireAuth, requireRole('admin'), (req: AuthedRequest, res: Response) => {
    const { type, id } = req.params;
    const { decision, reason } = req.body || {};
    if (!['verified', 'rejected', 'requires_resubmission'].includes(decision)) {
      res.status(400).json({ error: 'Invalid verification decision.' });
      return;
    }
    if ((decision === 'rejected' || decision === 'requires_resubmission') && (!reason || String(reason).trim().length < 5)) {
      res.status(400).json({ error: 'A clear reason (5+ characters) is required when rejecting or requesting resubmission.' });
      return;
    }

    const db = getDb();
    const now = nowIso();
    const cleanReason = decision === 'verified' ? null : String(reason).trim();

    if (type === 'identity') {
      const row = db.prepare('SELECT user_id FROM identity_verifications WHERE id = ?').get(id) as { user_id: string } | undefined;
      if (!row) {
        res.status(404).json({ error: 'Identity verification request not found.' });
        return;
      }
      db.prepare('UPDATE identity_verifications SET verification_status = ?, reviewed_at = ?, reviewer_id = ?, rejection_reason = ? WHERE id = ?').run(
        decision,
        now,
        req.authUser!.id,
        cleanReason,
        id,
      );
      createNotification(
        row.user_id,
        decision === 'verified' ? 'Identity Verification Approved' : 'Identity Verification Update',
        decision === 'verified'
          ? 'Your identity verification is now approved.'
          : `Status: ${decision.replace('_', ' ')}. Reason: ${cleanReason}`,
        'verification',
        id,
      );
      writeAudit(req.authUser!.id, `IDENTITY_${decision.toUpperCase()}`, 'identity_verification', id, { reason: cleanReason });
    } else if (type === 'academic') {
      const row = db.prepare('SELECT user_id, education_record_id, title FROM academic_documents WHERE id = ?').get(id) as
        | { user_id: string; education_record_id: string; title: string }
        | undefined;
      if (!row) {
        res.status(404).json({ error: 'Academic document not found.' });
        return;
      }
      db.prepare('UPDATE academic_documents SET verification_status = ?, reviewed_at = ?, reviewer_id = ?, rejection_reason = ? WHERE id = ?').run(
        decision,
        now,
        req.authUser!.id,
        cleanReason,
        id,
      );
      db.prepare('UPDATE education_records SET verification_status = ? WHERE id = ?').run(decision, row.education_record_id);
      createNotification(
        row.user_id,
        decision === 'verified' ? 'Academic Certificate Verified' : 'Academic Document Requires Attention',
        decision === 'verified'
          ? `Your document "${row.title}" is now verified.`
          : `"${row.title}" status: ${decision.replace('_', ' ')}. Reason: ${cleanReason}`,
        'verification',
        id,
      );
      writeAudit(req.authUser!.id, `ACADEMIC_${decision.toUpperCase()}`, 'academic_document', id, { reason: cleanReason });
    } else if (type === 'employer') {
      const row = db.prepare('SELECT user_id, organization_name FROM employer_profiles WHERE id = ?').get(id) as
        | { user_id: string; organization_name: string }
        | undefined;
      if (!row) {
        res.status(404).json({ error: 'Employer verification request not found.' });
        return;
      }
      db.prepare('UPDATE employer_profiles SET verification_status = ?, rejection_reason = ? WHERE id = ?').run(
        decision,
        cleanReason,
        id,
      );
      createNotification(
        row.user_id,
        decision === 'verified' ? 'Employer Profile Verified' : 'Employer Verification Update',
        decision === 'verified'
          ? `${row.organization_name} now displays a Verified Employer badge.`
          : `Verification update: ${cleanReason}`,
        'verification',
        id,
      );
      writeAudit(req.authUser!.id, `EMPLOYER_${decision.toUpperCase()}`, 'employer_profile', id, { reason: cleanReason });
    } else {
      res.status(400).json({ error: 'Unknown verification type.' });
      return;
    }

    res.json({ ok: true });
  });

  router.patch('/admin/moderation/:kind/:id', requireAuth, requireRole('admin'), (req: AuthedRequest, res: Response) => {
    const { kind, id } = req.params;
    const { status } = req.body || {};
    const db = getDb();
    if (kind === 'job') {
      db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), id);
      writeAudit(req.authUser!.id, 'MODERATE_JOB', 'job', id, { status });
    } else if (kind === 'gig') {
      db.prepare('UPDATE micro_tasks SET status = ? WHERE id = ?').run(status, id);
      writeAudit(req.authUser!.id, 'MODERATE_GIG', 'micro_task', id, { status });
    } else {
      res.status(400).json({ error: 'Invalid moderation kind.' });
      return;
    }
    res.json({ ok: true });
  });

  router.patch('/admin/reports/:id', requireAuth, requireRole('admin'), (req: AuthedRequest, res: Response) => {
    const { status } = req.body || {};
    const db = getDb();
    db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, req.params.id);
    writeAudit(req.authUser!.id, 'RESOLVE_REPORT', 'report', req.params.id, { status });
    res.json({ ok: true });
  });

  router.post('/admin/categories', requireAuth, requireRole('admin'), (req: AuthedRequest, res: Response) => {
    const { name, nameNe, type } = req.body || {};
    if (!name || !nameNe) {
      res.status(400).json({ error: 'Category English and Nepali names are required.' });
      return;
    }
    const db = getDb();
    const id = uid('cat');
    db.prepare('INSERT INTO categories (id, name, name_ne, type) VALUES (?, ?, ?, ?)').run(
      id,
      name.trim(),
      nameNe.trim(),
      type === 'gig' ? 'gig' : 'job',
    );
    writeAudit(req.authUser!.id, 'CREATE_CATEGORY', 'category', id, { name });
    res.status(201).json({ ok: true, id });
  });

  return router;
}
