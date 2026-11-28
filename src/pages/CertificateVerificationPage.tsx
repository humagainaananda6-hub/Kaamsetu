import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Eye,
  FileCheck2,
  Fingerprint,
  ImagePlus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetch, fileToBase64 } from '../lib/api';
import { formatNepalDate } from '../lib/nepal-locations';
import { PublicNavbar } from '../components/ui/Navigation';
import { VerificationBadge } from '../components/ui/Badges';
import { ConfirmationModal, LoadingSkeleton, UploadDropzone } from '../components/ui/CommonUI';
import { Floating3DBridge } from '../components/ui/Floating3DBridge';
import { TabTransition3D } from '../components/ui/PageTransition3D';
import type { VerificationStatus } from '../types';

export interface CertificateCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface CertificateRecord {
  id: string;
  verificationCode: string;
  userId: string | null;
  holderName: string;
  certificateTitle: string;
  certificateType: string;
  issuingAuthority: string;
  issueYear: number | null;
  serialNumber: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256Hash: string;
  verificationStatus: VerificationStatus;
  integrityScore: number;
  checks: CertificateCheckItem[];
  verificationNotes?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
  previewUrl: string | null;
}

interface PhotoVerifyResponse {
  sha256Hash: string;
  exactHashMatch: boolean;
  integrityScore: number;
  detectedFormat: string;
  checks: CertificateCheckItem[];
  matchedCertificate: CertificateRecord | null;
}

