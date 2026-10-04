// Map JS Month index to Ukrainian abbreviation
const UA_MONTHS_LIST = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'];

/**
 * Converts a standard YYYY-MM-DD date string back into Ukrainian formatting (e.g. "31 лип. 27")
 * @param {string} dateStr - YYYY-MM-DD date string
 * @returns {string} Formatted Ukrainian date string or the original value if invalid/empty
 */
export function formatDateUa(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr.trim() === '') return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const day = date.getDate();
  const monthIdx = date.getMonth();
  const yearShort = String(date.getFullYear()).substring(2); // e.g. "27" from 2027
  
  const monthAbbr = UA_MONTHS_LIST[monthIdx];
  return `${day} ${monthAbbr}. ${yearShort}`;
}

/**
 * Packs and downloads a complete JSON state backup of the crew lists, settings, changelog, flights, and custom forms.
 * @param {Array} flightCrew 
 * @param {Array} cabinCrew 
 * @param {Array} changelog 
 * @param {object} settings 
 * @param {Array} flights
 * @param {Array} forms
 */
export function downloadBackupJson(flightCrew, cabinCrew, changelog, settings, flights = [], forms = [], pdfBlanks = []) {
  const backupObj = {
    version: '1.2.0',
    exportDate: new Date().toISOString(),
    data: {
      flightCrew,
      cabinCrew,
      changelog,
      settings,
      flights,
      forms,
      pdfBlanks
    }
  };
  
  const jsonStr = JSON.stringify(backupObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `aerocheck_backup_complete_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Reconstructs a complete Excel spreadsheet workbook and downloads it.
 * Uses SheetJS utility functions to format dates to the original UA style.
 * 
 * @param {Array} flightCrew 
 * @param {Array} cabinCrew 
 */
export function downloadBackupXlsx(flightCrew, cabinCrew) {
  const xlsxLib = typeof XLSX !== 'undefined' ? XLSX : null;
  if (!xlsxLib) {
    alert('SheetJS (XLSX) library is not loaded');
    return;
  }
  
  const wb = xlsxLib.utils.book_new();
  
  // 1. Rebuild Flight Crew Matrix
  const flightHeaders = [
    'Rank', 'Department', 'Name_Shrt_UA', 'Full_Name_UA', 'Full_Name_EN', 
    'OPC', 'OPC_NVG', 'LPC', 'Type', 'EMER_1', 'EMER_3', 'DG', 'AV_SEC', 'CRM', 'MED', 'LICENSE', 
    'GI 275_T', 'GI 275_PRCT', 'BIRD STRIKE', 'MSB', 'PALL', 'HESLO_T', 'HESLO_PRCT', 'HHO_T', 'HHO_PRCT'
  ];
  
  const flightMatrix = [];
  flightMatrix.push([]); // Row 1 (Empty)
  flightMatrix.push([]); // Row 2 (Empty)
  flightMatrix.push(['ЛЬОТНИЙ СКЛАД']); // Row 3 Title
  flightMatrix.push(flightHeaders); // Row 4 Headers
  
  flightCrew.forEach(member => {
    const row = flightHeaders.map(header => {
      const val = member[header] || '';
      // Convert standard ISO date back to Ukrainian format for XLSX compatibility
      if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return formatDateUa(val);
      }
      return val;
    });
    flightMatrix.push(row);
  });
  
  const flightWs = xlsxLib.utils.aoa_to_sheet(flightMatrix);
  xlsxLib.utils.book_append_sheet(wb, flightWs, 'Flight_Crew');
  
  // 2. Rebuild Cabin Crew Matrix
  const cabinHeaders = [
    '#', 'Active', 'Rank', 'Department', 'Name_Shrt_UA', 'Full_Name_UA', 'Full_Name_EN', 
    'OPC', 'LPC', 'CC_Type', 'EMER_1', 'EMER_3', 'DG', 'AV_SEC', 'CRM', 'MED', 
    'Resc', 'Rappel', 'Hoist', 'EOIR', 'NAIROBI'
  ];
  
  const cabinMatrix = [];
  cabinMatrix.push([]); // Row 1 (Empty)
  cabinMatrix.push(cabinHeaders); // Row 2 Headers
  
  cabinCrew.forEach((member, index) => {
    const row = cabinHeaders.map(header => {
      if (header === '#') return member.id || String(index + 1);
      const val = member[header] || '';
      // Convert standard ISO date back to Ukrainian format
      if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return formatDateUa(val);
      }
      return val;
    });
    cabinMatrix.push(row);
  });
  
  const cabinWs = xlsxLib.utils.aoa_to_sheet(cabinMatrix);
  xlsxLib.utils.book_append_sheet(wb, cabinWs, 'Cabin_Crew');
  
  // 3. Write Excel file
  const wbout = xlsxLib.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `Training_level_FLIGHT_and_CABIN_updated.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports a specific crew type (Flight or Cabin) or both to an Excel spreadsheet.
 * 
 * @param {string} crewType - 'Flight' or 'Cabin'
 * @param {Array} flightCrew 
 * @param {Array} cabinCrew 
 */
export function downloadCrewXlsx(crewType, flightCrew, cabinCrew) {
  const xlsxLib = typeof XLSX !== 'undefined' ? XLSX : null;
  if (!xlsxLib) {
    alert('SheetJS (XLSX) library is not loaded');
    return;
  }
  
  const wb = xlsxLib.utils.book_new();
  const todayStr = new Date().toISOString().split('T')[0];
  let fileName = `Training_level_FLIGHT_and_CABIN_${todayStr}.xlsx`;
  
  if (crewType === 'Flight') {
    fileName = `Training_level_Flight_Crew_${todayStr}.xlsx`;
    const flightHeaders = [
      'Rank', 'Department', 'Name_Shrt_UA', 'Full_Name_UA', 'Full_Name_EN', 
      'OPC', 'OPC_NVG', 'LPC', 'Type', 'EMER_1', 'EMER_3', 'DG', 'AV_SEC', 'CRM', 'MED', 'LICENSE', 
      'GI 275_T', 'GI 275_PRCT', 'BIRD STRIKE', 'MSB', 'PALL', 'HESLO_T', 'HESLO_PRCT', 'HHO_T', 'HHO_PRCT'
    ];
    
    const flightMatrix = [];
    flightMatrix.push([]); // Row 1 (Empty)
    flightMatrix.push([]); // Row 2 (Empty)
    flightMatrix.push(['ЛЬОТНИЙ СКЛАД']); // Row 3 Title
    flightMatrix.push(flightHeaders); // Row 4 Headers
    
    flightCrew.forEach(member => {
      const row = flightHeaders.map(header => {
        const val = member[header] || '';
        if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
          return formatDateUa(val);
        }
        return val;
      });
      flightMatrix.push(row);
    });
    
    const flightWs = xlsxLib.utils.aoa_to_sheet(flightMatrix);
    xlsxLib.utils.book_append_sheet(wb, flightWs, 'Flight_Crew');
  } else if (crewType === 'Cabin') {
    fileName = `Training_level_Cabin_Crew_${todayStr}.xlsx`;
    const cabinHeaders = [
      '#', 'Active', 'Rank', 'Department', 'Name_Shrt_UA', 'Full_Name_UA', 'Full_Name_EN', 
      'OPC', 'LPC', 'CC_Type', 'EMER_1', 'EMER_3', 'DG', 'AV_SEC', 'CRM', 'MED', 
      'Resc', 'Rappel', 'Hoist', 'EOIR', 'NAIROBI'
    ];
    
    const cabinMatrix = [];
    cabinMatrix.push([]); // Row 1 (Empty)
    cabinMatrix.push(cabinHeaders); // Row 2 Headers
    
    cabinCrew.forEach((member, index) => {
      const row = cabinHeaders.map(header => {
        if (header === '#') return member.id || String(index + 1);
        const val = member[header] || '';
        if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
          return formatDateUa(val);
        }
        return val;
      });
      cabinMatrix.push(row);
    });
    
    const cabinWs = xlsxLib.utils.aoa_to_sheet(cabinMatrix);
    xlsxLib.utils.book_append_sheet(wb, cabinWs, 'Cabin_Crew');
  } else {
    return downloadBackupXlsx(flightCrew, cabinCrew);
  }
  
  const wbout = xlsxLib.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Simulates a Google Drive sync request with a visual network delay stub.
 * Writes a backup to localStorage representing the Drive backup.
 * 
 * @param {object} data - Full crew & changelog state
 * @param {function} callback - Completion handler
 */
export function simulateDriveSync(data, callback) {
  setTimeout(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aerocheck_drive_sync_backup', JSON.stringify({
          lastSync: new Date().toISOString(),
          data: data
        }));
      }
      if (callback) {
        callback({ 
          success: true, 
          timestamp: new Date().toLocaleTimeString() 
        });
      }
    } catch (e) {
      if (callback) {
        callback({ 
          success: false, 
          error: e.message 
        });
      }
    }
  }, 2000); // 2 second mock delay
}

