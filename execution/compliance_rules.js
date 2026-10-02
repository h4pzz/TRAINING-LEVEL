/**
 * CREW_COMPLIANCE_RULES
 * 
 * Configuration rules for calculating certificate validity, warning levels,
 * and parsing localized data formats for Flight and Cabin crews.
 */
export const CREW_COMPLIANCE_RULES = {
  // Only these 11 preparations have a fixed validity duration (Expiry Date).
  // All other database columns represent simple completion dates (no expiry).
  EXPIRING_PREPARATIONS: [
    'OPC',
    'OPC_NVG',
    'LPC',
    'Type',      // Maps to 'Type' for Flight, 'CC_Type' for Cabin
    'EMER_1',
    'EMER_3',
    'DG',
    'AV_SEC',
    'CRM',
    'MED',
    'LICENSE'
  ],

  // Crew profile configurations
  CREW_TYPES: {
    Flight: {
      key: 'Flight',
      displayName: {
        uk: 'Льотний екіпаж',
        en: 'Flight Crew'
      },
      // Rule: Expiry ends on the LAST DAY of the month after N months by default
      end_of_month_default: true,
      // Validity periods in months (N) for Flight crew
      validity: {
        OPC: 6,         // Flight OPC is 6 months
        OPC_NVG: 12,    // 1 Year
        LPC: 12,        // 1 Year
        Type: 12,       // 1 Year
        EMER_1: 12,     // 1 Year
        EMER_3: 36,     // 3 Years
        DG: 24,         // 2 Years
        AV_SEC: 36,     // 3 Years
        CRM: 24,        // 2 Years
        MED: 12,        // 1 Year
        LICENSE: 12     // 1 Year
      },
      // Expiry behavior overrides per preparation
      end_of_month_overrides: {
        DG: false,
        AV_SEC: false
      },
      // Database spreadsheet columns to rule keys
      columnMapping: {
        'OPC': 'OPC',
        'OPC_NVG': 'OPC_NVG',
        'LPC': 'LPC',
        'Type': 'Type',
        'EMER_1': 'EMER_1',
        'EMER_3': 'EMER_3',
        'DG': 'DG',
        'AV_SEC': 'AV_SEC',
        'CRM': 'CRM',
        'MED': 'MED',
        'LICENSE': 'LICENSE'
      }
    },
    Cabin: {
      key: 'Cabin',
      displayName: {
        uk: 'Кабінний екіпаж',
        en: 'Cabin Crew'
      },
      // Rule: Expiry ends on the LAST DAY of the month after N months by default
      end_of_month_default: true,
      // Validity periods in months (N) for Cabin crew
      validity: {
        OPC: 12,        // Cabin OPC is 12 months
        LPC: 12,        // 1 Year
        Type: 12,       // 1 Year (Maps to CC_Type)
        EMER_1: 12,     // 1 Year
        EMER_3: 36,     // 3 Years
        DG: 24,         // 2 Years
        AV_SEC: 36,     // 3 Years
        CRM: 24,        // 2 Years
        MED: 12         // 1 Year
      },
      // Expiry behavior overrides per preparation
      end_of_month_overrides: {
        DG: false,
        AV_SEC: false
      },
      // Database spreadsheet columns to rule keys
      columnMapping: {
        'OPC': 'OPC',
        'LPC': 'LPC',
        'CC_Type': 'Type', // Maps CC_Type to standard Type
        'EMER_1': 'EMER_1',
        'EMER_3': 'EMER_3',
        'DG': 'DG',
        'AV_SEC': 'AV_SEC',
        'CRM': 'CRM',
        'MED': 'MED'
      }
    }
  },

  // Map of Ukrainian month abbreviations to JavaScript month index (0-11)
  // Used to parse date strings of format "31 лип. 27" or "2 бер. 29"
  UKRAINIAN_MONTHS_MAP: {
    'січ': 0,   // січня / January
    'лют': 1,   // лютого / February
    'бер': 2,   // березня / March
    'квіт': 3,  // квітня / April
    'трав': 5,  // травня / May
    'черв': 5,  // червня / June
    'лип': 6,   // липня / July
    'серп': 7,  // серпня / August
    'вер': 8,   // вересня / September
    'жовт': 9,  // жовтня / October
    'лист': 10, // листопада / November
    'груд': 11  // грудня / December
  },

  // Helper translations for UI and status levels
  STATUS_THEME: {
    VALID: {
      class: 'status-valid',
      label: { uk: 'Дійсний', en: 'Valid' },
      color: '#10b981' // Green
    },
    WARNING_ORANGE: {
      class: 'status-warning-orange',
      label: { uk: 'Закінчується (1 міс.)', en: 'Expiring (1 mo.)' },
      color: '#f97316' // Orange
    },
    WARNING_YELLOW: {
      class: 'status-warning-yellow',
      label: { uk: 'Закінчується (3 міс.)', en: 'Expiring (3 mo.)' },
      color: '#eab308' // Yellow
    },
    EXPIRED: {
      class: 'status-expired',
      label: { uk: 'Прострочений', en: 'Expired' },
      color: '#ef4444' // Red
    },
    NEUTRAL: {
      class: 'status-neutral',
      label: { uk: 'Пройдено', en: 'Completed' },
      color: '#6b7280' // Gray (non-expiring)
    },
    MISSING: {
      class: 'status-missing',
      label: { uk: 'Відсутній', en: 'Missing' },
      color: '#d1d5db' // Light Gray
    }
  },

  // Expiry thresholds for warnings (in days)
  WARNING_THRESHOLD_DAYS: 30
};

