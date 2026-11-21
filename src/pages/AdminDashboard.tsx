import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Briefcase,
  Building2,
  CheckCircle2,
  Eye,
  FileCheck,
  Flag,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  Star,
  Users,
  Wrench,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { formatNPR, formatNepalDate } from '../lib/nepal-locations';
import { DashboardLayout, type SidebarNavItem } from '../components/ui/Navigation';
import { ConfirmationModal, DashboardStatCard, LoadingSkeleton } from '../components/ui/CommonUI';
import { VerificationBadge } from '../components/ui/Badges';

export const AdminDashboard: React.FC = () => {
  const { user, lang, categories, refreshMeta, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Secure document preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState('');

  // Rejection / Resubmission modal
  const [reviewModal, setReviewModal] = useState<{
    type: 'identity' | 'academic' | 'employer';
    id: string;
    decision: 'rejected' | 'requires_resubmission';
    label: string;
  } | null>(null);
  const [reviewReason, setReviewReason] = useState('');

  // New Category form
  const [catName, setCatName] = useState('');
  const [catNameNe, setCatNameNe] = useState('');
  const [catType, setCatType] = useState<'job' | 'gig'>('job');

  const loadAdmin = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<any>('/api/admin/overview');
      setData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load admin console.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  const handleOpenSignedDoc = async (kind: 'identity' | 'academic' | 'employer', id: string, label: string) => {
    try {
      const res = await apiFetch<{ url: string }>(`/api/documents/signed-url/${kind}/${id}`);
      setPreviewLabel(label);
      setPreviewUrl(res.url);
    } catch (err: any) {
      showToast(err.message || 'Document preview unavailable.', 'error');
    }
  };

  const handleDecision = async (
    type: 'identity' | 'academic' | 'employer',
    id: string,
    decision: 'verified' | 'rejected' | 'requires_resubmission',
    reason?: string,
  ) => {
    try {
      await apiFetch(`/api/admin/verifications/${type}/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason }),
      });
      showToast(`Decision recorded: ${decision.replace('_', ' ')}`, 'success');
      setReviewModal(null);
      setReviewReason('');
      loadAdmin();
    } catch (err: any) {
      showToast(err.message || 'Review action failed.', 'error');
    }
  };

  const handleUserStatus = async (userId: string, accountStatus: 'active' | 'suspended') => {
    await apiFetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ accountStatus }),
    });
    showToast(`User account ${accountStatus}.`, 'info');
    loadAdmin();
  };

  const handleModerate = async (kind: 'job' | 'gig', id: string, status: string) => {
    await apiFetch(`/api/admin/moderation/${kind}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    showToast(`Listing updated to ${status}.`, 'success');
    loadAdmin();
  };

  const handleResolveReport = async (id: string, status: string) => {
    await apiFetch(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    showToast(`Report marked ${status}.`, 'success');
    loadAdmin();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ name: catName, nameNe: catNameNe, type: catType }),
    });
    setCatName('');
    setCatNameNe('');
    await refreshMeta();
    showToast('Category added.', 'success');
  };

  if (!user || user.role !== 'admin') return null;

  const navItems: SidebarNavItem[] = [
    { id: 'overview', label: 'Platform Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4" /> },
    { id: 'identity', label: 'Identity Verification', icon: <ShieldCheck className="w-4 h-4" />, badge: data?.metrics?.pendingIdentity },
    { id: 'academic', label: 'Academic Verification', icon: <GraduationCap className="w-4 h-4" />, badge: data?.metrics?.pendingAcademic },
    { id: 'employers', label: 'Employer Verification', icon: <Building2 className="w-4 h-4" />, badge: data?.metrics?.pendingEmployers },
    { id: 'jobs', label: 'Job Moderation', icon: <Briefcase className="w-4 h-4" />, badge: data?.metrics?.pendingJobs },
    { id: 'gigs', label: 'Gig Moderation', icon: <Wrench className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & Complaints', icon: <Flag className="w-4 h-4" />, badge: data?.metrics?.openReports },
    { id: 'reviews', label: 'Reviews & Ratings', icon: <Star className="w-4 h-4" /> },
    { id: 'categories', label: 'Category Management', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Logs', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <DashboardLayout
      title="KaamSetu Administration"
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      {loading || !data ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Platform Overview &amp; Verification Queues</h2>
                <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
                  Every verification approval, rejection, and moderation action is recorded in immutable audit logs.
                </p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <DashboardStatCard label="Total Users" value={data.metrics.totalUsers} />
                <DashboardStatCard label="Pending Identity Checks" value={data.metrics.pendingIdentity} accent="amber" />
                <DashboardStatCard label="Pending Academic Docs" value={data.metrics.pendingAcademic} accent="amber" />
                <DashboardStatCard label="Pending Employers" value={data.metrics.pendingEmployers} accent="blue" />
                <DashboardStatCard label="Active Jobs" value={data.metrics.activeJobs} accent="emerald" />
                <DashboardStatCard label="Jobs Pending Approval" value={data.metrics.pendingJobs} accent="amber" />
                <DashboardStatCard label="Total Job Applications" value={data.metrics.totalApplications} accent="blue" />
                <DashboardStatCard label="Open Reports" value={data.metrics.openReports} accent="amber" />
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-[#263449]">
                <h2 className="text-lg font-bold">User Management ({data.users.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-[#111B2E] text-xs text-slate-500 dark:text-[#94A3B8]">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#263449]">
                    {data.users.map((u: any) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-[#111B2E]/60">
                        <td className="px-4 py-3 font-medium">{u.fullName}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-[#94A3B8]">{u.email}</td>
                        <td className="px-4 py-3 text-xs capitalize">{u.role.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-xs font-semibold">
                          <span className={u.accountStatus === 'active' ? 'text-[#16C784]' : 'text-[#EF4444]'}>
                            {u.accountStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUserStatus(u.id, u.accountStatus === 'active' ? 'suspended' : 'active')
                              }
                              className="px-3 py-1 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#263449]"
                            >
                              {u.accountStatus === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'identity' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Identity Verification Queue</h2>
              {data.identityQueue.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-semibold">{item.userName}</span>
                      <VerificationBadge status={item.verificationStatus} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                      {item.documentType} · Masked Ref: <span className="font-mono-num">{item.documentNumberMasked}</span> · Submitted {formatNepalDate(item.submittedAt, lang)}
                    </p>
                    {item.rejectionReason && (
                      <p className="text-xs text-[#EF4444]">Reason: {item.rejectionReason}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSignedDoc('identity', item.id, `${item.userName} — ${item.documentType}`)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#263449] inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Document</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision('identity', item.id, 'verified')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220] inline-flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewModal({
                          type: 'identity',
                          id: item.id,
                          decision: 'requires_resubmission',
                          label: item.userName,
                        })
                      }
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#F59E0B]/50 text-[#F59E0B]"
                    >
                      Request Resubmit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewModal({
                          type: 'identity',
                          id: item.id,
                          decision: 'rejected',
                          label: item.userName,
                        })
                      }
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#EF4444]/50 text-[#EF4444]"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'academic' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Academic Qualification Verification Queue</h2>
              {data.academicQueue.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-semibold">{item.userName} — {item.title}</span>
                      <VerificationBadge status={item.verificationStatus} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                      {item.qualificationLevel} · {item.institutionName} ({item.boardOrUniversity}) · {item.completionYear} · {item.gpaOrPercentage}
                    </p>
                    {item.rejectionReason && (
                      <p className="text-xs text-[#EF4444]">Reason: {item.rejectionReason}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenSignedDoc('academic', item.id, `${item.userName} — ${item.title}`)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#263449] inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Certificate</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecision('academic', item.id, 'verified')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220]"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewModal({
                          type: 'academic',
                          id: item.id,
                          decision: 'rejected',
                          label: item.title,
                        })
                      }
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#EF4444]/50 text-[#EF4444]"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'employers' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Employer Verification Requests</h2>
              {data.employerQueue.map((emp: any) => (
                <div
                  key={emp.id}
                  className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base font-semibold">{emp.organizationName}</span>
                      <VerificationBadge status={emp.verificationStatus} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                      {emp.employerType} · {emp.businessCategory} · {emp.district}, {emp.province} · Doc: {emp.verificationDocName || 'Not uploaded'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {emp.verificationDocName && (
                      <button
                        type="button"
                        onClick={() => handleOpenSignedDoc('employer', emp.id, emp.organizationName)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#263449] inline-flex items-center gap-1"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Inspect Doc</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDecision('employer', emp.id, 'verified')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220]"
                    >
                      Verify Employer
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setReviewModal({
                          type: 'employer',
                          id: emp.id,
                          decision: 'rejected',
                          label: emp.organizationName,
                        })
                      }
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#EF4444]/50 text-[#EF4444]"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Job Listing Moderation</h2>
              {data.jobsModeration.map((j: any) => (
                <div
                  key={j.id}
                  className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-base font-semibold">{j.title}</p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                      {j.organizationName} · {j.district} · {formatNPR(j.salaryMin)}–{formatNPR(j.salaryMax)} · Status: <strong>{j.status}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleModerate('job', j.id, 'Active')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220]"
                    >
                      Approve / Active
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModerate('job', j.id, 'Rejected')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#EF4444]/50 text-[#EF4444]"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'gigs' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Micro-Task Moderation</h2>
              {data.gigsModeration.map((g: any) => (
                <div
                  key={g.id}
                  className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-base font-semibold">{g.title}</p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                      {g.posterName} · {g.category} · {formatNPR(g.paymentAmount)} · Status: <strong>{g.status}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleModerate('gig', g.id, 'Open')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220]"
                    >
                      Approve / Open
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModerate('gig', g.id, 'Cancelled')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#EF4444]/50 text-[#EF4444]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Reports &amp; Complaints ({data.reports.length})</h2>
              {data.reports.map((r: any) => (
                <div
                  key={r.id}
                  className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <p className="text-base font-semibold">{r.targetTitle}</p>
                    <p className="text-xs text-[#F59E0B] font-medium">{r.reason} · Status: {r.status}</p>
                    <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{r.description}</p>
                    <p className="text-[11px] text-slate-500">Reported by {r.reporterName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleResolveReport(r.id, 'Resolved')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220]"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveReport(r.id, 'Dismissed')}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#263449]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Platform Reviews &amp; Ratings</h2>
              {data.reviews.map((rev: any) => (
                <div key={rev.id} className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">{rev.reviewerName} → {rev.reviewedName}</span>
                    <span className="font-mono-num text-[#F59E0B] font-bold">{rev.rating} / 5</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{rev.reviewText}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-3">
                <h2 className="text-lg font-bold">Active Categories ({categories.length})</h2>
                <div className="space-y-2 max-h-[380px] overflow-y-auto">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-100 dark:border-[#263449]">
                      <span>{c.name} ({c.nameNe})</span>
                      <span className="text-xs uppercase text-slate-500">{c.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAddCategory} className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4 self-start">
                <h3 className="text-base font-semibold">Add Category</h3>
                <div>
                  <label className="block text-xs font-medium mb-1">English Name</label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Nepali Name (नेपाली)</label>
                  <input
                    type="text"
                    required
                    value={catNameNe}
                    onChange={(e) => setCatNameNe(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Type</label>
                  <select
                    value={catType}
                    onChange={(e) => setCatType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                  >
                    <option value="job">Job Category</option>
                    <option value="gig">Micro-Task Category</option>
                  </select>
                </div>
                <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220]">
                  Add Category
                </button>
              </form>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-[#263449]">
                <h2 className="text-lg font-bold">Administrative Audit Logs</h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-[#263449]">
                {data.auditLogs.map((log: any) => (
                  <div key={log.id} className="p-4 text-xs flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-mono-num font-semibold text-[#16C784]">{log.action}</span>
                      <span className="text-slate-500 dark:text-[#94A3B8] ml-2">
                        by {log.actorName} on {log.entityType} ({log.entityId})
                      </span>
                    </div>
                    <span className="text-slate-400 font-mono-num">{formatNepalDate(log.createdAt, lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmationModal
        open={!!previewUrl}
        title={previewLabel}
        description="Restricted 5-minute signed URL preview. Access is recorded in document_access_logs."
        confirmLabel="Close Preview"
        onConfirm={() => setPreviewUrl(null)}
        onCancel={() => setPreviewUrl(null)}
      >
        {previewUrl && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#263449] bg-slate-900">
            <img src={previewUrl} alt={previewLabel} referrerPolicy="no-referrer" className="w-full max-h-[360px] object-contain" />
          </div>
        )}
      </ConfirmationModal>

      <ConfirmationModal
        open={!!reviewModal}
        title={
          reviewModal?.decision === 'rejected'
            ? `Reject Verification: ${reviewModal.label}`
            : `Request Resubmission: ${reviewModal?.label}`
        }
        description="A clear reason is mandatory and will be sent to the applicant."
        confirmLabel="Submit Decision"
        destructive={reviewModal?.decision === 'rejected'}
        onConfirm={() =>
          reviewModal && handleDecision(reviewModal.type, reviewModal.id, reviewModal.decision, reviewReason)
        }
        onCancel={() => {
          setReviewModal(null);
          setReviewReason('');
        }}
      >
        <textarea
          rows={3}
          required
          value={reviewReason}
          onChange={(e) => setReviewReason(e.target.value)}
          placeholder="Explain why the document cannot be verified yet..."
          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
        />
      </ConfirmationModal>
    </DashboardLayout>
  );
};
