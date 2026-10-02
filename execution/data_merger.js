/**
 * Evaluates whether an imported date should overwrite a cached date.
 * An overwrite happens if the imported date is valid and either the cached date
 * is empty, or the imported date is chronologically newer.
 * @param {string} cachedDateStr 
 * @param {string} importedDateStr 
 * @returns {boolean}
 */
export function shouldOverwriteDate(cachedDateStr, importedDateStr) {
  const cleanCached = (cachedDateStr || '').trim();
  const cleanImported = (importedDateStr || '').trim();
  
  if (cleanImported === '' || cleanImported === '-') return false;
  if (cleanCached === '' || cleanCached === '-') return true;
  
  const cachedTime = new Date(cleanCached).getTime();
  const importedTime = new Date(cleanImported).getTime();
  
  if (isNaN(importedTime)) return false;
  if (isNaN(cachedTime)) return true;
  
  return importedTime > cachedTime;
}

/**
 * Smart Merges imported Excel crew data with the current cached local data.
 * Matches crew members by English or Ukrainian full names.
 * Overwrites training dates only if the imported date is chronologically newer.
 * Logs all changes into changelog entries.
 * 
 * @param {Array<object>} cachedList - The current crew database from cache
 * @param {Array<object>} importedList - The newly parsed crew list from Excel
 * @param {string} userEmail - The email of the user triggering the merge
 * @returns {object} { mergedList: Array, changelogEntries: Array }
 */
export function mergeCrewData(cachedList, importedList, userEmail = 'system@aerocheck.com') {
  const mergedList = JSON.parse(JSON.stringify(cachedList)); // deep clone
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
