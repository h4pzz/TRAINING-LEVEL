# AeroCheck Crew Training Dashboard — Project Context

This document serves as the long-term memory (Single Source of Truth for documentation) for the **AeroCheck Crew Training Dashboard** SPA. It outlines the project's requirements, architectural decisions, and folder structure.

---

## 🌟 Project Overview

**AeroCheck Crew Training Dashboard** is a Single Page Application (SPA) designed to track qualification levels, ground training, and practical sessions of aviation personnel. 

The system operates with two distinct profiles:
1. **Flight Crew** (Lethyi Ekipazh)
2. **Cabin Crew** (Kabinnyi Ekipazh)

---

## 📂 Folders & Files Structure

The project follows a clean, modular structure aligned with the **3-Layer Architecture**:

```
/
├── .tmp/                          # Temporary intermediate files (never committed)
│   └── inspect_xlsx.py            # Temporary script to inspect spreadsheet structure
├── DATABASE/                      # Single Source of Truth database
│   └── Training_level_FLIGHT_and CABIN.xlsx
├── directives/                    # Layer 1: SOPs and guidelines for agents
│   ├── data_import.md             # SOP: Reading Excel and Smart Merge logic
│   ├── compliance_calculation.md  # SOP: Expiration date and visual badges
│   ├── training_flights.md        # SOP: Logging flights & triggering notifications
│   └── changelog_audit.md         # SOP: Logging modifications to Google Drive
├── execution/                     # Layer 3: Deterministic logic and configuration
│   ├── compliance_rules.js        # Config: Expiry limits and rules by crew type
│   ├── compliance_calculator.js   # Logic: Date math, end-of-month shift, status levels
│   ├── excel_parser.js            # Logic: SheetJS integrations & column mapping
│   ├── data_merger.js             # Logic: Smart Merge (Diff) based on Employee ID
│   ├── email_dispatcher.js        # Stub: Asynchronous notification dispatch
│   └── drive_sync.js              # Stub: Reading/Writing to Google Drive
├── css/                           # Visual styling (Vanilla CSS)
│   ├── variables.css              # Color tokens, typography, and theme styling
│   ├── layout.css                 # Sidebar, main dashboard panels, grid layout
│   └── components.css             # Badges, modals, form inputs, buttons
├── js/                            # Layer 2 / Coordination logic
│   └── app.js                     # SPA State Manager, views coordinator, routing
├── index.html                     # Entry point (SPA shell with sidebar, search, views)
├── changelog.json                 # Audit log (merged onto Google Drive in production)
├── project_context.md             # This document (Project Long-term memory)
├── gemini.md                      # Agent orchestration rules
└── vibe-coding.md                 # Vibe Coding guidelines
```

---

## 🎯 Critical Business Requirements

### 1. Bilingual Search & Display (UA / EN)
* The application supports Ukrainian (UA) and English (EN) interfaces.
* The names in the source database are stored in both languages.
* Search and display must adapt to the selected language:
  * **Ukrainian Mode**: Display and perform interactive search using the `Name_Shrt_UA` field.
  * **English Mode**: Display and perform interactive search using the `Full_Name_EN` field.

### 2. "TRAINING FLIGHTS" Section
* A dedicated tab in the left navigation sidebar called **"TRAINING FLIGHTS"**.
* This section contains a form for entering training flight records:
  * Crew member selection.
  * Flight date, aircraft type, duration, and exercise details.
  * Trigger button to log the flight.

### 3. Email Notification Stub
* Saving a flight log triggers an asynchronous function stub `dispatchFlightLogEmail(logData)`.
* This functions as a non-blocking logger for now. Integrations with a real email API will be configured later.

---

## 🏗️ 3-Layer Logic Alignment

* **Layer 1 (Directive)**: SOPs stored in `directives/` describe step-by-step algorithms in plain Markdown (e.g., how to perform smart merging or status calculations).
* **Layer 2 (Orchestration)**: Implemented via `js/app.js` which manages application state, coordinates UI events, handles local routing (tabs), and calls the execution layer functions.
* **Layer 3 (Execution)**: Pure, deterministic functions in `execution/` that handle parsing, validation, date calculations, merges, and logging.

---

## 💾 Data Management & Synchronization

