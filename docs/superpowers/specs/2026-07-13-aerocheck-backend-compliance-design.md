# Design Specification: AeroCheck Data Parsing, Compliance, and Sync Logic

**Date:** 2026-07-13  
**Status:** Approved  
**Scope:** SheetJS Excel Parsing, Date Math & Compliance Rules, Smart Merge (Diff), Local Backup & Google Drive Sync Simulation  

---

## 🌟 Overview

This document specifies the technical design for the **Backend / Data Sync & Compliance Calculations** subsystem of the AeroCheck Crew Training Dashboard SPA. It defines the implementation of the parsing layer (SheetJS), date conversion algorithms, the Smart Merge synchronization mechanism, the rule engine for training compliance, and the offline backup and simulated Google Drive integration.

---

## 💾 Data Flow & Bootstrapping

When the SPA starts, it orchestrates the loading of crew records following this flow:

1.  **Check Cache:** `js/app.js` checks `localStorage` for cached records (`aerocheck_flight_crew` and `aerocheck_cabin_crew`).
2.  **Bootstrap (First Load):** If `localStorage` is empty:
    *   The app performs a background `fetch()` to `DATABASE/Training_level_FLIGHT_and CABIN.xlsx`.
    *   The fetched binary array buffer is passed to `execution/excel_parser.js`.
    *   The parser extracts data from the two worksheets (`Flight_Crew` and `Cabin_Crew`) and returns structured JSON lists.
    *   The app persists the JSON data directly into `localStorage`.
3.  **Use Cache:** If data exists in `localStorage`, the app loads it directly to ensure instant page render.

---

## 📊 Excel Parser & Localized Date Parsing

