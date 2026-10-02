import { CREW_COMPLIANCE_RULES } from './compliance_rules.js';

/**
 * Parses an Excel cell date value. Supports Excel serial numbers,
 * Ukrainian text abbreviations (e.g. "31 лип. 27"), and standard JS Date strings.
 * @param {any} val - Raw cell value from SheetJS
 * @returns {string|null} ISO date string YYYY-MM-DD or null
 */
export function parseExcelDate(val) {
  if (val === undefined || val === null || val === '') return null;
  
  // 1. If it's already a JS Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  const valStr = String(val).trim();
  if (valStr === '-' || valStr === '') return null;
  
  // 2. Handle numeric values (Excel serial numbers, e.g. 45930)
  if (!isNaN(valStr) && !isNaN(parseFloat(valStr))) {
    const serial = parseFloat(valStr);
    // Excel serial dates start on Jan 1, 1900.
    // 25569 is the difference in days between Jan 1, 1900 and Jan 1, 1970 (JS epoch)
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    
    // Extract calendar values in UTC to prevent timezone offsets from shifting dates
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  // 3. Handle Ukrainian formatted text (e.g. "31 лип. 27" or "2 бер. 29")
  // Format: Day (1-2 digits), space, month abbreviation (letters), optional dot, optional space, Year (2 or 4 digits)
  const regex = /^(\d+)\s+([а-яА-ЯёЁіІїЇєЄґҐ]+)\.?\s*(\d+)/;
  const match = valStr.match(regex);
  if (match) {
    const day = parseInt(match[1], 10);
    const monthAbbr = match[2].toLowerCase().substring(0, 4); // Take first 4 letters max
    const yearDigits = match[3];
    
    const monthsMap = CREW_COMPLIANCE_RULES.UKRAINIAN_MONTHS_MAP;
    let monthIdx = -1;
    
    // Find month mapping by prefix or exact match
    for (const key of Object.keys(monthsMap)) {
      if (monthAbbr.startsWith(key) || key.startsWith(monthAbbr)) {
        monthIdx = monthsMap[key];
        break;
      }
    }
    
    if (monthIdx !== -1) {
      let year = parseInt(yearDigits, 10);
      if (yearDigits.length === 2) {
        year = 2000 + year; // Convert "27" to 2027
      }
      
      const date = new Date(year, monthIdx, day);
      if (!isNaN(date.getTime())) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }
  
  // 4. Fallback: try standard JS Date parsing
  const stdDate = new Date(valStr);
  if (!isNaN(stdDate.getTime())) {
    const y = stdDate.getFullYear();
    const m = String(stdDate.getMonth() + 1).padStart(2, '0');
    const d = String(stdDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  
  return null;
}

/**
 * Searches case-insensitively for a sheet name containing a keyword.
 * @param {object} workbook - SheetJS workbook object
 * @param {string} keyword - Keyword to search (e.g. 'flight')
 * @returns {string|null} Actual sheet name or null
 */
function findSheetName(workbook, keyword) {
  const normalizedKeyword = keyword.toLowerCase();
  for (const name of workbook.SheetNames) {
    if (name.toLowerCase().includes(normalizedKeyword)) {
      return name;
    }
  }
  return null;
}

/**
 * Parses a single worksheet into a JSON array of crew members.
 * @param {object} workbook - SheetJS workbook
 * @param {string} sheetKeyword - Sheet search keyword ('flight' or 'cabin')
 * @param {string} crewType - 'Flight' or 'Cabin'
 * @returns {Array<object>} List of parsed crew members
 */
function parseSheet(workbook, sheetKeyword, crewType) {
  const xlsxLib = typeof XLSX !== 'undefined' ? XLSX : null;
  const sheetName = findSheetName(workbook, sheetKeyword) || (crewType === 'Flight' ? workbook.SheetNames[0] : workbook.SheetNames[1]);
  
  if (!sheetName) return [];
  
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  
  // Read raw cell arrays (matrix style header: 1)
  const rawRows = xlsxLib 
    ? xlsxLib.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    : [];
    
  if (rawRows.length === 0) return [];
  
  // Find the header row (contains Name_Shrt_UA or Full_Name_EN or Full_Name_UA)
  let headerIndex = -1;
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (row.includes('Full_Name_EN') || row.includes('Full_Name_UA') || row.includes('Name_Shrt_UA')) {
      headerIndex = i;
      break;
    }
  }
  
  // Fallback indices if header row not detected by values
  if (headerIndex === -1) {
    headerIndex = crewType === 'Flight' ? 3 : 1;
  }
  
  if (headerIndex >= rawRows.length) return [];
  
  const headers = rawRows[headerIndex].map(h => String(h || '').trim());
  const dataRows = [];
  
  const crewConfig = CREW_COMPLIANCE_RULES.CREW_TYPES[crewType];
  if (!crewConfig) return [];
  
  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    
    // Check if the row contains name data
    const nameEnIdx = headers.indexOf('Full_Name_EN');
    const nameUaIdx = headers.indexOf('Full_Name_UA');
    
    const nameEn = nameEnIdx !== -1 ? String(row[nameEnIdx] || '').trim() : '';
    const nameUa = nameUaIdx !== -1 ? String(row[nameUaIdx] || '').trim() : '';
    
    // Skip empty rows or repeated headers
    if (!nameEn && !nameUa) continue;
    if (nameEn === 'Full_Name_EN' || nameUa === 'Full_Name_UA') continue;
    
    // Build initial crew member record
    const record = {
      id: '',
      crewType: crewType,
      active: 'YES'
    };
    
    headers.forEach((header, colIdx) => {
      if (!header) return;
      const cellVal = row[colIdx] !== undefined ? row[colIdx] : '';
      
      if (['Rank', 'Department', 'Name_Shrt_UA', 'Full_Name_UA', 'Full_Name_EN'].includes(header)) {
        record[header] = String(cellVal).trim();
      } else if (header === '#' && crewType === 'Cabin') {
        record.id = String(cellVal).trim();
      } else if (header === 'Active') {
        record.active = String(cellVal).trim().toUpperCase() === 'NO' ? 'NO' : 'YES';
      } else {
        // It is a training column (expiring or non-expiring)
        const ruleKey = crewConfig.columnMapping[header] || header;
        const parsedDate = parseExcelDate(cellVal);
        record[header] = parsedDate || '';
      }
    });
    
    // Auto-fix transliterated Name_Shrt_UA if Full_Name_UA is in Cyrillic
    if (record.Name_Shrt_UA && record.Full_Name_UA) {
      const hasEnglish = /[a-zA-Z]/.test(record.Name_Shrt_UA);
      const hasCyrillicFull = /[а-яА-ЯёЁіІїЇєЄґҐ]/.test(record.Full_Name_UA);
      if (hasEnglish && hasCyrillicFull) {
        const nameParts = record.Full_Name_UA.trim().split(/\s+/);
        record.Name_Shrt_UA = nameParts[0] + ' ' + 
                              (nameParts[1] ? nameParts[1][0] + '.' : '') + 
                              (nameParts[2] ? nameParts[2][0] + '.' : '');
      }
    }
    
    // Populate ID if missing
    if (!record.id) {
      record.id = record.Full_Name_EN || record.Full_Name_UA || `crew_${crewType}_${i}`;
    }
    
    dataRows.push(record);
  }
  
  return dataRows;
}

/**
 * Parses an Excel Workbook Array Buffer.
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {object} { flightCrew: Array, cabinCrew: Array }
 */
export function parseCrewXlsx(arrayBuffer) {
  const xlsxLib = typeof XLSX !== 'undefined' ? XLSX : null;
  if (!xlsxLib) {
    throw new Error('SheetJS (XLSX) library is not loaded');
  }
  
  const workbook = xlsxLib.read(arrayBuffer, { type: 'array' });
  
  const flightCrew = parseSheet(workbook, 'flight', 'Flight');
  const cabinCrew = parseSheet(workbook, 'cabin', 'Cabin');
  
  return {
    flightCrew,
    cabinCrew
  };
}
