import React, { useEffect, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch, setAuthToken } from '../lib/api';
import { NepalLocationSelector } from '../components/ui/CommonUI';
import { KbnBrandMark } from '../components/ui/Navigation';
import type { EducationLevel, EmploymentType } from '../types';

export const OnboardingWizard: React.FC = () => {
  const { user, skills, refreshUser, navigate, showToast } = useApp();
  const [role, setRole] = useState<'job_seeker' | 'employer'>(
    user?.role === 'employer' ? 'employer' : 'job_seeker',
  );
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const autostart = new URLSearchParams(window.location.search).get('autostart') === '1';
    if (autostart && user) {
      navigate(user.role === 'employer' ? '/employer' : '/seeker');
    }
  }, [user, navigate]);

  // Seeker fields
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [location, setLocation] = useState({
    province: 'Bagmati Province',
    district: 'Kathmandu',
    municipality: 'Kathmandu Metropolitan City',
  });
  const [preferredLocation, setPreferredLocation] = useState('Kathmandu / Remote');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>("Bachelor's");
  const [employmentPreference, setEmploymentPreference] = useState<EmploymentType>('Full-time');
  const [headline, setHeadline] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['React', 'TypeScript']);

  // Employer fields
  const [organizationName, setOrganizationName] = useState('');
  const [employerType, setEmployerType] = useState<'Company / Startup' | 'Agency / Organization' | 'Small Business' | 'Individual'>('Company / Startup');
  const [businessCategory, setBusinessCategory] = useState('Information Technology');
  const [contactPerson, setContactPerson] = useState(user?.fullName || '');
  const [website, setWebsite] = useState('');
  const [empDescription, setEmpDescription] = useState('');

  const totalSteps = 3;

  const toggleSkill = (name: string) => {
    setSelectedSkills((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  };

  const handleSave = async (saveOnly: boolean) => {
    setSaving(true);
    try {
      if (role === 'job_seeker') {
        const res = await apiFetch<{ token?: string }>('/api/onboarding/seeker', {
          method: 'POST',
          body: JSON.stringify({
            fullName,
            phoneNumber,
            dateOfBirth,
            province: location.province,
            district: location.district,
            municipality: location.municipality,
            preferredLocation,
            educationLevel,
            employmentPreference,
            professionalHeadline: headline,
            skills: selectedSkills,
            saveOnly,
          }),
        });
        if (res.token) setAuthToken(res.token);
        await refreshUser();
        showToast(saveOnly ? 'Progress saved. You can finish anytime.' : 'Profile ready! Welcome to KaamBridgeNepal (KBN).', 'success');
        navigate('/seeker');
      } else {
        const res = await apiFetch<{ token?: string }>('/api/onboarding/employer', {
          method: 'POST',
          body: JSON.stringify({
            organizationName: organizationName || `${user?.fullName || 'New'} Enterprise`,
            employerType,
            businessCategory,
            contactPerson,
            phoneNumber,
            province: location.province,
            district: location.district,
            municipality: location.municipality,
            website,
            description: empDescription,
            saveOnly,
          }),
        });
        if (res.token) setAuthToken(res.token);
        await refreshUser();
        showToast(saveOnly ? 'Draft saved.' : 'Employer profile ready!', 'success');
        navigate('/employer');
      }
    } catch (err: any) {
      showToast(err.message || 'Could not save onboarding.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen text-[#0B1220] dark:text-[#F8FAFC] py-10 px-4">
      <div className="max-w-2xl mx-auto kbn-card-surface rounded-[24px] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <KbnBrandMark compact={false} />
            <div>
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-[#16C784]">Account Setup</span>
              <h1 className="text-2xl font-extrabold font-display tracking-tight mt-0.5">Set Up Your Profile</h1>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => navigate(role === 'employer' ? '/employer' : '/seeker')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-[#d5deea] dark:border-[#263449] hover:border-[#16C784]"
            >
              Skip &amp; Open Workspace →
            </button>
            <span className="text-xs font-mono-num text-[#51617a] dark:text-[#94A3B8]">
              Step {step} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 rounded-full bg-slate-200 dark:bg-[#0B1220] overflow-hidden">
          <div
            className="h-full bg-[#16C784] transition-all duration-200"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">1. How will you use KaamBridgeNepal (KBN)?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('job_seeker')}
                className={`p-5 rounded-xl border text-left transition-colors ${
                  role === 'job_seeker'
                    ? 'border-[#16C784] bg-[#16C784]/10'
                    : 'border-slate-300 dark:border-[#263449]'
                }`}
              >
                <span className="block text-base font-semibold">I am looking for work</span>
                <span className="block text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
                  Build a verified digital resume, upload certificates, and match with jobs &amp; gigs.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole('employer')}
                className={`p-5 rounded-xl border text-left transition-colors ${
                  role === 'employer'
                    ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                    : 'border-slate-300 dark:border-[#263449]'
                }`}
              >
                <span className="block text-base font-semibold">I want to hire people</span>
                <span className="block text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
                  Post full-time roles, internships, or short-term local tasks and review verified applicants.
                </span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && role === 'job_seeker' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">2. Personal &amp; Location Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Phone (+977)</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+977-9841234567"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Date of Birth (Optional)</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Preferred Work Location</label>
                <input
                  type="text"
                  value={preferredLocation}
                  onChange={(e) => setPreferredLocation(e.target.value)}
                  placeholder="Kathmandu / Pokhara / Remote"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                />
              </div>
            </div>
            <NepalLocationSelector
              province={location.province}
              district={location.district}
              municipality={location.municipality}
              onChange={setLocation}
            />
          </div>
        )}

        {step === 3 && role === 'job_seeker' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">3. Qualifications &amp; Skills</h2>
            <div>
              <label className="block text-xs font-medium mb-1">Professional Headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Junior Graphic Designer · Bachelor's Graduate"
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Highest Education Level</label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                >
                  {['SEE', '+2 / Intermediate', 'Diploma / Vocational', "Bachelor's", "Master's", 'PhD / Doctorate'].map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Employment Preference</label>
                <select
                  value={employmentPreference}
                  onChange={(e) => setEmploymentPreference(e.target.value as EmploymentType)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                >
                  {['Full-time', 'Part-time', 'Internship', 'Freelance', 'Contract'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2">Select Your Key Skills</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-[#263449]">
                {skills.slice(0, 20).map((sk) => {
                  const selected = selectedSkills.includes(sk.skillName);
                  return (
                    <button
                      key={sk.id}
                      type="button"
                      onClick={() => toggleSkill(sk.skillName)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        selected
                          ? 'border-[#16C784] bg-[#16C784]/15 text-[#16C784]'
                          : 'border-slate-300 dark:border-[#263449] text-slate-600 dark:text-[#94A3B8]'
                      }`}
                    >
                      {sk.skillName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 2 && role === 'employer' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">2. Organization &amp; Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Organization / Hiring Name</label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. Everest Digital Studio"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Employer Type</label>
                <select
                  value={employerType}
                  onChange={(e) => setEmployerType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                >
                  {['Company / Startup', 'Agency / Organization', 'Small Business', 'Individual'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Business Category</label>
                <input
                  type="text"
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Contact Person</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && role === 'employer' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">3. Location &amp; Profile Summary</h2>
            <NepalLocationSelector
              province={location.province}
              district={location.district}
              municipality={location.municipality}
              onChange={setLocation}
            />
            <div>
              <label className="block text-xs font-medium mb-1">Website or Social Link (Optional)</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://company.com.np"
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">About Your Organization</label>
              <textarea
                rows={3}
                value={empDescription}
                onChange={(e) => setEmpDescription(e.target.value)}
                placeholder="Briefly describe what your team builds or hires for..."
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              />
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="pt-4 border-t border-slate-200 dark:border-[#263449] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave(true)}
            className="text-xs font-medium text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
          >
            Save &amp; Finish Later
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-[#263449]"
              >
                Back
              </button>
            )}
            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#16C784] text-[#0B1220] inline-flex items-center gap-1"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#16C784] text-[#0B1220] inline-flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Complete Setup'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
