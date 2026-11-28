import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Briefcase,
  Building2,
  CheckCircle2,
  Compass,
  FileCheck2,
  ImagePlus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Wrench,
  Zap,
} from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { NEPAL_PROVINCES } from '../lib/nepal-locations';
import type { Job, MicroTask, User } from '../types';
import { PublicNavbar } from '../components/ui/Navigation';
import { GigCard, JobCard } from '../components/ui/Cards';
import { ConfirmationModal, EmptyState, LoadingSkeleton } from '../components/ui/CommonUI';
import { Floating3DBridge } from '../components/ui/Floating3DBridge';
import { TiltCard } from '../components/ui/TiltCard';

type FeedTab = 'all' | 'jobs' | 'gigs';

export const AppHomePage: React.FC = () => {
  const { user, establishSession, platformStats, unreadMessages, navigate, showToast } = useApp();
  const prefersReduced = useReducedMotion();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [gigs, setGigs] = useState<MicroTask[]>([]);
  const [loading, setLoading] = useState(true);

  const [feedTab, setFeedTab] = useState<FeedTab>('all');
  const [searchQ, setSearchQ] = useState('');
  const [workMode, setWorkMode] = useState('all');
  const [province, setProvince] = useState('all');
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const [applyTarget, setApplyTarget] = useState<Job | null>(null);
  const [coverMessage, setCoverMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [interestTarget, setInterestTarget] = useState<MicroTask | null>(null);
  const [interestNote, setInterestNote] = useState('');

  // Pointer parallax for hero 3D #scene
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const [sceneTilt, setSceneTilt] = useState('');

  const loadFeed = async () => {
    setLoading(true);
    try {
      const [jobsRes, gigsRes] = await Promise.all([
        apiFetch<{ jobs: Job[] }>('/api/jobs'),
        apiFetch<{ gigs: MicroTask[] }>('/api/gigs'),
      ]);
      setJobs(jobsRes.jobs);
      setGigs(gigsRes.gigs);
    } catch {
      // Keep cached/empty gracefully when offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [user?.id]);

  const dashboardPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'employer' ? '/employer' : '/seeker';

  const handleHeroPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (prefersReduced || window.innerWidth <= 820 || e.pointerType === 'touch') return;
    const x = e.clientX / Math.max(window.innerWidth, 1) - 0.5;
    const y = e.clientY / Math.max(window.innerHeight, 1) - 0.5;
    setSceneTilt(`rotateY(${(x * 20).toFixed(2)}deg) rotateX(${(-y * 14).toFixed(2)}deg)`);
  };

  const handleQuickDemo = async (email: string, password: string, label: string) => {
    setDemoLoading(email);
    try {
      const res = await apiFetch<{ user: User; token?: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await establishSession(res.user, res.token);
      showToast(`Signed in as ${res.user.fullName}`, 'success');
      if (res.user.role === 'admin') navigate('/admin');
      else if (res.user.role === 'employer') navigate('/employer');
      else navigate('/seeker');
    } catch (err: any) {
      showToast(err.message || `Could not open ${label} workspace.`, 'error');
    } finally {
      setDemoLoading(null);
    }
  };

  const filteredJobs = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return jobs.filter((j) => {
      if (workMode !== 'all' && j.workMode !== workMode) return false;
      if (province !== 'all' && j.province !== province) return false;
      if (!q) return true;
      return (
        j.title.toLowerCase().includes(q) ||
        j.organizationName.toLowerCase().includes(q) ||
        j.district.toLowerCase().includes(q) ||
        j.requiredSkills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [jobs, searchQ, workMode, province]);

  const filteredGigs = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return gigs.filter((g) => {
      if (workMode === 'Remote' && g.locationType !== 'Online') return false;
      if ((workMode === 'On-site' || workMode === 'Hybrid') && g.locationType !== 'Local') return false;
      if (province !== 'all' && g.province !== province) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.district.toLowerCase().includes(q) ||
        g.requiredSkills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [gigs, searchQ, workMode, province]);

  const handleToggleSave = async (job: Job) => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }
    try {
      const res = await apiFetch<{ saved: boolean }>(`/api/jobs/${job.id}/save`, { method: 'POST' });
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, isSaved: res.saved } : j)));
      showToast(res.saved ? 'Saved to your opportunities.' : 'Removed from saved.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Could not update saved state.', 'error');
    }
  };

  const handleOpenApply = (job: Job) => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }
    if (user.role !== 'job_seeker') {
      showToast('Switch to a Job Seeker account to apply.', 'info');
      return;
    }
    setApplyTarget(job);
    setCoverMessage(
      `Namaste! I am interested in ${job.title} and have shared my verified KaamBridgeNepal (KBN) profile for review.`,
    );
  };

  const handleConfirmApply = async () => {
    if (!applyTarget) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/jobs/${applyTarget.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ coverMessage }),
      });
      setJobs((prev) => prev.map((j) => (j.id === applyTarget.id ? { ...j, hasApplied: true } : j)));
      showToast(`Applied to ${applyTarget.title}`, 'success');
      setApplyTarget(null);
    } catch (err: any) {
      showToast(err.message || 'Could not submit application.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenInterest = (gig: MicroTask) => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }
    if (user.role !== 'job_seeker') {
      showToast('Switch to a Job Seeker account to apply for tasks.', 'info');
      return;
    }
    setInterestTarget(gig);
    setInterestNote(`Namaste! I am available for "${gig.title}" and can complete it within ${gig.estimatedDuration}.`);
  };

  const handleConfirmInterest = async () => {
    if (!interestTarget) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/gigs/${interestTarget.id}/interest`, {
        method: 'POST',
        body: JSON.stringify({ message: interestNote }),
      });
      setGigs((prev) =>
        prev.map((g) => (g.id === interestTarget.id ? { ...g, hasExpressedInterest: true } : g)),
      );
      showToast('Interest sent to task poster!', 'success');
      setInterestTarget(null);
    } catch (err: any) {
      showToast(err.message || 'Could not submit interest.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen text-[#0B1220] dark:text-[#F8FAFC] flex flex-col"
      onPointerMove={handleHeroPointerMove}
      onPointerLeave={() => setSceneTilt('')}
    >
      <PublicNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-24 lg:pb-12 space-y-12">
        {/* UI-Base Hero Split with 3D Floating Cards & Orbital Ring */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[64vh]">
          <div className="lg:col-span-6 space-y-6">
            <h1 className="text-[clamp(36px,5.6vw,68px)] leading-[1.02] tracking-[-2px] font-extrabold kbn-hero-gradient max-w-[11.5em]">
              Your skills deserve the right opportunity.
            </h1>

            <p className="text-base text-[#51617a] dark:text-[#94A3B8] max-w-[36em] leading-relaxed">
              Verified jobs and local gigs across Nepal. No bidding wars, just direct matches between your qualifications and people who need them.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/jobs')}
                className="px-6 py-3.5 text-sm font-bold rounded-[14px] kbn-btn-primary"
              >
                Find opportunities
              </button>
              <button
                type="button"
                onClick={() => navigate(user?.role === 'employer' ? '/employer' : '/auth?mode=register')}
                className="px-6 py-3.5 text-sm font-bold rounded-[14px] kbn-card-surface text-[#0B1220] dark:text-[#F8FAFC] hover:border-[#3B82F6]"
              >
                Hire talent
              </button>
              <button
                type="button"
                onClick={() => navigate('/verify')}
                className="px-4 py-3.5 text-sm font-semibold rounded-[14px] border border-[#d5deea] dark:border-[#263449] bg-white/70 dark:bg-[#111B2E]/80 text-[#0B1220] dark:text-[#F8FAFC] hover:border-[#16C784] inline-flex items-center gap-2 transition-colors"
              >
                <ImagePlus className="w-4 h-4 text-[#16C784]" />
                <span>Verify Certificate</span>
              </button>
            </div>

            {/* Quick Workspace / Demo Switcher Strip */}
            {user ? (
              <div className="kbn-card-surface rounded-[18px] p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#16C784] uppercase tracking-wider">
                    Signed in · {user.role.replace('_', ' ')}
                  </p>
                  <p className="text-sm font-bold truncate">{user.fullName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(dashboardPath)}
                    className="px-3.5 py-2 text-xs font-bold rounded-[12px] kbn-btn-primary"
                  >
                    Open Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/messages')}
                    className="px-3.5 py-2 text-xs font-semibold rounded-[12px] border border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#111B2E]"
                  >
                    Messages{unreadMessages > 0 ? ` (${unreadMessages})` : ''}
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#51617a] dark:text-[#94A3B8]">
                  Instant Demo Access
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!!demoLoading}
                    onClick={() => handleQuickDemo('aarav@kaamsetu.np', 'KaamSetu@2026', 'Job Seeker')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[#d5deea] dark:border-[#263449] bg-white/90 dark:bg-[#172338] hover:border-[#16C784] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#16C784]" />
                    <span>Seeker · Aarav</span>
                  </button>
                  <button
                    type="button"
                    disabled={!!demoLoading}
                    onClick={() => handleQuickDemo('bikash@himalayantech.np', 'KaamSetu@2026', 'Employer')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[#d5deea] dark:border-[#263449] bg-white/90 dark:bg-[#172338] hover:border-[#3B82F6] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span>Employer · Bikash</span>
                  </button>
                  <button
                    type="button"
                    disabled={!!demoLoading}
                    onClick={() => handleQuickDemo('admin@kaamsetu.np', 'AdminSetu@2026', 'Admin')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[#d5deea] dark:border-[#263449] bg-white/90 dark:bg-[#172338] hover:border-[#F59E0B] inline-flex items-center gap-1.5 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Admin · Prativa</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right 3D Parallax Floating Scene (#scene) */}
          <div className="lg:col-span-6" style={{ perspective: '1200px' }}>
            <div
              ref={sceneRef}
              data-testid="kbn-hero-3d-scene"
              className="relative h-[400px] sm:h-[450px] transition-transform duration-150 ease-out"
              style={{
                transformStyle: 'preserve-3d',
                transform: sceneTilt || undefined,
              }}
            >
              {/* Rotating 3D Dashed Orbital Ring */}
              <div
                aria-hidden="true"
                className="kbn-ring-spin absolute left-1/2 top-1/2 w-[280px] sm:w-[380px] h-[280px] sm:h-[380px] -ml-[140px] sm:-ml-[190px] -mt-[140px] sm:-mt-[190px] rounded-full border-2 border-dashed border-[#d5deea] dark:border-[#263449]"
              />

              {/* Floating Card 1: Verified Job Match */}
              <TiltCard
                onClick={() => navigate('/jobs')}
                maxTilt={14}
                depth={65}
                className="kbn-bob kbn-card-surface cursor-pointer absolute left-[2%] sm:left-[5%] top-[2%] sm:top-[4%] w-[215px] sm:w-[295px] rounded-[20px] p-4 sm:p-5 shadow-[0_36px_60px_-28px_rgba(0,0,0,0.55)]"
                style={{ transform: 'translateZ(60px)' }}
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16C784]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verified employer
                </span>
                <strong className="block text-base sm:text-[17px] mt-1.5">Frontend Developer</strong>
                <span className="block text-xs text-[#51617a] dark:text-[#94A3B8] mt-0.5 font-mono-num">
                  Kathmandu · रु 45,000–70,000
                </span>
                <span className="block mt-2.5 text-sm font-extrabold text-[#16C784] font-mono-num">
                  92% match
                </span>
              </TiltCard>

              {/* Floating Card 2: Open Local Gig */}
              <TiltCard
                onClick={() => navigate('/gigs')}
                maxTilt={14}
                depth={130}
                className="kbn-bob kbn-card-surface cursor-pointer absolute right-0 top-[36%] sm:top-[34%] w-[195px] sm:w-[245px] rounded-[20px] p-4 sm:p-5 border-[#16C784]/70 shadow-[0_36px_60px_-28px_rgba(0,0,0,0.55)]"
                style={{ animationDelay: '-1.5s', transform: 'translateZ(130px)' }}
              >
                <strong className="block text-base sm:text-[17px]">Poster design</strong>
                <span className="block text-xs text-[#51617a] dark:text-[#94A3B8] mt-0.5 font-mono-num">
                  Pokhara · रु 3,500 · 2 days
                </span>
                <span className="inline-block mt-2.5 text-[11px] font-bold text-[#F59E0B]">
                  Open gig · Direct match
                </span>
              </TiltCard>

              {/* Floating Card 3: Verified Certificate */}
              <TiltCard
                onClick={() => navigate('/verify')}
                maxTilt={14}
                depth={95}
                className="kbn-bob kbn-card-surface cursor-pointer absolute left-[6%] sm:left-[14%] bottom-[2%] w-[215px] sm:w-[265px] rounded-[20px] p-4 sm:p-5 shadow-[0_36px_60px_-28px_rgba(0,0,0,0.55)]"
                style={{ animationDelay: '-3s', transform: 'translateZ(95px)' }}
              >
                <strong className="block text-base sm:text-[17px]">Bachelor&apos;s certificate</strong>
                <span className="block text-xs text-[#51617a] dark:text-[#94A3B8] mt-0.5">
                  Reviewed by KBN team · SHA-256
                </span>
                <span className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-bold text-[#16C784]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified · Inspect &amp; Upload
                </span>
              </TiltCard>
            </div>
          </div>
        </section>

        {/* UI-Base 3 Core Value Cards (Emerald / Blue / Pink top stripes + 3D Tilt) */}
        <section className="kbn-card-grid grid grid-cols-1 md:grid-cols-3 gap-5">
          <TiltCard
            as="article"
            onClick={() => navigate('/verify')}
            className="kbn-card-surface cursor-pointer rounded-[20px] p-6 space-y-2.5"
          >
            <div className="w-10 h-10 rounded-xl bg-[#16C784]/15 text-[#16C784] grid place-items-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold">Verified profiles</h2>
            <p className="text-sm text-[#51617a] dark:text-[#94A3B8] leading-relaxed">
              Upload certificates and ID privately. A badge appears only after human and cryptographic review, never on upload alone.
            </p>
          </TiltCard>

          <TiltCard
            as="article"
            onClick={() => navigate('/jobs')}
            className="kbn-card-surface cursor-pointer rounded-[20px] p-6 space-y-2.5"
          >
            <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/15 text-[#3B82F6] grid place-items-center">
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold">Smart matching</h2>
            <p className="text-sm text-[#51617a] dark:text-[#94A3B8] leading-relaxed">
              Skills, education, experience, and Nepal district location are scored transparently. Scores guide, they never auto-reject.
            </p>
          </TiltCard>

          <TiltCard
            as="article"
            onClick={() => navigate('/gigs')}
            className="kbn-card-surface cursor-pointer rounded-[20px] p-6 space-y-2.5"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F472B6]/15 text-[#F472B6] grid place-items-center">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold">Local gigs</h2>
            <p className="text-sm text-[#51617a] dark:text-[#94A3B8] leading-relaxed">
              Photography, tutoring, delivery, data entry, and design tasks across all 77 districts with direct employer contact.
            </p>
          </TiltCard>
        </section>

        {/* Interactive 3D Bridge & Showcase Strip */}
        <section className="kbn-card-surface rounded-[24px] p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#16C784]">
              <Sparkles className="w-4 h-4" />
              <span>3D Talent Wall &amp; Certificate Photo Vault</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Upload Certificate Photos &amp; Fly Through Verified Profiles in 3D
            </h2>
            <p className="text-sm text-[#51617a] dark:text-[#94A3B8] leading-relaxed">
              Add academic certificates or CTEVT diplomas with SHA-256 verification, inspect authenticity instantly, and explore Nepal talent on the interactive 3D wall.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate('/showcase')}
                className="px-4 py-2.5 text-xs font-bold rounded-[12px] kbn-btn-primary inline-flex items-center gap-1.5"
              >
                <Box className="w-4 h-4" />
                <span>Open 3D Showcase Wall</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/verify')}
                className="px-4 py-2.5 text-xs font-semibold rounded-[12px] border border-[#d5deea] dark:border-[#263449] bg-white dark:bg-[#111B2E] hover:border-[#16C784] inline-flex items-center gap-1.5"
              >
                <FileCheck2 className="w-4 h-4 text-[#3B82F6]" />
                <span>Certificate Photo Hub</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 h-52 rounded-[18px] bg-gradient-to-br from-[#EEF3F9] via-white to-emerald-50/70 dark:from-[#0B1220] dark:via-[#111B2E] dark:to-[#0d2429] border border-[#d5deea] dark:border-[#263449] overflow-hidden">
            <Floating3DBridge variant="showcase" />
          </div>
        </section>

        {/* Live Database Opportunities Feed */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Live Verified Opportunities
              </h2>
              <p className="text-sm text-[#51617a] dark:text-[#94A3B8] mt-1">
                <span className="font-mono-num font-bold text-[#16C784]">{platformStats.activeJobs}</span> active jobs ·{' '}
                <span className="font-mono-num font-bold text-[#3B82F6]">{platformStats.openGigs}</span> open gigs across{' '}
                <span className="font-mono-num font-bold">77</span> districts
              </p>
            </div>

            <div className="inline-flex rounded-full bg-white dark:bg-[#172338] border border-[#d5deea] dark:border-[#263449] p-1 gap-1" role="tablist">
              {(
                [
                  ['all', `All (${filteredJobs.length + filteredGigs.length})`, Compass],
                  ['jobs', `Jobs (${filteredJobs.length})`, Briefcase],
                  ['gigs', `Gigs (${filteredGigs.length})`, Wrench],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={feedTab === id}
                  onClick={() => setFeedTab(id)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-full inline-flex items-center gap-1.5 transition-colors ${
                    feedTab === id
                      ? 'bg-[#16C784] text-[#03130d]'
                      : 'text-[#51617a] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Search & Chip Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search title, skill or city (e.g. React, Kathmandu, Pokhara)"
                aria-label="Search opportunities"
                className="w-full pl-11 pr-4 py-3 text-sm rounded-[14px] bg-white dark:bg-[#172338] border border-[#d5deea] dark:border-[#263449]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {['all', 'Remote', 'Hybrid', 'On-site'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setWorkMode(mode)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-full border transition-colors ${
                    workMode === mode
                      ? 'bg-[#16C784] text-[#03130d] border-[#16C784]'
                      : 'bg-white dark:bg-[#172338] border-[#d5deea] dark:border-[#263449] text-[#51617a] dark:text-[#94A3B8]'
                  }`}
                >
                  {mode === 'all' ? 'All Modes' : mode}
                </button>
              ))}

              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                aria-label="Filter by province"
                className="px-3.5 py-2 text-xs font-semibold rounded-full bg-white dark:bg-[#172338] border border-[#d5deea] dark:border-[#263449]"
              >
                <option value="all">All 7 Provinces</option>
                {NEPAL_PROVINCES.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : (
            <div className="space-y-8">
              {(feedTab === 'all' || feedTab === 'jobs') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#51617a] dark:text-[#94A3B8]">
                      Featured Job Opportunities
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigate('/jobs')}
                      className="text-xs font-bold text-[#16C784] hover:underline"
                    >
                      View all jobs →
                    </button>
                  </div>

                  {filteredJobs.length === 0 ? (
                    <EmptyState
                      title="No matching jobs"
                      description="Try a different keyword or reset your work mode/province filter."
                    />
                  ) : (
                    <div className="kbn-card-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredJobs.slice(0, 6).map((job) => (
                        <JobCard
                          key={job.id}
                          job={job}
                          onOpen={(j) => navigate(`/jobs/${j.id}`)}
                          onApply={handleOpenApply}
                          onToggleSave={handleToggleSave}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(feedTab === 'all' || feedTab === 'gigs') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#51617a] dark:text-[#94A3B8]">
                      Local &amp; Online Gigs
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigate('/gigs')}
                      className="text-xs font-bold text-[#3B82F6] hover:underline"
                    >
                      Open gig board →
                    </button>
                  </div>

                  {filteredGigs.length === 0 ? (
                    <EmptyState
                      title="No matching gigs"
                      description="Adjust your location or search filter to view open short-term tasks."
                    />
                  ) : (
                    <div className="kbn-card-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredGigs.slice(0, 6).map((gig) => (
                        <GigCard
                          key={gig.id}
                          gig={gig}
                          onOpen={(g) => navigate(`/gigs/${g.id}`)}
                          onExpressInterest={handleOpenInterest}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <ConfirmationModal
        open={!!applyTarget}
        title={applyTarget ? `Apply to ${applyTarget.title}` : 'Confirm Application'}
        description={
          applyTarget
            ? `Your KaamBridgeNepal (KBN) profile and verified academic qualifications will be shared with ${applyTarget.organizationName}. Private citizenship images are never shared.`
            : ''
        }
        confirmLabel="Submit Application"
        loading={submitting}
        onConfirm={handleConfirmApply}
        onCancel={() => setApplyTarget(null)}
      >
        <div>
          <label className="block text-xs font-medium mb-1.5">Cover Note</label>
          <textarea
            rows={4}
            value={coverMessage}
            onChange={(e) => setCoverMessage(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
          />
        </div>
      </ConfirmationModal>

      <ConfirmationModal
        open={!!interestTarget}
        title={interestTarget ? `Express Interest: ${interestTarget.title}` : 'Express Interest'}
        description="Send your availability note directly to the task poster."
        confirmLabel="Send Interest"
        loading={submitting}
        onConfirm={handleConfirmInterest}
        onCancel={() => setInterestTarget(null)}
      >
        <div>
          <label className="block text-xs font-medium mb-1.5">Message to Poster</label>
          <textarea
            rows={3}
            value={interestNote}
            onChange={(e) => setInterestNote(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
          />
        </div>
      </ConfirmationModal>
    </div>
  );
};
