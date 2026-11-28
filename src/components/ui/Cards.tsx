import React from 'react';
import { Bookmark, Check, MapPin, MessageSquare, Star } from 'lucide-react';
import { formatNPR } from '../../lib/nepal-locations';
import type { CandidateSummary, Job, MicroTask } from '../../types';
import { TaskStatusBadge, VerificationBadge } from './Badges';
import { TiltCard } from './TiltCard';

export const JobCard: React.FC<{
  job: Job;
  onOpen: (job: Job) => void;
  onApply?: (job: Job) => void;
  onToggleSave?: (job: Job) => void;
}> = ({ job, onOpen, onApply, onToggleSave }) => {
  const matchColor =
    (job.match?.score ?? 0) >= 90
      ? 'text-[#16C784]'
      : (job.match?.score ?? 0) >= 75
        ? 'text-[#3B82F6]'
        : 'text-[#51617a] dark:text-[#94A3B8]';

  return (
    <TiltCard
      as="article"
      maxTilt={11}
      depth={12}
      className="kbn-card-surface rounded-[20px] p-5 flex flex-col justify-between gap-4"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#51617a] dark:text-[#94A3B8]">
              <span className="font-semibold text-[#0B1220] dark:text-slate-200">{job.organizationName}</span>
              {job.employerVerified && (
                <>
                  <span aria-hidden="true">·</span>
                  <VerificationBadge status="verified" />
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{job.categoryName}</span>
            </div>
            <h3 className="mt-1.5 text-lg font-bold text-[#0B1220] dark:text-[#F8FAFC] leading-snug">
              <button
                type="button"
                onClick={() => onOpen(job)}
                className="text-left hover:text-[#16C784] transition-colors"
              >
                {job.title}
              </button>
            </h3>
          </div>

          {job.match && (
            <div className="text-right shrink-0">
              <span className={`block text-base font-extrabold font-mono-num tabular-nums ${matchColor}`}>
                {job.match.score}%
              </span>
              <span className="block text-[11px] text-[#51617a] dark:text-[#94A3B8] whitespace-nowrap">
                {job.match.tier}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#51617a] dark:text-[#94A3B8]">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {job.district}, {job.province.replace(' Province', '')}
          </span>
          <span aria-hidden="true">·</span>
          <span>{job.workMode}</span>
          <span aria-hidden="true">·</span>
          <span>{job.employmentType}</span>
          <span aria-hidden="true">·</span>
          <span>{job.requiredEducation}</span>
        </div>

        <p className="text-sm text-[#51617a] dark:text-[#94A3B8] line-clamp-2">{job.description}</p>

        <div className="text-xs text-[#51617a] dark:text-[#94A3B8]">
          Skills:{' '}
          <span className="font-medium text-[#0B1220] dark:text-slate-200">
            {job.requiredSkills.join(' · ') || 'General'}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-[#d5deea] dark:border-[#263449] flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-sm font-bold font-mono-num tabular-nums text-[#0B1220] dark:text-[#F8FAFC]">
            {formatNPR(job.salaryMin)} – {formatNPR(job.salaryMax)}
          </span>
          <span className="text-xs text-[#51617a] dark:text-[#94A3B8] ml-1.5">/ {job.paymentFrequency}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(job)}
              aria-label={job.isSaved ? `Unsave ${job.title}` : `Save ${job.title}`}
              className={`px-3 py-2 text-xs font-semibold rounded-[12px] border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                job.isSaved
                  ? 'border-[#16C784] text-[#16C784] bg-[#16C784]/10'
                  : 'border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#111B2E] text-[#51617a] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{job.isSaved ? 'Saved' : 'Save'}</span>
            </button>
          )}
          {onApply && (
            <button
              type="button"
              disabled={job.hasApplied}
              onClick={() => onApply(job)}
              aria-label={job.hasApplied ? `Already applied to ${job.title}` : `Apply to ${job.title}`}
              className={`px-4 py-2 text-xs font-bold rounded-[12px] transition-all whitespace-nowrap ${
                job.hasApplied
                  ? 'bg-slate-200 dark:bg-[#111B2E] text-slate-600 dark:text-[#94A3B8] cursor-default'
                  : 'kbn-btn-primary'
              }`}
            >
              {job.hasApplied ? 'Applied' : 'Apply now'}
            </button>
          )}
        </div>
      </div>
    </TiltCard>
  );
};

export const GigCard: React.FC<{
  gig: MicroTask;
  onOpen: (gig: MicroTask) => void;
  onExpressInterest?: (gig: MicroTask) => void;
}> = ({ gig, onOpen, onExpressInterest }) => (
  <TiltCard
    as="article"
    maxTilt={11}
    depth={12}
    className="kbn-card-surface rounded-[20px] p-5 flex flex-col justify-between gap-4"
  >
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 text-xs text-[#51617a] dark:text-[#94A3B8]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate font-semibold text-[#0B1220] dark:text-slate-200">{gig.posterName}</span>
          {gig.posterVerified && (
            <>
              <span aria-hidden="true">·</span>
              <VerificationBadge status="verified" />
            </>
          )}
        </div>
        <TaskStatusBadge status={gig.status} />
      </div>

      <h3 className="text-lg font-bold text-[#0B1220] dark:text-[#F8FAFC] leading-snug">
        <button
          type="button"
          onClick={() => onOpen(gig)}
          className="text-left hover:text-[#3B82F6] transition-colors"
        >
          {gig.title}
        </button>
      </h3>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#51617a] dark:text-[#94A3B8]">
        <span>{gig.category}</span>
        <span aria-hidden="true">·</span>
        <span>{gig.locationType === 'Online' ? 'Online Delivery' : `${gig.district}, ${gig.municipality}`}</span>
        <span aria-hidden="true">·</span>
        <span>{gig.estimatedDuration}</span>
        {gig.urgency === 'Urgent' && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-[#F59E0B] font-semibold">Urgent</span>
          </>
        )}
      </div>

      <p className="text-sm text-[#51617a] dark:text-[#94A3B8] line-clamp-2">{gig.description}</p>
    </div>

    <div className="pt-3 border-t border-[#d5deea] dark:border-[#263449] flex items-center justify-between gap-3">
      <div>
        <span className="text-base font-extrabold font-mono-num tabular-nums text-[#16C784]">
          {formatNPR(gig.paymentAmount)}
        </span>
        <span className="block text-[11px] text-[#51617a] dark:text-[#94A3B8]">
          {gig.workersRequired} worker{gig.workersRequired > 1 ? 's' : ''} · Due {gig.deadline}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onOpen(gig)}
          className="px-3 py-2 text-xs font-semibold rounded-[12px] border border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#111B2E] text-[#0B1220] dark:text-[#F8FAFC] hover:border-[#3B82F6] transition-colors whitespace-nowrap"
        >
          Details
        </button>
        {onExpressInterest && gig.status === 'Open' && (
          <button
            type="button"
            disabled={gig.hasExpressedInterest}
            onClick={() => onExpressInterest(gig)}
            className={`px-3.5 py-2 text-xs font-bold rounded-[12px] transition-colors whitespace-nowrap ${
              gig.hasExpressedInterest
                ? 'bg-slate-200 dark:bg-[#111B2E] text-slate-600 dark:text-[#94A3B8]'
                : 'kbn-btn-primary'
            }`}
          >
            {gig.hasExpressedInterest ? 'Interest sent' : 'Express interest'}
          </button>
        )}
      </div>
    </div>
  </TiltCard>
);

export const CandidateCard: React.FC<{
  candidate: CandidateSummary;
  onViewProfile: (userId: string) => void;
  onToggleShortlist: (userId: string) => void;
  onContact: (candidate: CandidateSummary) => void;
}> = ({ candidate, onViewProfile, onToggleShortlist, onContact }) => (
  <TiltCard
    as="article"
    maxTilt={9}
    depth={10}
    className="kbn-card-surface rounded-[20px] p-5 flex flex-col justify-between gap-4"
  >
    <div className="space-y-3">
      <div className="flex items-start gap-3.5">
        {candidate.profilePhotoUrl ? (
          <img
            src={candidate.profilePhotoUrl}
            alt={candidate.fullName}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-2xl object-cover border border-[#d5deea] dark:border-[#263449] shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#16C784] text-[#03130d] flex items-center justify-center font-extrabold text-base shrink-0">
            {candidate.fullName.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-[#0B1220] dark:text-[#F8FAFC] truncate">
              {candidate.fullName}
            </h3>
            {candidate.matchScore !== undefined && (
              <span className="text-xs font-extrabold font-mono-num text-[#16C784] shrink-0">
                {candidate.matchScore}% Match
              </span>
            )}
          </div>
          <p className="text-sm text-[#51617a] dark:text-[#94A3B8] line-clamp-1">
            {candidate.professionalHeadline}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <VerificationBadge
              status={candidate.identityVerified}
              labelOverride={candidate.identityVerified ? 'Identity Verified' : 'ID Unverified'}
            />
            {candidate.educationVerified && (
              <>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <VerificationBadge
                  status="verified"
                  labelOverride={`Edu Verified (${candidate.verifiedQualifications.join(', ')})`}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="text-xs text-[#51617a] dark:text-[#94A3B8] flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>{candidate.educationLevel}</span>
        <span aria-hidden="true">·</span>
        <span>{candidate.yearsOfExperience} yrs exp</span>
        <span aria-hidden="true">·</span>
        <span>
          {candidate.district}, {candidate.province.replace(' Province', '')}
        </span>
        <span aria-hidden="true">·</span>
        <span>{candidate.availability}</span>
      </div>

      <div className="text-xs text-[#51617a] dark:text-[#94A3B8]">
        Skills:{' '}
        <span className="font-medium text-[#0B1220] dark:text-slate-200">
          {candidate.skills.slice(0, 5).join(' · ') || 'Not listed'}
        </span>
      </div>
    </div>

    <div className="pt-3 border-t border-[#d5deea] dark:border-[#263449] flex flex-wrap items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => onViewProfile(candidate.userId)}
        className="px-3 py-1.5 text-xs font-semibold rounded-[12px] border border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#111B2E] text-[#0B1220] dark:text-[#F8FAFC] hover:border-[#3B82F6] transition-colors whitespace-nowrap"
      >
        View Profile
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onToggleShortlist(candidate.userId)}
          aria-label={candidate.isShortlisted ? `Remove ${candidate.fullName} from shortlist` : `Shortlist ${candidate.fullName}`}
          className={`px-3 py-1.5 text-xs font-semibold rounded-[12px] border transition-colors inline-flex items-center gap-1 whitespace-nowrap ${
            candidate.isShortlisted
              ? 'border-[#16C784] text-[#16C784] bg-[#16C784]/10'
              : 'border-[#d5deea] dark:border-[#263449] text-[#51617a] dark:text-[#94A3B8]'
          }`}
        >
          {candidate.isShortlisted ? <Check className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
          <span>{candidate.isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
        </button>
        <button
          type="button"
          onClick={() => onContact(candidate)}
          className="px-3 py-1.5 text-xs font-bold rounded-[12px] kbn-btn-primary inline-flex items-center gap-1 whitespace-nowrap"
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Contact</span>
        </button>
      </div>
    </div>
  </TiltCard>
);
