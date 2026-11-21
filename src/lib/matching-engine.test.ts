import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateJobMatch,
  calculateProfileCompletion,
  getMatchTier,
} from './matching-engine';

test('calculateJobMatch gives 100% Excellent Match on exact match', () => {
  const result = calculateJobMatch(
    {
      skills: ['React', 'TypeScript', 'Tailwind CSS'],
      educationLevel: "Bachelor's",
      yearsOfExperience: 3,
      province: 'Bagmati Province',
      district: 'Lalitpur',
      preferredLocation: 'Kathmandu / Lalitpur',
      employmentPreference: 'Full-time',
      availability: 'Immediate',
    },
    {
      requiredSkills: ['React', 'TypeScript'],
      requiredEducation: "Bachelor's",
      minimumExperience: 2,
      province: 'Bagmati Province',
      district: 'Lalitpur',
      workMode: 'Hybrid',
      employmentType: 'Full-time',
    },
  );

  assert.equal(result.score, 100);
  assert.equal(result.tier, 'Excellent Match');
  assert.equal(result.breakdown.length, 5);
});

test('calculateJobMatch gives full location credit for Remote jobs regardless of district', () => {
  const result = calculateJobMatch(
    {
      skills: ['Figma'],
      educationLevel: '+2 / Intermediate',
      yearsOfExperience: 1,
      province: 'Gandaki Province',
      district: 'Kaski',
      preferredLocation: 'Pokhara',
      employmentPreference: 'Freelance',
      availability: 'Immediate',
    },
    {
      requiredSkills: ['Figma'],
      requiredEducation: '+2 / Intermediate',
      minimumExperience: 1,
      province: 'Bagmati Province',
      district: 'Kathmandu',
      workMode: 'Remote',
      employmentType: 'Freelance',
    },
  );

  assert.equal(result.score, 100);
  const locBreakdown = result.breakdown.find((b) => b.factor.includes('Location'));
  assert.equal(locBreakdown?.score, 100);
});

test('calculateJobMatch produces lower score when skills and education mismatch', () => {
  const result = calculateJobMatch(
    {
      skills: ['Cooking'],
      educationLevel: 'SEE',
      yearsOfExperience: 0,
      province: 'Karnali Province',
      district: 'Jumla',
      preferredLocation: 'Jumla',
      employmentPreference: 'Part-time',
      availability: 'Within 1 month',
    },
    {
      requiredSkills: ['React', 'Node.js', 'PostgreSQL'],
      requiredEducation: "Master's",
      minimumExperience: 4,
      province: 'Bagmati Province',
      district: 'Kathmandu',
      workMode: 'On-site',
      employmentType: 'Full-time',
    },
  );

  assert.ok(result.score < 50);
  assert.equal(result.tier, 'Lower Match');
});

test('getMatchTier maps threshold ranges accurately', () => {
  assert.equal(getMatchTier(92), 'Excellent Match');
  assert.equal(getMatchTier(75), 'Strong Match');
  assert.equal(getMatchTier(60), 'Potential Match');
  assert.equal(getMatchTier(49), 'Lower Match');
});

test('calculateProfileCompletion returns accurate score and missing suggestions', () => {
  const partial = calculateProfileCompletion({
    hasPhoto: true,
    hasHeadline: true,
    hasAbout: false,
    hasLocation: true,
    skillsCount: 2,
    educationCount: 1,
    experienceCount: 0,
    portfolioCount: 0,
    identitySubmitted: false,
    academicDocSubmitted: false,
  });

  assert.equal(partial.percentage, 45);
  assert.ok(partial.suggestions.some((s) => s.includes('3 skills')));
  assert.ok(partial.suggestions.some((s) => s.includes('identity verification')));
});
