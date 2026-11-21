import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NEPAL_PROVINCES,
  formatNPR,
  formatNepalDate,
  getAllDistricts,
  getDistrictsByProvince,
  normalizeNepalPhone,
} from './nepal-locations';

test('Nepal dataset contains all 7 provinces and all 77 districts', () => {
  assert.equal(NEPAL_PROVINCES.length, 7);
  const allDistricts = getAllDistricts();
  assert.equal(allDistricts.length, 77);
});

test('getDistrictsByProvince returns Bagmati districts including Kathmandu and Lalitpur', () => {
  const bagmati = getDistrictsByProvince('Bagmati Province');
  assert.equal(bagmati.length, 13);
  assert.ok(bagmati.some((d) => d.name === 'Kathmandu'));
  assert.ok(bagmati.some((d) => d.name === 'Lalitpur'));
});

test('normalizeNepalPhone validates +977 mobile numbers', () => {
  assert.deepEqual(normalizeNepalPhone('9841234567'), {
    valid: true,
    normalized: '+977-9841234567',
  });
  assert.deepEqual(normalizeNepalPhone('+977 9803456789'), {
    valid: true,
    normalized: '+977-9803456789',
  });
  assert.equal(normalizeNepalPhone('12345').valid, false);
});

test('formatNPR formats Nepali Rupees cleanly', () => {
  assert.equal(formatNPR(45000), 'रु 45,000');
  assert.equal(formatNPR(120000), 'रु 1,20,000');
});

test('formatNepalDate includes both AD and BS calendar info', () => {
  const formatted = formatNepalDate('2026-11-17T08:00:00Z', 'en');
  assert.ok(formatted.includes('2026'));
  assert.ok(formatted.includes('BS'));
});
