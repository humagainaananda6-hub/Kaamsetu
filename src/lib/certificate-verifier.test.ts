import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectBinaryFileFormat,
  evaluateCertificateIntegrity,
  formatVerificationCode,
  normalizeLookupQuery,
} from './certificate-verifier';

test('detectBinaryFileFormat identifies PNG and JPEG magic bytes accurately', () => {
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const jpgBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const badBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03]);

  assert.equal(detectBinaryFileFormat(pngBytes, 'image/png'), 'png');
  assert.equal(detectBinaryFileFormat(jpgBytes, 'image/jpeg'), 'jpeg');
  assert.equal(detectBinaryFileFormat(badBytes, 'image/png'), 'unknown');
});

test('evaluateCertificateIntegrity returns 100% score for valid PNG certificate', () => {
  const validPng = new Uint8Array(512);
  validPng.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const result = evaluateCertificateIntegrity({
    buffer: validPng,
    declaredMime: 'image/png',
    holderName: 'Aarav Shrestha',
    certificateTitle: 'B.Sc. CSIT Official Transcript',
    issuingAuthority: 'Tribhuvan University',
    serialNumber: 'TU-2025-0412',
    issueYear: 2025,
  });

  assert.equal(result.integrityScore, 100);
  assert.equal(result.detectedFormat, 'png');
  assert.equal(result.checks.every((c) => c.passed), true);
});

test('evaluateCertificateIntegrity flags unrecognized signature and invalid serial', () => {
  const invalidBuf = new Uint8Array(64);
  const result = evaluateCertificateIntegrity({
    buffer: invalidBuf,
    declaredMime: 'image/jpeg',
    holderName: 'Ab',
    certificateTitle: 'Degree',
    issuingAuthority: 'TU',
    serialNumber: 'bad serial!!',
    issueYear: 2025,
  });

  assert.equal(result.integrityScore < 100, true);
  assert.equal(result.detectedFormat, 'unknown');
  assert.equal(result.checks[0].passed, false);
});

test('formatVerificationCode and normalizeLookupQuery format codes cleanly', () => {
  assert.equal(formatVerificationCode('cert_abc123', 2026), 'KBN-CERT-2026-ABC123');
  assert.equal(normalizeLookupQuery('  kbn-cert-2026-tu01 '), 'KBN-CERT-2026-TU01');
});
