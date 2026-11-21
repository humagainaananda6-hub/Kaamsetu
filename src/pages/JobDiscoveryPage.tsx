import React, { useEffect, useState } from 'react';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { NEPAL_PROVINCES, getDistrictsByProvince } from '../lib/nepal-locations';
import type { Job } from '../types';
import { PublicNavbar } from '../components/ui/Navigation';
import { JobCard } from '../components/ui/Cards';
import { ConfirmationModal, EmptyState, LoadingSkeleton } from '../components/ui/CommonUI';

export const JobDiscoveryPage: React.FC = () => {
  const { user, categories, skills, navigate, showToast } = useApp();
  const urlParams = new URLSearchParams(window.location.search);

  const [q, setQ] = useState(urlParams.get('q') || '');
  const [category, setCategory] = useState(urlParams.get('category') || 'all');
  const [province, setProvince] = useState('all');
  const [district, setDistrict] = useState('all');
  const [employmentType, setEmploymentType] = useState('all');
  const [education, setEducation] = useState('all');
  const [workMode, setWorkMode] = useState('all');
  const [skill, setSkill] = useState('all');
  const [minSalary, setMinSalary] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyTarget, setApplyTarget] = useState<Job | null>(null);
  const [coverMessage, setCoverMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set('q', q.trim());
      if (category !== 'all') qs.set('category', category);
      if (province !== 'all') qs.set('province', province);
      if (district !== 'all') qs.set('district', district);
      if (employmentType !== 'all') qs.set('employmentType', employmentType);
      if (education !== 'all') qs.set('education', education);
      if (workMode !== 'all') qs.set('workMode', workMode);
      if (skill !== 'all') qs.set('skill', skill);
      if (minSalary) qs.set('minSalary', minSalary);

      const res = await apiFetch<{ jobs: Job[] }>(`/api/jobs?${qs.toString()}`);
      setJobs(res.jobs);
    } catch (err: any) {
      showToast(err.message || 'Failed to load jobs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, province, district, employmentType, education, workMode, skill]);

  const handleToggleSave = async (job: Job) => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }
    try {
      const res = await apiFetch<{ saved: boolean }>(`/api/jobs/${job.id}/save`, { method: 'POST' });
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, isSaved: res.saved } : j)));
      showToast(res.saved ? 'Job saved to your opportunities.' : 'Removed from saved jobs.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Could not update saved jobs.', 'error');
    }
  };

  const handleOpenApply = (job: Job) => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }
    if (user.role !== 'job_seeker') {
      showToast('Switch to a Job Seeker account to apply for vacancies.', 'info');
      return;
    }
    setApplyTarget(job);
    setCoverMessage(
      `Namaste! I am interested in the ${job.title} position and have attached my verified KaamSetu profile for your review.`,
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
      showToast(`Application submitted to ${applyTarget.organizationName}.`, 'success');
      setApplyTarget(null);
    } catch (err: any) {
      showToast(err.message || 'Application failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const districts = province !== 'all' ? getDistrictsByProvince(province) : [];
  const jobCategories = categories.filter((c) => c.type === 'job');

  const clearFilters = () => {
    setQ('');
    setCategory('all');
    setProvince('all');
    setDistrict('all');
    setEmploymentType('all');
    setEducation('all');
    setWorkMode('all');
    setSkill('all');
    setMinSalary('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F8FAFC]">
      <PublicNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Find Opportunities That Match Your Potential.
            </h1>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
              {user?.role === 'job_seeker'
                ? 'Sorted by your rule-based match score. Match scores are advisory recommendations — employers review all applicants.'
                : 'Sign in as a Job Seeker to see personalized match percentages across all active listings.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="lg:hidden inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-300 dark:border-[#263449] bg-white dark:bg-[#172338] self-start"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{filtersOpen ? 'Hide Filters' : 'Filters'}</span>
          </button>
        </div>

        {/* Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadJobs();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by job title, company, or skill (e.g. React, Tally, Figma)..."
              aria-label="Search jobs"
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white dark:bg-[#172338] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#16C784] text-[#0B1220] hover:bg-[#13b074] transition-colors whitespace-nowrap"
          >
            Search Jobs
          </button>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Filter Panel */}
          <aside
            className={`lg:col-span-3 bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 space-y-4 ${
              filtersOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <Filter className="w-4 h-4 text-[#16C784]" />
                Filters
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-[#16C784]"
              >
                Reset all
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              >
                <option value="all">All Categories</option>
                {jobCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Province
              </label>
              <select
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setDistrict('all');
                }}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              >
                <option value="all">All 7 Provinces</option>
                {NEPAL_PROVINCES.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {province !== 'all' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  District
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                >
                  <option value="all">All Districts</option>
                  {districts.map((d) => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              >
                <option value="all">All Types</option>
                {['Full-time', 'Part-time', 'Internship', 'Freelance', 'Contract'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Work Mode
              </label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              >
                <option value="all">On-site, Hybrid &amp; Remote</option>
                <option value="On-site">On-site</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Education Level
              </label>
              <select
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              >
                <option value="all">Any Qualification</option>
                {['SEE', '+2 / Intermediate', 'Diploma / Vocational', "Bachelor's", "Master's"].map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Required Skill
              </label>
              <select
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              >
                <option value="all">Any Skill</option>
                {skills.map((s) => (
                  <option key={s.id} value={s.skillName}>{s.skillName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Minimum Salary (NPR)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                />
                <button
                  type="button"
                  onClick={loadJobs}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-[#111B2E]"
                >
                  Apply
                </button>
              </div>
            </div>
          </aside>

          {/* Job List */}
          <div className="lg:col-span-9 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
              <span>
                Showing <strong className="font-mono-num text-slate-900 dark:text-[#F8FAFC]">{jobs.length}</strong> active opportunities
              </span>
              {(q || category !== 'all' || province !== 'all' || workMode !== 'all') && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-[#16C784] hover:underline"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear active filters
                </button>
              )}
            </div>

            {loading ? (
              <LoadingSkeleton rows={4} />
            ) : jobs.length === 0 ? (
              <EmptyState
                title="No matching jobs found"
                description="Try broadening your district, education, or salary filters to see more verified roles across Nepal."
                actionLabel="Reset Filters"
                onAction={clearFilters}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onOpen={(j) => navigate(`/jobs/${j.id}`)}
                    onApply={user?.role !== 'employer' ? handleOpenApply : undefined}
                    onToggleSave={user?.role === 'job_seeker' ? handleToggleSave : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        open={!!applyTarget}
        title={applyTarget ? `Apply to ${applyTarget.title}` : 'Confirm Application'}
        description={
          applyTarget
            ? `Your KaamSetu profile and verified academic qualifications will be shared with ${applyTarget.organizationName}. Private citizenship images are never shared.`
            : ''
        }
        confirmLabel="Submit Application"
        loading={submitting}
        onConfirm={handleConfirmApply}
        onCancel={() => setApplyTarget(null)}
      >
        <div>
          <label className="block text-xs font-medium mb-1.5">Cover Note to Employer</label>
          <textarea
            rows={4}
            value={coverMessage}
            onChange={(e) => setCoverMessage(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
          />
        </div>
      </ConfirmationModal>
    </div>
  );
};
