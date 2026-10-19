# Directive: AI OCR Recognition & Import of Scanned Training Flight Logs

## 1. Goal
Provide automated, AI-powered recognition and interactive verification of scanned paper and iPad flight log sheets (*"Log sheet of duty time and flight time during training flights"*). Enable batch ingestion of ~50 files with crew name auto-matching against the database, split-view visual review, and seamless commitment to `STATE.flights` with compliance calculation and Google Drive synchronization.

## 2. Architecture & Data Flow
1. **API Credentials & Settings**:
   - Google Gemini API key configured in Settings (`#settings-gemini-api-key`) or environment.
   - Key is stored in `STATE.settings.geminiApiKey` and persisted in `localStorage`.
   - Free tier rate limits: 15 RPM (Requests Per Minute) $\rightarrow$ batch requests are paced with a minimum 4-second delay between calls.

2. **OCR Recognition Engine (`execution/scan_ocr_parser.js`)**:
   - Direct browser-to-Gemini REST API endpoint:
     `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
   - Accepts both PDF (`application/pdf`) and images (`image/jpeg`, `image/png`) via base64 `inline_data`.
   - Structured JSON response parsing with rigorous system prompt handling:
     - Date (YYYY-MM-DD)
     - Helicopter registration (e.g. `UR-UHB`)
     - Fuel start, fuel end, refuel
     - Duty time, flight time, block time
     - Briefings: Pre-flight instructions (bgn, end, ttl) & Post-flight debrief (bgn, end, ttl)
     - Crew table (pstn, name, day/nght/nvg flight & block times, instructor times, task number, training types)
     - Ditto mark handling: repeating characters (`-"-`, `//`, `ditto`) are resolved using the preceding crew row.
     - Z-strike handling: struck-through rows or empty rows are ignored.

3. **Intelligent Crew Matching Engine**:
   - Scanned crew name (e.g. `S. Berehovyy`, `O. Sokurenko`, `A. Dubinin`) is normalized and compared against existing database crew members (`STATE.flightCrew` and `STATE.cabinCrew`).
   - Bidirectional transliteration (Latin $\leftrightarrow$ Ukrainian Cyrillic) and initial extraction (`Berehovyy S.` $\leftrightarrow$ `Береговий С.` / `BEREHOVYY STANISLAV`).
   - Match statuses:
     - 🟢 **Exact Match**: Match confidence 100% (same surname and initial).
     - 🟡 **Fuzzy Match**: Levenshtein distance $\le 2$ or multiple candidates.
     - ⚪ **Unmatched / New**: Manual picker with dropdown of all crew members.

4. **Split-View Visual Verification Modal**:
   - Zero blind imports: The user always sees the uploaded scan side-by-side with extracted form fields.
   - Batch navigation list: Displays all loaded files, status indicators (🟢 Ready, 🟡 Review, ⚠️ Duplicate), and duplicate warnings.
   - Actions: Edit fields, re-link crew member, save single flight, save all verified flights.

5. **Commit & Storage**:
   - Verified flights are appended to `STATE.flights` with unique IDs (`fl_import_...`).
   - Automatic crew compliance calculation: updates training columns (`TRI`, `NVG`, `NAIROBI`, `LPC`, `OPC`, `Type`) for each member.
   - Audit trail recorded in `STATE.changelog`.
   - Persisted to `localStorage` and synced to Google Drive / Sheets if enabled.

## 3. Error Handling & Edge Cases
- **HTTP 429 (Rate Limit)**: Automatically retry with exponential backoff (wait 5s, 10s, 15s).
- **Invalid API Key**: Provide clear warning banner with shortcut to Settings tab.
- **Corrupted or unreadable image**: Flag file as 🔴 Failed in queue with error description.
