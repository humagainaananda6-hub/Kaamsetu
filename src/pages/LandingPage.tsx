import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Lock,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { t } from '../lib/i18n';
import { formatNPR } from '../lib/nepal-locations';
import type { Job, MicroTask } from '../types';
import { PublicNavbar } from '../components/ui/Navigation';
import { GigCard, JobCard } from '../components/ui/Cards';

const FAQS = [
  {
    q: 'How is KaamSetu different from freelancing bidding sites?',
    a: 'There are no reverse-auction bidding wars. Job seekers create a verified skill and education profile once, and KaamSetu computes transparent rule-based match scores directly against employer requirements.',
  },
  {
    q: 'Does uploading my Citizenship (Nagarikta) or SEE certificate make me verified immediately?',
    a: 'No. Uploaded documents enter a Pending Review queue and are stored privately outside public directories. Verified badges only appear after an authorized reviewer approves the submission.',
  },
  {
    q: 'Can employers see my citizenship number or private certificate scans?',
    a: 'Never. Employers only see your public resume, verified status badges, and consented qualification summaries. Sensitive identity documents are restricted to verification personnel with access logging.',
  },
  {
    q: 'How do payments work for Micro-Tasks and local gigs?',
    a: 'Task listings display agreed NPR compensation upfront. KaamSetu is architected for modular eSewa, Khalti, and Fonepay integrations once merchant credentials are configured; until then, workers and posters settle compensation directly.',
  },
];

const SAMPLE_TESTIMONIALS = [
  {
    name: 'Aarav Shrestha (Sample Profile)',
    role: 'B.Sc. CSIT Graduate · Lalitpur',
    quote:
      'Instead of scrolling dozens of scattered social media posts, I verified my SEE transcript once and received a 94% match alert for a local React role in Jhamsikhel.',
  },
  {
    name: 'Sita Gurung (Sample Profile)',
    role: 'Brand & UI Designer · Pokhara',
    quote:
      'Local cafes and startups in Kaski discovered my portfolio directly without forcing me to undercut my rates in bidding wars.',
  },
  {
    name: 'Bikash Thapa (Sample Employer)',
    role: 'Founder, Himalayan Tech Labs · Kathmandu',
    quote:
      'Filtering candidates by verified academic credentials and exact TypeScript skills cut our shortlisting time from two weeks to two days.',
  },
];

