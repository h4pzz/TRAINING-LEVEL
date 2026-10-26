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
