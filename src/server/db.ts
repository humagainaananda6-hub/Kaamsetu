import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.resolve(process.cwd(), '.data');
export const PRIVATE_DOCS_DIR = path.join(DATA_DIR, 'private_docs');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(PRIVATE_DOCS_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'kaamsetu.db');

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  initSchema(db);
  _db = db;
  return db;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone_number TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('job_seeker', 'employer', 'admin')),
      profile_photo_url TEXT,
      date_of_birth TEXT,
      account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending')),
      email_verified INTEGER NOT NULL DEFAULT 0,
      phone_verified INTEGER NOT NULL DEFAULT 0,
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_ne TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('job', 'gig'))
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      skill_name TEXT NOT NULL UNIQUE,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS job_seeker_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      professional_headline TEXT NOT NULL DEFAULT '',
      about TEXT NOT NULL DEFAULT '',
      province TEXT NOT NULL DEFAULT 'Bagmati Province',
      district TEXT NOT NULL DEFAULT 'Kathmandu',
      municipality TEXT NOT NULL DEFAULT 'Kathmandu Metropolitan City',
      preferred_location TEXT NOT NULL DEFAULT '',
      education_level TEXT NOT NULL DEFAULT 'SEE',
      years_of_experience INTEGER NOT NULL DEFAULT 0,
      employment_preference TEXT NOT NULL DEFAULT 'Full-time',
      availability TEXT NOT NULL DEFAULT 'Immediate',
      expected_min_salary INTEGER NOT NULL DEFAULT 15000,
      expected_max_salary INTEGER NOT NULL DEFAULT 40000,
      languages_json TEXT NOT NULL DEFAULT '["Nepali","English"]',
      profile_completion_percentage INTEGER NOT NULL DEFAULT 20
    );

    CREATE TABLE IF NOT EXISTS employer_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      employer_type TEXT NOT NULL DEFAULT 'Company / Startup',
      organization_name TEXT NOT NULL,
      business_category TEXT NOT NULL DEFAULT 'Information Technology',
      contact_person TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      website TEXT,
      province TEXT NOT NULL DEFAULT 'Bagmati Province',
      district TEXT NOT NULL DEFAULT 'Kathmandu',
      municipality TEXT NOT NULL DEFAULT 'Kathmandu Metropolitan City',
      verification_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (verification_status IN ('not_submitted', 'pending_review', 'verified', 'rejected', 'requires_resubmission')),
      verification_doc_path TEXT,
      verification_doc_name TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS identity_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      document_type TEXT NOT NULL,
      document_number_masked TEXT NOT NULL,
      private_storage_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (verification_status IN ('not_submitted', 'pending_review', 'verified', 'rejected', 'requires_resubmission')),
      submitted_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      rejection_reason TEXT,
      consent_timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS education_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      qualification_level TEXT NOT NULL,
      institution_name TEXT NOT NULL,
      board_or_university TEXT NOT NULL,
      completion_year INTEGER NOT NULL,
      gpa_or_percentage TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'not_submitted' CHECK (verification_status IN ('not_submitted', 'pending_review', 'verified', 'rejected', 'requires_resubmission')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS academic_documents (
      id TEXT PRIMARY KEY,
      education_record_id TEXT NOT NULL REFERENCES education_records(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      private_storage_path TEXT NOT NULL,
      document_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (verification_status IN ('not_submitted', 'pending_review', 'verified', 'rejected', 'requires_resubmission')),
      submitted_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      rejection_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS user_skills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      proficiency_level TEXT NOT NULL DEFAULT 'Intermediate',
      years_experience INTEGER NOT NULL DEFAULT 1,
      UNIQUE (user_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS portfolios (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      project_url TEXT,
      image_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS work_experiences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      job_title TEXT NOT NULL,
      description TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      currently_working INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      employer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      description TEXT NOT NULL,
      responsibilities TEXT NOT NULL,
      benefits TEXT NOT NULL DEFAULT '',
      employment_type TEXT NOT NULL,
      required_education TEXT NOT NULL,
      minimum_experience INTEGER NOT NULL DEFAULT 0,
      salary_min INTEGER NOT NULL,
      salary_max INTEGER NOT NULL,
      payment_frequency TEXT NOT NULL DEFAULT 'Monthly',
      currency TEXT NOT NULL DEFAULT 'NPR',
      province TEXT NOT NULL,
      district TEXT NOT NULL,
      municipality TEXT NOT NULL,
      work_mode TEXT NOT NULL,
      vacancies INTEGER NOT NULL DEFAULT 1,
      required_verification_level TEXT NOT NULL DEFAULT 'Any',
      application_deadline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Draft', 'Pending Approval', 'Active', 'Paused', 'Filled', 'Rejected')),
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_required_skills (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
      importance TEXT NOT NULL DEFAULT 'Required',
      UNIQUE (job_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS job_applications (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      applicant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cover_message TEXT NOT NULL,
      resume_reference TEXT,
      status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected')),
      status_history_json TEXT NOT NULL DEFAULT '[]',
      applied_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (job_id, applicant_id)
    );

    CREATE TABLE IF NOT EXISTS saved_jobs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      UNIQUE (user_id, job_id)
    );

    CREATE TABLE IF NOT EXISTS shortlisted_candidates (
      id TEXT PRIMARY KEY,
      employer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      UNIQUE (employer_id, candidate_id)
    );

    CREATE TABLE IF NOT EXISTS job_matches (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      match_score INTEGER NOT NULL,
      matching_reasons TEXT NOT NULL,
      calculated_at TEXT NOT NULL,
      UNIQUE (user_id, job_id)
    );

    CREATE TABLE IF NOT EXISTS micro_tasks (
      id TEXT PRIMARY KEY,
      employer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      payment_amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NPR',
      estimated_duration TEXT NOT NULL,
      location_type TEXT NOT NULL CHECK (location_type IN ('Local', 'Online')),
      province TEXT NOT NULL,
      district TEXT NOT NULL,
      municipality TEXT NOT NULL,
      workers_required INTEGER NOT NULL DEFAULT 1,
      required_skills_json TEXT NOT NULL DEFAULT '[]',
      urgency TEXT NOT NULL DEFAULT 'Normal' CHECK (urgency IN ('Normal', 'Urgent')),
      deadline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Draft', 'Pending Approval', 'Open', 'Assigned', 'In Progress', 'Completed', 'Cancelled', 'Disputed')),
      deleted_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_applications (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES micro_tasks(id) ON DELETE CASCADE,
      applicant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Interested' CHECK (status IN ('Interested', 'Selected', 'Declined')),
      applied_at TEXT NOT NULL,
      UNIQUE (task_id, applicant_id)
    );

    CREATE TABLE IF NOT EXISTS task_assignments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL UNIQUE REFERENCES micro_tasks(id) ON DELETE CASCADE,
      worker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      employer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      completion_status TEXT NOT NULL DEFAULT 'Assigned'
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      context_title TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message_text TEXT NOT NULL,
      attachment_reference TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      notification_type TEXT NOT NULL,
      reference_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reviewed_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id TEXT REFERENCES micro_tasks(id) ON DELETE SET NULL,
      job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      review_text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reported_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
      task_id TEXT REFERENCES micro_tasks(id) ON DELETE SET NULL,
      target_title TEXT NOT NULL DEFAULT 'Listing / User',
      reason TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Under Review', 'Resolved', 'Dismissed')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_access_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_kind TEXT NOT NULL,
      document_id TEXT NOT NULL,
      accessed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      phone_number TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS certificate_verifications (
      id TEXT PRIMARY KEY,
      verification_code TEXT NOT NULL UNIQUE,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      holder_name TEXT NOT NULL,
      certificate_title TEXT NOT NULL,
      certificate_type TEXT NOT NULL,
      issuing_authority TEXT NOT NULL,
      issue_year INTEGER,
      serial_number TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      sha256_hash TEXT NOT NULL,
      private_storage_path TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (verification_status IN ('pending_review', 'verified', 'rejected')),
      integrity_score INTEGER NOT NULL DEFAULT 0,
      checks_json TEXT NOT NULL DEFAULT '[]',
      verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      verification_notes TEXT,
      created_at TEXT NOT NULL,
      verified_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(province, district);
    CREATE INDEX IF NOT EXISTS idx_jobs_status_date ON jobs(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_job_apps_job ON job_applications(job_id, status);
    CREATE INDEX IF NOT EXISTS idx_job_apps_user ON job_applications(applicant_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status_date ON micro_tasks(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_location ON micro_tasks(province, district);
    CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
    CREATE INDEX IF NOT EXISTS idx_identity_status ON identity_verifications(verification_status);
    CREATE INDEX IF NOT EXISTS idx_academic_status ON academic_documents(verification_status);
    CREATE INDEX IF NOT EXISTS idx_cert_verifications_code ON certificate_verifications(verification_code);
    CREATE INDEX IF NOT EXISTS idx_cert_verifications_status ON certificate_verifications(verification_status);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
  `);

  const reportCols = db.prepare('PRAGMA table_info(reports)').all() as Array<{ name: string }>;
  if (!reportCols.some((c) => c.name === 'target_title')) {
    db.exec("ALTER TABLE reports ADD COLUMN target_title TEXT NOT NULL DEFAULT 'Listing / User'");
  }
}