The parser in [excel_parser.js](file:///d:/WIBECODING/TRAINING%20LEVEL/execution/excel_parser.js) uses the **SheetJS** library to parse uploaded or fetched Excel spreadsheets.

### 1. Excel Cell Values & Types
*   Excel stores dates either as raw serial numbers (number of days since Jan 1, 1900, e.g., `45930.0`) or as text strings representing formatted dates.
*   The parser converts cell values into standard `YYYY-MM-DD` ISO strings using the following rules:
    *   **Excel Serial Dates (Numeric):** Converted using:
        $$\text{JS Date} = \text{new Date}((\text{serial} - 25569) \times 86400 \times 1000)$$
        *(Correcting for UTC/Local timezone offsets).*
    *   **Ukrainian Formatted Text (String, e.g., `"31 лип. 27"`):** Parsed using regex and the Ukrainian month map in [compliance_rules.js](file:///d:/WIBECODING/TRAINING%20LEVEL/execution/compliance_rules.js):
        *   Regex pattern splits the string into: `Day` (1 or 2 digits), `Month Abbreviation` (letters with optional period), `Year` (2 digits).
        *   `Month Abbreviation` is normalized and matched against `UKRAINIAN_MONTHS_MAP` (e.g. `'лип'` -> `6` / July).
        *   `Year` (2 digits, e.g. `27`) is parsed as `2000 + Year` -> `2027`.
        *   Constructed date is formatted as `YYYY-MM-DD`.

---

## 🔀 Smart Merge (Diff) Algorithm

When a new Excel file is imported, the existing local cache is merged with the new spreadsheet data in [data_merger.js](file:///d:/WIBECODING/TRAINING%20LEVEL/execution/data_merger.js) to preserve manual edits that might be newer than the Excel spreadsheet:

1.  **Crew Matching Logic:**
    *   A crew member row in the imported Excel sheet matches an existing member in the cache if:
        *   `Full_Name_EN` matches exactly (case-insensitive, trimmed).
        *   **OR** `Full_Name_UA` matches exactly (case-insensitive, trimmed).
    *   If no match is found, the imported member is added as a **new entry**.
2.  **Date Merging Logic:**
    *   For each training column (both expiring and non-expiring):
        *   Compare the cached date ($Date_{cached}$) with the imported date ($Date_{imported}$).
        *   **Rule:** Overwrite the cached date **ONLY** if the imported date is chronologically newer than the cached date ($Date_{imported} > Date_{cached}$) or if the cached date is empty/missing.
        *   Any update triggers an entry in the audit trail log (`changelog.json`) indicating the crew member, column, old value, and new value.

---

## 📅 Compliance Calculation Rule Engine

Calculations are computed dynamically in [compliance_calculator.js](file:///d:/WIBECODING/TRAINING%20LEVEL/execution/compliance_calculator.js) based on the configurations in [compliance_rules.js](file:///d:/WIBECODING/TRAINING%20LEVEL/execution/compliance_rules.js).

### 1. Manual Date Input Behavior (Write Path)
When adding or updating training records in the edit forms:
*   By default, the edit form prompts the user: **"Select date type: [ ] Expiration Date | [ ] Completion Date"**.
*   **Admin Override:** Admins can disable this prompt in the System Settings tab. If disabled, inputs are treated as **Expiration Dates** by default.
*   **Expiration Date Mode:** The selected date is written directly to the database as-is.
*   **Completion Date Mode:** The system automatically calculates the Expiration Date using the rules below and writes the calculated expiration date to the database.

### 2. Duration & Expiration Calculations
When calculating expiration from completion dates:

*   **Standard Durations ($N$ Months):**
    *   `OPC` (Flight Crew): **6 months**
    *   `OPC` (Cabin Crew): **12 months**
    *   `DG` (Dangerous Goods): **24 months**
    *   `AV_SEC` / `AV-SEC` (Aviation Security): **36 months**
    *   `LPC`, `Type`, `EMER_1`, `MED`, `LICENSE`: **12 months**
    *   `EMER_3`: **36 months**

*   **Adjustment Rules (End-of-Month vs Day-to-Day):**
    *   **DG and AV_SEC:** Expire exactly **day-to-day** (exact date matching the anniversary date).
        *   *Example:* Completion on `2026-01-15` for `DG` (24 mo) $\rightarrow$ Expiration is `2028-01-15`.
    *   **All other preparations (OPC, LPC, Type, EMER_1, EMER_3, MED, LICENSE):** Expire on the **last day** of the resulting month (`end_of_month: true`).
        *   *Example:* Completion on `2026-01-15` for Flight `OPC` (6 mo) $\rightarrow$ Expiration is `2026-07-31`.

### 3. Status Badges
To display qualifications on the dashboard and lists, compare the expiration date with the **Current System Date** (set globally in the application):
*   🔴 **EXPIRED:** $ExpiryDate < SystemDate$
*   🟡 **WARNING:** $ExpiryDate \ge SystemDate$ AND $(ExpiryDate - SystemDate) \le 30 \text{ days}$
*   🟢 **VALID:** $ExpiryDate > SystemDate + 30 \text{ days}$
*   ⚪ **NEUTRAL:** For the 14 non-expiring preparations (displayed as grey completion badges).
*   ⚫ **MISSING:** If empty or `-`.

---

## 💾 Local Backup & Drive Sync

Since Phase 1 is a sandbox environment, backup and synchronization are implemented locally with Google Drive stubs to establish a seamless upgrade path:

1.  **Local Backup Downloads:**
    *   **Export JSON:** A button in Settings compiles the entire local state (`localStorage` dump of crew data, settings, and changelog) into a JSON string and triggers a file download named `aerocheck_backup_YYYY-MM-DD.json`.
    *   **Export XLSX:** A button in Settings uses SheetJS to write a new `.xlsx` binary file. It structures two worksheets `Flight_Crew` and `Cabin_Crew` using the updated local data, formats the dates matching the original Ukrainian style (e.g. `31 лип. 27`), and downloads the file as `Training_level_FLIGHT_and CABIN_updated.xlsx`.
2.  **Google Drive Sync Simulation:**
    *   An async service stub `drive_sync.js` manages synchronization.
    *   **Manual Sync:** Pressing the sync button triggers a loader spinner for 2 seconds (simulating network requests) and displays an alert indicating success.
    *   **Auto Sync:** A configurable timer (default: 5 minutes) triggers background updates.
    *   **UI Indicators:** A colored status indicator next to the sidebar logo displays:
        *   🟢 *Drive Connected (Synced)*
        *   🟡 *Offline Mode (Saved to Browser)*

---

## 🧪 Verification Plan

### Automated Verification
*   Create a local node script `verify_date_math.js` to run test assertions on `compliance_rules.js` and `compliance_calculator.js`.
*   Validate date parsing of both numeric values (`45930.0` $\rightarrow$ `2025-12-31`) and UA strings (`"31 лип. 27"` $\rightarrow$ `2027-07-31`).
*   Validate EOM shift calculations for `OPC`/`LPC` and exact day-to-day anniversary calculations for `DG`/`AV_SEC`.

### Manual Verification
*   Verify that importing `DATABASE/Training_level_FLIGHT_and CABIN.xlsx` initially populates the localStorage and loads the dashboard immediately without errors.
*   Log a manual edit in the dashboard, perform a backup download, clear browser storage, and import the backup to ensure state is correctly restored.
