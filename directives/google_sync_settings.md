# Directive: Google Drive & Google Sheets Synchronization and Crew Folders

## 1. Goal
Provide seamless synchronization of aviation training compliance data, personal documents, and training flight logs between the local AeroCheck application and Google Cloud services (Google Sheets as single source of truth database, Google Drive as cloud storage for crew documents and photos).

## 2. Architecture & Authentication
- **Service Options**:
  1. **OAuth 2.0 Client Flow**: Interactive user login for Google Drive and Google Sheets access (`https://www.googleapis.com/auth/drive.file`, `https://www.googleapis.com/auth/spreadsheets`).
  2. **API Key & Public/Restricted Sheet**: Read-only synchronization for published sheets.
  3. **Service Account JSON**: Enterprise backend/serverless automated batch sync.
  4. **Simulation/Offline Mode (Current Default)**: Realistic local storage mirroring with network simulation, allowing offline field use.

## 3. Google Sheets Integration
- **Spreadsheet ID**: The unique ID from the Google Sheet URL (`https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`).
- **Sheet Mapping**:
  - `Flight_Crew`: Matrix containing flight crew qualifications, dates, and compliance items.
  - `Cabin_Crew`: Matrix containing cabin crew qualifications, dates, and compliance items.
  - `Training_Flights`: Log of completed training flights, duty times, instructor hours.
  - `Changelog`: Append-only audit trail of all record updates.
- **Sync Strategy**:
  - Smart Merge: Records merged by unique employee ID / `Full_Name_EN`.
  - Date conflict resolution: newer valid dates take precedence over older dates.

## 4. Google Drive Hierarchy & Crew Folder Convention (`LastName_FirstName`)
To ensure strict organizational clarity across departments, all documents and files must follow this hierarchy:

```
Google Drive Root
└── Training level/
    ├── Flight Crew/
    │   ├── Berehovyy_Serhiy/
    │   │   ├── photo.jpg
    │   │   ├── LPC_scan.pdf
    │   │   ├── MED_certificate.pdf
    │   │   └── ...
    │   ├── Sokurenko_Oleksandr/
    │   └── ... (149 individual folders)
    └── Cabin crew/
        ├── Aleksa_Sergii/
        │   ├── photo.jpg
        │   ├── CC_Type_scan.pdf
        │   └── ...
        ├── Dubinin_Andrii/
        └── ... (47 individual folders)
```

### Folder Naming Rule:
- Each folder inside `Flight Crew` and `Cabin crew` must be strictly named using `LastName_FirstName` separated by an underscore `_`.
- Derived from `member.Full_Name_EN` (or fallback `Full_Name_UA`).
- Spaces between words are converted to `_`.
- Special filesystem characters (`/ \ : * ? " < > |`) must be sanitized.

## 5. Recommended Settings
- **Expiry Alert Threshold**: Warning trigger $N$ days prior to expiration (default: 30 days).
- **Critical Expiry Threshold**: Critical warning trigger $N$ days prior to expiration (default: 7 days).
- **Date Formatting**: Configurable regional format (`YYYY-MM-DD`, `DD.MM.YYYY`, `DD MMM YYYY`).
- **Date Calculation Method**: End-of-month adjustment for Flight crew vs exact day-to-day for Cabin crew.
- **Local Backup Retention**: Keep last $N$ JSON snapshot revisions in browser storage.

## 6. Sync Modes & Site Data Protection Policy (Захист даних від видалення)
### 1. Manual-Only Mode (Тільки ручна синхронізація)
- The user can set synchronization to **Manual Only** (`syncInterval = 'manual'`).
- In this mode, no background interval timers run. Synchronization occurs strictly when initiated manually by the user via the sync action buttons.

### 2. Zero-Deletion Guarantee on Website (Неможливість видалення на сайті)
- **Personnel Preservation**: Crew members present on the website are **NEVER deleted** during synchronization (whether manual or automated). If a crew member is deleted in Google Drive or Google Sheets, the website's persistent local database retains their profile. Personnel can only be deleted on the website through explicit administrator action in the management console.
- **Dates Protection**: Existing qualification and training dates on the website are immutable against deletion or blanking. If incoming data contains empty cells, nulls, dashes, or older dates, the website's dates remain untouched. Only valid and chronologically newer dates can overwrite existing dates.
- **Drive Deletion Scope**: Deletions on Google Drive remain on Google Drive and do not propagate destructively to the website's operational records.

## 7. Training Flights Scans Auto-Upload & Hierarchy (`Month_YEAR`)

### 1. Structure
All training flight log scans (PDF or image) imported via AI OCR are automatically categorized and stored according to flight date:

```
Google Drive Root
└── Training_Flights/               <-- Default root (or configured in Settings)
    ├── Jan_2026/                   <-- Subfolder format: [Month_YEAR]
    │   ├── Scan_Flight_UR-UHB_2026-01-14.pdf
    │   └── Scan_Flight_UR-UHA_2026-01-28.pdf
    ├── Feb_2026/
    ├── Oct_2026/
    │   └── Scan_Flight_UR-UHC_2026-10-27.pdf
    └── ...
```

### 2. Month Naming Rule
- Subfolder format is strictly `[3-Letter-Month]_[4-Digit-Year]`:
  `Jan_2026`, `Feb_2026`, `Mar_2026`, `Apr_2026`, `May_2026`, `Jun_2026`, `Jul_2026`, `Aug_2026`, `Sep_2026`, `Oct_2026`, `Nov_2026`, `Dec_2026`.
- If the folder does not exist, it is created automatically.
- Root folder `Training_Flights` is also created automatically if missing.

### 3. Google Apps Script Web App Code (uh.nairobi@gmail.com)
Deploy this script as a Web App (Execute as: **Me**, Who has access: **Anyone**):

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'upload_flight_scan') {
      var rootFolderName = data.rootFolder || 'Training_Flights';
      var subfolderName = data.subfolder || 'Unsorted';
      var fileName = data.fileName || ('Flight_Scan_' + Date.now() + '.pdf');
      
      // 1. Get or create root folder
      var rootFolders = DriveApp.getFoldersByName(rootFolderName);
      var rootFolder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder(rootFolderName);
      
      // 2. Get or create Month_YEAR subfolder
      var subFolders = rootFolder.getFoldersByName(subfolderName);
      var subFolder = subFolders.hasNext() ? subFolders.next() : rootFolder.createFolder(subfolderName);
      
      // 3. Decode base64 data and create file
      var rawBase64 = data.fileData;
      var commaIdx = rawBase64.indexOf(',');
      if (commaIdx !== -1) rawBase64 = rawBase64.substring(commaIdx + 1);
      
      var decodedBytes = Utilities.base64Decode(rawBase64);
      var blob = Utilities.newBlob(decodedBytes, data.mimeType || 'application/pdf', fileName);
      var file = subFolder.createFile(blob);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileId: file.getId(),
        fileUrl: file.getUrl(),
        path: rootFolderName + '/' + subfolderName + '/' + fileName
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

