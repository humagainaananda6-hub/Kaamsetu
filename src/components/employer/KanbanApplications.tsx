import React from 'react';
import { MessageSquare } from 'lucide-react';
import type { ApplicationStatus, JobApplication } from '../../types';
import { VerificationBadge } from '../ui/Badges';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';

const STAGES: ApplicationStatus[] = [
  'New',
  'Under Review',
  'Shortlisted',
  'Interview',
  'Selected',
  'Rejected',
];

export const KanbanApplications: React.FC<{
  applications: JobApplication[];
  onMoveStage: (appId: string, nextStatus: ApplicationStatus) => Promise<void>;
}> = ({ applications, onMoveStage }) => {
  const { navigate, showToast } = useApp();

  const handleMessage = async (app: JobApplication) => {
    try {
      const res = await apiFetch<{ id: string }>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          recipientId: app.applicantId,
          contextTitle: app.jobTitle || 'Job Application',
        }),
      });
      navigate(`/messages?conv=${res.id}`);
    } catch (err: any) {
      showToast(err.message || 'Could not open messages.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Application Management Pipeline</h2>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
          Move applicants across hiring stages. Candidates receive immediate notifications on stage updates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {STAGES.map((stage) => {
          const stageApps = applications.filter((a) => a.status === stage);
          return (
            <div
              key={stage}
              className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#263449]">
                <h3 className="text-sm font-semibold">{stage}</h3>
                <span className="text-xs font-mono-num font-bold text-[#16C784]">{stageApps.length}</span>
              </div>

              {stageApps.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] py-4 text-center">
                  No applicants in {stage}
                </p>
              ) : (
                <div className="space-y-3">
                  {stageApps.map((app) => (
                    <div
                      key={app.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <button
                            type="button"
                            onClick={() => navigate(`/profile/${app.applicantId}`)}
                            className="text-sm font-semibold hover:text-[#16C784] text-left"
                          >
                            {app.applicantName}
                          </button>
                          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{app.jobTitle}</p>
                        </div>
                        {app.matchScore !== undefined && (
                          <span className="text-xs font-bold font-mono-num text-[#16C784]">
                            {app.matchScore}%
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <VerificationBadge
                          status={!!app.applicantIdentityVerified}
                          labelOverride={app.applicantIdentityVerified ? 'ID Verified' : 'ID Unverified'}
                        />
                        {app.applicantEducationVerified && (
                          <VerificationBadge status="verified" labelOverride="Edu Verified" />
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-[#94A3B8] line-clamp-2">
                        {app.coverMessage}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-[#263449]">
                        <select
                          aria-label={`Change stage for ${app.applicantName}`}
                          value={app.status}
                          onChange={(e) => onMoveStage(app.id, e.target.value as ApplicationStatus)}
                          className="px-2 py-1 text-xs rounded-lg bg-white dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleMessage(app)}
                          aria-label={`Message ${app.applicantName}`}
                          className="p-1.5 rounded-lg border border-slate-300 dark:border-[#263449] text-slate-600 dark:text-[#94A3B8] hover:text-[#16C784]"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
