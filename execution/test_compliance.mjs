import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { 
  addMonthsCalendar, 
  formatDateIso, 
  calculateExpiryDate, 
  determineStatus 
} from './compliance_calculator.js';

import {
  isExpiring,
  getRuleKey,
  getValidityMonths,
  shouldApplyEndOfMonth,
  CREW_COMPLIANCE_RULES
} from './compliance_rules.js';

describe('Compliance Rules & Metadata', () => {
  it('correctly maps expiring preparations', () => {
    assert.equal(isExpiring('OPC'), true);
    assert.equal(isExpiring('LPC'), true);
    assert.equal(isExpiring('MED'), true);
    assert.equal(isExpiring('DG'), true);
    assert.equal(isExpiring('Bird_Strike'), false);
    assert.equal(isExpiring('GI_275'), false);
  });

  it('correctly returns validity months for Flight vs Cabin', () => {
    // Flight OPC is 6 months
    assert.equal(getValidityMonths('OPC', 'Flight'), 6);
    // Cabin OPC is 12 months
    assert.equal(getValidityMonths('OPC', 'Cabin'), 12);
    // EMER_3 is 36 months for both
    assert.equal(getValidityMonths('EMER_3', 'Flight'), 36);
    assert.equal(getValidityMonths('EMER_3', 'Cabin'), 36);
  });

  it('correctly identifies end-of-month overrides', () => {
    // DG and AV_SEC have end_of_month_overrides: false
    assert.equal(shouldApplyEndOfMonth('DG', 'Flight'), false);
    assert.equal(shouldApplyEndOfMonth('AV_SEC', 'Flight'), false);
    assert.equal(shouldApplyEndOfMonth('OPC', 'Flight'), true);
    assert.equal(shouldApplyEndOfMonth('LPC', 'Flight'), true);
  });

  it('correctly maps Ukrainian month abbreviations', () => {
    assert.equal(CREW_COMPLIANCE_RULES.UKRAINIAN_MONTHS_MAP['трав'], 4); // May = 4 (0-indexed)
    assert.equal(CREW_COMPLIANCE_RULES.UKRAINIAN_MONTHS_MAP['черв'], 5); // June = 5
    assert.equal(CREW_COMPLIANCE_RULES.UKRAINIAN_MONTHS_MAP['січ'], 0);  // Jan = 0
  });
});

describe('Date Math (addMonthsCalendar & formatDateIso)', () => {
  it('adds months cleanly within same year', () => {
    const d = new Date(2026, 0, 15); // 2026-01-15
    const res = addMonthsCalendar(d, 3);
    assert.equal(formatDateIso(res), '2026-04-15');
  });

  it('clamps day to last day of month without rollover (Aug 31 + 6 mo -> Feb 28)', () => {
    const d = new Date(2026, 7, 31); // 2026-08-31
    const res = addMonthsCalendar(d, 6);
    assert.equal(formatDateIso(res), '2027-02-28');
  });

  it('handles leap year correctly (Aug 31, 2023 + 6 mo -> Feb 29, 2024)', () => {
    const d = new Date(2023, 7, 31); // 2023-08-31
    const res = addMonthsCalendar(d, 6);
    assert.equal(formatDateIso(res), '2024-02-29');
  });

  it('handles 1 month from Jan 31 -> Feb 28 in non-leap year', () => {
    const d = new Date(2025, 0, 31); // 2025-01-31
    const res = addMonthsCalendar(d, 1);
    assert.equal(formatDateIso(res), '2025-02-28');
  });
});

describe('Expiry Calculation (calculateExpiryDate)', () => {
  it('calculates Flight OPC with end-of-month shift (6 months)', () => {
    const expiry = calculateExpiryDate('2026-03-15', 'OPC', 'Flight');
    // March + 6 months = September -> last day of Sept is 30
    assert.equal(expiry, '2026-09-30');
  });

  it('calculates Flight LPC with end-of-month shift (12 months)', () => {
    const expiry = calculateExpiryDate('2026-02-10', 'LPC', 'Flight');
    // Feb 2026 + 12 months = Feb 2027 -> last day is 28
    assert.equal(expiry, '2027-02-28');
  });

  it('calculates Flight DG with exact date (override false, 24 months)', () => {
    const expiry = calculateExpiryDate('2026-04-18', 'DG', 'Flight');
    assert.equal(expiry, '2028-04-18');
  });

  it('calculates Cabin OPC (12 months, end-of-month)', () => {
    const expiry = calculateExpiryDate('2026-05-12', 'OPC', 'Cabin');
    assert.equal(expiry, '2027-05-31');
  });

  it('returns original date for non-expiring preparations', () => {
    const res = calculateExpiryDate('2026-01-20', 'Bird_Strike', 'Flight');
    assert.equal(res, '2026-01-20');
  });

  it('returns null for missing or invalid dates', () => {
    assert.equal(calculateExpiryDate('', 'OPC', 'Flight'), null);
    assert.equal(calculateExpiryDate('-', 'OPC', 'Flight'), null);
    assert.equal(calculateExpiryDate('invalid-date', 'OPC', 'Flight'), null);
  });
});

describe('Status Determination (determineStatus)', () => {
  const SYS_DATE = '2026-10-27';

  it('returns EXPIRED when expiry date is in the past', () => {
    const status = determineStatus('2026-10-20', SYS_DATE, 'OPC');
    assert.equal(status, 'EXPIRED');
  });

  it('returns WARNING_ORANGE when expiry is <= 7 days away', () => {
    const statusSameDay = determineStatus('2026-10-27', SYS_DATE, 'OPC');
    const statusIn5Days = determineStatus('2026-11-01', SYS_DATE, 'OPC');
    assert.equal(statusSameDay, 'WARNING_ORANGE');
    assert.equal(statusIn5Days, 'WARNING_ORANGE');
  });

  it('returns WARNING_YELLOW when expiry is between 8 and 30 days away', () => {
    const statusIn20Days = determineStatus('2026-11-16', SYS_DATE, 'OPC');
    assert.equal(statusIn20Days, 'WARNING_YELLOW');
  });

  it('returns VALID when expiry is > 30 days away', () => {
    const statusIn60Days = determineStatus('2026-12-30', SYS_DATE, 'OPC');
    assert.equal(statusIn60Days, 'VALID');
  });

  it('returns MISSING when date is empty or dash', () => {
    assert.equal(determineStatus('', SYS_DATE, 'OPC'), 'MISSING');
    assert.equal(determineStatus('-', SYS_DATE, 'OPC'), 'MISSING');
  });

  it('returns NEUTRAL for non-expiring preparations with valid completion date', () => {
    const status = determineStatus('2024-05-10', SYS_DATE, 'Bird_Strike');
    assert.equal(status, 'NEUTRAL');
  });
});
