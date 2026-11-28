import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getDb, PRIVATE_DOCS_DIR } from './db.ts';
import { hashPassword } from './auth.ts';
import { evaluateCertificateIntegrity } from '../lib/certificate-verifier.ts';

function writeSampleSvgDoc(filename: string, title: string, subtitle: string, lines: string[]) {
  const fullPath = path.join(PRIVATE_DOCS_DIR, filename);
  if (fs.existsSync(fullPath)) return fullPath;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
    <rect width="800" height="520" fill="#0F172A"/>
    <rect x="24" y="24" width="752" height="472" rx="12" fill="#172338" stroke="#263449" stroke-width="2"/>
    <text x="56" y="80" fill="#16C784" font-family="sans-serif" font-size="14" font-weight="700">KAAMBRIDGENEPAL (KBN) CERTIFICATE VERIFICATION PREVIEW</text>
    <text x="56" y="128" fill="#F8FAFC" font-family="sans-serif" font-size="26" font-weight="700">${title}</text>
    <text x="56" y="162" fill="#94A3B8" font-family="sans-serif" font-size="16">${subtitle}</text>
    <line x1="56" y1="188" x2="744" y2="188" stroke="#263449" stroke-width="1"/>
    ${lines
      .map(
        (line, i) =>
          `<text x="56" y="${236 + i * 38}" fill="#E2E8F0" font-family="monospace" font-size="16">${line}</text>`,
      )
      .join('')}
    <text x="56" y="456" fill="#64748B" font-family="sans-serif" font-size="13">Sample verification artifact for KaamBridgeNepal (KBN) registry workflow.</text>
  </svg>`;
  fs.writeFileSync(fullPath, svg, 'utf8');
  return fullPath;
}

function seedSampleCertificatesIfEmpty(db: ReturnType<typeof getDb>) {
  const existingCerts = db.prepare('SELECT COUNT(*) as cnt FROM certificate_verifications').get() as { cnt: number };
  if (existingCerts.cnt > 0) return;

  const sampleCert1Path = writeSampleSvgDoc(
    'sample-kbn-cert-tu01.svg',
    'Tribhuvan University — B.Sc. CSIT Certificate',
    'Verified Academic Credential · KaamBridgeNepal (KBN)',
    ['Holder: Aarav Shrestha', 'Authority: Tribhuvan University (TU)', 'Serial No: TU-CSIT-2025-0412', 'Verification Code: KBN-CERT-2026-TU01'],
  );
  const sampleCert2Path = writeSampleSvgDoc(
    'sample-kbn-cert-ct02.svg',
    'CTEVT Digital Design & UI Diploma',
    'Pending Reviewer Verification · KaamBridgeNepal (KBN)',
    ['Holder: Sita Gurung', 'Authority: CTEVT Nepal', 'Serial No: CTEVT-2025-8831', 'Verification Code: KBN-CERT-2026-CT02'],
  );

  const buf1 = fs.readFileSync(sampleCert1Path);
  const buf2 = fs.readFileSync(sampleCert2Path);
  const hash1 = crypto.createHash('sha256').update(buf1).digest('hex');
  const hash2 = crypto.createHash('sha256').update(buf2).digest('hex');
  const eval1 = evaluateCertificateIntegrity({
    buffer: buf1,
    declaredMime: 'image/svg+xml',
    holderName: 'Aarav Shrestha',
    certificateTitle: 'B.Sc. CSIT Degree Certificate',
    issuingAuthority: 'Tribhuvan University',
    serialNumber: 'TU-CSIT-2025-0412',
    issueYear: 2025,
  });
  const eval2 = evaluateCertificateIntegrity({
    buffer: buf2,
    declaredMime: 'image/svg+xml',
    holderName: 'Sita Gurung',
    certificateTitle: 'CTEVT Digital Design & UI Diploma',
    issuingAuthority: 'CTEVT Nepal',
    serialNumber: 'CTEVT-2025-8831',
    issueYear: 2025,
  });

  const aaravExists = db.prepare('SELECT id FROM users WHERE id = ?').get('usr_aarav') as { id: string } | undefined;
  const sitaExists = db.prepare('SELECT id FROM users WHERE id = ?').get('usr_sita') as { id: string } | undefined;
  const adminExists = db.prepare('SELECT id FROM users WHERE id = ?').get('usr_admin') as { id: string } | undefined;
  const nowStr = new Date().toISOString();

  const insertCert = db.prepare(`
    INSERT INTO certificate_verifications (
      id, verification_code, user_id, holder_name, certificate_title, certificate_type,
      issuing_authority, issue_year, serial_number, file_name, mime_type, file_size,
      sha256_hash, private_storage_path, verification_status, integrity_score, checks_json,
      verified_by, verification_notes, created_at, verified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCert.run(
    'cert_tu01',
    'KBN-CERT-2026-TU01',
    aaravExists ? 'usr_aarav' : null,
    'Aarav Shrestha',
    'B.Sc. CSIT Degree Certificate',
    "Bachelor's Certificate",
    'Tribhuvan University',
    2025,
    'TU-CSIT-2025-0412',
    'tu_bsc_csit_certificate.svg',
    'image/svg+xml',
    buf1.length,
    hash1,
    sampleCert1Path,
    'verified',
    eval1.integrityScore,
    JSON.stringify(eval1.checks),
    adminExists ? 'usr_admin' : null,
    'Matched against TU academic seal & photo integrity check.',
    nowStr,
    nowStr,
  );

  insertCert.run(
    'cert_ct02',
    'KBN-CERT-2026-CT02',
    sitaExists ? 'usr_sita' : null,
    'Sita Gurung',
    'CTEVT Digital Design & UI Diploma',
    'Technical / CTEVT Training',
    'CTEVT Nepal',
    2025,
    'CTEVT-2025-8831',
    'ctevt_ui_diploma.svg',
    'image/svg+xml',
    buf2.length,
    hash2,
    sampleCert2Path,
    'pending_review',
    eval2.integrityScore,
    JSON.stringify(eval2.checks),
    null,
    null,
    nowStr,
    null,
  );
}

export function seedDatabaseIfEmpty() {
  const db = getDb();
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (countRow.cnt > 0) {
    seedSampleCertificatesIfEmpty(db);
    return;
  }

  const now = new Date('2026-11-17T08:00:00Z').toISOString();
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();
  const daysAhead = (d: number) => new Date(Date.now() + d * 86400_000).toISOString().slice(0, 10);

  // Sample private docs (fictional)
  const docAaravId = writeSampleSvgDoc(
    'sample-id-aarav.svg',
    'Citizenship Document (Sample Demo)',
    'Submitted by Aarav Shrestha · Restricted Reviewer Access',
    ['Document Type: Nepali Citizenship (Nagarikta)', 'Masked Reference: XX-XX-76-00412', 'District: Lalitpur, Bagmati Province', 'Consent Recorded: Yes'],
  );
  const docSitaId = writeSampleSvgDoc(
    'sample-id-sita.svg',
    'Citizenship Document (Sample Demo)',
    'Submitted by Sita Gurung · Pending Admin Review',
    ['Document Type: Nepali Citizenship (Nagarikta)', 'Masked Reference: XX-XX-75-00819', 'District: Kaski, Gandaki Province', 'Consent Recorded: Yes'],
  );
  const docAaravSee = writeSampleSvgDoc(
    'sample-see-aarav.svg',
    'SEE Marksheet Certificate (Sample Demo)',
    'National Examinations Board (NEB)',
    ['Candidate: Aarav Shrestha', 'Institution: Lalitpur Madhyamik Vidyalaya', 'GPA: 3.75 · Year: 2019'],
  );
  const docAaravBachelor = writeSampleSvgDoc(
    'sample-bsc-aarav.svg',
    'B.Sc. CSIT Transcript (Sample Demo)',
    'Tribhuvan University · Pending Review',
    ['Candidate: Aarav Shrestha', 'Institution: Patan Multiple Campus', 'Percentage: 78.4% · Year: 2025'],
  );
  const docAnitaSee = writeSampleSvgDoc(
    'sample-see-anita.svg',
    'SEE Certificate (Sample Demo)',
    'National Examinations Board (NEB)',
    ['Candidate: Anita Tamang', 'Institution: Narayani Model School, Chitwan', 'GPA: 3.60 · Year: 2021'],
  );
  const docEmpNabin = writeSampleSvgDoc(
    'sample-emp-nabin.svg',
    'PAN & Business Registration (Sample Demo)',
    'Newa Kitchen & Cafe · Pending Employer Verification',
    ['Organization: Newa Kitchen & Cafe', 'Owner: Nabin Maharjan', 'Municipality: Kathmandu Metropolitan City'],
  );

  // 1. Categories (16 Job Categories + 7 Gig Categories)
  const jobCategories = [
    ['cat_it', 'Information Technology', 'सूचना प्रविधि', 'job'],
    ['cat_design', 'Graphic Design', 'ग्राफिक डिजाइन', 'job'],
    ['cat_marketing', 'Digital Marketing', 'डिजिटल मार्केटिङ', 'job'],
    ['cat_finance', 'Accounting and Finance', 'लेखा तथा वित्त', 'job'],
    ['cat_education', 'Education and Teaching', 'शिक्षा तथा शिक्षण', 'job'],
    ['cat_engineering', 'Engineering', 'इन्जिनियरिङ', 'job'],
    ['cat_hospitality', 'Hospitality and Tourism', 'आतिथ्य तथा पर्यटन', 'job'],
    ['cat_healthcare', 'Healthcare', 'स्वास्थ्य सेवा', 'job'],
    ['cat_construction', 'Construction', 'निर्माण', 'job'],
    ['cat_admin', 'Administration', 'प्रशासन', 'job'],
    ['cat_sales', 'Sales', 'बिक्री', 'job'],
    ['cat_support', 'Customer Support', 'ग्राहक सेवा', 'job'],
    ['cat_agri', 'Agriculture', 'कृषि', 'job'],
    ['cat_creative', 'Creative Industries', 'सिर्जनात्मक क्षेत्र', 'job'],
    ['cat_labor', 'General Labor', 'सामान्य श्रम', 'job'],
    ['cat_other', 'Other', 'अन्य', 'job'],
  ];

  const gigCategories = [
    ['gig_online', 'Online Tasks', 'अनलाइन काम', 'gig'],
    ['gig_local', 'Local Tasks', 'स्थानीय काम', 'gig'],
    ['gig_creative', 'Creative Tasks', 'सिर्जनात्मक काम', 'gig'],
    ['gig_tech', 'Technical Tasks', 'प्राविधिक काम', 'gig'],
    ['gig_physical', 'Physical Tasks', 'शारीरिक काम', 'gig'],
    ['gig_edu', 'Educational Tasks', 'शैक्षिक काम', 'gig'],
    ['gig_event', 'Event-Based Tasks', 'कार्यक्रम आधारित काम', 'gig'],
  ];

  const insertCat = db.prepare('INSERT INTO categories (id, name, name_ne, type) VALUES (?, ?, ?, ?)');
  for (const c of [...jobCategories, ...gigCategories]) {
    insertCat.run(c[0], c[1], c[2], c[3]);
  }

  // 2. Skills
  const skillSeeds: Array<[string, string, string]> = [
    ['sk_react', 'React', 'cat_it'],
    ['sk_ts', 'TypeScript', 'cat_it'],
    ['sk_node', 'Node.js', 'cat_it'],
    ['sk_tailwind', 'Tailwind CSS', 'cat_it'],
    ['sk_sql', 'PostgreSQL', 'cat_it'],
    ['sk_python', 'Python', 'cat_it'],
    ['sk_figma', 'Figma', 'cat_design'],
    ['sk_illustrator', 'Adobe Illustrator', 'cat_design'],
    ['sk_photoshop', 'Adobe Photoshop', 'cat_design'],
    ['sk_branding', 'Brand Identity', 'cat_design'],
    ['sk_seo', 'SEO & Analytics', 'cat_marketing'],
    ['sk_social', 'Social Media Marketing', 'cat_marketing'],
    ['sk_content', 'Content Writing', 'cat_marketing'],
    ['sk_tally', 'Tally Prime', 'cat_finance'],
    ['sk_excel', 'Microsoft Excel', 'cat_finance'],
    ['sk_tax', 'Nepal Tax & VAT Filing', 'cat_finance'],
    ['sk_teaching', 'Classroom Teaching', 'cat_education'],
    ['sk_math', 'Mathematics Tutoring', 'cat_education'],
    ['sk_autocad', 'AutoCAD', 'cat_engineering'],
    ['sk_civil', 'Site Supervision', 'cat_engineering'],
    ['sk_barista', 'Barista & Espresso', 'cat_hospitality'],
    ['sk_service', 'Customer Service', 'cat_support'],
    ['sk_photo', 'Event Photography', 'cat_creative'],
    ['sk_video', 'Video Editing', 'cat_creative'],
    ['sk_data', 'Data Entry', 'cat_admin'],
    ['sk_office', 'Office Administration', 'cat_admin'],
    ['sk_sales', 'B2B Sales', 'cat_sales'],
    ['sk_repair', 'Computer Hardware Repair', 'cat_it'],
    ['sk_translation', 'Nepali-English Translation', 'cat_education'],
    ['sk_delivery', 'Local Courier & Logistics', 'cat_labor'],
  ];
  const insertSkill = db.prepare('INSERT INTO skills (id, skill_name, category_id) VALUES (?, ?, ?)');
  for (const s of skillSeeds) {
    insertSkill.run(s[0], s[1], s[2]);
  }

  // 3. Users (Fictional Demo Accounts)
  const seekerPass = hashPassword('KaamSetu@2026');
  const adminPass = hashPassword('AdminSetu@2026');

  const insertUser = db.prepare(`
    INSERT INTO users (id, full_name, email, phone_number, password_hash, role, profile_photo_url, date_of_birth, account_status, email_verified, phone_verified, onboarding_completed, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 1, 1, 1, ?, ?)
  `);

  insertUser.run(
    'usr_aarav',
    'Aarav Shrestha',
    'aarav@kaamsetu.np',
    '+977-9841234567',
    seekerPass,
    'job_seeker',
    '/src/assets/images/avatar_aarav_shrestha_1794931634099.jpg',
    '2002-04-12',
    daysAgo(30),
    now,
  );
  insertUser.run(
    'usr_sita',
    'Sita Gurung',
    'sita@kaamsetu.np',
    '+977-9803456789',
    seekerPass,
    'job_seeker',
    '/src/assets/images/avatar_sita_gurung_1794931634205.jpg',
    '2000-09-21',
    daysAgo(25),
    now,
  );
  insertUser.run(
    'usr_anita',
    'Anita Tamang',
    'anita@kaamsetu.np',
    '+977-9812345678',
    seekerPass,
    'job_seeker',
    '/src/assets/images/avatar_anita_tamang_1794931634607.jpg',
    '2004-01-18',
    daysAgo(14),
    now,
  );
  insertUser.run(
    'usr_bikash',
    'Bikash Thapa',
    'bikash@himalayantech.np',
    '+977-9851098765',
    seekerPass,
    'employer',
    '/src/assets/images/avatar_bikash_thapa_1794931634452.jpg',
    '1993-07-05',
    daysAgo(40),
    now,
  );
  insertUser.run(
    'usr_nabin',
    'Nabin Maharjan',
    'nabin@newakitchen.np',
    '+977-9849876543',
    seekerPass,
    'employer',
    null,
    '1990-11-11',
    daysAgo(18),
    now,
  );
  insertUser.run(
    'usr_admin',
    'Prativa Adhikari',
    'admin@kaamsetu.np',
    '+977-9851100001',
    adminPass,
    'admin',
    null,
    '1991-02-14',
    daysAgo(60),
    now,
  );

  // 4. Job Seeker Profiles
  const insertSeekerProfile = db.prepare(`
    INSERT INTO job_seeker_profiles (
      id, user_id, professional_headline, about, province, district, municipality,
      preferred_location, education_level, years_of_experience, employment_preference,
      availability, expected_min_salary, expected_max_salary, languages_json, profile_completion_percentage
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSeekerProfile.run(
    'jsp_aarav',
    'usr_aarav',
    'Full-Stack React & TypeScript Developer (B.Sc. CSIT)',
    'Computer Science graduate from Patan Multiple Campus building responsive web apps for Nepali fintech and SaaS teams. Passionate about clean TypeScript, accessibility, and fast mobile-first interfaces.',
    'Bagmati Province',
    'Lalitpur',
    'Lalitpur Metropolitan City',
    'Lalitpur / Kathmandu / Remote',
    "Bachelor's",
    2,
    'Full-time',
    'Immediate',
    40000,
    70000,
    JSON.stringify(['Nepali', 'English', 'Newari']),
    95,
  );

  insertSeekerProfile.run(
    'jsp_sita',
    'usr_sita',
    'Brand & UI/UX Graphic Designer · Pokhara & Remote',
    'Visual designer specializing in packaging, event branding, and Figma interface systems for tourism, hospitality, and tech startups across Gandaki and Kathmandu.',
    'Gandaki Province',
    'Kaski',
    'Pokhara Metropolitan City',
    'Pokhara / Remote',
    "Bachelor's",
    3,
    'Freelance',
    'Within 2 weeks',
    35000,
    60000,
    JSON.stringify(['Nepali', 'English', 'Gurung']),
    85,
  );

  insertSeekerProfile.run(
    'jsp_anita',
    'usr_anita',
    'BBS Undergraduate · Data Entry, Tutoring & Content Support',
    'Second-year management student in Bharatpur looking for flexible part-time work, Nepali-English translation, field surveys, and online data entry gigs.',
    'Bagmati Province',
    'Chitwan',
    'Bharatpur Metropolitan City',
    'Chitwan / Remote',
    '+2 / Intermediate',
    1,
    'Part-time',
    'Part-time / Weekends',
    15000,
    25000,
    JSON.stringify(['Nepali', 'English', 'Tamang']),
    75,
  );

  // 5. Employer Profiles
  const insertEmp = db.prepare(`
    INSERT INTO employer_profiles (
      id, user_id, employer_type, organization_name, business_category, contact_person,
      description, website, province, district, municipality, verification_status,
      verification_doc_path, verification_doc_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertEmp.run(
    'emp_bikash',
    'usr_bikash',
    'Company / Startup',
    'Himalayan Tech Labs Pvt. Ltd.',
    'Information Technology',
    'Bikash Thapa',
    'Kathmandu Valley software product studio building digital public infrastructure, SME commerce tools, and cloud platforms for Nepali businesses.',
    'https://himalayantech.example.np',
    'Bagmati Province',
    'Lalitpur',
    'Lalitpur Metropolitan City',
    'verified',
    null,
    'Company_Registration_Sample.pdf',
    daysAgo(40),
  );

  insertEmp.run(
    'emp_nabin',
    'usr_nabin',
    'Small Business',
    'Newa Kitchen & Cafe',
    'Hospitality and Tourism',
    'Nabin Maharjan',
    'Specialty coffee house and heritage Newari dining space in Patan & Thamel hiring reliable part-time staff and creative event freelancers.',
    'https://newakitchen.example.np',
    'Bagmati Province',
    'Kathmandu',
    'Kathmandu Metropolitan City',
    'pending_review',
    docEmpNabin,
    'Newa_Kitchen_PAN_Sample.svg',
    daysAgo(18),
  );

  // 6. Identity Verifications
  db.prepare(`
    INSERT INTO identity_verifications (id, user_id, document_type, document_number_masked, private_storage_path, file_name, mime_type, verification_status, submitted_at, reviewed_at, reviewer_id, consent_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'idv_aarav',
    'usr_aarav',
    'Nepali Citizenship (Nagarikta)',
    'XX-XX-76-00412',
    docAaravId,
    'sample-id-aarav.svg',
    'image/svg+xml',
    'verified',
    daysAgo(28),
    daysAgo(27),
    'usr_admin',
    daysAgo(28),
  );

  db.prepare(`
    INSERT INTO identity_verifications (id, user_id, document_type, document_number_masked, private_storage_path, file_name, mime_type, verification_status, submitted_at, consent_timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?)
  `).run(
    'idv_sita',
    'usr_sita',
    'Nepali Citizenship (Nagarikta)',
    'XX-XX-75-00819',
    docSitaId,
    'sample-id-sita.svg',
    'image/svg+xml',
    daysAgo(2),
    daysAgo(2),
  );

  // 7. Education Records & Academic Documents
  const insertEdu = db.prepare(`
    INSERT INTO education_records (id, user_id, qualification_level, institution_name, board_or_university, completion_year, gpa_or_percentage, verification_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAcadDoc = db.prepare(`
    INSERT INTO academic_documents (id, education_record_id, user_id, title, private_storage_path, document_type, file_name, mime_type, file_size, verification_status, submitted_at, reviewed_at, reviewer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertEdu.run('edu_aarav_see', 'usr_aarav', 'SEE', 'Lalitpur Madhyamik Vidyalaya', 'NEB Nepal', 2019, '3.75 GPA', 'verified', daysAgo(29));
  insertAcadDoc.run('adoc_aarav_see', 'edu_aarav_see', 'usr_aarav', 'SEE Marksheet Certificate', docAaravSee, 'SEE Certificate', 'sample-see-aarav.svg', 'image/svg+xml', 1240, 'verified', daysAgo(28), daysAgo(27), 'usr_admin');

  insertEdu.run('edu_aarav_bsc', 'usr_aarav', "Bachelor's", 'Patan Multiple Campus', 'Tribhuvan University', 2025, '78.4%', 'pending_review', daysAgo(3));
  insertAcadDoc.run('adoc_aarav_bsc', 'edu_aarav_bsc', 'usr_aarav', 'B.Sc. CSIT Final Transcript', docAaravBachelor, "Bachelor's Certificate", 'sample-bsc-aarav.svg', 'image/svg+xml', 1480, 'pending_review', daysAgo(3), null, null);

  insertEdu.run('edu_sita_bfa', 'usr_sita', "Bachelor's", 'Kathmandu University School of Arts', 'Kathmandu University', 2022, '3.68 CGPA', 'verified', daysAgo(22));
  insertEdu.run('edu_anita_see', 'usr_anita', 'SEE', 'Narayani Model Secondary School', 'NEB Nepal', 2021, '3.60 GPA', 'verified', daysAgo(12));
  insertAcadDoc.run('adoc_anita_see', 'edu_anita_see', 'usr_anita', 'SEE Marksheet', docAnitaSee, 'SEE Certificate', 'sample-see-anita.svg', 'image/svg+xml', 1120, 'verified', daysAgo(12), daysAgo(11), 'usr_admin');

  // 8. User Skills
  const insertUS = db.prepare('INSERT INTO user_skills (id, user_id, skill_id, proficiency_level, years_experience) VALUES (?, ?, ?, ?, ?)');
  const userSkillsData: Array<[string, string, string, string, number]> = [
    ['us_1', 'usr_aarav', 'sk_react', 'Advanced', 2],
    ['us_2', 'usr_aarav', 'sk_ts', 'Advanced', 2],
    ['us_3', 'usr_aarav', 'sk_node', 'Intermediate', 2],
    ['us_4', 'usr_aarav', 'sk_tailwind', 'Expert', 2],
    ['us_5', 'usr_aarav', 'sk_sql', 'Intermediate', 1],
    ['us_6', 'usr_sita', 'sk_figma', 'Expert', 3],
    ['us_7', 'usr_sita', 'sk_illustrator', 'Advanced', 3],
    ['us_8', 'usr_sita', 'sk_photoshop', 'Advanced', 3],
    ['us_9', 'usr_sita', 'sk_branding', 'Expert', 3],
    ['us_10', 'usr_anita', 'sk_data', 'Advanced', 1],
    ['us_11', 'usr_anita', 'sk_excel', 'Intermediate', 1],
    ['us_12', 'usr_anita', 'sk_translation', 'Advanced', 1],
    ['us_13', 'usr_anita', 'sk_content', 'Intermediate', 1],
  ];
  for (const us of userSkillsData) insertUS.run(...us);

  // 9. Work Experience & Portfolios
  db.prepare(`
    INSERT INTO work_experiences (id, user_id, company_name, job_title, description, start_date, end_date, currently_working)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('exp_1', 'usr_aarav', 'Sajilo Digital Pvt. Ltd.', 'Junior Frontend Developer', 'Built merchant onboarding flows and responsive Nepali-language dashboards with React and TypeScript.', '2024-05-01', '2026-06-30', 0);

  db.prepare(`
    INSERT INTO portfolios (id, user_id, title, description, project_url, image_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('port_1', 'usr_aarav', 'HamroYatra Bus Booking UI', 'Accessible seat-selection web app supporting Nepali & English route search across 40+ districts.', 'https://github.com/example/hamroyatra', null, daysAgo(15));

  db.prepare(`
    INSERT INTO portfolios (id, user_id, title, description, project_url, image_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('port_2', 'usr_sita', 'Annapurna Roasters Packaging System', 'Complete brand identity, bilingual packaging, and social kit for a Pokhara specialty coffee roaster.', 'https://behance.net/example/annapurna', null, daysAgo(10));

  // 10. Jobs (8 realistic listings across Nepal)
  const insertJob = db.prepare(`
    INSERT INTO jobs (
      id, employer_id, title, category_id, description, responsibilities, benefits,
      employment_type, required_education, minimum_experience, salary_min, salary_max,
      payment_frequency, currency, province, district, municipality, work_mode, vacancies,
      required_verification_level, application_deadline, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NPR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertJobSkill = db.prepare('INSERT INTO job_required_skills (id, job_id, skill_id, importance) VALUES (?, ?, ?, ?)');

  const jobsData = [
    {
      id: 'job_frontend',
      emp: 'usr_bikash',
      title: 'Frontend Developer (React & TypeScript)',
      cat: 'cat_it',
      desc: 'Join Himalayan Tech Labs in Jhamsikhel to build modern SaaS dashboards and public-service portals tailored for Nepali teams.',
      resp: 'Develop accessible React + TypeScript interfaces, collaborate with backend API engineers, and optimize performance for mid-range Android devices.',
      benefits: 'SSF contribution, festival bonus (Dashain), flexible hybrid hours, health insurance.',
      type: 'Full-time',
      edu: "Bachelor's",
      exp: 1,
      sMin: 45000,
      sMax: 75000,
      freq: 'Monthly',
      prov: 'Bagmati Province',
      dist: 'Lalitpur',
      muni: 'Lalitpur Metropolitan City',
      mode: 'Hybrid',
      vac: 2,
      ver: 'Identity Verified',
      deadline: daysAhead(25),
      status: 'Active',
      skills: ['sk_react', 'sk_ts', 'sk_tailwind'],
      created: daysAgo(2),
    },
    {
      id: 'job_fullstack',
      emp: 'usr_bikash',
      title: 'Full-Stack Software Engineer (Node.js & SQL)',
      cat: 'cat_it',
      desc: 'Architect reliable REST APIs and relational schemas for Nepali SME inventory and billing tools.',
      resp: 'Design SQL schemas, write TypeScript backend services, review pull requests, and support production deployments.',
      benefits: 'Competitive salary, learning allowance, 5-day work week.',
      type: 'Full-time',
      edu: "Bachelor's",
      exp: 2,
      sMin: 60000,
      sMax: 95000,
      freq: 'Monthly',
      prov: 'Bagmati Province',
      dist: 'Lalitpur',
      muni: 'Lalitpur Metropolitan City',
      mode: 'On-site',
      vac: 1,
      ver: 'Identity & Education Verified',
      deadline: daysAhead(30),
      status: 'Active',
      skills: ['sk_react', 'sk_ts', 'sk_node', 'sk_sql'],
      created: daysAgo(4),
    },
    {
      id: 'job_uiux',
      emp: 'usr_bikash',
      title: 'Product & Brand Designer (Figma)',
      cat: 'cat_design',
      desc: 'Create intuitive bilingual web/mobile interfaces and crisp brand visuals for growing startups across Nepal.',
      resp: 'Build design systems in Figma, conduct user interviews in Kathmandu & Pokhara, and hand off clean component specs.',
      benefits: 'Remote-friendly across Nepal, annual hardware stipend.',
      type: 'Freelance',
      edu: "Bachelor's",
      exp: 2,
      sMin: 40000,
      sMax: 65000,
      freq: 'Monthly',
      prov: 'Bagmati Province',
      dist: 'Kathmandu',
      muni: 'Kathmandu Metropolitan City',
      mode: 'Remote',
      vac: 1,
      ver: 'Any',
      deadline: daysAhead(20),
      status: 'Active',
      skills: ['sk_figma', 'sk_branding', 'sk_illustrator'],
      created: daysAgo(5),
    },
    {
      id: 'job_barista',
      emp: 'usr_nabin',
      title: 'Part-Time Barista & Cafe Floor Associate',
      cat: 'cat_hospitality',
      desc: 'Morning and weekend barista & customer service role ideal for college students in Kathmandu Valley.',
      resp: 'Prepare espresso and traditional drinks, greet guests warmly, and maintain a spotless counter.',
      benefits: 'Paid training, staff meals, flexible exam-week shifts.',
      type: 'Part-time',
      edu: '+2 / Intermediate',
      exp: 0,
      sMin: 16000,
      sMax: 22000,
      freq: 'Monthly',
      prov: 'Bagmati Province',
      dist: 'Kathmandu',
      muni: 'Kathmandu Metropolitan City',
      mode: 'On-site',
      vac: 2,
      ver: 'Any',
      deadline: daysAhead(18),
      status: 'Active',
      skills: ['sk_barista', 'sk_service'],
      created: daysAgo(3),
    },
    {
      id: 'job_accountant',
      emp: 'usr_nabin',
      title: 'Junior Accountant (Tally & VAT Filing)',
      cat: 'cat_finance',
      desc: 'Manage daily ledger entries, supplier invoices, and monthly IRD VAT returns for our growing hospitality outlets.',
      resp: 'Maintain Tally Prime accounts, reconcile eSewa/Fonepay settlements, and prepare monthly cashflow summaries.',
      benefits: 'Festival bonus, lunch provided, career mentorship.',
      type: 'Full-time',
      edu: "Bachelor's",
      exp: 1,
      sMin: 28000,
      sMax: 38000,
      freq: 'Monthly',
      prov: 'Bagmati Province',
      dist: 'Lalitpur',
      muni: 'Lalitpur Metropolitan City',
      mode: 'On-site',
      vac: 1,
      ver: 'Identity Verified',
      deadline: daysAhead(22),
      status: 'Active',
      skills: ['sk_tally', 'sk_excel', 'sk_tax'],
      created: daysAgo(6),
    },
    {
      id: 'job_marketing_intern',
      emp: 'usr_bikash',
      title: 'Digital Marketing & Content Intern',
      cat: 'cat_marketing',
      desc: 'Paid 6-month internship for recent graduates or final-year students passionate about Nepali digital storytelling.',
      resp: 'Draft social media campaigns, assist with SEO blog articles in English & Nepali, and track engagement.',
      benefits: 'Stipend रु 18,000/month, direct mentorship, full-time conversion path.',
      type: 'Internship',
      edu: '+2 / Intermediate',
      exp: 0,
      sMin: 18000,
      sMax: 22000,
      freq: 'Monthly',
      prov: 'Bagmati Province',
      dist: 'Kathmandu',
      muni: 'Kathmandu Metropolitan City',
      mode: 'Hybrid',
      vac: 2,
      ver: 'Any',
      deadline: daysAhead(15),
      status: 'Active',
      skills: ['sk_social', 'sk_content', 'sk_seo'],
      created: daysAgo(1),
    },
    {
      id: 'job_civil_pokhara',
      emp: 'usr_bikash',
      title: 'Site Civil Engineer (Pokhara Tourism Project)',
      cat: 'cat_engineering',
      desc: 'Supervise eco-lodge structural execution and AutoCAD shop drawings in Kaski district.',
      resp: 'Daily site quality inspection, contractor coordination, BOQ tracking.',
      benefits: 'Accommodation support, travel allowance, insurance.',
      type: 'Contract',
      edu: "Bachelor's",
      exp: 2,
      sMin: 48000,
      sMax: 65000,
      freq: 'Monthly',
      prov: 'Gandaki Province',
      dist: 'Kaski',
      muni: 'Pokhara Metropolitan City',
      mode: 'On-site',
      vac: 1,
      ver: 'Identity & Education Verified',
      deadline: daysAhead(28),
      status: 'Active',
      skills: ['sk_autocad', 'sk_civil'],
      created: daysAgo(7),
    },
    {
      id: 'job_pending_mod',
      emp: 'usr_nabin',
      title: 'Kitchen Inventory Coordinator (Pending Review)',
      cat: 'cat_admin',
      desc: 'Manage stock sheets and vendor coordination across central kitchen operations.',
      resp: 'Update Excel inventory sheets daily and coordinate local deliveries.',
      benefits: 'Staff meals, weekly off.',
      type: 'Full-time',
      edu: 'SEE',
      exp: 0,
      sMin: 20000,
      sMax: 26000,
      freq: 'Monthly',
      prov: 'Bagmati Province',
      dist: 'Kathmandu',
      muni: 'Kathmandu Metropolitan City',
      mode: 'On-site',
      vac: 1,
      ver: 'Any',
      deadline: daysAhead(14),
      status: 'Pending Approval',
      skills: ['sk_data', 'sk_excel'],
      created: daysAgo(1),
    },
  ];

  for (const j of jobsData) {
    insertJob.run(
      j.id,
      j.emp,
      j.title,
      j.cat,
      j.desc,
      j.resp,
      j.benefits,
      j.type,
      j.edu,
      j.exp,
      j.sMin,
      j.sMax,
      j.freq,
      j.prov,
      j.dist,
      j.muni,
      j.mode,
      j.vac,
      j.ver,
      j.deadline,
      j.status,
      j.created,
      j.created,
    );
    j.skills.forEach((skId, idx) => {
      insertJobSkill.run(`jrs_${j.id}_${idx}`, j.id, skId, 'Required');
    });
  }

  // 11. Micro-Tasks (6 local & online gigs)
  const insertTask = db.prepare(`
    INSERT INTO micro_tasks (
      id, employer_id, title, description, category, payment_amount, currency,
      estimated_duration, location_type, province, district, municipality,
      workers_required, required_skills_json, urgency, deadline, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'NPR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTask.run(
    'task_photo',
    'usr_nabin',
    'Event Photography for Heritage Food Festival (Patan)',
    'Need a reliable photographer for a 4-hour evening cultural food showcase in Patan Durbar area. Deliver 60 color-graded photos within 48 hours.',
    'Event-Based Tasks',
    6500,
    '4 hours',
    'Local',
    'Bagmati Province',
    'Lalitpur',
    'Lalitpur Metropolitan City',
    1,
    JSON.stringify(['Event Photography', 'Adobe Photoshop']),
    'Urgent',
    daysAhead(5),
    'Open',
    daysAgo(1),
  );

  insertTask.run(
    'task_poster',
    'usr_nabin',
    'Design Bilingual Menu Poster & Social Promo Pack',
    'Create 3 print-ready A3 posters and 5 Instagram story slides for our winter seasonal menu in Nepali & English.',
    'Creative Tasks',
    4500,
    '2 days',
    'Online',
    'Bagmati Province',
    'Kathmandu',
    'Kathmandu Metropolitan City',
    1,
    JSON.stringify(['Figma', 'Adobe Illustrator', 'Brand Identity']),
    'Normal',
    daysAhead(7),
    'Open',
    daysAgo(2),
  );

  insertTask.run(
    'task_data_entry',
    'usr_bikash',
    'Digitize 350 SME Survey Forms into Structured Spreadsheet',
    'Accurate data entry of scanned Nepali/English municipality business registration sheets into a clean Excel template.',
    'Online Tasks',
    3800,
    '1-2 days',
    'Online',
    'Bagmati Province',
    'Lalitpur',
    'Lalitpur Metropolitan City',
    2,
    JSON.stringify(['Data Entry', 'Microsoft Excel', 'Nepali-English Translation']),
    'Normal',
    daysAhead(6),
    'Open',
    daysAgo(1),
  );

  insertTask.run(
    'task_courier',
    'usr_bikash',
    'Deliver Signed Contract Packet Across 4 Kathmandu Offices',
    'Pick up sealed legal documents from Jhamsikhel and deliver to Baneshwor, Lazimpat, and Naxal with signed acknowledgment.',
    'Local Tasks',
    1200,
    '3 hours',
    'Local',
    'Bagmati Province',
    'Kathmandu',
    'Kathmandu Metropolitan City',
    1,
    JSON.stringify(['Local Courier & Logistics']),
    'Urgent',
    daysAhead(2),
    'Open',
    daysAgo(0),
  );

  insertTask.run(
    'task_video',
    'usr_bikash',
    'Short-Form Product Walkthrough Video Editing (60 sec)',
    'Edit raw screen recordings and voiceover into a crisp 60-second launch reel with Nepali & English subtitles.',
    'Creative Tasks',
    5000,
    '2 days',
    'Online',
    'Bagmati Province',
    'Lalitpur',
    'Lalitpur Metropolitan City',
    1,
    JSON.stringify(['Video Editing']),
    'Normal',
    daysAhead(9),
    'Assigned',
    daysAgo(4),
  );

  insertTask.run(
    'task_completed_sample',
    'usr_nabin',
    'Translate Cafe Onboarding Booklet to Nepali Unicode',
    'Completed translation of 12-page staff hygiene and hospitality handbook into clear Nepali.',
    'Educational Tasks',
    3200,
    '1 day',
    'Online',
    'Bagmati Province',
    'Kathmandu',
    'Kathmandu Metropolitan City',
    1,
    JSON.stringify(['Nepali-English Translation']),
    'Normal',
    daysAgo(2),
    'Completed',
    daysAgo(8),
  );

  // Task Applications & Assignments
  db.prepare(`
    INSERT INTO task_applications (id, task_id, applicant_id, message, status, applied_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('ta_1', 'task_video', 'usr_sita', 'I can edit crisp bilingual subtitles and motion callouts in 48 hours.', 'Selected', daysAgo(3));

  db.prepare(`
    INSERT INTO task_applications (id, task_id, applicant_id, message, status, applied_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('ta_2', 'task_completed_sample', 'usr_anita', 'Native Nepali speaker with BBS translation experience.', 'Selected', daysAgo(7));

  db.prepare(`
    INSERT INTO task_applications (id, task_id, applicant_id, message, status, applied_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('ta_3', 'task_data_entry', 'usr_anita', 'I have strong typing speed in both English and Devanagari Unicode.', 'Interested', daysAgo(1));

  db.prepare(`
    INSERT INTO task_assignments (id, task_id, worker_id, employer_id, assigned_at, started_at, completed_at, completion_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('tassign_1', 'task_video', 'usr_sita', 'usr_bikash', daysAgo(3), daysAgo(2), null, 'In Progress');

  db.prepare(`
    INSERT INTO task_assignments (id, task_id, worker_id, employer_id, assigned_at, started_at, completed_at, completion_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('tassign_2', 'task_completed_sample', 'usr_anita', 'usr_nabin', daysAgo(7), daysAgo(6), daysAgo(5), 'Completed');

  // 12. Job Applications & Saved Jobs
  db.prepare(`
    INSERT INTO job_applications (id, job_id, applicant_id, cover_message, resume_reference, status, status_history_json, applied_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'app_1',
    'job_frontend',
    'usr_aarav',
    'I have 2 years of React + TypeScript experience building accessible bilingual interfaces and would love to contribute to Himalayan Tech Labs.',
    'kaamsetu://profile/usr_aarav',
    'Shortlisted',
    JSON.stringify([
      { status: 'New', changedAt: daysAgo(2) },
      { status: 'Shortlisted', changedAt: daysAgo(1), note: 'Strong TypeScript portfolio match' },
    ]),
    daysAgo(2),
    daysAgo(1),
  );

  db.prepare(`
    INSERT INTO job_applications (id, job_id, applicant_id, cover_message, resume_reference, status, status_history_json, applied_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'app_2',
    'job_uiux',
    'usr_sita',
    'Attached my Pokhara & Kathmandu branding portfolio. Experienced in Figma design systems.',
    'kaamsetu://profile/usr_sita',
    'New',
    JSON.stringify([{ status: 'New', changedAt: daysAgo(1) }]),
    daysAgo(1),
    daysAgo(1),
  );

  db.prepare(`
    INSERT INTO job_applications (id, job_id, applicant_id, cover_message, resume_reference, status, status_history_json, applied_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'app_3',
    'job_marketing_intern',
    'usr_anita',
    'Eager to apply my bilingual Nepali/English writing skills to digital campaigns.',
    'kaamsetu://profile/usr_anita',
    'Under Review',
    JSON.stringify([
      { status: 'New', changedAt: daysAgo(1) },
      { status: 'Under Review', changedAt: daysAgo(0) },
    ]),
    daysAgo(1),
    daysAgo(0),
  );

  db.prepare('INSERT INTO saved_jobs (id, user_id, job_id, created_at) VALUES (?, ?, ?, ?)').run(
    'sav_1',
    'usr_aarav',
    'job_fullstack',
    daysAgo(1),
  );

  // 13. Conversations & Messages
  db.prepare('INSERT INTO conversations (id, context_title, created_at) VALUES (?, ?, ?)').run(
    'conv_1',
    'Frontend Developer (React & TypeScript)',
    daysAgo(1),
  );
  db.prepare('INSERT INTO conversation_participants (id, conversation_id, user_id) VALUES (?, ?, ?)').run('cp_1', 'conv_1', 'usr_bikash');
  db.prepare('INSERT INTO conversation_participants (id, conversation_id, user_id) VALUES (?, ?, ?)').run('cp_2', 'conv_1', 'usr_aarav');

  db.prepare('INSERT INTO messages (id, conversation_id, sender_id, message_text, read_at, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    'msg_1',
    'conv_1',
    'usr_bikash',
    'Namaste Aarav! We reviewed your verified profile and shortlisted you for the Frontend Developer role. Are you available for a 20-min technical chat on Thursday?',
    daysAgo(1),
    daysAgo(1),
  );
  db.prepare('INSERT INTO messages (id, conversation_id, sender_id, message_text, read_at, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    'msg_2',
    'conv_1',
    'usr_aarav',
    'Namaste Bikash ji! Thank you for shortlisting my profile. Thursday morning or afternoon works well for me.',
    null,
    daysAgo(0),
  );

  // 14. Notifications
  const insertNotif = db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, notification_type, reference_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertNotif.run('not_1', 'usr_aarav', 'Application Shortlisted', 'Himalayan Tech Labs shortlisted your application for Frontend Developer (React & TypeScript).', 'application_status', 'job_frontend', 0, daysAgo(1));
  insertNotif.run('not_2', 'usr_aarav', 'Identity Verification Approved', 'Your Nepali Citizenship verification has been approved by KaamSetu reviewers.', 'verification', 'idv_aarav', 1, daysAgo(27));
  insertNotif.run('not_3', 'usr_aarav', 'New Message from Bikash Thapa', 'You received a message regarding Frontend Developer.', 'message', 'conv_1', 0, daysAgo(1));
  insertNotif.run('not_4', 'usr_bikash', 'New Application Received', 'Sita Gurung applied for Product & Brand Designer (Figma).', 'application_received', 'job_uiux', 0, daysAgo(1));
  insertNotif.run('not_5', 'usr_sita', 'Task Assigned', 'You were selected for Short-Form Product Walkthrough Video Editing.', 'task_update', 'task_video', 0, daysAgo(3));

  // 15. Reviews, Sample Reports & Audit Logs
  db.prepare(`
    INSERT INTO reviews (id, reviewer_id, reviewed_user_id, task_id, rating, review_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('rev_1', 'usr_nabin', 'usr_anita', 'task_completed_sample', 5, 'Clear, accurate Nepali translation delivered ahead of schedule. Very reliable.', daysAgo(4));

  db.prepare(`
    INSERT INTO reports (id, reporter_id, job_id, target_title, reason, description, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('rep_1', 'usr_aarav', 'job_pending_mod', 'Kitchen Inventory Coordinator (Pending Review)', 'Incomplete location details', 'Sample moderation test report: verify work hours and exact ward address before publishing.', 'Open', daysAgo(1));

  db.prepare(`
    INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'aud_1',
    'usr_admin',
    'APPROVE_IDENTITY_VERIFICATION',
    'identity_verification',
    'idv_aarav',
    JSON.stringify({ decision: 'verified', note: 'Clear document match' }),
    daysAgo(27),
  );
  db.prepare(`
    INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'aud_2',
    'usr_admin',
    'APPROVE_ACADEMIC_DOCUMENT',
    'academic_document',
    'adoc_aarav_see',
    JSON.stringify({ decision: 'verified', qualification: 'SEE' }),
    daysAgo(27),
  );
}
