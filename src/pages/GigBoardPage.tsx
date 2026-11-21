import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { NEPAL_PROVINCES, getDistrictsByProvince } from '../lib/nepal-locations';
import type { MicroTask } from '../types';
import { PublicNavbar } from '../components/ui/Navigation';
import { GigCard } from '../components/ui/Cards';
import { ConfirmationModal, EmptyState, LoadingSkeleton } from '../components/ui/CommonUI';

const GIG_CATEGORIES = [
  'Online Tasks',
  'Local Tasks',
  'Creative Tasks',
  'Technical Tasks',
  'Physical Tasks',
  'Educational Tasks',
  'Event-Based Tasks',
];

export const GigBoardPage: React.FC = () => {
  const { user, navigate, showToast } = useApp();
  const [gigs, setGigs] = useState<MicroTask[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [province, setProvince] = useState('all');
  const [district, setDistrict] = useState('all');
  const [locationType, setLocationType] = useState('all');
  const [urgency, setUrgency] = useState('all');

  const [interestTarget, setInterestTarget] = useState<MicroTask | null>(null);
  const [interestNote, setInterestNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadGigs = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set('q', q.trim());
      if (category !== 'all') qs.set('category', category);
      if (province !== 'all') qs.set('province', province);
      if (district !== 'all') qs.set('district', district);
      if (locationType !== 'all') qs.set('locationType', locationType);
      if (urgency !== 'all') qs.set('urgency', urgency);

      const res = await apiFetch<{ gigs: MicroTask[] }>(`/api/gigs?${qs.toString()}`);
      setGigs(res.gigs);
    } catch (err: any) {
      showToast(err.message || 'Could not load micro-tasks.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, province, district, locationType, urgency]);

  const handleOpenInterest = (gig: MicroTask) => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }
    if (user.role !== 'job_seeker') {
      showToast('Sign in as a Job Seeker / Freelancer to express interest in tasks.', 'info');
      return;
    }
    setInterestTarget(gig);
    setInterestNote(`Namaste! I am available for "${gig.title}" and can deliver within ${gig.estimatedDuration}.`);
  };

  const submitInterest = async () => {
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
      showToast('Interest sent! The task poster will review candidates.', 'success');
      setInterestTarget(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to express interest.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const districts = province !== 'all' ? getDistrictsByProvince(province) : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F8FAFC]">
      <PublicNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Small Tasks. Real Earnings.</h1>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-1">
              Short-term local errands, event photography, tutoring, design, and online gigs. Compensation is agreed directly between task poster and worker (no automated escrow is active).
            </p>
          </div>
          {user?.role === 'employer' && (
            <button
              type="button"
              onClick={() => navigate('/employer?tab=post-gig')}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#3B82F6] text-white hover:bg-blue-600 whitespace-nowrap"
            >
              Post a Micro-Task
            </button>
          )}
        </div>

        {/* Category Segmented Tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              category === 'all'
                ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-[#3B82F6]'
                : 'border-slate-300 dark:border-[#263449] text-slate-600 dark:text-[#94A3B8]'
            }`}
          >
            All Categories
          </button>
          {GIG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                category === cat
                  ? 'border-[#3B82F6] bg-[#3B82F6]/15 text-[#3B82F6]'
                  : 'border-slate-300 dark:border-[#263449] text-slate-600 dark:text-[#94A3B8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Location Filters */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadGigs();
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
        >
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tasks (poster, photography, data)..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white dark:bg-[#172338] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <select
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setDistrict('all');
            }}
            className="px-3 py-2 text-sm rounded-xl bg-white dark:bg-[#172338] border border-slate-300 dark:border-[#263449]"
          >
            <option value="all">All Provinces</option>
            {NEPAL_PROVINCES.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
          <select
            value={district}
            disabled={province === 'all'}
            onChange={(e) => setDistrict(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl bg-white dark:bg-[#172338] border border-slate-300 dark:border-[#263449] disabled:opacity-50"
          >
            <option value="all">All Districts</option>
            {districts.map((d) => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
          <select
            value={locationType}
            onChange={(e) => setLocationType(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl bg-white dark:bg-[#172338] border border-slate-300 dark:border-[#263449]"
          >
            <option value="all">Local &amp; Online</option>
            <option value="Local">Local Only</option>
            <option value="Online">Online Only</option>
          </select>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl bg-white dark:bg-[#172338] border border-slate-300 dark:border-[#263449]"
          >
            <option value="all">Any Urgency</option>
            <option value="Urgent">Urgent Only</option>
            <option value="Normal">Normal</option>
          </select>
        </form>

        {loading ? (
          <LoadingSkeleton rows={3} />
        ) : gigs.length === 0 ? (
          <EmptyState
            title="No micro-tasks match your filters"
            description="Adjust your province, category, or online/local filters to browse available short-term tasks."
            actionLabel="Reset Filters"
            onAction={() => {
              setQ('');
              setCategory('all');
              setProvince('all');
              setDistrict('all');
              setLocationType('all');
              setUrgency('all');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {gigs.map((gig) => (
              <GigCard
                key={gig.id}
                gig={gig}
                onOpen={(g) => navigate(`/gigs/${g.id}`)}
                onExpressInterest={user?.role !== 'employer' ? handleOpenInterest : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmationModal
        open={!!interestTarget}
        title={`Express Interest: ${interestTarget?.title}`}
        description="Send a quick availability note to the task poster. They will review interested candidates and assign a worker."
        confirmLabel="Send Interest"
        loading={submitting}
        onConfirm={submitInterest}
        onCancel={() => setInterestTarget(null)}
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
