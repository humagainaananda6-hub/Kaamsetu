import type {
  EducationLevel,
  EmploymentType,
  Job,
  JobSeekerProfile,
  MatchBreakdownItem,
  MatchResult,
  WorkMode,
} from '../types';

export interface MatchingWeights {
  skills: number;
  education: number;
  experience: number;
  location: number;
  preference: number;
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  skills: 0.35,
  education: 0.25,
  experience: 0.15,
  location: 0.15,
  preference: 0.1,
};

const EDUCATION_RANK: Record<EducationLevel, number> = {
  SEE: 1,
  '+2 / Intermediate': 2,
  'Diploma / Vocational': 3,
  "Bachelor's": 4,
  "Master's": 5,
  'PhD / Doctorate': 6,
};

export interface CandidateMatchInput {
  skills: string[];
  educationLevel: EducationLevel;
  yearsOfExperience: number;
  province: string;
  district: string;
  preferredLocation: string;
  employmentPreference: EmploymentType;
  availability: JobSeekerProfile['availability'];
}

export interface JobMatchInput {
  requiredSkills: string[];
  requiredEducation: EducationLevel;
  minimumExperience: number;
  province: string;
  district: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
}

export function getMatchTier(score: number): MatchResult['tier'] {
  if (score >= 90) return 'Excellent Match';
  if (score >= 75) return 'Strong Match';
  if (score >= 50) return 'Potential Match';
  return 'Lower Match';
}

export function calculateJobMatch(
  candidate: CandidateMatchInput,
  job: JobMatchInput,
  weights: MatchingWeights = DEFAULT_MATCHING_WEIGHTS,
): MatchResult {
  // 1. Skills compatibility (0-100)
  const candSkillsLower = new Set(candidate.skills.map((s) => s.trim().toLowerCase()));
  const reqSkills = job.requiredSkills.map((s) => s.trim()).filter(Boolean);
  let skillsScore = 100;
  let skillsReason = 'No specific skills required';

  if (reqSkills.length > 0) {
    const matched = reqSkills.filter((s) => candSkillsLower.has(s.toLowerCase()));
    const missing = reqSkills.filter((s) => !candSkillsLower.has(s.toLowerCase()));
    skillsScore = Math.round((matched.length / reqSkills.length) * 100);
    if (matched.length === reqSkills.length) {
      skillsReason = `Matches all ${reqSkills.length} required skills (${matched.join(', ')})`;
    } else if (matched.length > 0) {
      skillsReason = `Matches ${matched.length}/${reqSkills.length} skills (${matched.join(', ')}); gap: ${missing.join(', ')}`;
    } else {
      skillsReason = `Missing listed skills (${missing.slice(0, 3).join(', ')})`;
    }
  }

  // 2. Education compatibility (0-100)
  const candEduRank = EDUCATION_RANK[candidate.educationLevel] ?? 1;
  const reqEduRank = EDUCATION_RANK[job.requiredEducation] ?? 1;
  let eduScore = 100;
  let eduReason = `Meets ${job.requiredEducation} requirement`;
  if (candEduRank < reqEduRank) {
    const diff = reqEduRank - candEduRank;
    eduScore = Math.max(20, 100 - diff * 30);
    eduReason = `Listed ${candidate.educationLevel} vs required ${job.requiredEducation}`;
  } else if (candEduRank > reqEduRank) {
    eduReason = `Exceeds ${job.requiredEducation} requirement (${candidate.educationLevel})`;
  }

  // 3. Experience compatibility (0-100)
  let expScore = 100;
  let expReason = `Meets ${job.minimumExperience}+ yrs experience requirement`;
  if (job.minimumExperience > 0) {
    if (candidate.yearsOfExperience >= job.minimumExperience) {
      expScore = 100;
    } else {
      expScore = Math.max(25, Math.round((candidate.yearsOfExperience / job.minimumExperience) * 100));
      expReason = `${candidate.yearsOfExperience} yrs vs ${job.minimumExperience} yrs requested`;
    }
  } else {
    expReason = 'Entry-level friendly (0 yrs required)';
  }

  // 4. Location compatibility (0-100)
  let locScore = 50;
  let locReason = `${job.district}, ${job.province}`;
  if (job.workMode === 'Remote') {
    locScore = 100;
    locReason = 'Remote role — accessible across Nepal';
  } else if (
    candidate.district.toLowerCase() === job.district.toLowerCase() ||
    candidate.preferredLocation.toLowerCase().includes(job.district.toLowerCase())
  ) {
    locScore = 100;
    locReason = `Same district match (${job.district})`;
  } else if (
    candidate.province.toLowerCase() === job.province.toLowerCase() ||
    candidate.preferredLocation.toLowerCase().includes(job.province.toLowerCase())
  ) {
    locScore = 75;
    locReason = `Same province (${job.province})`;
  } else {
    locScore = 35;
    locReason = `Different province (${job.district} vs ${candidate.district})`;
  }

  // 5. Employment preference & availability (0-100)
  let prefScore = 60;
  let prefReason = `Seeking ${candidate.employmentPreference}`;
  if (candidate.employmentPreference === job.employmentType) {
    prefScore = candidate.availability === 'Immediate' ? 100 : 90;
    prefReason = `Matches ${job.employmentType} preference (${candidate.availability})`;
  } else if (
    (candidate.employmentPreference === 'Full-time' && job.employmentType === 'Contract') ||
    (candidate.employmentPreference === 'Freelance' && job.employmentType === 'Part-time')
  ) {
    prefScore = 75;
    prefReason = `Compatible schedule (${candidate.employmentPreference} / ${job.employmentType})`;
  }

  const breakdown: MatchBreakdownItem[] = [
    {
      factor: 'Skills Compatibility',
      weight: Math.round(weights.skills * 100),
      score: skillsScore,
      weightedContribution: skillsScore * weights.skills,
      reason: skillsReason,
    },
    {
      factor: 'Education Level',
      weight: Math.round(weights.education * 100),
      score: eduScore,
      weightedContribution: eduScore * weights.education,
      reason: eduReason,
    },
    {
      factor: 'Experience',
      weight: Math.round(weights.experience * 100),
      score: expScore,
      weightedContribution: expScore * weights.experience,
      reason: expReason,
    },
    {
      factor: 'Location & Work Mode',
      weight: Math.round(weights.location * 100),
      score: locScore,
      weightedContribution: locScore * weights.location,
      reason: locReason,
    },
    {
      factor: 'Employment & Availability',
      weight: Math.round(weights.preference * 100),
      score: prefScore,
      weightedContribution: prefScore * weights.preference,
      reason: prefReason,
    },
  ];

  const rawScore = breakdown.reduce((acc, item) => acc + item.weightedContribution, 0);
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    score,
    tier: getMatchTier(score),
    reasons: breakdown.map((b) => b.reason),
    breakdown,
  };
}

