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
 * Packs and downloads a complete JSON state backup of the crew lists, settings, and changelog.
 * @param {Array} flightCrew 
 * @param {Array} cabinCrew 
 * @param {Array} changelog 
 * @param {object} settings 
 */
export function downloadBackupJson(flightCrew, cabinCrew, changelog, settings) {
  const backupObj = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    data: {
      flightCrew,
      cabinCrew,
      changelog,
      settings
    }
  };
  
  const jsonStr = JSON.stringify(backupObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `aerocheck_backup_${dateStr}.json`;
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
 * Simulates a Google Drive sync request with a visual network delay stub.
 * Writes a backup to localStorage representing the Drive backup.
 * 
 * @param {object} data - Full crew & changelog state
 * @param {function} callback - Completion handler
 */
export function simulateDriveSync(data, callback) {
  setTimeout(() => {
    try {
      localStorage.setItem('aerocheck_drive_sync_backup', JSON.stringify({
        lastSync: new Date().toISOString(),
        data: data
      }));
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
 * Simulates a photo upload to the crew member's personal folder on Google Drive.
 * Folder path structure: [Rank]_[First_Name_EN]
 * 
 * @param {object} member - Crew member object
 * @param {string} base64Data - Base64 encoded image data URL
 * @param {function} callback - Completion handler
 */
export function simulateDrivePhotoUpload(member, base64Data, callback) {
  setTimeout(() => {
    try {
      const rank = member.Rank || 'CREW';
      const firstNameEn = member.Full_Name_EN ? member.Full_Name_EN.trim().split(/\s+/)[0] : 'Member';
      const folderPath = `Google Drive / Crew Documents / ${rank}_${firstNameEn}`;
      
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
  }, 1500); // 1.5 second mock delay
}

/**
 * Simulates a document scan upload to the crew member's personal folder on Google Drive.
 * Folder path structure: [Rank]_[First_Name_EN]
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
      const rank = member.Rank || 'CREW';
      const firstNameEn = member.Full_Name_EN ? member.Full_Name_EN.trim().split(/\s+/)[0] : 'Member';
      const folderPath = `Google Drive / Crew Documents / ${rank}_${firstNameEn}`;
      
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
  }, 1500); // 1.5 second mock delay
}


