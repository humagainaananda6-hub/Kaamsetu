export type UserRole = 'job_seeker' | 'employer' | 'admin';
export type AccountStatus = 'active' | 'suspended' | 'pending';
export type VerificationStatus =
  | 'not_submitted'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'requires_resubmission';

export type EducationLevel =
  | 'SEE'
  | '+2 / Intermediate'
  | 'Diploma / Vocational'
  | "Bachelor's"
  | "Master's"
  | 'PhD / Doctorate';

export type EmploymentType =
  | 'Full-time'
  | 'Part-time'
  | 'Internship'
  | 'Freelance'
  | 'Contract';

export type WorkMode = 'On-site' | 'Remote' | 'Hybrid';

export type ApplicationStatus =
  | 'New'
  | 'Under Review'
  | 'Shortlisted'
  | 'Interview'
  | 'Selected'
  | 'Rejected';

export type TaskStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Open'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'Disputed';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  role: UserRole;
  profilePhotoUrl: string | null;
  dateOfBirth: string | null;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSkill {
  id: string;
  skillId: string;
  skillName: string;
  categoryId: string;
  proficiencyLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  yearsExperience: number;
}

export interface EducationRecord {
  id: string;
  userId: string;
  qualificationLevel: EducationLevel;
  institutionName: string;
  boardOrUniversity: string;
  completionYear: number;
  gpaOrPercentage: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
  document?: AcademicDocument | null;
}

export interface AcademicDocument {
  id: string;
  educationRecordId: string;
  userId: string;
  title: string;
  documentType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  verificationStatus: VerificationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewerId: string | null;
  rejectionReason: string | null;
}

export interface IdentityVerification {
  id: string;
  userId: string;
  documentType: 'Nepali Citizenship (Nagarikta)' | 'National ID (Rastriya Parichaya Patra)' | 'Passport';
  documentNumberMasked: string;
  fileName: string;
  mimeType: string;
  verificationStatus: VerificationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewerId: string | null;
  rejectionReason: string | null;
  consentTimestamp: string;
}

export interface PortfolioItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  projectUrl: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface WorkExperience {
  id: string;
  userId: string;
  companyName: string;
  jobTitle: string;
  description: string;
  startDate: string;
  endDate: string | null;
  currentlyWorking: boolean;
}

export interface JobSeekerProfile {
  id: string;
  userId: string;
  professionalHeadline: string;
  about: string;
  province: string;
  district: string;
  municipality: string;
  preferredLocation: string;
  educationLevel: EducationLevel;
  yearsOfExperience: number;
  employmentPreference: EmploymentType;
  availability: 'Immediate' | 'Within 2 weeks' | 'Within 1 month' | 'Part-time / Weekends';
  expectedMinSalary: number;
  expectedMaxSalary: number;
  languages: string[];
  profileCompletionPercentage: number;
}

export interface EmployerProfile {
  id: string;
  userId: string;
  employerType: 'Company / Startup' | 'Agency / Organization' | 'Small Business' | 'Individual';
  organizationName: string;
  businessCategory: string;
  contactPerson: string;
  description: string;
  website: string | null;
  province: string;
  district: string;
  municipality: string;
  verificationStatus: VerificationStatus;
  verificationDocName: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface MatchBreakdownItem {
  factor: string;
  weight: number;
  score: number;
  weightedContribution: number;
  reason: string;
}

export interface MatchResult {
  score: number;
  tier: 'Excellent Match' | 'Strong Match' | 'Potential Match' | 'Lower Match';
  reasons: string[];
  breakdown: MatchBreakdownItem[];
}

export interface Job {
  id: string;
  employerId: string;
  organizationName: string;
  employerVerified: boolean;
  employerType: string;
  title: string;
  categoryId: string;
  categoryName: string;
  description: string;
  responsibilities: string;
  benefits: string;
  employmentType: EmploymentType;
  requiredEducation: EducationLevel;
  minimumExperience: number;
  salaryMin: number;
  salaryMax: number;
  paymentFrequency: 'Monthly' | 'Weekly' | 'Project-based';
  currency: 'NPR';
  province: string;
  district: string;
  municipality: string;
  workMode: WorkMode;
  vacancies: number;
  requiredVerificationLevel: 'Any' | 'Identity Verified' | 'Identity & Education Verified';
  applicationDeadline: string;
  status: 'Draft' | 'Pending Approval' | 'Active' | 'Paused' | 'Filled' | 'Rejected';
  requiredSkills: string[];
  createdAt: string;
  updatedAt: string;
  match?: MatchResult;
  hasApplied?: boolean;
  isSaved?: boolean;
  applicantCount?: number;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle?: string;
  organizationName?: string;
  applicantId: string;
  applicantName?: string;
  applicantEmail?: string;
  applicantHeadline?: string;
  applicantPhotoUrl?: string | null;
  applicantLocation?: string;
  applicantIdentityVerified?: boolean;
  applicantEducationVerified?: boolean;
  coverMessage: string;
  resumeReference: string | null;
  status: ApplicationStatus;
  matchScore?: number;
  appliedAt: string;
  updatedAt: string;
  statusHistory?: Array<{ status: ApplicationStatus; changedAt: string; note?: string }>;
}

export interface MicroTask {
  id: string;
  employerId: string;
  posterName: string;
  posterVerified: boolean;
  title: string;
  description: string;
  category: string;
  paymentAmount: number;
  currency: 'NPR';
  estimatedDuration: string;
  locationType: 'Local' | 'Online';
  province: string;
  district: string;
  municipality: string;
  workersRequired: number;
  requiredSkills: string[];
  urgency: 'Normal' | 'Urgent';
  deadline: string;
  status: TaskStatus;
  createdAt: string;
  hasExpressedInterest?: boolean;
  interestedCount?: number;
  assignedWorkerId?: string | null;
  assignedWorkerName?: string | null;
}

export interface TaskApplication {
  id: string;
  taskId: string;
  applicantId: string;
  applicantName: string;
  applicantHeadline: string;
  applicantPhotoUrl: string | null;
  applicantVerified: boolean;
  message: string;
  status: 'Interested' | 'Selected' | 'Declined';
  appliedAt: string;
}

export interface CandidateSummary {
  userId: string;
  fullName: string;
  profilePhotoUrl: string | null;
  professionalHeadline: string;
  province: string;
  district: string;
  municipality: string;
  educationLevel: EducationLevel;
  yearsOfExperience: number;
  employmentPreference: EmploymentType;
  availability: string;
  skills: string[];
  identityVerified: boolean;
  educationVerified: boolean;
  verifiedQualifications: string[];
  portfolioCount: number;
  isShortlisted?: boolean;
  matchScore?: number;
}

export interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserRole: UserRole;
  otherUserPhotoUrl: string | null;
  otherUserVerified: boolean;
  contextTitle: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  messageText: string;
  attachmentReference: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  notificationType:
    | 'job_match'
    | 'task_match'
    | 'application_received'
    | 'application_status'
    | 'message'
    | 'verification'
    | 'task_update';
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ReviewItem {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewedUserId: string;
  taskId: string | null;
  jobId: string | null;
  rating: number;
  reviewText: string;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string | null;
  jobId: string | null;
  taskId: string | null;
  targetTitle: string;
  reason: string;
  description: string;
  status: 'Open' | 'Under Review' | 'Resolved' | 'Dismissed';
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  nameNe: string;
  type: 'job' | 'gig';
}

export interface SkillItem {
  id: string;
  skillName: string;
  categoryId: string;
}
