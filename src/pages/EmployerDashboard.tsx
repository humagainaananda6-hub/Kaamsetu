import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  ClipboardList,
  Kanban,
  LayoutDashboard,
  MessageSquare,
  PlusCircle,
  Search,
  Settings,
  Star,
  Users,
  Wrench,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch, fileToBase64 } from '../lib/api';
import { NEPAL_PROVINCES, formatNPR } from '../lib/nepal-locations';
import type {
  ApplicationStatus,
  CandidateSummary,
  EmployerProfile,
  Job,
  JobApplication,
  MicroTask,
} from '../types';
import { DashboardLayout, type SidebarNavItem } from '../components/ui/Navigation';
import {
  DashboardStatCard,
  EmptyState,
  LoadingSkeleton,
  NepalLocationSelector,
  UploadDropzone,
} from '../components/ui/CommonUI';
import { TaskStatusBadge, VerificationBadge } from '../components/ui/Badges';
import { CandidateCard } from '../components/ui/Cards';
import { JobPostingWizard } from '../components/employer/JobPostingWizard';
import { KanbanApplications } from '../components/employer/KanbanApplications';

export const EmployerDashboard: React.FC = () => {
  const { user, lang, setLang, theme, toggleTheme, navigate, showToast, unreadMessages } = useApp();
  const urlTab = new URLSearchParams(window.location.search).get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(urlTab);
  const [loading, setLoading] = useState(true);

  const [company, setCompany] = useState<EmployerProfile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [gigs, setGigs] = useState<MicroTask[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [candidates, setCandidates] = useState<CandidateSummary[]>([]);

  // Candidate filters
  const [candQ, setCandQ] = useState('');
  const [candProvince, setCandProvince] = useState('all');
  const [candEdu, setCandEdu] = useState('all');
  const [candVerifiedOnly, setCandVerifiedOnly] = useState(false);

  // Micro-task post state
  const [gigTitle, setGigTitle] = useState('');
  const [gigCat, setGigCat] = useState('Local Tasks');
  const [gigDesc, setGigDesc] = useState('');
  const [gigPay, setGigPay] = useState(2500);
  const [gigDur, setGigDur] = useState('1 day');
  const [gigLocType, setGigLocType] = useState<'Local' | 'Online'>('Local');
  const [gigUrgency, setGigUrgency] = useState<'Normal' | 'Urgent'>('Normal');
  const [gigLoc, setGigLoc] = useState({
    province: 'Bagmati Province',
    district: 'Kathmandu',
    municipality: 'Kathmandu Metropolitan City',
  });
  const [gigSkills, setGigSkills] = useState('');

  // Company profile edit & verification
  const [compFile, setCompFile] = useState<File | null>(null);
  const [compDesc, setCompDesc] = useState('');
  const [compWebsite, setCompWebsite] = useState('');

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const [ws, candRes] = await Promise.all([
        apiFetch<any>('/api/employer/workspace'),
        apiFetch<{ candidates: CandidateSummary[] }>('/api/employer/candidates'),
      ]);
      setCompany(ws.company);
      setCompDesc(ws.company?.description || '');
      setCompWebsite(ws.company?.website || '');
      setJobs(ws.jobs || []);
      setGigs(ws.gigs || []);
      setApplications(ws.applications || []);
      setCandidates(candRes.candidates || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load employer workspace.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const searchCandidates = async () => {
    const qs = new URLSearchParams();
    if (candQ.trim()) qs.set('q', candQ.trim());
    if (candProvince !== 'all') qs.set('province', candProvince);
    if (candEdu !== 'all') qs.set('education', candEdu);
    if (candVerifiedOnly) qs.set('verifiedOnly', 'true');
    const res = await apiFetch<{ candidates: CandidateSummary[] }>(`/api/employer/candidates?${qs.toString()}`);
    setCandidates(res.candidates);
  };

  const handleMoveStage = async (appId: string, nextStatus: ApplicationStatus) => {
    try {
      await apiFetch(`/api/employer/applications/${appId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: nextStatus } : a)));
      showToast(`Candidate moved to ${nextStatus}.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Stage update failed.', 'error');
    }
  };

  const handleToggleShortlist = async (candidateId: string) => {
    const res = await apiFetch<{ shortlisted: boolean }>(`/api/employer/shortlist/${candidateId}`, {
      method: 'POST',
    });
    setCandidates((prev) =>
      prev.map((c) => (c.userId === candidateId ? { ...c, isShortlisted: res.shortlisted } : c)),
    );
    showToast(res.shortlisted ? 'Candidate shortlisted.' : 'Removed from shortlist.', 'info');
  };

  const handleContactCandidate = async (candidate: CandidateSummary) => {
    const res = await apiFetch<{ id: string }>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({
        recipientId: candidate.userId,
        contextTitle: `Hiring Inquiry — ${company?.organizationName || 'Employer'}`,
      }),
    });
    navigate(`/messages?conv=${res.id}`);
  };

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/gigs', {
        method: 'POST',
        body: JSON.stringify({
          title: gigTitle,
          description: gigDesc,
          category: gigCat,
          paymentAmount: Number(gigPay),
          estimatedDuration: gigDur,
          locationType: gigLocType,
          province: gigLoc.province,
          district: gigLoc.district,
          municipality: gigLoc.municipality,
          urgency: gigUrgency,
          requiredSkills: gigSkills.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      setGigTitle('');
      setGigDesc('');
      showToast('Micro-task published to gig board!', 'success');
      await loadWorkspace();
      setActiveTab('listings');
    } catch (err: any) {
      showToast(err.message || 'Could not post micro-task.', 'error');
    }
  };

  const handleJobStatusUpdate = async (jobId: string, status: string) => {
    await apiFetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    showToast(`Vacancy updated to ${status}.`, 'success');
    loadWorkspace();
  };

  const handleUploadEmployerDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compFile) return;
    const b64 = await fileToBase64(compFile);
    await apiFetch('/api/employer/verification', {
      method: 'POST',
      body: JSON.stringify({
        fileName: compFile.name,
        mimeType: compFile.type || 'application/pdf',
        fileBase64: b64,
      }),
    });
    setCompFile(null);
    showToast('Verification document submitted for admin review.', 'success');
    loadWorkspace();
  };

  const navItems: SidebarNavItem[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'post-job', label: 'Post a Job', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'post-gig', label: 'Post a Micro-Task', icon: <Wrench className="w-4 h-4" /> },
    { id: 'listings', label: 'My Job Listings', icon: <ClipboardList className="w-4 h-4" />, badge: jobs.length },
    { id: 'applications', label: 'Applications', icon: <Kanban className="w-4 h-4" />, badge: applications.length },
    { id: 'candidates', label: 'Find Candidates', icon: <Users className="w-4 h-4" /> },
    { id: 'shortlisted', label: 'Shortlisted', icon: <Star className="w-4 h-4" />, badge: candidates.filter((c) => c.isShortlisted).length },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" />, badge: unreadMessages },
    { id: 'company', label: 'Company Profile', icon: <Building2 className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleTabSelect = (id: string) => {
    if (id === 'messages') {
      navigate('/messages');
      return;
    }
    setActiveTab(id);
  };

  if (!user) return null;

  return (
    <DashboardLayout
      title={company?.organizationName || 'Employer Workspace'}
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={handleTabSelect}
    >
      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-2xl font-bold">{company?.organizationName}</h2>
                    <VerificationBadge status={company?.verificationStatus || 'not_submitted'} />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
                    {company?.businessCategory} · {company?.district}, {company?.province}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('post-job')}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#16C784] text-[#0B1220]"
                  >
                    Post a Job
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('post-gig')}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#3B82F6] text-white"
                  >
                    Post Micro-Task
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <DashboardStatCard label="Active Jobs" value={jobs.filter((j) => j.status === 'Active').length} accent="emerald" />
                <DashboardStatCard label="Total Applications" value={applications.length} accent="blue" />
                <DashboardStatCard label="New Applicants" value={applications.filter((a) => a.status === 'New').length} accent="amber" />
                <DashboardStatCard
                  label="Shortlisted Applicants"
                  value={applications.filter((a) => a.status === 'Shortlisted').length}
                />
                <DashboardStatCard label="Completed Tasks" value={gigs.filter((g) => g.status === 'Completed').length} accent="emerald" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Recent Applications</h3>
                    <button type="button" onClick={() => setActiveTab('applications')} className="text-xs text-[#16C784] hover:underline">
                      Open Kanban
                    </button>
                  </div>
                  {applications.slice(0, 4).map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#263449] last:border-none text-sm">
                      <div>
                        <p className="font-medium">{a.applicantName}</p>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{a.jobTitle}</p>
                      </div>
                      <span className="text-xs font-semibold text-[#16C784]">{a.status}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Active Micro-Tasks</h3>
                    <button type="button" onClick={() => setActiveTab('listings')} className="text-xs text-[#3B82F6] hover:underline">
                      Manage All
                    </button>
                  </div>
                  {gigs.slice(0, 4).map((g) => (
                    <div key={g.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-[#263449] last:border-none text-sm">
                      <div>
                        <button type="button" onClick={() => navigate(`/gigs/${g.id}`)} className="font-medium hover:text-[#3B82F6] text-left">
                          {g.title}
                        </button>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                          {formatNPR(g.paymentAmount)} · {g.interestedCount || 0} interested
                        </p>
                      </div>
                      <TaskStatusBadge status={g.status} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'post-job' && (
            <JobPostingWizard
              onCreated={() => {
                loadWorkspace();
                setActiveTab('listings');
              }}
            />
          )}

          {activeTab === 'post-gig' && (
            <form
              onSubmit={handleCreateGig}
              className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4 max-w-3xl"
            >
              <h2 className="text-xl font-bold">Post a Short-Term Micro-Task</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    value={gigTitle}
                    onChange={(e) => setGigTitle(e.target.value)}
                    placeholder="e.g. Photography for Store Launch"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Gig Category</label>
                  <select
                    value={gigCat}
                    onChange={(e) => setGigCat(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                  >
                    {['Online Tasks', 'Local Tasks', 'Creative Tasks', 'Technical Tasks', 'Physical Tasks', 'Educational Tasks', 'Event-Based Tasks'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Payment Amount (NPR)</label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={gigPay}
                    onChange={(e) => setGigPay(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Estimated Duration</label>
                  <input
                    type="text"
                    required
                    value={gigDur}
                    onChange={(e) => setGigDur(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Delivery Mode &amp; Urgency</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={gigLocType}
                      onChange={(e) => setGigLocType(e.target.value as any)}
                      className="px-2 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                    >
                      <option value="Local">Local</option>
                      <option value="Online">Online</option>
                    </select>
                    <select
                      value={gigUrgency}
                      onChange={(e) => setGigUrgency(e.target.value as any)}
                      className="px-2 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>
              <NepalLocationSelector
                province={gigLoc.province}
                district={gigLoc.district}
                municipality={gigLoc.municipality}
                onChange={setGigLoc}
              />
              <div>
                <label className="block text-xs font-medium mb-1">Required Skills (comma separated)</label>
                <input
                  type="text"
                  value={gigSkills}
                  onChange={(e) => setGigSkills(e.target.value)}
                  placeholder="Event Photography, Photoshop"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Task Description</label>
                <textarea
                  rows={3}
                  required
                  value={gigDesc}
                  onChange={(e) => setGigDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#3B82F6] text-white hover:bg-blue-600"
              >
                Publish Micro-Task
              </button>
            </form>
          )}

          {activeTab === 'listings' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-xl font-bold">My Job Listings ({jobs.length})</h2>
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="text-base font-semibold hover:text-[#16C784] text-left"
                      >
                        {job.title}
                      </button>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                        {job.district} · {formatNPR(job.salaryMin)}–{formatNPR(job.salaryMax)} ·{' '}
                        <span className="font-mono-num">{job.applicantCount || 0}</span> applicants
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={job.status}
                        onChange={(e) => handleJobStatusUpdate(job.id, e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                      >
                        <option value="Active">Active</option>
                        <option value="Paused">Paused</option>
                        <option value="Filled">Filled</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-bold">My Micro-Tasks ({gigs.length})</h3>
                {gigs.map((gig) => (
                  <div
                    key={gig.id}
                    className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() => navigate(`/gigs/${gig.id}`)}
                        className="text-base font-semibold hover:text-[#3B82F6] text-left"
                      >
                        {gig.title}
                      </button>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                        {formatNPR(gig.paymentAmount)} · {gig.interestedCount || 0} interested
                        {gig.assignedWorkerName ? ` · Assigned: ${gig.assignedWorkerName}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <TaskStatusBadge status={gig.status} />
                      <button
                        type="button"
                        onClick={() => navigate(`/gigs/${gig.id}`)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#263449]"
                      >
                        Manage Task
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'applications' && (
            <KanbanApplications applications={applications} onMoveStage={handleMoveStage} />
          )}

          {activeTab === 'candidates' && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Discover Verified Candidates</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-4">
                <div className="lg:col-span-2 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={candQ}
                    onChange={(e) => setCandQ(e.target.value)}
                    placeholder="Search skill, name, or headline..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                  />
                </div>
                <select
                  value={candProvince}
                  onChange={(e) => setCandProvince(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                >
                  <option value="all">All Provinces</option>
                  {NEPAL_PROVINCES.map((p) => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={candEdu}
                  onChange={(e) => setCandEdu(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                >
                  <option value="all">Any Qualification</option>
                  {['SEE', '+2 / Intermediate', "Bachelor's", "Master's"].map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={candVerifiedOnly}
                      onChange={(e) => setCandVerifiedOnly(e.target.checked)}
                    />
                    <span>ID Verified</span>
                  </label>
                  <button
                    type="button"
                    onClick={searchCandidates}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220]"
                  >
                    Filter
                  </button>
                </div>
              </div>

              {candidates.length === 0 ? (
                <EmptyState title="No candidates match" description="Try relaxing your province or verification filters." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {candidates.map((c) => (
                    <CandidateCard
                      key={c.userId}
                      candidate={c}
                      onViewProfile={(id) => navigate(`/profile/${id}`)}
                      onToggleShortlist={handleToggleShortlist}
                      onContact={handleContactCandidate}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'shortlisted' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Shortlisted Candidates</h2>
              {candidates.filter((c) => c.isShortlisted).length === 0 ? (
                <EmptyState
                  title="No shortlisted candidates yet"
                  description="Browse candidate discovery to shortlist verified talent."
                  actionLabel="Find Candidates"
                  onAction={() => setActiveTab('candidates')}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {candidates
                    .filter((c) => c.isShortlisted)
                    .map((c) => (
                      <CandidateCard
                        key={c.userId}
                        candidate={c}
                        onViewProfile={(id) => navigate(`/profile/${id}`)}
                        onToggleShortlist={handleToggleShortlist}
                        onContact={handleContactCandidate}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'company' && company && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Company Profile &amp; Verification</h2>
                  <VerificationBadge status={company.verificationStatus} />
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Website</label>
                    <input
                      type="url"
                      value={compWebsite}
                      onChange={(e) => setCompWebsite(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={compDesc}
                      onChange={(e) => setCompDesc(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch('/api/employer/company', {
                        method: 'PUT',
                        body: JSON.stringify({ description: compDesc, website: compWebsite }),
                      });
                      showToast('Company profile updated.', 'success');
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220]"
                  >
                    Save Company Info
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleUploadEmployerDoc}
                className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4"
              >
                <h3 className="text-base font-semibold">Organization Verification Document</h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Submit company registration, PAN/VAT certificate, or individual hiring ID to earn a Verified Employer badge.
                </p>
                <UploadDropzone
                  label="Registration / PAN Document"
                  selectedFile={compFile}
                  onFileSelected={setCompFile}
                />
                <button
                  type="submit"
                  disabled={!compFile}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#3B82F6] text-white disabled:opacity-50"
                >
                  Submit for Verification
                </button>
              </form>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 max-w-xl space-y-4">
              <h2 className="text-xl font-bold">Employer Display Settings</h2>
              <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-[#263449]">
                <span className="text-sm">Theme</span>
                <button type="button" onClick={toggleTheme} className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#263449]">
                  {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                </button>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm">Language</span>
                <button type="button" onClick={() => setLang(lang === 'en' ? 'ne' : 'en')} className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-[#263449]">
                  {lang === 'en' ? 'नेपाली' : 'English'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};