### 1. Single Source of Truth (SSOT)
* An Excel file (.xlsx) containing two worksheets: `Flight_Crew` and `Cabin_Crew`.
* Stored on the user's Google Drive.

### 2. Browser Cache
* Local caching is handled via `LocalStorage` under keys:
  * `aerocheck_flight_crew`
  * `aerocheck_cabin_crew`
  * `aerocheck_settings`

### 3. Smart Merge (Diff) Algorithm
* When a user imports a new Excel file, the data is merged into the local cache:
  * Match existing crew members by unique ID (e.g., employee index/number).
  * For each certificate/training column, compare the new date with the cached date.
  * **Rule**: Overwrite the cached date **ONLY** if the newly imported date is chronologically newer than the cached date.

### 4. Audit Log (`changelog.json`)
* Any modifications (manual edits, smart merges, or file imports) are logged in `changelog.json`.
* Stored in Google Drive (stubbed locally in Phase 1).
* Structure includes:
  * Timestamp.
  * User Email.
  * Type of change (MERGE_IMPORT / MANUAL_EDIT).
  * Details of updated fields (old value vs. new value).

---

## ⚠️ Compliance & Date Calculation Rules

### Expiring Trainings (11 Items)
Only the following 11 items have a fixed expiration date:
* `OPC`, `OPC_NVG`, `LPC`, `Type` (maps to `CC_Type` for Cabin Crew), `EMER_1`, `EMER_3`, `DG`, `AV_SEC`, `CRM`, `MED`, `LICENSE`.
* All other columns represent simple dates of completion and are displayed as neutral badges without calculating expiration.

### Calculation Rules by Crew Profile
* **Flight Crew (`Flight`)**:
  * Expiry Date = Completion Date + $N$ months.
  * **Rule**: Adjusted to the **last day** of the resulting month (`end_of_month_rule: true`).
* **Cabin Crew (`Cabin`)**:
  * Expiry Date = Completion Date + $N$ months.
  * **Rule**: Exact **day-to-day** anniversary (`end_of_month_rule: false`), **except for OPC** which is adjusted to the **last day** of the resulting month.

### Standard Validity Durations ($N$ Months)
* `OPC`:
  * **Flight Crew**: 6 months (expires last day of month)
  * **Cabin Crew**: 12 months (expires last day of month)
* `OPC_NVG`: 12 months (Flight Crew only)
* `LPC`: 12 months
* `Type` / `CC_Type`: 12 months
* `EMER_1`: 12 months
* `EMER_3`: 36 months
* `DG`: 24 months
* `AV_SEC`: 24 months
* `CRM`: 24 months
* `MED`: 12 months
* `LICENSE`: 12 months

---

## 📅 Date Storage Best Practices & Recommendations
Based on analysis of the database structure in `DATABASE/Training_level_FLIGHT_and CABIN.xlsx`:
1. **Current Schema Reality**: The Excel database sheets already store **Expiration Dates** (Терміни дії) in the columns for the 11 expiring training items (since they show future dates like 2027 and 2028), whereas they store **Completion Dates** (Дати проходження) for the non-expiring items.
2. **Strategy**:
   * **In Database / Local Cache**: Keep dates exactly as they are in the spreadsheet to maintain backward compatibility. For expiring items, store the calculated Expiration Date. For non-expiring items, store the raw Completion Date.
   * **When Logging a New Training (Write Path)**: The user enters the *Completion Date* (when they actually did the training). The application then calculates the *Expiration Date* using the `CREW_COMPLIANCE_RULES` (adding months, applying end-of-month rule or exact day-to-day rule) and writes this calculated date to the database.
   * **When Displaying in UI (Read Path)**: Display the Expiration Date for the 11 expiring items with status indicators (Green/Yellow/Red). To show when the training was completed, calculate it backwards by subtracting the validity duration (e.g. `Completion Date = Expiry Date - N months`), or simply label the columns clearly to represent "Expiry Date" vs. "Completion Date" based on whether they expire.

---

## 🔒 Phase 1 Sandbox Scope
* **Offline Execution**: Upload spreadsheet files using browser `<input type="file">`.
* **Parsing**: Done entirely in the browser using the **SheetJS** library.
* **Google APIs & Email**: Fully stubbed with async functions.
