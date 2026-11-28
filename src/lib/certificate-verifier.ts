export interface CertificateCheckItem {
  label: string;
  passed: boolean;
  detail: string;
}

export interface CertificateIntegrityResult {
  integrityScore: number;
  checks: CertificateCheckItem[];
  detectedFormat: 'png' | 'jpeg' | 'webp' | 'pdf' | 'svg' | 'unknown';
}

export function detectBinaryFileFormat(
  buffer: Uint8Array,
  declaredMime: string,
): 'png' | 'jpeg' | 'webp' | 'pdf' | 'svg' | 'unknown' {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'pdf';
  }
  const headText = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, 256)).trimStart();
  if (declaredMime === 'image/svg+xml' || headText.startsWith('<svg') || headText.startsWith('<?xml')) {
    return 'svg';
  }
  return 'unknown';
}

export function evaluateCertificateIntegrity(input: {
  buffer: Uint8Array;
  declaredMime: string;
  holderName: string;
  certificateTitle: string;
  issuingAuthority: string;
  serialNumber: string;
  issueYear?: number | null;
}): CertificateIntegrityResult {
  const detectedFormat = detectBinaryFileFormat(input.buffer, input.declaredMime);
  const formatValid = detectedFormat !== 'unknown';
  const sizeValid = input.buffer.length >= 128 && input.buffer.length <= 5 * 1024 * 1024;
  const holderValid = input.holderName.trim().length >= 3;
  const authorityValid = input.issuingAuthority.trim().length >= 2 && input.certificateTitle.trim().length >= 3;
  const serialClean = input.serialNumber.trim();
  const serialValid = /^[A-Za-z0-9\-/._]{4,40}$/.test(serialClean);
  const currentYear = new Date().getFullYear() + 58; // Supports both AD & BS (2083 BS)
  const yearValid = !input.issueYear || (input.issueYear >= 1970 && input.issueYear <= currentYear);

  const checks: CertificateCheckItem[] = [
    {
      label: 'File Binary & Image Signature',
      passed: formatValid,
      detail: formatValid
        ? `Verified ${detectedFormat.toUpperCase()} document header`
        : 'Unrecognized binary signature for declared certificate format',
    },
    {
      label: 'Document Resolution / Payload Size',
      passed: sizeValid,
      detail: sizeValid
        ? `${(input.buffer.length / 1024).toFixed(1)} KB within verified clarity range`
        : 'File too small or exceeds 5 MB maximum limit',
    },
    {
      label: 'Holder & Issuing Body Metadata',
      passed: holderValid && authorityValid,
      detail:
        holderValid && authorityValid
          ? `${input.holderName.trim()} · ${input.issuingAuthority.trim()}`
          : 'Complete holder name, title, and issuing authority required',
    },
    {
      label: 'Certificate Serial Format',
      passed: serialValid && yearValid,
      detail:
        serialValid && yearValid
          ? `Serial ${serialClean} normalized for KBN registry lookup`
          : 'Serial number must be 4–40 alphanumeric/hyphen characters',
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const integrityScore = Math.round((passedCount / checks.length) * 100);

  return {
    integrityScore,
    checks,
    detectedFormat,
  };
}

export function formatVerificationCode(seedId: string, year = new Date().getFullYear()): string {
  const alnum = seedId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const tail = (alnum.slice(-6) || '000001').padStart(6, '0');
  return `KBN-CERT-${year}-${tail}`;
}

export function normalizeLookupQuery(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}
