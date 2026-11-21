import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { ApplicationStatus, TaskStatus, VerificationStatus } from '../../types';

export const VerificationBadge: React.FC<{
  status: VerificationStatus | boolean;
  labelOverride?: string;
}> = ({ status, labelOverride }) => {
  const normalized: VerificationStatus =
    typeof status === 'boolean' ? (status ? 'verified' : 'not_submitted') : status;

  if (normalized === 'verified') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16C784] whitespace-nowrap shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{labelOverride || 'Verified'}</span>
      </span>
    );
  }
  if (normalized === 'pending_review') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F59E0B] whitespace-nowrap shrink-0">
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{labelOverride || 'Pending Review'}</span>
      </span>
    );
  }
  if (normalized === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#EF4444] whitespace-nowrap shrink-0">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{labelOverride || 'Rejected'}</span>
      </span>
    );
  }
  if (normalized === 'requires_resubmission') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F59E0B] whitespace-nowrap shrink-0">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{labelOverride || 'Resubmission Required'}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-[#94A3B8] whitespace-nowrap shrink-0">
      <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{labelOverride || 'Unverified'}</span>
    </span>
  );
};

export const ApplicationStatusBadge: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
  const styles: Record<ApplicationStatus, { cls: string; icon: React.ReactNode }> = {
    New: { cls: 'text-[#3B82F6]', icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" /> },
    'Under Review': { cls: 'text-[#F59E0B]', icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" /> },
    Shortlisted: { cls: 'text-[#16C784]', icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> },
    Interview: { cls: 'text-[#3B82F6]', icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> },
    Selected: { cls: 'text-[#22C55E]', icon: <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> },
    Rejected: { cls: 'text-[#EF4444]', icon: <XCircle className="w-3.5 h-3.5" aria-hidden="true" /> },
  };
  const cfg = styles[status] || styles.New;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${cfg.cls}`}>
      {cfg.icon}
      <span>{status}</span>
    </span>
  );
};

export const TaskStatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const colorMap: Record<TaskStatus, string> = {
    Draft: 'text-slate-500 dark:text-[#94A3B8]',
    'Pending Approval': 'text-[#F59E0B]',
    Open: 'text-[#16C784]',
    Assigned: 'text-[#3B82F6]',
    'In Progress': 'text-[#3B82F6]',
    Completed: 'text-[#22C55E]',
    Cancelled: 'text-[#EF4444]',
    Disputed: 'text-[#EF4444]',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 ${colorMap[status]}`}>
      <span>{status}</span>
    </span>
  );
};
