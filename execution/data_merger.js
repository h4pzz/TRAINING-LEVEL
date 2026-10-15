/**
 * Evaluates whether an imported date should overwrite a cached date.
 * CRITICAL RULE: Dates on the website can NEVER be deleted, erased, or reverted.
 * An overwrite happens ONLY if the imported date is a valid date AND either:
 * - the cached date was previously empty, OR
 * - the imported date is chronologically NEWER than the cached date.
 * 
 * Empty, null, missing, or older dates from Google Drive/Sheets will NEVER overwrite local dates.
 * @param {string} cachedDateStr 
 * @param {string} importedDateStr 
 * @returns {boolean}
 */
export function shouldOverwriteDate(cachedDateStr, importedDateStr) {
  const cleanCached = (cachedDateStr || '').trim();
  const cleanImported = (importedDateStr || '').trim();
  
  // Under NO circumstances can an empty/dash/invalid imported date wipe an existing cached date!
  if (cleanImported === '' || cleanImported === '-' || cleanImported === 'null' || cleanImported === 'undefined') {
    return false;
  }
  
  const importedTime = new Date(cleanImported).getTime();
  if (isNaN(importedTime)) return false; // Invalid incoming date cannot overwrite anything
  
  // If local date is empty or invalid, fill it with the valid imported date
  if (cleanCached === '' || cleanCached === '-' || cleanCached === 'null' || cleanCached === 'undefined') {
    return true;
  }
  
  const cachedTime = new Date(cleanCached).getTime();
  if (isNaN(cachedTime)) return true;
  
  // Overwrite ONLY if incoming date is strictly newer
  return importedTime > cachedTime;
}

/**
 * Smart Merges imported Excel/Drive crew data with the current cached local data.
 * 
 * CRITICAL ZERO-DELETION GUARANTEES:
 * 1. Existing crew members on the website are NEVER deleted during sync.
 *    Any member present in cachedList is preserved even if omitted or deleted in remote Google Drive / Sheets.
 *    Crew members can only be removed directly in Google Drive or via explicit local Admin deletion.
 * 2. Existing dates on the website are NEVER deleted, cleared, or replaced with empty values.
 *    Only valid and newer dates take effect.
 * 
 * @param {Array<object>} cachedList - The current crew database from local cache
 * @param {Array<object>} importedList - The newly parsed crew list from Excel / Drive
 * @param {string} userEmail - The email of the user triggering the merge
 * @returns {object} { mergedList: Array, changelogEntries: Array }
 */
export function mergeCrewData(cachedList, importedList, userEmail = 'system@aerocheck.com') {
  // Deep clone to ensure all local members are retained by default
  const mergedList = JSON.parse(JSON.stringify(cachedList || []));
  const changelogEntries = [];
  const timestamp = new Date().toISOString();
  
  importedList.forEach(importedMember => {
    // Search for matching crew member by Full_Name_EN or Full_Name_UA
    const cachedIdx = mergedList.findIndex(cachedMember => {
      const matchEn = importedMember.Full_Name_EN && cachedMember.Full_Name_EN && 
        importedMember.Full_Name_EN.trim().toLowerCase() === cachedMember.Full_Name_EN.trim().toLowerCase();
      const matchUa = importedMember.Full_Name_UA && cachedMember.Full_Name_UA && 
        importedMember.Full_Name_UA.trim().toLowerCase() === cachedMember.Full_Name_UA.trim().toLowerCase();
      return matchEn || matchUa;
    });
    
    if (cachedIdx !== -1) {
      const cachedMember = mergedList[cachedIdx];
      const details = [];
      
      // Merge properties
      Object.keys(importedMember).forEach(key => {
        // Skip metadata / identification keys
        if (['id', 'crewType', 'Rank', 'Department', 'Name_Shrt_UA', 'Full_Name_UA', 'Full_Name_EN', 'active'].includes(key)) {
          // If local metadata is missing but exists in the Excel import, update it
          if (!cachedMember[key] && importedMember[key]) {
            cachedMember[key] = importedMember[key];
          }
          return;
        }
        
        const cachedVal = cachedMember[key] || '';
        const importedVal = importedMember[key] || '';
        
        if (shouldOverwriteDate(cachedVal, importedVal)) {
          cachedMember[key] = importedVal;
          details.push({
            field: key,
            oldValue: cachedVal || 'empty',
            newValue: importedVal
          });
        }
      });
      
      // If records were modified, log the change
      if (details.length > 0) {
        changelogEntries.push({
          timestamp,
          userEmail,
          crewMember: cachedMember.Full_Name_EN || cachedMember.Full_Name_UA,
          crewType: cachedMember.crewType,
          type: 'MERGE_IMPORT',
          details
        });
      }
    } else {
      // Crew member not found, append as new entry
      mergedList.push(importedMember);
      changelogEntries.push({
        timestamp,
        userEmail,
        crewMember: importedMember.Full_Name_EN || importedMember.Full_Name_UA,
        crewType: importedMember.crewType,
        type: 'CREW_ADD',
        details: [{
          field: 'all',
          oldValue: 'n/a',
          newValue: 'Added crew member from Excel import'
        }]
      });
    }
  });
  
  return {
    mergedList,
    changelogEntries
  };
}