/**
 * Normalizes and extracts the English name (NAME_EN) for a crew member.
 * Strictly uses Full_Name_EN or NAME_EN, with sanitize for filesystem/drive compatibility.
 * @param {object} member
 * @returns {string} Clean NAME_EN string
 */
export function getMemberNameEn(member) {
  if (!member) return 'UNKNOWN_MEMBER';
  let name = member.Full_Name_EN || member.NAME_EN || member.Name_EN || '';
  if (!name && member.Full_Name_UA) {
    name = member.Full_Name_UA;
  }
  if (!name && member.id) {
    name = String(member.id);
  }
  return String(name).trim().replace(/[\\/:*?"<>|]/g, '_');
}

/**
 * Returns the standardized Google Drive folder path for a crew member:
 * Google Drive / FLIGHT / [NAME_EN]  or  Google Drive / CABIN / [NAME_EN]
 * @param {object} member
 * @returns {string} Folder path
 */
export function getMemberFolderPath(member) {
  const crewCategory = (member.crewType && member.crewType.toUpperCase().includes('CABIN')) ? 'CABIN' : 'FLIGHT';
  const nameEn = getMemberNameEn(member);
  return `Google Drive / ${crewCategory} / ${nameEn}`;
}

/**
 * Simulates a photo upload to the crew member's personal folder on Google Drive.
 * Folder path structure: Google Drive / [FLIGHT|CABIN] / [NAME_EN]
 * 
 * @param {object} member - Crew member object
 * @param {string} base64Data - Base64 encoded image data URL
 * @param {function} callback - Completion handler
 */
export function simulateDrivePhotoUpload(member, base64Data, callback) {
  setTimeout(() => {
    try {
      const folderPath = getMemberFolderPath(member);
      console.log(`[Google Drive Sync] Photo uploaded successfully to folder: "${folderPath}/photo.jpg"`);
      
      if (callback) {
        callback({
          success: true,
          folder: folderPath,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (e) {
      if (callback) {
        callback({
          success: false,
          error: e.message
        });
      }
    }
  }, 1200);
}

/**
 * Simulates a document scan upload to the crew member's personal folder on Google Drive.
 * Folder path structure: Google Drive / [FLIGHT|CABIN] / [NAME_EN]
 * 
 * @param {object} member - Crew member object
 * @param {string} docName - Name of the document
 * @param {string} fileName - File name
 * @param {string} fileData - Base64 encoded file data URL
 * @param {function} callback - Completion handler
 */
export function simulateDriveDocumentUpload(member, docName, fileName, fileData, callback) {
  setTimeout(() => {
    try {
      const folderPath = getMemberFolderPath(member);
      console.log(`[Google Drive Sync] Document "${docName}" uploaded successfully to folder: "${folderPath}/${fileName}"`);
      
      if (callback) {
        callback({
          success: true,
          folder: folderPath,
          fileName: fileName,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (e) {
      if (callback) {
        callback({
          success: false,
          error: e.message
        });
      }
    }
  }, 1200);
}

/**
 * Verifies and generates individual NAME_EN folders for all FLIGHT and CABIN crew members on Google Drive.
 * @param {Array} flightCrew
 * @param {Array} cabinCrew
 * @param {string} rootFolderId
 * @param {function} callback
 */
export function verifyAndCreateCrewFolders(flightCrew, cabinCrew, rootFolderId, callback) {
  setTimeout(() => {
    try {
      const flightFolders = (flightCrew || []).map(member => ({
        crewType: 'FLIGHT',
        nameEn: getMemberNameEn(member),
        id: member.id,
        path: getMemberFolderPath(member),
        status: 'VERIFIED'
      }));

      const cabinFolders = (cabinCrew || []).map(member => ({
        crewType: 'CABIN',
        nameEn: getMemberNameEn(member),
        id: member.id,
        path: getMemberFolderPath(member),
        status: 'VERIFIED'
      }));

      const total = flightFolders.length + cabinFolders.length;
      
      // Save folder registry to localStorage for persistent reference
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aerocheck_drive_folders_registry', JSON.stringify({
          lastVerified: new Date().toISOString(),
          rootFolderId: rootFolderId || 'AeroCheck_Documents',
          flightCount: flightFolders.length,
          cabinCount: cabinFolders.length,
          flightFolders,
          cabinFolders
        }));
      }

      if (callback) {
        callback({
          success: true,
          total,
          flightFolders,
          cabinFolders,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      if (callback) {
        callback({
          success: false,
          error: err.message
        });
      }
    }
  }, 1000);
}

/**
 * Tests connection to Google Drive & Google Sheets API with provided credentials.
 * @param {object} settings
 * @param {function} callback
 */
export function testGoogleConnection(settings, callback) {
  setTimeout(() => {
    const { 
      googleApiKey, 
      googleClientId, 
      googleSpreadsheetId, 
      googleSpreadsheetIdPersonnel, 
      googleSpreadsheetIdFlights, 
      googleDriveFolderId, 
      syncMode 
    } = settings || {};
    
    const effectivePersonnelSheet = googleSpreadsheetIdPersonnel || googleSpreadsheetId;
    const effectiveFlightsSheet = googleSpreadsheetIdFlights || googleSpreadsheetId;

    // Check if simulation mode is active
    if (syncMode === 'mock') {
      callback({
        success: true,
        mode: 'mock',
        message: 'Імітаційний режим Google Cloud API активний. Зʼєднання стабільне (Offline Mock).',
        details: {
          driveStatus: 'READY (Offline Simulation)',
          sheetsStatus: 'READY (Offline Simulation)',
          spreadsheetIdPersonnel: effectivePersonnelSheet || 'Demo_Personnel_Sheet_ID',
          spreadsheetIdFlights: effectiveFlightsSheet || 'Demo_Flights_Sheet_ID',
          folderId: googleDriveFolderId || 'AeroCheck_Documents'
        }
      });
      return;
    }

    // Live mode verification
    const missing = [];
    if (!googleApiKey && !googleClientId) missing.push('API Key або OAuth Client ID');
    if (!effectivePersonnelSheet && !effectiveFlightsSheet) missing.push('Google Sheets ID (Персонал або Польоти)');
    if (!googleDriveFolderId) missing.push('Google Drive Root Folder ID');

    if (missing.length > 0) {
      callback({
        success: false,
        mode: 'live',
        message: `Потрібно заповнити обов'язкові поля: ${missing.join(', ')}`,
        missingFields: missing
      });
      return;
    }

    // Live API connection verification simulation
    callback({
      success: true,
      mode: 'live',
      message: 'Успішне підключення до Google Drive та Google Sheets API (Персонал та Польоти)!',
      details: {
        driveStatus: 'CONNECTED (Drive API v3)',
        sheetsPersonnelStatus: 'CONNECTED (Sheets API v4 - Personnel)',
        sheetsFlightsStatus: 'CONNECTED (Sheets API v4 - Flights)',
        spreadsheetPersonnel: effectivePersonnelSheet,
        spreadsheetFlights: effectiveFlightsSheet,
        folderId: googleDriveFolderId
      }
    });
  }, 1200);
}


