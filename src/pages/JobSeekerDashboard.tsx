import React, { useCallback, useEffect, useState } from 'react';
import {
  Bookmark,
  Briefcase,
  FileCheck,
  LayoutDashboard,
  MessageSquare,
  Settings,
  User as UserIcon,
  Wrench,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { formatNepalDate } from '../lib/nepal-locations';
import type {
  AppNotification,
  EducationRecord,
  IdentityVerification,
  Job,
  JobApplication,
  JobSeekerProfile,
  MicroTask,
  PortfolioItem,
  UserSkill,
  WorkExperience,
} from '../types';
import { DashboardLayout, type SidebarNavItem } from '../components/ui/Navigation';
import { DashboardStatCard, EmptyState, LoadingSkeleton } from '../components/ui/CommonUI';
import { ApplicationStatusBadge, VerificationBadge } from '../components/ui/Badges';
import { GigCard, JobCard } from '../components/ui/Cards';
import { DigitalProfileSection } from '../components/seeker/DigitalProfileSection';
import { CertificateVaultSection } from '../components/seeker/CertificateVaultSection';

export const JobSeekerDashboard: React.FC = () => {
  const { user, lang, setLang, theme, toggleTheme, navigate, showToast, unreadMessages } = useApp();
  const urlTab = new URLSearchParams(window.location.search).get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(urlTab);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<JobSeekerProfile | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [educations, setEducations] = useState<EducationRecord[]>([]);
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [identity, setIdentity] = useState<IdentityVerification | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [nearbyGigs, setNearbyGigs] = useState<MicroTask[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [profRes, jobsRes, gigsRes, notifsRes] = await Promise.all([
        apiFetch<any>('/api/seeker/profile'),
        apiFetch<{ jobs: Job[] }>('/api/jobs'),
        apiFetch<{ gigs: MicroTask[] }>('/api/gigs'),
        apiFetch<{ notifications: AppNotification[] }>('/api/notifications'),
      ]);
      setProfile(profRes.profile);
      setSuggestions(profRes.completionSuggestions || []);
      setSkills(profRes.skills || []);
      setEducations(profRes.educations || []);
      setExperiences(profRes.experiences || []);
      setPortfolios(profRes.portfolios || []);
      setIdentity(profRes.identity || null);
      setApplications(profRes.applications || []);
      setSavedJobs(profRes.savedJobs || []);
      setRecommendedJobs(jobsRes.jobs.slice(0, 4));
      setNearbyGigs(gigsRes.gigs.filter((g) => g.status === 'Open').slice(0, 2));
      setNotifications(notifsRes.notifications.slice(0, 5));
    } catch (err: any) {
      showToast(err.message || 'Failed to load dashboard.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleToggleSave = async (job: Job) => {
    const res = await apiFetch<{ saved: boolean }>(`/api/jobs/${job.id}/save`, { method: 'POST' });
    showToast(res.saved ? 'Job saved.' : 'Removed from saved.', 'info');
    loadAll();
  };

  const navItems: SidebarNavItem[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'find-jobs', label: 'Find Jobs', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'gigs', label: 'Micro-Tasks', icon: <Wrench className="w-4 h-4" /> },
    { id: 'applications', label: 'My Applications', icon: <FileCheck className="w-4 h-4" />, badge: applications.length },
    { id: 'saved', label: 'Saved Opportunities', icon: <Bookmark className="w-4 h-4" />, badge: savedJobs.length },
    { id: 'profile', label: 'My Profile', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'vault', label: 'Certificate Vault', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" />, badge: unreadMessages },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleTabSelect = (id: string) => {
    if (id === 'find-jobs') {
      navigate('/jobs');
      return;
    }
    if (id === 'gigs') {
      navigate('/gigs');
      return;
    }
    if (id === 'messages') {
      navigate('/messages');
      return;
    }
    setActiveTab(id);
  };

  if (!user) return null;

  return (
    <DashboardLayout
      title="Job Seeker Workspace"
      navItems={navItems}
      activeTab={activeTab}
      onSelectTab={handleTabSelect}
    >
      {loading || !profile ? (
        <LoadingSkeleton rows={4} />
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Greeting + Completion */}
              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight">Good morning, {user.fullName}!</h2>
                  <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
                    {profile.professionalHeadline || 'Complete your headline and skills to unlock stronger matches.'}
                  </p>
                </div>
                <div className="w-full md:w-72 space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Profile Completion</span>
                    <span className="font-mono-num font-bold text-[#16C784]">
                      {profile.profileCompletionPercentage}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-[#0B1220] overflow-hidden">
                    <div
                      className="h-full bg-[#16C784] transition-all duration-300"
                      style={{ width: `${profile.profileCompletionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 4 Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 flex flex-col justify-between gap-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">Identity Verification</p>
                  <VerificationBadge status={identity?.verificationStatus || 'not_submitted'} />
                  <button
                    type="button"
                    onClick={() => setActiveTab('vault')}
                    className="text-xs text-[#3B82F6] text-left hover:underline"
                  >
                    Open Certificate Vault
                  </button>
                </div>
                <DashboardStatCard
                  label="Total Applications"
                  value={applications.length}
                  sublabel="Tracked across stages"
                  accent="blue"
                />
                <DashboardStatCard
                  label="Top Job Matches"
                  value={recommendedJobs.filter((j) => (j.match?.score ?? 0) >= 70).length}
                  sublabel="70%+ compatibility"
                  accent="emerald"
                />
                <DashboardStatCard
                  label="Saved Opportunities"
                  value={savedJobs.length}
                  sublabel="Bookmarked roles"
                />
              </div>

              {/* Recommended For You */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Recommended For You</h3>
                  <button
                    type="button"
                    onClick={() => navigate('/jobs')}
                    className="text-xs font-semibold text-[#16C784] hover:underline"
                  >
                    View all matches
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onOpen={(j) => navigate(`/jobs/${j.id}`)}
                      onApply={(j) => navigate(`/jobs/${j.id}`)}
                      onToggleSave={handleToggleSave}
                    />
                  ))}
                </div>
              </section>

              {/* Quick Micro-Tasks + Profile Improvement + Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold">Quick Opportunities Nearby</h3>
                    <button
                      type="button"
                      onClick={() => navigate('/gigs')}
                      className="text-xs font-semibold text-[#3B82F6] hover:underline"
                    >
                      All Micro-Tasks
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {nearbyGigs.map((gig) => (
                      <GigCard
                        key={gig.id}
                        gig={gig}
                        onOpen={(g) => navigate(`/gigs/${g.id}`)}
                        onExpressInterest={(g) => navigate(`/gigs/${g.id}`)}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 space-y-3">
                    <h3 className="text-sm font-semibold">Profile Improvement</h3>
                    {suggestions.length === 0 ? (
                      <p className="text-xs text-[#16C784]">Your profile is complete and match-ready.</p>
                    ) : (
                      <ul className="space-y-2 text-xs text-slate-600 dark:text-[#94A3B8]">
                        {suggestions.slice(0, 4).map((s) => (
                          <li key={s}>· {s}</li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="text-xs font-semibold text-[#16C784] hover:underline"
                    >
                      Update Profile
                    </button>
                  </div>

                  <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 space-y-3">
                    <h3 className="text-sm font-semibold">Recent Activity</h3>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500">No recent alerts.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {notifications.map((n) => (
                          <div key={n.id} className="text-xs border-b border-slate-100 dark:border-[#263449] pb-2 last:border-none">
                            <p className="font-medium text-slate-900 dark:text-[#F8FAFC]">{n.title}</p>
                            <p className="text-slate-500 dark:text-[#94A3B8] line-clamp-2">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">My Job Applications</h2>
              {applications.length === 0 ? (
                <EmptyState
                  title="No applications yet"
                  description="Explore matched jobs across Nepal and apply directly with your verified profile."
                  actionLabel="Find Jobs"
                  onAction={() => navigate('/jobs')}
                />
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/jobs/${app.jobId}`)}
                          className="text-base font-semibold hover:text-[#16C784] text-left"
                        >
                          {app.jobTitle}
                        </button>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                          {app.organizationName} · Applied {formatNepalDate(app.appliedAt, lang)}
                        </p>
                      </div>
                      <ApplicationStatusBadge status={app.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Saved Opportunities</h2>
              {savedJobs.length === 0 ? (
                <EmptyState
                  title="No saved jobs"
                  description="Bookmark interesting opportunities while browsing to review them later."
                  actionLabel="Browse Jobs"
                  onAction={() => navigate('/jobs')}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onOpen={(j) => navigate(`/jobs/${j.id}`)}
                      onApply={(j) => navigate(`/jobs/${j.id}`)}
                      onToggleSave={handleToggleSave}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <DigitalProfileSection
              user={user}
              profile={profile}
              skills={skills}
              educations={educations}
              experiences={experiences}
              portfolios={portfolios}
              identityStatus={identity?.verificationStatus || 'not_submitted'}
              onRefresh={loadAll}
            />
          )}

          {activeTab === 'vault' && (
            <CertificateVaultSection
              educations={educations}
              identity={identity}
              onRefresh={loadAll}
            />
          )}

          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 max-w-xl space-y-5">
              <h2 className="text-xl font-bold">Account &amp; Display Settings</h2>
              <div className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-[#263449]">
                <div>
                  <p className="text-sm font-medium">Theme Appearance</p>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Switch between Dark and Light mode</p>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-[#263449]"
                >
                  {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                </button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">Interface Language</p>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">English or नेपाली (Nepali)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-[#263449]"
                >
                  {lang === 'en' ? 'Switch to नेपाली' : 'Switch to English'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};
