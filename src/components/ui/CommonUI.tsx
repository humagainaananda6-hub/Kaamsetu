import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Inbox, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  NEPAL_PROVINCES,
  getDistrictsByProvince,
  getMunicipalitiesByDistrict,
} from '../../lib/nepal-locations';

export const DashboardStatCard: React.FC<{
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: 'emerald' | 'blue' | 'amber' | 'neutral';
}> = ({ label, value, sublabel, accent = 'neutral' }) => {
  const accentText =
    accent === 'emerald'
      ? 'text-[#16C784]'
      : accent === 'blue'
        ? 'text-[#3B82F6]'
        : accent === 'amber'
          ? 'text-[#F59E0B]'
          : 'text-slate-900 dark:text-[#F8FAFC]';

  return (
    <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-5 flex flex-col justify-between gap-2">
      <p className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">{label}</p>
      <p className={`text-2xl font-bold font-mono-num tabular-nums tracking-tight ${accentText}`}>{value}</p>
      {sublabel && <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{sublabel}</p>}
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] rounded-xl p-10 text-center flex flex-col items-center gap-3">
    <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] flex items-center justify-center text-slate-500 dark:text-[#94A3B8]">
      <Inbox className="w-5 h-5" aria-hidden="true" />
    </div>
    <h3 className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">{title}</h3>
    <p className="text-sm text-slate-600 dark:text-[#94A3B8] max-w-md">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#16C784] text-[#0B1220] hover:bg-[#13b074] transition-colors whitespace-nowrap"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading content">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-28 rounded-xl bg-slate-200/70 dark:bg-[#172338] border border-slate-200 dark:border-[#263449] animate-pulse"
      />
    ))}
  </div>
);

export const ConfirmationModal: React.FC<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  children,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] rounded-xl p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h3 id="modal-title" className="text-lg font-semibold text-slate-900 dark:text-[#F8FAFC]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-[#94A3B8]">{description}</p>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-[#263449] text-slate-700 dark:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#172338] transition-colors whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap disabled:opacity-60 ${
              destructive
                ? 'bg-[#EF4444] text-white hover:bg-red-600'
                : 'bg-[#16C784] text-[#0B1220] hover:bg-[#13b074]'
            }`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-[#172338] border border-slate-200 dark:border-[#263449] shadow-lg text-sm text-slate-900 dark:text-[#F8FAFC]"
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#16C784] shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const UploadDropzone: React.FC<{
  label: string;
  accept?: string;
  selectedFile: File | null;
  onFileSelected: (file: File | null) => void;
  helperText?: string;
}> = ({ label, accept = '.png,.jpg,.jpeg,.webp,.pdf', selectedFile, onFileSelected, helperText }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File exceeds 5 MB maximum limit.');
      return;
    }
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setError('Unsupported file format. Please upload PNG, JPG, WEBP, or PDF.');
      return;
    }
    onFileSelected(file);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-[#F8FAFC]">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full p-5 rounded-xl border border-dashed border-slate-300 dark:border-[#263449] bg-slate-50 dark:bg-[#0B1220] hover:border-[#16C784] transition-colors text-left flex items-center gap-4"
      >
        <div className="w-10 h-10 rounded-lg bg-[#16C784]/10 text-[#16C784] flex items-center justify-center shrink-0">
          <FileUp className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC] truncate">
            {selectedFile ? selectedFile.name : 'Choose a document to upload'}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
            {selectedFile
              ? `${(selectedFile.size / 1024).toFixed(1)} KB · Click to replace`
              : helperText || 'PNG, JPG, WEBP, or PDF up to 5 MB · Stored privately'}
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
    </div>
  );
};

export const NepalLocationSelector: React.FC<{
  province: string;
  district: string;
  municipality: string;
  onChange: (next: { province: string; district: string; municipality: string }) => void;
  includeAllOption?: boolean;
}> = ({ province, district, municipality, onChange, includeAllOption = false }) => {
  const districts = province && province !== 'all' ? getDistrictsByProvince(province) : [];
  const municipalities =
    province && province !== 'all' && district && district !== 'all'
      ? getMunicipalitiesByDistrict(province, district)
      : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">Province</label>
        <select
          value={province}
          onChange={(e) => {
            const nextProv = e.target.value;
            if (nextProv === 'all') {
              onChange({ province: 'all', district: 'all', municipality: '' });
              return;
            }
            const nextDists = getDistrictsByProvince(nextProv);
            const firstDist = nextDists[0]?.name || '';
            const firstMuni = nextDists[0]?.municipalities[0] || '';
            onChange({ province: nextProv, district: includeAllOption ? 'all' : firstDist, municipality: firstMuni });
          }}
          className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449] text-slate-900 dark:text-[#F8FAFC]"
        >
          {includeAllOption && <option value="all">All 7 Provinces</option>}
          {NEPAL_PROVINCES.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name} ({p.nameNe})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">District</label>
        <select
          value={district}
          disabled={!province || province === 'all'}
          onChange={(e) => {
            const nextDist = e.target.value;
            const munis = getMunicipalitiesByDistrict(province, nextDist);
            onChange({ province, district: nextDist, municipality: munis[0] || '' });
          }}
          className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449] text-slate-900 dark:text-[#F8FAFC] disabled:opacity-50"
        >
          {includeAllOption && <option value="all">All Districts</option>}
          {districts.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name} ({d.nameNe})
            </option>
          ))}
        </select>
      </div>

      {!includeAllOption && (
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
            Municipality / Rural Mun.
          </label>
          <select
            value={municipality}
            disabled={municipalities.length === 0}
            onChange={(e) => onChange({ province, district, municipality: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-[#0B1220] border border-slate-300 dark:border-[#263449] text-slate-900 dark:text-[#F8FAFC] disabled:opacity-50"
          >
            {municipalities.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
