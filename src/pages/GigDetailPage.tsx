import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, MapPin, ShieldAlert, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { formatNPR, formatNepalDate } from '../lib/nepal-locations';
import type { MicroTask, TaskApplication } from '../types';
import { PublicNavbar } from '../components/ui/Navigation';
import { TaskStatusBadge, VerificationBadge } from '../components/ui/Badges';
import { ConfirmationModal, LoadingSkeleton } from '../components/ui/CommonUI';

export const GigDetailPage: React.FC<{ gigId: string }> = ({ gigId }) => {
  const { user, lang, navigate, showToast } = useApp();
  const [gig, setGig] = useState<MicroTask | null>(null);
  const [applicants, setApplicants] = useState<TaskApplication[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [interestOpen, setInterestOpen] = useState(false);
  const [interestNote, setInterestNote] = useState('');

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const loadGig = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ gig: MicroTask; applicants: TaskApplication[]; reviews: any[] }>(
        `/api/gigs/${gigId}`,
      );
      setGig(res.gig);
      setApplicants(res.applicants || []);
      setReviews(res.reviews || []);
      setInterestNote(`Namaste! I am available for "${res.gig.title}".`);
    } catch (err: any) {
      showToast(err.message || 'Task not found.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigId]);

  const handleExpressInterest = async () => {
    if (!gig) return;
    try {
      await apiFetch(`/api/gigs/${gig.id}/interest`, {
        method: 'POST',
        body: JSON.stringify({ message: interestNote }),
      });
      setInterestOpen(false);
      showToast('Interest submitted!', 'success');
      loadGig();
    } catch (err: any) {
      showToast(err.message || 'Could not submit interest.', 'error');
    }
  };

  const handleAssignWorker = async (workerId: string) => {
    if (!gig) return;
    try {
      await apiFetch(`/api/gigs/${gig.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ workerId }),
      });
      showToast('Worker assigned! Task status updated to Assigned.', 'success');
      loadGig();
    } catch (err: any) {
      showToast(err.message || 'Assignment failed.', 'error');
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!gig) return;
    try {
      await apiFetch(`/api/gigs/${gig.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast(`Task status updated to ${status}.`, 'success');
      loadGig();
    } catch (err: any) {
      showToast(err.message || 'Status update failed.', 'error');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gig || !user) return;
    const targetId = user.id === gig.employerId ? gig.assignedWorkerId : gig.employerId;
    if (!targetId) return;
    try {
      await apiFetch(`/api/gigs/${gig.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ reviewedUserId: targetId, rating: reviewRating, reviewText }),
      });
      setReviewText('');
      showToast('Review published!', 'success');
      loadGig();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit review.', 'error');
    }
  };

  const isPoster = user?.id === gig?.employerId;
  const isAssignedWorker = user?.id === gig?.assignedWorkerId;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F8FAFC]">
      <PublicNavbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <button
          type="button"
          onClick={() => navigate('/gigs')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Micro-Task Board</span>
        </button>

        {loading || !gig ? (
          <LoadingSkeleton rows={3} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#94A3B8]">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{gig.posterName}</span>
                    <span aria-hidden="true">·</span>
                    <VerificationBadge status={gig.posterVerified} />
                  </div>
                  <TaskStatusBadge status={gig.status} />
                </div>

                <h1 className="text-2xl font-bold">{gig.title}</h1>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-[#94A3B8]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {gig.locationType === 'Online' ? 'Online Delivery' : `${gig.municipality}, ${gig.district}`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{gig.estimatedDuration}</span>
                  <span aria-hidden="true">·</span>
                  <span>Deadline: {formatNepalDate(gig.deadline, lang)}</span>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{gig.description}</p>

                <div className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Skills: <strong className="text-slate-800 dark:text-slate-200">{gig.requiredSkills.join(' · ') || 'General'}</strong>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-[#263449] flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xl font-bold font-mono-num text-[#16C784]">{formatNPR(gig.paymentAmount)}</span>
                    <span className="block text-xs text-slate-500 dark:text-[#94A3B8]">
                      Direct settlement · {gig.workersRequired} worker needed
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {user?.role === 'job_seeker' && gig.status === 'Open' && (
                      <button
                        type="button"
                        disabled={gig.hasExpressedInterest}
                        onClick={() => setInterestOpen(true)}
                        className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#3B82F6] text-white hover:bg-blue-600 disabled:opacity-60"
                      >
                        {gig.hasExpressedInterest ? 'Interest Sent' : 'Express Interest'}
                      </button>
                    )}
                    {!user && gig.status === 'Open' && (
                      <button
                        type="button"
                        onClick={() => navigate('/auth?mode=login')}
                        className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#3B82F6] text-white"
                      >
                        Sign in to Apply
                      </button>
                    )}

                    {(isPoster || isAssignedWorker) && gig.status === 'Assigned' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange('In Progress')}
                        className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#3B82F6] text-white"
                      >
                        Start Task
                      </button>
                    )}
                    {isPoster && (gig.status === 'Assigned' || gig.status === 'In Progress') && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange('Completed')}
                        className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#16C784] text-[#0B1220] inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Completion</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Employer Applicant Review Section */}
              {isPoster && (
                <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4">
                  <h2 className="text-base font-semibold">Interested Workers ({applicants.length})</h2>
                  {applicants.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
                      No workers have expressed interest yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {applicants.map((a) => (
                        <div
                          key={a.id}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] flex flex-wrap items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/profile/${a.applicantId}`)}
                                className="text-sm font-semibold hover:text-[#16C784]"
                              >
                                {a.applicantName}
                              </button>
                              <VerificationBadge status={a.applicantVerified} />
                            </div>
                            <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{a.message}</p>
                          </div>
                          {gig.status === 'Open' ? (
                            <button
                              type="button"
                              onClick={() => handleAssignWorker(a.applicantId)}
                              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220]"
                            >
                              Select Worker
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-[#3B82F6]">{a.status}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Completion Reviews */}
              {gig.status === 'Completed' && (
                <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4">
                  <h2 className="text-base font-semibold">Task Reviews</h2>
                  {reviews.map((r) => (
                    <div key={r.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{r.reviewerName}</span>
                        <span className="inline-flex items-center gap-1 text-[#F59E0B] font-mono-num">
                          <Star className="w-3.5 h-3.5 fill-current" /> {r.rating}/5
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-[#94A3B8]">{r.reviewText}</p>
                    </div>
                  ))}

                  {(isPoster || isAssignedWorker) && (
                    <form onSubmit={handleSubmitReview} className="space-y-3 pt-2 border-t border-slate-200 dark:border-[#263449]">
                      <p className="text-xs font-semibold">Leave a Review</p>
                      <div className="flex items-center gap-3">
                        <label className="text-xs">Rating:</label>
                        <select
                          value={reviewRating}
                          onChange={(e) => setReviewRating(Number(e.target.value))}
                          className="px-2.5 py-1 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>{n} Stars</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        rows={2}
                        required
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Share feedback on reliability and quality..."
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220]"
                      >
                        Publish Review
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            <aside className="lg:col-span-4 space-y-4">
              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#F59E0B]">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Safety &amp; Payment Notice</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                  Payments are not held in escrow on KaamSetu. Agree on milestones and settlement method (e.g., cash, eSewa, Khalti, Fonepay) directly with verified task posters before starting physical or online deliverables.
                </p>
                {gig.assignedWorkerName && (
                  <p className="text-xs pt-2 border-t border-slate-100 dark:border-[#263449]">
                    Assigned Worker: <strong>{gig.assignedWorkerName}</strong>
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>

      <ConfirmationModal
        open={interestOpen}
        title="Express Interest"
        description="Send your availability note to the task poster."
        confirmLabel="Submit Interest"
        onConfirm={handleExpressInterest}
        onCancel={() => setInterestOpen(false)}
      >
        <textarea
          rows={3}
          value={interestNote}
          onChange={(e) => setInterestNote(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
        />
      </ConfirmationModal>
    </div>
  );
};
