import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bookmark, Flag, MapPin, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { formatNPR, formatNepalDate } from '../lib/nepal-locations';
import type { Job } from '../types';
import { PublicNavbar } from '../components/ui/Navigation';
import { VerificationBadge } from '../components/ui/Badges';
import { ConfirmationModal, LoadingSkeleton } from '../components/ui/CommonUI';

export const JobDetailPage: React.FC<{ jobId: string }> = ({ jobId }) => {
  const { user, lang, navigate, showToast } = useApp();
  const [job, setJob] = useState<Job | null>(null);
  const [employerDetails, setEmployerDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [coverMessage, setCoverMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Suspicious or misleading listing');
  const [reportDesc, setReportDesc] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch<{ job: Job; employerDetails: any }>(`/api/jobs/${jobId}`)
      .then((res) => {
        setJob(res.job);
        setEmployerDetails(res.employerDetails);
        setCoverMessage(
          `Namaste! I am applying for ${res.job.title}. My verified qualifications and relevant skills are ready for your review.`,
        );
      })
      .catch((err) => showToast(err.message || 'Job not found.', 'error'))
      .finally(() => setLoading(false));
  }, [jobId, showToast]);

  const handleApply = async () => {
    if (!job) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/jobs/${job.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ coverMessage }),
      });
      setJob({ ...job, hasApplied: true });
      setApplyModalOpen(false);
      showToast('Application submitted successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not submit application.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }
    if (!job) return;
    const res = await apiFetch<{ saved: boolean }>(`/api/jobs/${job.id}/save`, { method: 'POST' });
    setJob({ ...job, isSaved: res.saved });
    showToast(res.saved ? 'Job saved.' : 'Removed from saved.', 'info');
  };

  const handleContactEmployer = async () => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }
    if (!job) return;
    try {
      const res = await apiFetch<{ id: string }>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          recipientId: job.employerId,
          contextTitle: job.title,
          initialMessage: `Namaste! I have a question regarding the ${job.title} position.`,
        }),
      });
      navigate(`/messages?conv=${res.id}`);
    } catch (err: any) {
      showToast(err.message || 'Could not start conversation.', 'error');
    }
  };

  const handleReport = async () => {
    if (!job) return;
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          jobId: job.id,
          reportedUserId: job.employerId,
          targetTitle: job.title,
          reason: reportReason,
          description: reportDesc,
        }),
      });
      setReportOpen(false);
      setReportDesc('');
      showToast('Report submitted to KaamSetu moderation team.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not submit report.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F8FAFC]">
      <PublicNavbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <button
          type="button"
          onClick={() => navigate('/jobs')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Job Discovery</span>
        </button>

        {loading || !job ? (
          <LoadingSkeleton rows={3} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-[#94A3B8]">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{job.organizationName}</span>
                  <span aria-hidden="true">·</span>
                  <VerificationBadge status={job.employerVerified} />
                  <span aria-hidden="true">·</span>
                  <span>{job.categoryName}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{job.title}</h1>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-[#94A3B8]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {job.municipality}, {job.district}, {job.province}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{job.workMode}</span>
                  <span aria-hidden="true">·</span>
                  <span>{job.employmentType}</span>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-[#263449] flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xl font-bold font-mono-num text-[#16C784]">
                      {formatNPR(job.salaryMin)} – {formatNPR(job.salaryMax)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-[#94A3B8] ml-1.5">
                      / {job.paymentFrequency}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {user?.role === 'job_seeker' && (
                      <button
                        type="button"
                        onClick={handleToggleSave}
                        className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-[#263449] inline-flex items-center gap-1.5"
                      >
                        <Bookmark className="w-4 h-4" />
                        <span>{job.isSaved ? 'Saved' : 'Save Job'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleContactEmployer}
                      className="px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-[#263449] inline-flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Contact Employer</span>
                    </button>
                    <button
                      type="button"
                      disabled={job.hasApplied || user?.role === 'employer'}
                      onClick={() => (user ? setApplyModalOpen(true) : navigate('/auth?mode=login'))}
                      className="px-5 py-2 text-sm font-semibold rounded-xl bg-[#16C784] text-[#0B1220] hover:bg-[#13b074] disabled:opacity-60"
                    >
                      {job.hasApplied ? 'Already Applied' : 'Apply Now'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-5">
                <section className="space-y-2">
                  <h2 className="text-base font-semibold">Role Overview</h2>
                  <p className="text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed whitespace-pre-line">
                    {job.description}
                  </p>
                </section>

                <section className="space-y-2 pt-4 border-t border-slate-100 dark:border-[#263449]">
                  <h2 className="text-base font-semibold">Key Responsibilities</h2>
                  <p className="text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed whitespace-pre-line">
                    {job.responsibilities}
                  </p>
                </section>

                {job.benefits && (
                  <section className="space-y-2 pt-4 border-t border-slate-100 dark:border-[#263449]">
                    <h2 className="text-base font-semibold">Compensation &amp; Benefits</h2>
                    <p className="text-sm text-slate-600 dark:text-[#94A3B8]">{job.benefits}</p>
                  </section>
                )}

                <section className="space-y-2 pt-4 border-t border-slate-100 dark:border-[#263449]">
                  <h2 className="text-base font-semibold">Requirements</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-[#94A3B8]">Required Education:</span>{' '}
                      <strong className="font-medium">{job.requiredEducation}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-[#94A3B8]">Minimum Experience:</span>{' '}
                      <strong className="font-medium font-mono-num">{job.minimumExperience} yrs</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-[#94A3B8]">Openings:</span>{' '}
                      <strong className="font-medium font-mono-num">{job.vacancies}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-[#94A3B8]">Verification Requirement:</span>{' '}
                      <strong className="font-medium">{job.requiredVerificationLevel}</strong>
                    </div>
                  </div>
                  <p className="text-sm pt-2">
                    <span className="text-xs text-slate-500 dark:text-[#94A3B8]">Required Skills: </span>
                    <span className="font-medium">{job.requiredSkills.join(' · ')}</span>
                  </p>
                </section>
              </div>
            </div>

            {/* Right Sidebar: Match Breakdown & Employer Details */}
            <aside className="lg:col-span-4 space-y-5">
              {job.match && (
                <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Your Match Score</h2>
                    <span className="text-xl font-bold font-mono-num text-[#16C784]">{job.match.score}%</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{job.match.tier}</p>
                  <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-[#263449]">
                    {job.match.breakdown.map((b) => (
                      <div key={b.factor} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{b.factor} ({b.weight}%)</span>
                          <span className="font-mono-num font-semibold">{b.score}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-[#0B1220] overflow-hidden">
                          <div className="h-full bg-[#16C784]" style={{ width: `${b.score}%` }} />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">{b.reason}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] pt-2 border-t border-slate-100 dark:border-[#263449]">
                    Match scores are advisory recommendations only and never automatically reject candidates.
                  </p>
                </div>
              )}

              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-5 space-y-3 text-sm">
                <h2 className="font-semibold">About Employer</h2>
                <p className="font-medium">{employerDetails?.organizationName || job.organizationName}</p>
                {employerDetails?.description && (
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{employerDetails.description}</p>
                )}
                <div className="text-xs text-slate-500 dark:text-[#94A3B8] pt-2 border-t border-slate-100 dark:border-[#263449] space-y-1">
                  <p>Deadline: {formatNepalDate(job.applicationDeadline, lang)}</p>
                  <p>Posted: {formatNepalDate(job.createdAt, lang)}</p>
                </div>
                {user && (
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="pt-2 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#EF4444]"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report suspicious listing</span>
                  </button>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>

      <ConfirmationModal
        open={applyModalOpen}
        title={`Apply to ${job?.title}`}
        description="Confirm your direct application. Employers can view your verified qualifications and public resume."
        confirmLabel="Submit Application"
        loading={submitting}
        onConfirm={handleApply}
        onCancel={() => setApplyModalOpen(false)}
      >
        <textarea
          rows={4}
          value={coverMessage}
          onChange={(e) => setCoverMessage(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
        />
      </ConfirmationModal>

      <ConfirmationModal
        open={reportOpen}
        title="Report Listing"
        description="Flag misleading compensation, spam, or suspicious requirements for administrator moderation."
        confirmLabel="Submit Report"
        destructive
        onConfirm={handleReport}
        onCancel={() => setReportOpen(false)}
      >
        <div className="space-y-3">
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
          >
            <option>Suspicious or misleading listing</option>
            <option>Requests unlawful upfront fee</option>
            <option>Incorrect location or compensation</option>
            <option>Abusive or discriminatory text</option>
          </select>
          <textarea
            rows={3}
            value={reportDesc}
            onChange={(e) => setReportDesc(e.target.value)}
            placeholder="Describe what looks suspicious..."
            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
          />
        </div>
      </ConfirmationModal>
    </div>
  );
};
