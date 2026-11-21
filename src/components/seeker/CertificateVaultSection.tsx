import React, { useState } from 'react';
import { Eye, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { apiFetch, fileToBase64 } from '../../lib/api';
import { formatNepalDate } from '../../lib/nepal-locations';
import { useApp } from '../../context/AppContext';
import type { EducationRecord, IdentityVerification } from '../../types';
import { VerificationBadge } from '../ui/Badges';
import { ConfirmationModal, UploadDropzone } from '../ui/CommonUI';

export const CertificateVaultSection: React.FC<{
  educations: EducationRecord[];
  identity: IdentityVerification | null;
  onRefresh: () => Promise<void>;
}> = ({ educations, identity, onRefresh }) => {
  const { lang, showToast } = useApp();

  // Academic upload state
  const [selectedEduId, setSelectedEduId] = useState(educations[0]?.id || '');
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState("Bachelor's Certificate");
  const [acadFile, setAcadFile] = useState<File | null>(null);
  const [uploadingAcad, setUploadingAcad] = useState(false);

  // Citizenship Identity verification state
  const [idType, setIdType] = useState<IdentityVerification['documentType']>('Nepali Citizenship (Nagarikta)');
  const [idNumber, setIdNumber] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);

  // Secure preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const handleOpenSecurePreview = async (kind: 'identity' | 'academic', docId: string, title: string) => {
    try {
      const res = await apiFetch<{ url: string }>(`/api/documents/signed-url/${kind}/${docId}`);
      setPreviewTitle(title);
      setPreviewUrl(res.url);
    } catch (err: any) {
      showToast(err.message || 'Could not generate temporary signed URL.', 'error');
    }
  };

  const handleUploadAcademic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEduId || !docTitle.trim() || !acadFile) {
      showToast('Select an education record, title, and document file.', 'error');
      return;
    }
    setUploadingAcad(true);
    try {
      const b64 = await fileToBase64(acadFile);
      await apiFetch('/api/seeker/academic-doc', {
        method: 'POST',
        body: JSON.stringify({
          educationRecordId: selectedEduId,
          title: docTitle.trim(),
          documentType: docType,
          fileName: acadFile.name,
          mimeType: acadFile.type || 'image/png',
          fileBase64: b64,
        }),
      });
      setDocTitle('');
      setAcadFile(null);
      await onRefresh();
      showToast('Certificate uploaded securely and queued for reviewer verification.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Upload failed.', 'error');
    } finally {
      setUploadingAcad(false);
    }
  };

  const handleUploadIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentChecked) {
      showToast('Please accept the explicit identity processing consent first.', 'error');
      return;
    }
    if (!idNumber.trim() || !idFile) {
      showToast('Enter document number and select your identity file.', 'error');
      return;
    }
    setUploadingId(true);
    try {
      const b64 = await fileToBase64(idFile);
      await apiFetch('/api/seeker/identity', {
        method: 'POST',
        body: JSON.stringify({
          documentType: idType,
          documentNumber: idNumber.trim(),
          fileName: idFile.name,
          mimeType: idFile.type || 'image/png',
          fileBase64: b64,
          consentAccepted: consentChecked,
        }),
      });
      setIdNumber('');
      setIdFile(null);
      await onRefresh();
      showToast('Identity document submitted to private verification queue.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Identity submission failed.', 'error');
    } finally {
      setUploadingId(false);
    }
  };

  const handleDeleteIdentity = async () => {
    await apiFetch('/api/seeker/identity', { method: 'DELETE' });
    await onRefresh();
    showToast('Identity document removed from private storage.', 'info');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold">Certificate Vault &amp; Identity Verification</h2>
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
          Documents are stored in private, access-controlled storage. Uploading a file sets status to Pending Review—badges appear only after authorized human approval.
        </p>
      </div>

      {/* Academic Certificate Vault */}
      <section className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold">Academic &amp; Technical Certificate Vault</h3>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8]">
            <Lock className="w-3.5 h-3.5 text-[#16C784]" />
            <span>Private Access-Controlled Storage</span>
          </span>
        </div>

        <div className="space-y-3">
          {educations.map((ed) => (
            <div
              key={ed.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] flex flex-wrap items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {ed.document?.title || `${ed.qualificationLevel} — ${ed.institutionName}`}
                  </span>
                  <VerificationBadge status={ed.document?.verificationStatus || 'not_submitted'} />
                </div>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  {ed.qualificationLevel} · {ed.boardOrUniversity} · {ed.completionYear} · {ed.gpaOrPercentage}
                </p>
                {ed.document && (
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    File: {ed.document.fileName} · Submitted {formatNepalDate(ed.document.submittedAt, lang)}
                  </p>
                )}
                {ed.document?.rejectionReason && (
                  <p className="text-xs text-[#EF4444]">
                    Reviewer feedback: {ed.document.rejectionReason}
                  </p>
                )}
              </div>

              {ed.document && (
                <button
                  type="button"
                  onClick={() => handleOpenSecurePreview('academic', ed.document!.id, ed.document!.title)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#263449] inline-flex items-center gap-1.5 hover:border-[#16C784]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {educations.length > 0 && (
          <form onSubmit={handleUploadAcademic} className="pt-4 border-t border-slate-200 dark:border-[#263449] space-y-4">
            <h4 className="text-sm font-semibold">Upload or Replace Academic Certificate</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Education Record</label>
                <select
                  value={selectedEduId}
                  onChange={(e) => setSelectedEduId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                >
                  {educations.map((ed) => (
                    <option key={ed.id} value={ed.id}>
                      {ed.qualificationLevel} — {ed.institutionName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Qualification Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                >
                  {[
                    'SEE Certificate',
                    '+2 Certificate',
                    "Bachelor's Certificate",
                    "Master's Certificate",
                    'Diploma Certificate',
                    'Technical / CTEVT Training',
                    'Vocational Qualification',
                    'Professional License',
                  ].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. TU B.Sc. CSIT Transcript"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
                />
              </div>
            </div>

            <UploadDropzone
              label="Academic Document File"
              selectedFile={acadFile}
              onFileSelected={setAcadFile}
            />

            <button
              type="submit"
              disabled={uploadingAcad}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#16C784] text-[#0B1220] hover:bg-[#13b074] disabled:opacity-60"
            >
              {uploadingAcad ? 'Uploading...' : 'Submit Academic Document for Review'}
            </button>
          </form>
        )}
      </section>

      {/* Separate Secure Citizenship Identity Verification */}
      <section className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#3B82F6]" />
            <h3 className="text-base font-semibold">Nepali Citizenship &amp; Identity Verification</h3>
          </div>
          <VerificationBadge status={identity?.verificationStatus || 'not_submitted'} />
        </div>

        <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
          Your Nepali Citizenship Certificate (Nagarikta) or National ID is strictly isolated from public profiles and employer searches. Documents are never used for AI model training, all views are audit-logged, and you may delete your submission anytime.
        </p>

        {identity && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <p className="text-sm font-semibold">{identity.documentType}</p>
              <p className="text-slate-500 dark:text-[#94A3B8]">
                Masked Ref: <span className="font-mono-num">{identity.documentNumberMasked}</span> · Submitted{' '}
                {formatNepalDate(identity.submittedAt, lang)}
              </p>
              {identity.rejectionReason && (
                <p className="text-[#EF4444]">Reviewer feedback: {identity.rejectionReason}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenSecurePreview('identity', identity.id, identity.documentType)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#263449] inline-flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Private Preview</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteIdentity}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#EF4444]/40 text-[#EF4444] inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleUploadIdentity} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Identity Document Type</label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              >
                <option value="Nepali Citizenship (Nagarikta)">Nepali Citizenship (Nagarikta)</option>
                <option value="National ID (Rastriya Parichaya Patra)">National ID (Rastriya Parichaya Patra)</option>
                <option value="Passport">Passport</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Document Number (Masked after upload)</label>
              <input
                type="text"
                required
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder="e.g. 27-01-78-00123"
                className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449]"
              />
            </div>
          </div>

          <UploadDropzone
            label="Identity Scan / Photo"
            selectedFile={idFile}
            onFileSelected={setIdFile}
          />

          <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-[#94A3B8] cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-0.5 rounded"
            />
            <span>
              I explicitly consent to KaamSetu verification staff reviewing this identity document solely to verify my account authenticity. It will never be displayed publicly or used for unrelated AI training.
            </span>
          </label>

          <button
            type="submit"
            disabled={uploadingId}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#3B82F6] text-white hover:bg-blue-600 disabled:opacity-60"
          >
            {uploadingId ? 'Submitting...' : identity ? 'Resubmit Identity Document' : 'Submit for Identity Verification'}
          </button>
        </form>
      </section>

      <ConfirmationModal
        open={!!previewUrl}
        title={previewTitle}
        description="Temporary 5-minute signed URL preview. Access is logged for security."
        confirmLabel="Done"
        onConfirm={() => setPreviewUrl(null)}
        onCancel={() => setPreviewUrl(null)}
      >
        {previewUrl && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#263449] bg-slate-900">
            <img
              src={previewUrl}
              alt={previewTitle}
              referrerPolicy="no-referrer"
              className="w-full max-h-[360px] object-contain"
            />
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
};