export function calculateProfileCompletion(input: {
  hasPhoto: boolean;
  hasHeadline: boolean;
  hasAbout: boolean;
  hasLocation: boolean;
  skillsCount: number;
  educationCount: number;
  experienceCount: number;
  portfolioCount: number;
  identitySubmitted: boolean;
  academicDocSubmitted: boolean;
}): { percentage: number; suggestions: string[] } {
  const checks: Array<{ ok: boolean; weight: number; suggestion: string }> = [
    { ok: input.hasPhoto, weight: 10, suggestion: 'Add a clear profile photograph' },
    { ok: input.hasHeadline, weight: 10, suggestion: 'Write a concise professional headline' },
    { ok: input.hasAbout, weight: 10, suggestion: 'Complete your About Me summary' },
    { ok: input.hasLocation, weight: 10, suggestion: 'Set your province, district, and municipality' },
    { ok: input.skillsCount >= 3, weight: 15, suggestion: 'Add at least 3 skills to boost match accuracy' },
    { ok: input.educationCount >= 1, weight: 15, suggestion: 'Add your academic qualification history' },
    { ok: input.academicDocSubmitted, weight: 10, suggestion: 'Upload an academic certificate to the Certificate Vault' },
    { ok: input.identitySubmitted, weight: 10, suggestion: 'Submit identity verification for a verified trust badge' },
    { ok: input.experienceCount >= 1 || input.portfolioCount >= 1, weight: 10, suggestion: 'Add work experience or a portfolio project' },
  ];

  const percentage = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
  const suggestions = checks.filter((c) => !c.ok).map((c) => c.suggestion);
  return { percentage, suggestions };
}

export function attachMatchToJob(job: Job, candidate?: CandidateMatchInput | null): Job {
  if (!candidate) return job;
  return {
    ...job,
    match: calculateJobMatch(candidate, {
      requiredSkills: job.requiredSkills,
      requiredEducation: job.requiredEducation,
      minimumExperience: job.minimumExperience,
      province: job.province,
      district: job.district,
      workMode: job.workMode,
      employmentType: job.employmentType,
    }),
  };
}
