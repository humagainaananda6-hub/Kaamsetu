import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, MessageSquare, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/api';
import { PublicNavbar } from '../components/ui/Navigation';
import { VerificationBadge } from '../components/ui/Badges';
import { LoadingSkeleton } from '../components/ui/CommonUI';

export const PublicProfilePage: React.FC<{ userId: string }> = ({ userId }) => {
  const { user, navigate, showToast } = useApp();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ profile: any }>(`/api/profiles/${userId}/public`)
      .then((res) => setProfile(res.profile))
      .catch((err) => showToast(err.message || 'Profile unavailable.', 'error'))
      .finally(() => setLoading(false));
  }, [userId, showToast]);

  const handleMessage = async () => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }
    try {
      const res = await apiFetch<{ id: string }>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          recipientId: userId,
          contextTitle: `Inquiry for ${profile.fullName}`,
          initialMessage: `Namaste ${profile.fullName}! I viewed your verified KaamSetu profile and would like to connect.`,
        }),
      });
      navigate(`/messages?conv=${res.id}`);
    } catch (err: any) {
      showToast(err.message || 'Could not start conversation.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] text-slate-900 dark:text-[#F8FAFC]">
      <PublicNavbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {loading || !profile ? (
          <LoadingSkeleton rows={3} />
        ) : (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {profile.profilePhotoUrl ? (
                  <img
                    src={profile.profilePhotoUrl}
                    alt={profile.fullName}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full object-cover border border-slate-200 dark:border-[#263449]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#16C784]/15 text-[#16C784] font-bold text-xl flex items-center justify-center">
                    {profile.fullName.charAt(0)}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-bold">{profile.fullName}</h1>
                    <VerificationBadge
                      status={profile.identityVerified}
                      labelOverride={profile.identityVerified ? 'Identity Verified' : 'Identity Unverified'}
                    />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-[#94A3B8]">{profile.professionalHeadline}</p>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {profile.municipality}, {profile.district}, {profile.province} · {profile.availability}
                  </p>
                </div>
              </div>

              {user && user.id !== userId && (
                <button
                  type="button"
                  onClick={handleMessage}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#16C784] text-[#0B1220] inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Message Candidate</span>
                </button>
              )}
            </div>

            {profile.about && (
              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-2">
                <h2 className="text-base font-semibold">About</h2>
                <p className="text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">{profile.about}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-3">
                <h2 className="text-base font-semibold">Verified &amp; Listed Education</h2>
                {profile.educations.map((ed: any) => (
                  <div key={ed.id} className="pb-2.5 border-b border-slate-100 dark:border-[#263449] last:border-none">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{ed.qualificationLevel}</span>
                      <VerificationBadge status={ed.verificationStatus} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
                      {ed.institutionName} · {ed.boardOrUniversity} ({ed.completionYear})
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-3">
                <h2 className="text-base font-semibold">Skills &amp; Languages</h2>
                <div className="space-y-1.5 text-sm">
                  {profile.skills.map((s: any) => (
                    <div key={s.skillName} className="flex justify-between">
                      <span>{s.skillName}</span>
                      <span className="text-xs text-slate-500 dark:text-[#94A3B8]">{s.proficiencyLevel}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] pt-2 border-t border-slate-100 dark:border-[#263449]">
                  Languages: {profile.languages.join(' · ')}
                </p>
              </div>
            </div>

            {profile.experiences.length > 0 && (
              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-3">
                <h2 className="text-base font-semibold">Work Experience</h2>
                {profile.experiences.map((ex: any) => (
                  <div key={ex.id} className="space-y-1">
                    <p className="text-sm font-semibold">{ex.jobTitle} · {ex.companyName}</p>
                    <p className="text-xs text-slate-500">{ex.startDate} – {ex.currentlyWorking ? 'Present' : ex.endDate}</p>
                    <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{ex.description}</p>
                  </div>
                ))}
              </div>
            )}

            {profile.portfolios.length > 0 && (
              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-3">
                <h2 className="text-base font-semibold">Portfolio</h2>
                {profile.portfolios.map((p: any) => (
                  <div key={p.id} className="space-y-1">
                    <p className="text-sm font-semibold">{p.title}</p>
                    <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{p.description}</p>
                  </div>
                ))}
              </div>
            )}

            {profile.reviews.length > 0 && (
              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-3">
                <h2 className="text-base font-semibold">Verified Task Reviews</h2>
                {profile.reviews.map((r: any) => (
                  <div key={r.id} className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold">{r.reviewerName}</span>
                      <span className="inline-flex items-center gap-1 text-[#F59E0B] font-mono-num">
                        <Star className="w-3.5 h-3.5 fill-current" /> {r.rating}/5
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-[#94A3B8]">{r.reviewText}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
