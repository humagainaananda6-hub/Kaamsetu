import React, { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../lib/api';
import { formatNPR } from '../../lib/nepal-locations';
import { NepalLocationSelector } from '../ui/CommonUI';
import type { EducationLevel, EmploymentType, WorkMode } from '../../types';

export const JobPostingWizard: React.FC<{
  onCreated: () => void;
}> = ({ onCreated }) => {
  const { categories, skills, showToast } = useApp();
  const jobCategories = categories.filter((c) => c.type === 'job');

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(jobCategories[0]?.id || 'cat_it');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('Full-time');
  const [vacancies, setVacancies] = useState(1);

  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [benefits, setBenefits] = useState('SSF contribution, festival bonus');
  const [requiredEducation, setRequiredEducation] = useState<EducationLevel>("Bachelor's");
  const [minimumExperience, setMinimumExperience] = useState(1);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['React', 'TypeScript']);

  const [salaryMin, setSalaryMin] = useState(35000);
  const [salaryMax, setSalaryMax] = useState(60000);
  const [paymentFrequency, setPaymentFrequency] = useState<'Monthly' | 'Weekly' | 'Project-based'>('Monthly');

  const [loc, setLoc] = useState({
    province: 'Bagmati Province',
    district: 'Kathmandu',
    municipality: 'Kathmandu Metropolitan City',
  });
  const [workMode, setWorkMode] = useState<WorkMode>('Hybrid');

  const [applicationDeadline, setApplicationDeadline] = useState(
    new Date(Date.now() + 21 * 86400_000).toISOString().slice(0, 10),
  );
  const [requiredVerificationLevel, setRequiredVerificationLevel] = useState<
    'Any' | 'Identity Verified' | 'Identity & Education Verified'
  >('Any');

  const toggleSkill = (name: string) => {
    setSelectedSkills((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  };

  const handlePublish = async (asDraft: boolean) => {
    if (!title.trim() || !description.trim()) {
      showToast('Please enter a job title and description.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          title,
          categoryId,
          employmentType,
          vacancies,
          description,
          responsibilities: responsibilities || description,
          benefits,
          requiredEducation,
          minimumExperience,
          requiredSkills: selectedSkills,
          salaryMin,
          salaryMax,
          paymentFrequency,
          province: loc.province,
          district: loc.district,
          municipality: loc.municipality,
          workMode,
          applicationDeadline,
          requiredVerificationLevel,
          status: asDraft ? 'Draft' : 'Active',
        }),
      });
      showToast(asDraft ? 'Job saved as draft.' : 'Job published to KaamBridgeNepal (KBN)!', 'success');
      onCreated();
    } catch (err: any) {
      showToast(err.message || 'Could not save job.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = [
    '1. Basics',
    '2. Description',
    '3. Compensation',
    '4. Location',
    '5. Preferences',
    '6. Preview',
  ];

  return (
    <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold">Post a Job Vacancy</h2>
        <span className="text-xs font-mono-num text-slate-500 dark:text-[#94A3B8]">
          Step {step} / 6
        </span>
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {STEPS.map((label, idx) => {
          const num = idx + 1;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setStep(num)}
              className={`px-2 py-1.5 text-[11px] font-medium rounded-lg border truncate transition-colors ${
                step === num
                  ? 'border-[#16C784] bg-[#16C784]/15 text-[#16C784]'
                  : 'border-slate-200 dark:border-[#263449] text-slate-500 dark:text-[#94A3B8]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Job Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Junior React Developer"
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            >
              {jobCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Employment Type</label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            >
              {['Full-time', 'Part-time', 'Internship', 'Freelance', 'Contract'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Number of Vacancies</label>
            <input
              type="number"
              min={1}
              value={vacancies}
              onChange={(e) => setVacancies(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Job Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the team, role goals, and daily work..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Key Responsibilities</label>
            <textarea
              rows={3}
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              placeholder="List main responsibilities..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Required Qualification</label>
              <select
                value={requiredEducation}
                onChange={(e) => setRequiredEducation(e.target.value as EducationLevel)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              >
                {['SEE', '+2 / Intermediate', 'Diploma / Vocational', "Bachelor's", "Master's"].map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Minimum Experience (Years)</label>
              <input
                type="number"
                min={0}
                value={minimumExperience}
                onChange={(e) => setMinimumExperience(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-2">Required Skills</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-lg border border-slate-200 dark:border-[#263449]">
              {skills.slice(0, 24).map((sk) => (
                <button
                  key={sk.id}
                  type="button"
                  onClick={() => toggleSkill(sk.skillName)}
                  className={`px-2.5 py-1 text-xs rounded-lg border ${
                    selectedSkills.includes(sk.skillName)
                      ? 'border-[#16C784] bg-[#16C784]/15 text-[#16C784]'
                      : 'border-slate-300 dark:border-[#263449] text-slate-600 dark:text-[#94A3B8]'
                  }`}
                >
                  {sk.skillName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Minimum Salary (NPR)</label>
            <input
              type="number"
              min={0}
              value={salaryMin}
              onChange={(e) => setSalaryMin(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Maximum Salary (NPR)</label>
            <input
              type="number"
              min={0}
              value={salaryMax}
              onChange={(e) => setSalaryMax(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Payment Frequency</label>
            <select
              value={paymentFrequency}
              onChange={(e) => setPaymentFrequency(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            >
              <option value="Monthly">Monthly</option>
              <option value="Weekly">Weekly</option>
              <option value="Project-based">Project-based</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium mb-1">Benefits</label>
            <input
              type="text"
              value={benefits}
              onChange={(e) => setBenefits(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <NepalLocationSelector
            province={loc.province}
            district={loc.district}
            municipality={loc.municipality}
            onChange={setLoc}
          />
          <div>
            <label className="block text-xs font-medium mb-1">Work Mode</label>
            <select
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value as WorkMode)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            >
              <option value="On-site">On-site</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Remote">Remote</option>
            </select>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Application Deadline</label>
            <input
              type="date"
              value={applicationDeadline}
              onChange={(e) => setApplicationDeadline(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Preferred Verification Level</label>
            <select
              value={requiredVerificationLevel}
              onChange={(e) => setRequiredVerificationLevel(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            >
              <option value="Any">Any Applicant</option>
              <option value="Identity Verified">Identity Verified Preferred</option>
              <option value="Identity & Education Verified">Identity &amp; Education Verified Preferred</option>
            </select>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] space-y-2 text-sm">
          <h3 className="text-base font-bold">{title || 'Untitled Job'}</h3>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
            {employmentType} · {workMode} · {loc.municipality}, {loc.district} · {vacancies} vacancy
          </p>
          <p className="text-sm font-mono-num text-[#16C784] font-semibold">
            {formatNPR(salaryMin)} – {formatNPR(salaryMax)} / {paymentFrequency}
          </p>
          <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{description || 'No description entered yet.'}</p>
          <p className="text-xs">Skills: {selectedSkills.join(' · ')}</p>
        </div>
      )}

      <div className="pt-4 border-t border-slate-200 dark:border-[#263449] flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={() => handlePublish(true)}
          className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#263449]"
        >
          Save Draft
        </button>

        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#263449]"
            >
              Previous
            </button>
          )}
          {step < 6 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220] inline-flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handlePublish(false)}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220] inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Publishing...' : 'Publish Vacancy'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