export const LandingPage: React.FC = () => {
  const { lang, setLang, theme, toggleTheme, categories, platformStats, navigate } = useApp();
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [featuredGigs, setFeaturedGigs] = useState<MicroTask[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    apiFetch<{ jobs: Job[] }>('/api/jobs')
      .then((res) => setFeaturedJobs(res.jobs.slice(0, 3)))
      .catch(() => {});
    apiFetch<{ gigs: MicroTask[] }>('/api/gigs')
      .then((res) => setFeaturedGigs(res.gigs.slice(0, 3)))
      .catch(() => {});
  }, []);

  const jobCategories = categories.filter((c) => c.type === 'job');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F8FAFC]">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12">
        {/* Clean Preferences Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#263449]/70 mb-8">
          <p className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
            Nepal&apos;s Verified Employment &amp; Local Gig Ecosystem · All 7 Provinces
          </p>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111B2E] p-0.5">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  lang === 'en'
                    ? 'bg-[#16C784] text-[#0B1220]'
                    : 'text-slate-600 dark:text-[#94A3B8]'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang('ne')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  lang === 'ne'
                    ? 'bg-[#16C784] text-[#0B1220]'
                    : 'text-slate-600 dark:text-[#94A3B8]'
                }`}
              >
                नेपाली
              </button>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg border border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111B2E] text-slate-700 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-balance text-slate-900 dark:text-[#F8FAFC]">
              {t(lang, 'heroHeadline')}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-[#94A3B8] leading-relaxed max-w-xl">
              {t(lang, 'heroSubtext')}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate('/jobs')}
                className="px-6 py-3 text-sm font-semibold rounded-xl bg-[#16C784] text-[#0B1220] hover:bg-[#13b074] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
              >
                <span>{t(lang, 'ctaPrimary')}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/auth?mode=register&role=employer')}
                className="px-6 py-3 text-sm font-semibold rounded-xl border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#111B2E] text-slate-900 dark:text-[#F8FAFC] hover:border-[#3B82F6] transition-colors whitespace-nowrap"
              >
                {t(lang, 'ctaSecondary')}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Your Skills. Your Qualifications. Your Opportunities.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-[#263449] bg-slate-200 dark:bg-[#172338] relative min-h-[280px]">
              <img
                src="/src/assets/images/hero_kaamsetu_connect_1794931632628.jpg"
                alt="Nepali professionals collaborating in a bright Kathmandu studio overlooking the Himalayas"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5">
                <p className="text-xs font-medium text-white/90">
                  Direct Skill &amp; Credential Matching · Kathmandu Valley to All 77 Districts
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Live Seeded Platform Metrics Strip */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5">
            <span className="block text-2xl font-bold font-mono-num tabular-nums text-[#16C784]">
              {platformStats.activeJobs}
            </span>
            <span className="mt-1 block text-xs text-slate-600 dark:text-[#94A3B8]">
              Active Verified Jobs (Demo Seed)
            </span>
          </div>
          <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5">
            <span className="block text-2xl font-bold font-mono-num tabular-nums text-[#3B82F6]">
              {platformStats.openGigs}
            </span>
            <span className="mt-1 block text-xs text-slate-600 dark:text-[#94A3B8]">
              Open Micro-Tasks Nearby
            </span>
          </div>
          <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5">
            <span className="block text-2xl font-bold font-mono-num tabular-nums text-slate-900 dark:text-[#F8FAFC]">
              77
            </span>
            <span className="mt-1 block text-xs text-slate-600 dark:text-[#94A3B8]">
              Districts Indexed Across 7 Provinces
            </span>
          </div>
          <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5">
            <span className="block text-2xl font-bold font-mono-num tabular-nums text-slate-900 dark:text-[#F8FAFC]">
              0%
            </span>
            <span className="mt-1 block text-xs text-slate-600 dark:text-[#94A3B8]">
              Bidding Wars · Direct Matching Only
            </span>
          </div>
        </div>
      </section>

      {/* Verified Profile & Smart Matching Asymmetric Bento */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-slate-200 dark:border-[#263449]">
        <div className="max-w-2xl mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">
            Built for Trust, Verification, and Direct Hiring
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-[#94A3B8]">
            Replace scattered social media job posts and unverified resumes with structured credentials and transparent matching.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-[#16C784] text-sm font-semibold">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Explainable Smart Matching Engine</span>
            </div>
            <h3 className="text-xl font-bold">Know exactly why a role matches your profile</h3>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
              Every job calculates a weighted 0–100% compatibility score across five transparent factors — Skills (35%), Education (25%), Experience (15%), Location &amp; Work Mode (15%), and Availability (10%). Scores guide discovery and never auto-reject applicants.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              {[
                ['Skills', '35%'],
                ['Education', '25%'],
                ['Experience', '15%'],
                ['Location', '15%'],
                ['Preference', '10%'],
              ].map(([label, weight]) => (
                <div
                  key={label}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449]"
                >
                  <span className="block text-base font-bold font-mono-num text-[#16C784]">{weight}</span>
                  <span className="block text-xs text-slate-600 dark:text-[#94A3B8]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-[#3B82F6] text-sm font-semibold">
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span>Private Certificate Vault</span>
            </div>
            <h3 className="text-xl font-bold">Citizenship &amp; Academic Security</h3>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
              Upload SEE, +2, Bachelor&apos;s, Master&apos;s, or CTEVT certificates plus Nepali Citizenship (Nagarikta) into access-controlled storage. Only authorized reviewers inspect documents via short-lived signed URLs.
            </p>
            <div className="pt-2 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16C784] shrink-0" />
                <span>Citizenship numbers never shown publicly</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16C784] shrink-0" />
                <span>Verified badges only after reviewer approval</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-slate-200 dark:border-[#263449]">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Featured Opportunities</h2>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
              Live listings from verified Nepali startups, businesses, and organizations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/jobs')}
            className="text-sm font-semibold text-[#16C784] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>Browse all jobs</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {featuredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onOpen={(j) => navigate(`/jobs/${j.id}`)}
              onApply={(j) => navigate(`/jobs/${j.id}`)}
            />
          ))}
        </div>
      </section>

      {/* Micro-Tasks Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-slate-200 dark:border-[#263449]">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Small Tasks. Real Earnings.</h2>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8]">
              Short-term local errands, event photography, poster design, tutoring, and data entry across Nepal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/gigs')}
            className="text-sm font-semibold text-[#3B82F6] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>Explore Micro-Task Board</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {featuredGigs.map((gig) => (
            <GigCard
              key={gig.id}
              gig={gig}
              onOpen={(g) => navigate(`/gigs/${g.id}`)}
              onExpressInterest={(g) => navigate(`/gigs/${g.id}`)}
            />
          ))}
        </div>
      </section>

      {/* Featured Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-slate-200 dark:border-[#263449]">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Explore 16 Employment Sectors</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {jobCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/jobs?category=${cat.id}`)}
              className="p-3.5 rounded-xl text-left bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] hover:border-[#16C784] transition-colors"
            >
              <span className="block text-sm font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                {cat.name}
              </span>
              <span className="block text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 truncate">
                {cat.nameNe}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-slate-200 dark:border-[#263449]">
        <h2 className="text-2xl font-bold tracking-tight mb-8">How KaamSetu Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01. Build & Verify Your Profile',
              text: 'Add your skills, work history, and education from SEE to Master’s. Submit certificates and Nagarikta privately for human verification.',
            },
            {
              step: '02. Review Explained Matches',
              text: 'Browse full-time roles, internships, or local micro-tasks ranked by compatibility with clear factor-by-factor explanations.',
            },
            {
              step: '03. Connect & Track Directly',
              text: 'Apply in one click, message employers inside KaamSetu, and follow every stage from New to Shortlisted, Interview, and Selected.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-6 space-y-2"
            >
              <h3 className="text-base font-bold text-[#16C784]">{item.step}</h3>
              <p className="text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Employer Benefits */}
      <section id="for-employers" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-slate-200 dark:border-[#263449]">
        <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#16C784]">
              <ShieldCheck className="w-4 h-4" />
              <span>For Startups, SMEs &amp; Local Businesses</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Hire Verified Nepali Talent Faster
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8]">
              Post vacancies in NPR with clear province/district targeting, discover candidates with verified academic records, and move applicants seamlessly across your 6-stage Kanban hiring pipeline.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/auth?mode=register&role=employer')}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#16C784] text-[#0B1220] hover:bg-[#13b074] transition-colors"
              >
                Create Employer Account
              </button>
              <button
                type="button"
                onClick={() => navigate('/auth?mode=login')}
                className="px-5 py-2.5 text-sm font-medium rounded-xl border border-slate-300 dark:border-[#263449] hover:bg-slate-100 dark:hover:bg-[#111B2E] transition-colors"
              >
                Try Employer Demo
              </button>
            </div>
          </div>
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-sm">
            {[
              ['6-Stage Kanban', 'New -> Selected pipeline'],
              ['Candidate Search', 'Filter by verified degrees'],
              ['Micro-Tasks', 'Assign local gigs in hours'],
              ['Direct Messaging', 'No middleman commissions'],
            ].map(([title, sub]) => (
              <div
                key={title}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449]"
              >
                <p className="font-semibold text-slate-900 dark:text-[#F8FAFC]">{title}</p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Testimonials (Clearly Labeled Sample Content) */}
      <section id="about-us" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-slate-200 dark:border-[#263449]">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Community Stories (Sample Illustrative Scenarios)</h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Illustrative sample scenarios showing how students, freelancers, and employers use KaamSetu.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SAMPLE_TESTIMONIALS.map((item) => (
            <div
              key={item.name}
              className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-6 flex flex-col justify-between gap-4"
            >
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">&ldquo;{item.quote}&rdquo;</p>
              <div className="pt-3 border-t border-slate-100 dark:border-[#263449]">
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{item.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 border-t border-slate-200 dark:border-[#263449]">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl overflow-hidden"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-medium text-sm sm:text-base"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-slate-600 dark:text-[#94A3B8] border-t border-slate-100 dark:border-[#263449] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-[#263449] bg-white dark:bg-[#111B2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
          <div className="space-y-2">
            <span className="text-base font-extrabold font-display tracking-tight">KAAMSETU</span>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Connecting Skills to Opportunities across Nepal&apos;s 7 provinces and 77 districts.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
              Platform
            </p>
            <div className="flex flex-col gap-1.5 text-xs">
              <button type="button" onClick={() => navigate('/jobs')} className="text-left hover:text-[#16C784]">
                Smart Job Discovery
              </button>
              <button type="button" onClick={() => navigate('/gigs')} className="text-left hover:text-[#16C784]">
                Micro-Task Board
              </button>
              <button type="button" onClick={() => navigate('/auth')} className="text-left hover:text-[#16C784]">
                Login &amp; Demo Accounts
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
              Privacy &amp; Retention
            </p>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Identity &amp; academic files are stored privately with explicit consent, access logging, and user-initiated deletion rights.
            </p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
              Nepal Integrations Ready
            </p>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Modular hooks prepared for eSewa, Khalti, Fonepay &amp; SMS OTP gateways (unconfigured in local mode; direct settlement applies). Contact: support@kaamsetu.np
            </p>
          </div>
        </div>
        <div className="border-t border-slate-200 dark:border-[#263449] py-4 text-center text-xs text-slate-500 dark:text-[#94A3B8]">
          © {new Date().getFullYear()} KaamSetu Nepal · Currency: NPR (रु)
        </div>
      </footer>
    </div>
  );
};
