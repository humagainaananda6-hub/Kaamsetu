import React, { useState } from 'react';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { NepalLocationSelector } from '../ui/CommonUI';
import { VerificationBadge } from '../ui/Badges';
import type {
  EducationLevel,
  EducationRecord,
  EmploymentType,
  JobSeekerProfile,
  PortfolioItem,
  User,
  UserSkill,
  WorkExperience,
} from '../../types';

export const DigitalProfileSection: React.FC<{
  user: User;
  profile: JobSeekerProfile;
  skills: UserSkill[];
  educations: EducationRecord[];
  experiences: WorkExperience[];
  portfolios: PortfolioItem[];
  identityStatus: string;
  onRefresh: () => Promise<void>;
}> = ({
  user,
  profile,
  skills,
  educations,
  experiences,
  portfolios,
  identityStatus,
  onRefresh,
}) => {
  const { skills: allSkills, showToast, navigate } = useApp();

  const [fullName, setFullName] = useState(user.fullName);
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
  const [headline, setHeadline] = useState(profile.professionalHeadline);
  const [about, setAbout] = useState(profile.about);
  const [loc, setLoc] = useState({
    province: profile.province,
    district: profile.district,
    municipality: profile.municipality,
  });
  const [preferredLocation, setPreferredLocation] = useState(profile.preferredLocation);
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(profile.educationLevel);
  const [yearsExp, setYearsExp] = useState(profile.yearsOfExperience);
  const [empPref, setEmpPref] = useState<EmploymentType>(profile.employmentPreference);
  const [availability, setAvailability] = useState(profile.availability);
  const [minSalary, setMinSalary] = useState(profile.expectedMinSalary);
  const [maxSalary, setMaxSalary] = useState(profile.expectedMaxSalary);
  const [languagesText, setLanguagesText] = useState(profile.languages.join(', '));
  const [saving, setSaving] = useState(false);

  // Add Skill form
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillProf, setNewSkillProf] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'>('Intermediate');

  // Add Education form
  const [eduLevel, setEduLevel] = useState<EducationLevel>("Bachelor's");
  const [institution, setInstitution] = useState('');
  const [board, setBoard] = useState('');
  const [compYear, setCompYear] = useState(2025);
  const [gpa, setGpa] = useState('');

  // Add Experience form
  const [expCompany, setExpCompany] = useState('');
  const [expTitle, setExpTitle] = useState('');
  const [expStart, setExpStart] = useState('2024-01-01');
  const [expDesc, setExpDesc] = useState('');

  // Add Portfolio form
  const [portTitle, setPortTitle] = useState('');
  const [portDesc, setPortDesc] = useState('');
  const [portUrl, setPortUrl] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/seeker/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          phoneNumber,
          professionalHeadline: headline,
          about,
          province: loc.province,
          district: loc.district,
          municipality: loc.municipality,
          preferredLocation,
          educationLevel,
          yearsOfExperience: Number(yearsExp),
          employmentPreference: empPref,
          availability,
          expectedMinSalary: Number(minSalary),
          expectedMaxSalary: Number(maxSalary),
          languages: languagesText
            .split(',')
            .map((l) => l.trim())
            .filter(Boolean),
        }),
      });
      await onRefresh();
      showToast('Digital profile saved!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    try {
      await apiFetch('/api/seeker/skills', {
        method: 'POST',
        body: JSON.stringify({ skillName: newSkillName.trim(), proficiencyLevel: newSkillProf }),
      });
      setNewSkillName('');
      await onRefresh();
      showToast('Skill added.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not add skill.', 'error');
    }
  };

  const handleDeleteSkill = async (id: string) => {
    await apiFetch(`/api/seeker/skills/${id}`, { method: 'DELETE' });
    await onRefresh();
  };

  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/seeker/education', {
        method: 'POST',
        body: JSON.stringify({
          qualificationLevel: eduLevel,
          institutionName: institution,
          boardOrUniversity: board,
          completionYear: Number(compYear),
          gpaOrPercentage: gpa,
        }),
      });
      setInstitution('');
      setBoard('');
      setGpa('');
      await onRefresh();
      showToast('Education added! Upload your certificate in the Certificate Vault.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not add education.', 'error');
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/seeker/experience', {
        method: 'POST',
        body: JSON.stringify({
          companyName: expCompany,
          jobTitle: expTitle,
          startDate: expStart,
          description: expDesc,
        }),
      });
      setExpCompany('');
      setExpTitle('');
      setExpDesc('');
      await onRefresh();
      showToast('Work experience added.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add experience.', 'error');
    }
  };

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/seeker/portfolio', {
        method: 'POST',
        body: JSON.stringify({ title: portTitle, description: portDesc, projectUrl: portUrl }),
      });
      setPortTitle('');
      setPortDesc('');
      setPortUrl('');
      await onRefresh();
      showToast('Portfolio project added.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add portfolio.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Digital Resume Profile</h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
            Keep your qualifications, skills, and preferences accurate for direct matching.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/profile/${user.id}`)}
          className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-[#263449] inline-flex items-center gap-1.5 hover:border-[#16C784]"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Public Profile Preview</span>
        </button>
      </div>

      {/* Identity + Core Info Form */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#263449]">
          <div className="flex items-center gap-4">
            {user.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt={user.fullName}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-[#263449]"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#16C784]/15 text-[#16C784] font-bold text-lg flex items-center justify-center">
                {user.fullName.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-semibold text-base">{user.fullName}</p>
              <VerificationBadge status={identityStatus as any} />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-[#16C784] text-[#0B1220] hover:bg-[#13b074] disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Nepal Phone (+977)</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+977-98XXXXXXXX"
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">Professional Headline</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1">About Me</label>
            <textarea
              rows={3}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
        </div>

        <NepalLocationSelector
          province={loc.province}
          district={loc.district}
          municipality={loc.municipality}
          onChange={setLoc}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Highest Education</label>
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            >
              {['SEE', '+2 / Intermediate', 'Diploma / Vocational', "Bachelor's", "Master's", 'PhD / Doctorate'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Years of Experience</label>
            <input
              type="number"
              min={0}
              max={40}
              value={yearsExp}
              onChange={(e) => setYearsExp(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Employment Preference</label>
            <select
              value={empPref}
              onChange={(e) => setEmpPref(e.target.value as EmploymentType)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            >
              {['Full-time', 'Part-time', 'Internship', 'Freelance', 'Contract'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            >
              {['Immediate', 'Within 2 weeks', 'Within 1 month', 'Part-time / Weekends'].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Preferred Work Location</label>
            <input
              type="text"
              value={preferredLocation}
              onChange={(e) => setPreferredLocation(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Languages (comma separated)</label>
            <input
              type="text"
              value={languagesText}
              onChange={(e) => setLanguagesText(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Expected Min Salary (NPR)</label>
            <input
              type="number"
              value={minSalary}
              onChange={(e) => setMinSalary(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Expected Max Salary (NPR)</label>
            <input
              type="number"
              value={maxSalary}
              onChange={(e) => setMaxSalary(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
          </div>
        </div>
      </form>

      {/* Skills Section */}
      <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold">Skills ({skills.length})</h3>
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <div
              key={s.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] text-xs"
            >
              <span className="font-medium">{s.skillName}</span>
              <span className="text-slate-500 dark:text-[#94A3B8]">{s.proficiencyLevel}</span>
              <button
                type="button"
                onClick={() => handleDeleteSkill(s.id)}
                aria-label={`Remove skill ${s.skillName}`}
                className="text-slate-400 hover:text-[#EF4444]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={handleAddSkill} className="flex flex-wrap gap-2 pt-2">
          <input
            type="text"
            list="kaamsetu-skill-options"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            placeholder="Add skill (e.g. React, Tally Prime)..."
            className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
          />
          <datalist id="kaamsetu-skill-options">
            {allSkills.map((sk) => (
              <option key={sk.id} value={sk.skillName} />
            ))}
          </datalist>
          <select
            value={newSkillProf}
            onChange={(e) => setNewSkillProf(e.target.value as any)}
            className="px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
          >
            {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220] inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Skill</span>
          </button>
        </form>
      </div>

      {/* Education History */}
      <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-semibold">Education History</h3>
        <div className="space-y-2.5">
          {educations.map((ed) => (
            <div
              key={ed.id}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-semibold">
                  {ed.qualificationLevel} · {ed.institutionName}
                </p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  {ed.boardOrUniversity} · {ed.completionYear} · {ed.gpaOrPercentage}
                </p>
              </div>
              <VerificationBadge status={ed.verificationStatus} />
            </div>
          ))}
        </div>

        <form onSubmit={handleAddEducation} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-2">
          <select
            value={eduLevel}
            onChange={(e) => setEduLevel(e.target.value as EducationLevel)}
            className="px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
          >
            {['SEE', '+2 / Intermediate', 'Diploma / Vocational', "Bachelor's", "Master's", 'PhD / Doctorate'].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <input
            type="text"
            required
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="School / College Name"
            className="px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
          />
          <input
            type="text"
            required
            value={board}
            onChange={(e) => setBoard(e.target.value)}
            placeholder="Board / University (e.g. TU, NEB)"
            className="px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
          />
          <input
            type="text"
            required
            value={gpa}
            onChange={(e) => setGpa(e.target.value)}
            placeholder="GPA / % (e.g. 3.65)"
            className="px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
          />
          <div className="flex gap-2">
            <input
              type="number"
              required
              value={compYear}
              onChange={(e) => setCompYear(Number(e.target.value))}
              className="w-20 px-2 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
            <button
              type="submit"
              className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220]"
            >
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Work Experience & Portfolio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold">Work Experience</h3>
          {experiences.map((ex) => (
            <div key={ex.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] space-y-1">
              <div className="flex justify-between">
                <p className="text-sm font-semibold">{ex.jobTitle} · {ex.companyName}</p>
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/api/seeker/experience/${ex.id}`, { method: 'DELETE' });
                    await onRefresh();
                  }}
                  aria-label={`Delete experience ${ex.jobTitle}`}
                  className="text-slate-400 hover:text-[#EF4444]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-500">{ex.startDate} – {ex.currentlyWorking ? 'Present' : ex.endDate}</p>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{ex.description}</p>
            </div>
          ))}
          <form onSubmit={handleAddExperience} className="space-y-2.5 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={expCompany}
                onChange={(e) => setExpCompany(e.target.value)}
                placeholder="Company"
                className="px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              />
              <input
                type="text"
                required
                value={expTitle}
                onChange={(e) => setExpTitle(e.target.value)}
                placeholder="Role / Title"
                className="px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              />
            </div>
            <input
              type="date"
              value={expStart}
              onChange={(e) => setExpStart(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
            <textarea
              rows={2}
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              placeholder="Key achievements..."
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220]">
              Add Experience
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-semibold">Portfolio Projects</h3>
          {portfolios.map((p) => (
            <div key={p.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] space-y-1">
              <div className="flex justify-between">
                <p className="text-sm font-semibold">{p.title}</p>
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/api/seeker/portfolio/${p.id}`, { method: 'DELETE' });
                    await onRefresh();
                  }}
                  aria-label={`Delete portfolio ${p.title}`}
                  className="text-slate-400 hover:text-[#EF4444]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{p.description}</p>
              {p.projectUrl && (
                <a href={p.projectUrl} target="_blank" rel="noreferrer" className="text-xs text-[#3B82F6] hover:underline">
                  {p.projectUrl}
                </a>
              )}
            </div>
          ))}
          <form onSubmit={handleAddPortfolio} className="space-y-2.5 pt-2">
            <input
              type="text"
              required
              value={portTitle}
              onChange={(e) => setPortTitle(e.target.value)}
              placeholder="Project Title"
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
            <input
              type="url"
              value={portUrl}
              onChange={(e) => setPortUrl(e.target.value)}
              placeholder="Link (GitHub, Behance, Drive...)"
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
            <textarea
              rows={2}
              required
              value={portDesc}
              onChange={(e) => setPortDesc(e.target.value)}
              placeholder="What did you build or design?"
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
            />
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#3B82F6] text-white">
              Add Project
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