// Fix the Ukrainian month map index for May
CREW_COMPLIANCE_RULES.UKRAINIAN_MONTHS_MAP['трав'] = 4;

/**
 * Returns whether a given preparation key is an expiring type
 * @param {string} key - Column or rule key
 * @returns {boolean}
 */
export function isExpiring(key) {
  return CREW_COMPLIANCE_RULES.EXPIRING_PREPARATIONS.includes(key);
}

/**
 * Returns the normalized rule key for a column name based on crew type
 * @param {string} columnName - The raw column name from sheet
 * @param {string} crewType - 'Flight' or 'Cabin'
 * @returns {string|null} The standard rule key or null if not mapped
 */
export function getRuleKey(columnName, crewType) {
  const typeConfig = CREW_COMPLIANCE_RULES.CREW_TYPES[crewType];
  if (!typeConfig) return null;
  return typeConfig.columnMapping[columnName] || null;
}

/**
 * Gets the validity period in months for a given preparation and crew type
 * @param {string} key - The normalized rule key (e.g. 'OPC')
 * @param {string} crewType - 'Flight' or 'Cabin'
 * @returns {number} Validity in months
 */
export function getValidityMonths(key, crewType) {
  const typeConfig = CREW_COMPLIANCE_RULES.CREW_TYPES[crewType];
  if (!typeConfig || !typeConfig.validity) return 12; // default fallback
  return typeConfig.validity[key] !== undefined ? typeConfig.validity[key] : 12;
}

/**
 * Returns whether the end of month rule should be applied for a specific preparation and crew type
 * @param {string} key - The normalized rule key (e.g. 'OPC')
 * @param {string} crewType - 'Flight' or 'Cabin'
 * @returns {boolean}
 */
export function shouldApplyEndOfMonth(key, crewType) {
  const typeConfig = CREW_COMPLIANCE_RULES.CREW_TYPES[crewType];
  if (!typeConfig) return false;
  if (typeConfig.end_of_month_overrides && typeConfig.end_of_month_overrides[key] !== undefined) {
    return typeConfig.end_of_month_overrides[key];
  }
  return typeConfig.end_of_month_default;
}
