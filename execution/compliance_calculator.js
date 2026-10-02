import { 
  CREW_COMPLIANCE_RULES, 
  isExpiring, 
  getValidityMonths, 
  shouldApplyEndOfMonth 
} from './compliance_rules.js';

/**
 * Helper to add calendar months to a date without rollover issues
 * (e.g. adding 6 months to Aug 31 yields Feb 28, not March 3).
 * @param {Date} date - The starting Date object
 * @param {number} months - Number of months to add
 * @returns {Date} A new Date object
 */
export function addMonthsCalendar(date, months) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();
  
  // Calculate target month and year
  const totalMonths = month + months;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12; // positive modulo
  
  // Get last day of target month to clamp the day if needed
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(day, lastDayOfTargetMonth);
  
  return new Date(targetYear, targetMonth, targetDay);
}

/**
 * Formats a Date object as YYYY-MM-DD
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateIso(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates the expiration date given a completion date and compliance rules.
 * @param {string} completionDateStr - Completion date in ISO format YYYY-MM-DD
 * @param {string} prepKey - Normalized preparation key (e.g., 'OPC')
 * @param {string} crewType - 'Flight' or 'Cabin'
 * @returns {string|null} ISO format YYYY-MM-DD or null if invalid
 */
export function calculateExpiryDate(completionDateStr, prepKey, crewType) {
  if (!completionDateStr || completionDateStr === '-') return null;
  
  const compDate = new Date(completionDateStr);
  if (isNaN(compDate.getTime())) return null;
  
  // Only calculate expiration if the preparation is configured to expire
  if (!isExpiring(prepKey)) return completionDateStr;
  
  const months = getValidityMonths(prepKey, crewType);
  let expiryDate = addMonthsCalendar(compDate, months);
  
  // Apply end of month shift if configured
  if (shouldApplyEndOfMonth(prepKey, crewType)) {
    expiryDate = new Date(expiryDate.getFullYear(), expiryDate.getMonth() + 1, 0);
  }
  
  return formatDateIso(expiryDate);
}

/**
 * Determines the status code ('VALID', 'WARNING', 'EXPIRED', 'NEUTRAL', 'MISSING')
 * for a preparation date relative to a system configuration date.
 * @param {string} dateStr - The date string from the database (could be expiry date or completion date)
 * @param {string} systemDateStr - Current evaluation date YYYY-MM-DD
 * @param {string} prepKey - Preparation key (e.g. 'OPC', 'HESLO_PRCT')
 * @returns {string} One of the status keys matching STATUS_THEME keys
 */
export function determineStatus(dateStr, systemDateStr, prepKey) {
  if (!dateStr || dateStr === '-' || dateStr.trim() === '') {
    return 'MISSING';
  }
  
  // If the preparation does not expire, it is simply NEUTRAL (Completed) if a date exists
  if (!isExpiring(prepKey)) {
    return 'NEUTRAL';
  }
  
  const expiry = new Date(dateStr);
  const system = new Date(systemDateStr);
  
  if (isNaN(expiry.getTime()) || isNaN(system.getTime())) {
    return 'MISSING';
  }
  
  // Reset times to compare calendar dates exactly
  expiry.setHours(0, 0, 0, 0);
  system.setHours(0, 0, 0, 0);
  
  if (expiry < system) {
    return 'EXPIRED';
  }
  
  // Calculate difference in calendar days
  const diffTime = expiry.getTime() - system.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 30) {
    return 'WARNING_ORANGE';
  }
  if (diffDays <= 90) {
    return 'WARNING_YELLOW';
  }
  
  return 'VALID';
}
