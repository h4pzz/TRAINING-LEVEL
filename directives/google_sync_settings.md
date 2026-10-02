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

## 4. Google Drive Hierarchy & Crew Folder Convention (`NAME_EN`)
To ensure strict organizational clarity across departments, all documents and files must follow this hierarchy:

```
[Google Drive Root Folder] (e.g. "AeroCheck_Documents")
├── FLIGHT/
│   ├── SURKOV_VOLODYMYR/
│   │   ├── photo.jpg
│   │   ├── LPC_scan.pdf
│   │   ├── MED_certificate.pdf
│   │   └── ...
│   ├── IVANOV_OLEKSII/
│   └── ...
└── CABIN/
    ├── PETROVA_ANNA/
    │   ├── photo.jpg
    │   ├── CC_Type_scan.pdf
    │   └── ...
    ├── SYDORENKO_MARIIA/
    └── ...
```

### Folder Naming Rule:
- Each folder inside `FLIGHT/` and `CABIN/` must be strictly named using `NAME_EN` (`member.Full_Name_EN`).
- If `Full_Name_EN` is empty or missing, it must fall back to the transliterated English name derived from `Full_Name_UA`, or member ID.
- Special filesystem characters (`/ \ : * ? " < > |`) must be sanitized.

## 5. Recommended Settings
- **Expiry Alert Threshold**: Warning trigger $N$ days prior to expiration (default: 30 days).
- **Critical Expiry Threshold**: Critical warning trigger $N$ days prior to expiration (default: 7 days).
- **Date Formatting**: Configurable regional format (`YYYY-MM-DD`, `DD.MM.YYYY`, `DD MMM YYYY`).
- **Date Calculation Method**: End-of-month adjustment for Flight crew vs exact day-to-day for Cabin crew.
- **Local Backup Retention**: Keep last $N$ JSON snapshot revisions in browser storage.