export const CertificateVerificationPage: React.FC = () => {
  const { user, lang, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'add' | 'verify'>('add');
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab 1: Add Certificate Photo state
  const [holderName, setHolderName] = useState('');
  const [certificateTitle, setCertificateTitle] = useState('');
  const [certificateType, setCertificateType] = useState('Academic Degree');
  const [issuingAuthority, setIssuingAuthority] = useState('Tribhuvan University (TU)');
  const [issueYear, setIssueYear] = useState('2025');
  const [serialNumber, setSerialNumber] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certLocalPreview, setCertLocalPreview] = useState<string | null>(null);
  const [submittingUpload, setSubmittingUpload] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<CertificateRecord | null>(null);

  // Tab 2A: Verification Code / Serial lookup
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResult, setLookupResult] = useState<CertificateRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [searchingCode, setSearchingCode] = useState(false);

  // Tab 2B: Photo Integrity & SHA-256 verification
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyLocalPreview, setVerifyLocalPreview] = useState<string | null>(null);
  const [verifyCodeHint, setVerifyCodeHint] = useState('');
  const [verifyingPhoto, setVerifyingPhoto] = useState(false);
  const [photoVerifyResult, setPhotoVerifyResult] = useState<PhotoVerifyResponse | null>(null);

  // Per-row action state & preview modal
  const [busyId, setBusyId] = useState<string | null>(null);
  const [inspectModal, setInspectModal] = useState<{ title: string; url: string; cert?: CertificateRecord } | null>(null);

  useEffect(() => {
    if (user && !holderName) {
      setHolderName(user.fullName);
    }
  }, [user, holderName]);

  useEffect(() => {
    if (!certFile || !certFile.type.startsWith('image/')) {
      setCertLocalPreview(null);
      return;
    }
    const objUrl = URL.createObjectURL(certFile);
    setCertLocalPreview(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [certFile]);

  useEffect(() => {
    if (!verifyFile || !verifyFile.type.startsWith('image/')) {
      setVerifyLocalPreview(null);
      return;
    }
    const objUrl = URL.createObjectURL(verifyFile);
    setVerifyLocalPreview(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [verifyFile]);

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ certificates: CertificateRecord[] }>('/api/certificates');
      setCertificates(res.certificates);
    } catch (err: any) {
      showToast(err.message || 'Could not load certificates.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates, user?.id]);

  const handleUploadCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holderName.trim() || !certificateTitle.trim() || !issuingAuthority.trim() || !serialNumber.trim() || !certFile) {
      showToast('Complete all certificate fields and attach a certificate photo.', 'error');
      return;
    }
    setSubmittingUpload(true);
    try {
      const fileBase64 = await fileToBase64(certFile);
      const res = await apiFetch<{ certificate: CertificateRecord }>('/api/certificates/upload', {
        method: 'POST',
        body: JSON.stringify({
          holderName: holderName.trim(),
          certificateTitle: certificateTitle.trim(),
          certificateType,
          issuingAuthority: issuingAuthority.trim(),
          issueYear: issueYear ? Number(issueYear) : undefined,
          serialNumber: serialNumber.trim(),
          fileName: certFile.name,
          mimeType: certFile.type || 'image/png',
          fileBase64,
        }),
      });
      setLastSubmitted(res.certificate);
      setCertificates((prev) => [res.certificate, ...prev]);
      setCertificateTitle('');
      setSerialNumber('');
      setCertFile(null);
      showToast(`Certificate registered: ${res.certificate.verificationCode}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Certificate upload failed.', 'error');
    } finally {
      setSubmittingUpload(false);
    }
  };

  const runCodeLookup = async (rawCode: string) => {
    const q = rawCode.trim();
    if (!q) return;
    setSearchingCode(true);
    setLookupError(null);
    try {
      const res = await apiFetch<{ certificate: CertificateRecord }>(
        `/api/certificates/lookup?q=${encodeURIComponent(q)}`,
      );
      setLookupResult(res.certificate);
    } catch (err: any) {
      setLookupResult(null);
      setLookupError(err.message || 'Certificate record not found.');
    } finally {
      setSearchingCode(false);
    }
  };

  const handleVerifyPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyFile) {
      showToast('Select a certificate photo to inspect.', 'error');
      return;
    }
    setVerifyingPhoto(true);
    try {
      const fileBase64 = await fileToBase64(verifyFile);
      const res = await apiFetch<PhotoVerifyResponse>('/api/certificates/verify-photo', {
        method: 'POST',
        body: JSON.stringify({
          mimeType: verifyFile.type || 'image/png',
          fileBase64,
          codeOrSerial: verifyCodeHint.trim() || undefined,
        }),
      });
      setPhotoVerifyResult(res);
      showToast(
        res.exactHashMatch
          ? 'Exact SHA-256 certificate photo match found!'
          : `Photo inspected (${res.integrityScore}/100 integrity score).`,
        res.exactHashMatch ? 'success' : 'info',
      );
    } catch (err: any) {
      showToast(err.message || 'Photo verification failed.', 'error');
    } finally {
      setVerifyingPhoto(false);
    }
  };

  const handleIntegrityCheck = async (certId: string, approveAsAdmin = false) => {
    setBusyId(certId);
    try {
      const res = await apiFetch<{
        id: string;
        hashMatches: boolean;
        integrityScore: number;
        checks: CertificateCheckItem[];
        verificationStatus: VerificationStatus;
        verificationNotes?: string | null;
        verifiedAt?: string | null;
      }>(`/api/certificates/${certId}/verify`, {
        method: 'POST',
        body: JSON.stringify(approveAsAdmin ? { approve: true } : {}),
      });
      setCertificates((prev) =>
        prev.map((c) =>
          c.id === certId
            ? {
                ...c,
                integrityScore: res.integrityScore,
                checks: res.checks,
                verificationStatus: res.verificationStatus,
                verificationNotes: res.verificationNotes,
                verifiedAt: res.verifiedAt,
              }
            : c,
        ),
      );
      if (lookupResult?.id === certId) {
        setLookupResult((prev) =>
          prev
            ? {
                ...prev,
                integrityScore: res.integrityScore,
                checks: res.checks,
                verificationStatus: res.verificationStatus,
                verificationNotes: res.verificationNotes,
                verifiedAt: res.verifiedAt,
              }
            : null,
        );
      }
      showToast(
        approveAsAdmin
          ? 'Certificate photo verified and approved in KBN registry.'
          : res.hashMatches
            ? `SHA-256 integrity verified (${res.integrityScore}/100).`
            : 'Warning: Stored file hash mismatch detected!',
        res.hashMatches ? 'success' : 'error',
      );
    } catch (err: any) {
      showToast(err.message || 'Integrity check failed.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const verifiedCount = certificates.filter((c) => c.verificationStatus === 'verified').length;
  const pendingCount = certificates.filter((c) => c.verificationStatus === 'pending_review').length;

  return (
    <div className="min-h-screen text-[#0B1220] dark:text-[#F8FAFC] flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24 lg:pb-10">
        {/* Top 3D Trust Hero Banner */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 kbn-card-surface rounded-[24px] p-5 sm:p-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#16C784]">
              <ShieldCheck className="w-4 h-4" />
              <span>KaamBridgeNepal (KBN) Credential Trust Hub</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight leading-tight kbn-hero-gradient">
              Certificate Photo Upload &amp; Cryptographic Verification
            </h1>
            <p className="text-sm text-[#51617a] dark:text-[#94A3B8] max-w-2xl leading-relaxed">
              Attach academic degrees, CTEVT diplomas, training certificates, or work letters with live photo inspection. KBN generates a tamper-evident SHA-256 fingerprint and verification code for employers and reviewers.
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-lg pt-1">
              <div className="rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] p-3">
                <p className="text-xl font-bold font-mono-num tabular-nums text-[#16C784]">{verifiedCount}</p>
                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">Verified Records</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] p-3">
                <p className="text-xl font-bold font-mono-num tabular-nums text-[#F59E0B]">{pendingCount}</p>
                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">Pending Review</p>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] p-3">
                <p className="text-xl font-bold font-mono-num tabular-nums text-[#3B82F6]">SHA-256</p>
                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">Photo Seal</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 h-60 sm:h-64 rounded-2xl bg-gradient-to-br from-slate-100 via-white to-emerald-50/60 dark:from-[#0B1220] dark:via-[#111B2E] dark:to-[#0f252b] border border-slate-200 dark:border-[#263449] overflow-hidden relative">
            <Floating3DBridge variant="showcase" />
            <div className="pointer-events-none absolute top-3 left-3 text-[11px] font-semibold text-slate-600 dark:text-[#94A3B8] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#16C784]" />
              <span>Interactive 3D KBN Trust Prism</span>
            </div>
          </div>
        </section>

        {/* Action Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] p-1 gap-1 max-w-full overflow-x-auto" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'add'}
              onClick={() => setActiveTab('add')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'add'
                  ? 'bg-[#16C784] text-[#0B1220]'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImagePlus className="w-4 h-4 shrink-0" />
              <span>Add Certificate Photo</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'verify'}
              onClick={() => setActiveTab('verify')}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'verify'
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Fingerprint className="w-4 h-4 shrink-0" />
              <span>Verify by Photo or Code</span>
            </button>
          </div>
          <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
            Supported: PNG, JPG, WEBP, SVG, PDF up to 5 MB
          </span>
        </div>

        {/* 3D Tab Panel */}
        <TabTransition3D tabKey={activeTab}>
          {activeTab === 'add' ? (
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleUploadCertificate}
                className="lg:col-span-7 bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">Submit Certificate Photo for Verification</h2>
                  <span className="text-xs text-[#16C784] font-medium">Instant SHA-256 Fingerprint</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="cert-holder" className="block text-xs font-medium mb-1">
                      Certificate Holder Full Name
                    </label>
                    <input
                      id="cert-holder"
                      type="text"
                      required
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      placeholder="e.g. Aarav Shrestha"
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                    />
                  </div>
                  <div>
                    <label htmlFor="cert-title" className="block text-xs font-medium mb-1">
                      Certificate Title
                    </label>
                    <input
                      id="cert-title"
                      type="text"
                      required
                      value={certificateTitle}
                      onChange={(e) => setCertificateTitle(e.target.value)}
                      placeholder="e.g. B.Sc. CSIT Transcript"
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                    />
                  </div>
                  <div>
                    <label htmlFor="cert-type" className="block text-xs font-medium mb-1">
                      Certificate Category
                    </label>
                    <select
                      id="cert-type"
                      value={certificateType}
                      onChange={(e) => setCertificateType(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                    >
                      <option value="Academic Degree">Academic Degree (TU / KU / PU / NEB)</option>
                      <option value="CTEVT / Technical Diploma">CTEVT / Technical Diploma</option>
                      <option value="Skill / Training Certificate">Skill / Training Certificate</option>
                      <option value="Professional License">Professional License (NEC / NMC / Bar)</option>
                      <option value="Work Experience Letter">Work Experience Letter</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="cert-authority" className="block text-xs font-medium mb-1">
                      Issuing Institution / Board
                    </label>
                    <input
                      id="cert-authority"
                      type="text"
                      required
                      value={issuingAuthority}
                      onChange={(e) => setIssuingAuthority(e.target.value)}
                      placeholder="e.g. Tribhuvan University (TU)"
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                    />
                  </div>
                  <div>
                    <label htmlFor="cert-serial" className="block text-xs font-medium mb-1">
                      Certificate Serial / Registration No.
                    </label>
                    <input
                      id="cert-serial"
                      type="text"
                      required
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="e.g. TU-CSIT-2025-8841"
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                    />
                  </div>
                  <div>
                    <label htmlFor="cert-year" className="block text-xs font-medium mb-1">
                      Issue Year
                    </label>
                    <input
                      id="cert-year"
                      type="number"
                      min={1970}
                      max={2035}
                      value={issueYear}
                      onChange={(e) => setIssueYear(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                    />
                  </div>
                </div>

                <UploadDropzone
                  label="Certificate Photo"
                  accept=".png,.jpg,.jpeg,.webp,.svg,.pdf"
                  selectedFile={certFile}
                  onFileSelected={setCertFile}
                  helperText="Upload a clear photo or scan of your certificate (PNG, JPG, WEBP, SVG, PDF)"
                />

                {certLocalPreview && (
                  <div className="rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1220] p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
                      Live Photo Preview ({certFile?.name})
                    </p>
                    <img
                      src={certLocalPreview}
                      alt="Selected certificate preview"
                      className="w-full max-h-56 object-contain rounded-lg bg-white dark:bg-slate-900"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingUpload}
                  className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#16C784] text-[#0B1220] hover:bg-[#13b074] disabled:opacity-60 transition-colors"
                >
                  {submittingUpload ? 'Uploading & Hashing...' : 'Upload Certificate Photo & Generate Code'}
                </button>
              </form>

              <aside className="lg:col-span-5 space-y-4">
                <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-5 space-y-3">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#16C784]" />
                    <span>Automated Photo &amp; Integrity Checks</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                    <li>1. Binary header signature validates genuine PNG, JPEG, WEBP, SVG, or PDF file bytes.</li>
                    <li>2. SHA-256 cryptographic digest seals the exact uploaded photo against post-upload edits.</li>
                    <li>3. Authority &amp; serial metadata validation computes an integrity readiness score out of 100.</li>
                    <li>4. KBN reviewers verify authenticity before issuing the green Verified badge.</li>
                  </ul>
                </div>

                {lastSubmitted && (
                  <div className="bg-emerald-50 dark:bg-[#111B2E] border border-[#16C784]/40 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#16C784]">
                        Certificate Registered
                      </span>
                      <VerificationBadge status={lastSubmitted.verificationStatus} />
                    </div>
                    <p className="text-sm font-bold">{lastSubmitted.certificateTitle}</p>
                    <div className="rounded-xl bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-[#263449] p-3 space-y-1 text-xs">
                      <p>
                        Verification Code:{' '}
                        <span className="font-mono-num font-bold text-[#16C784]">
                          {lastSubmitted.verificationCode}
                        </span>
                      </p>
                      <p>
                        Integrity Score:{' '}
                        <span className="font-mono-num font-semibold">{lastSubmitted.integrityScore}/100</span>
                      </p>
                      <p className="truncate">
                        SHA-256:{' '}
                        <span className="font-mono-num text-slate-500 dark:text-[#94A3B8]">
                          {lastSubmitted.sha256Hash}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {lastSubmitted.checks.map((chk, idx) => (
                        <div key={`${chk.label}-${idx}`} className="flex items-start gap-2 text-xs">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                              chk.passed ? 'text-[#16C784]' : 'text-[#F59E0B]'
                            }`}
                          />
                          <span>
                            <strong>{chk.label}:</strong> {chk.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </section>
          ) : (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Verify by Code or Serial */}
              <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold">Verify by Code or Serial Number</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    runCodeLookup(lookupQuery);
                  }}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={lookupQuery}
                      onChange={(e) => setLookupQuery(e.target.value)}
                      placeholder="e.g. KBN-CERT-2026-TU01 or TU-CSIT-2024-0192"
                      aria-label="Verification code or serial number"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searchingCode}
                    className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#3B82F6] text-white hover:bg-blue-600 disabled:opacity-60 whitespace-nowrap"
                  >
                    {searchingCode ? 'Checking...' : 'Verify Code'}
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-[#94A3B8]">Try sample code:</span>
                  {['KBN-CERT-2026-TU01', 'KBN-CERT-2026-CT02'].map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setLookupQuery(code);
                        runCodeLookup(code);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] font-mono-num hover:border-[#16C784] transition-colors"
                    >
                      {code}
                    </button>
                  ))}
                </div>

                {lookupError && (
                  <div className="p-3.5 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{lookupError}</span>
                  </div>
                )}

                {lookupResult && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold">{lookupResult.certificateTitle}</p>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                          Holder: {lookupResult.holderName} · {lookupResult.issuingAuthority}
                        </p>
                      </div>
                      <VerificationBadge status={lookupResult.verificationStatus} />
                    </div>
                    <div className="text-xs space-y-1">
                      <p>
                        Code: <span className="font-mono-num font-semibold">{lookupResult.verificationCode}</span> ·
                        Serial: <span className="font-mono-num">{lookupResult.serialNumber}</span>
                      </p>
                      <p className="truncate">
                        SHA-256: <span className="font-mono-num text-slate-500">{lookupResult.sha256Hash}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lookupResult.previewUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setInspectModal({
                              title: lookupResult.certificateTitle,
                              url: lookupResult.previewUrl!,
                              cert: lookupResult,
                            })
                          }
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#263449] inline-flex items-center gap-1.5 hover:border-[#16C784]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Photo</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === lookupResult.id}
                        onClick={() => handleIntegrityCheck(lookupResult.id, false)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220] inline-flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Verify Disk Hash</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Verify Photo Integrity / Match */}
              <form
                onSubmit={handleVerifyPhoto}
                className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-4"
              >
                <h2 className="text-lg font-bold">Verify Certificate Photo Integrity</h2>
                <div>
                  <label htmlFor="verify-code-hint" className="block text-xs font-medium mb-1">
                    Optional Verification Code / Serial to Cross-Check
                  </label>
                  <input
                    id="verify-code-hint"
                    type="text"
                    value={verifyCodeHint}
                    onChange={(e) => setVerifyCodeHint(e.target.value)}
                    placeholder="e.g. KBN-CERT-2026-TU01"
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                  />
                </div>

                <UploadDropzone
                  label="Certificate Photo to Verify"
                  accept=".png,.jpg,.jpeg,.webp,.svg,.pdf"
                  selectedFile={verifyFile}
                  onFileSelected={setVerifyFile}
                  helperText="Computes live SHA-256 fingerprint and matches against KBN certificate records"
                />

                {verifyLocalPreview && (
                  <img
                    src={verifyLocalPreview}
                    alt="Certificate photo under inspection"
                    className="w-full max-h-44 object-contain rounded-xl border border-slate-200 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1220]"
                  />
                )}

                <button
                  type="submit"
                  disabled={verifyingPhoto}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#16C784] text-[#0B1220] hover:bg-[#13b074] disabled:opacity-60"
                >
                  {verifyingPhoto ? 'Inspecting Photo...' : 'Inspect & Verify Photo'}
                </button>

                {photoVerifyResult && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">
                        {photoVerifyResult.exactHashMatch
                          ? 'Exact Registry Photo Match Confirmed'
                          : 'Photo Binary Check Complete'}
                      </span>
                      <span className="font-mono-num font-bold text-[#16C784]">
                        {photoVerifyResult.integrityScore}/100
                      </span>
                    </div>
                    <p className="truncate">
                      Computed SHA-256:{' '}
                      <span className="font-mono-num text-slate-500">{photoVerifyResult.sha256Hash}</span>
                    </p>
                    {photoVerifyResult.matchedCertificate && (
                      <div className="pt-1 border-t border-slate-200 dark:border-[#263449] flex items-center justify-between gap-2">
                        <span>
                          Matched: <strong>{photoVerifyResult.matchedCertificate.certificateTitle}</strong> (
                          {photoVerifyResult.matchedCertificate.holderName})
                        </span>
                        <VerificationBadge status={photoVerifyResult.matchedCertificate.verificationStatus} />
                      </div>
                    )}
                    <div className="space-y-1 pt-1">
                      {photoVerifyResult.checks.map((c, idx) => (
                        <div key={`${c.label}-${idx}`} className="flex items-start gap-1.5">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                              c.passed ? 'text-[#16C784]' : 'text-[#F59E0B]'
                            }`}
                          />
                          <span>
                            <strong>{c.label}:</strong> {c.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </section>
          )}
        </TabTransition3D>

        {/* Registry List */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-[#16C784]" />
                <span>Certificate Verification Registry ({certificates.length})</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Inspect stored certificate photos, verify SHA-256 disk integrity, or approve pending submissions as an administrator.
              </p>
            </div>
          </div>

          {loading ? (
            <LoadingSkeleton rows={3} />
          ) : (
            <div className="kbn-card-grid grid grid-cols-1 md:grid-cols-2 gap-5">
              {certificates.map((cert) => (
                <article
                  key={cert.id}
                  className="kbn-card-surface rounded-[20px] p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold leading-snug">{cert.certificateTitle}</h3>
                        <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
                          {cert.holderName} · {cert.issuingAuthority}
                          {cert.issueYear ? ` (${cert.issueYear})` : ''}
                        </p>
                      </div>
                      <VerificationBadge status={cert.verificationStatus} />
                    </div>

                    <div className="rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] p-3 text-xs space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          Code:{' '}
                          <strong className="font-mono-num text-[#16C784]">{cert.verificationCode}</strong>
                        </span>
                        <span className="font-mono-num tabular-nums font-semibold">
                          Score: {cert.integrityScore}/100
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-[#94A3B8]">
                        Serial: <span className="font-mono-num">{cert.serialNumber}</span> ·{' '}
                        {formatNepalDate(cert.createdAt, lang)}
                      </p>
                      <p className="truncate text-slate-500 dark:text-[#94A3B8]">
                        SHA-256: <span className="font-mono-num">{cert.sha256Hash}</span>
                      </p>
                    </div>

                    {cert.verificationNotes && (
                      <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{cert.verificationNotes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-[#263449]">
                    {cert.previewUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setInspectModal({
                            title: `${cert.holderName} — ${cert.certificateTitle}`,
                            url: cert.previewUrl!,
                            cert,
                          })
                        }
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#263449] inline-flex items-center gap-1.5 hover:border-[#3B82F6]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Photo</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={busyId === cert.id}
                      onClick={() => handleIntegrityCheck(cert.id, false)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#16C784]/50 text-[#16C784] hover:bg-[#16C784]/10 inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Verify Integrity</span>
                    </button>

                    {user?.role === 'admin' && cert.verificationStatus !== 'verified' && (
                      <button
                        type="button"
                        disabled={busyId === cert.id}
                        onClick={() => handleIntegrityCheck(cert.id, true)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#16C784] text-[#0B1220] hover:bg-[#13b074] inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve &amp; Verify</span>
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <ConfirmationModal
        open={!!inspectModal}
        title={inspectModal?.title || 'Certificate Photo'}
        description={
          inspectModal?.cert
            ? `Verification Code: ${inspectModal.cert.verificationCode} · SHA-256: ${inspectModal.cert.sha256Hash.slice(0, 20)}...`
            : 'Certificate image preview'
        }
        confirmLabel="Close"
        onConfirm={() => setInspectModal(null)}
        onCancel={() => setInspectModal(null)}
      >
        {inspectModal && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#263449] bg-slate-900">
            <img
              src={inspectModal.url}
              alt={inspectModal.title}
              referrerPolicy="no-referrer"
              className="w-full max-h-[380px] object-contain"
            />
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
};
