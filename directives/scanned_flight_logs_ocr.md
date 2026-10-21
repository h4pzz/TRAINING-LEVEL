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

3. **Intelligent Crew Matching Engine & Position Mapping**:
   - English Storage Standard: All crew names and positions are stored in English (`Full_Name_EN` from database, e.g. `Berehovyy Serhiy`, `Bondarenko Mykhailo`).
   - Company roles mapping:
     - `КПС` (Командир повітряного судна) $\leftrightarrow$ `PIC` (Pilot in Command)
     - `2П` (Другий пілот) $\leftrightarrow$ `SIC` (Second in Command)
     - `ІБ` (Інженер бортовий) $\leftrightarrow$ `FE` (Flight Engineer)
     - `БП` (Бортпровідник) $\leftrightarrow$ `FA` (Flight Attendant)
     - `БПАР` / `БП-АР` / `БП-РА` (Бортпровідник-рятувальник) $\leftrightarrow$ `FA-AR` (Flight Attendant - Aerial Rescuer)
     - If instructor is checked: append ` inst` (e.g. `PIC inst`, `SIC inst`, `FE inst`, `FA inst`, `FA-AR inst`).
   - Permanent VIP Instructor Roles:
     - `Berehovyy Serhiy`, `Turchyn Oleksandr`, `Kutko Yuriy` $\rightarrow$ ALWAYS `PI` (Pilot Instructor) and `isInstructor: true`.
     - `Formaniuk Iurii`, `Chernysh Oleksii` $\rightarrow$ ALWAYS `FE inst` and `isInstructor: true`.
     - `Aleksa Sergii`, `Dubinin Andrii` $\rightarrow$ ALWAYS `FA-AR inst` and `isInstructor: true`.
   - Pilot Qualification Safeguard: in training flights, multiple pilots (КПС / 2П) fly together for checks and ratings. Crew roster references provided to Gemini include their database Rank and permanent role. If Gemini mistakenly tags a КПС/2П pilot as FE (e.g. Bondarenko M., Kotsar O.), the parser and matching engine automatically correct the position to `PIC` / `SIC`.
   - Scanned crew name (e.g. `S. Berehovyy`, `O. Sokurenko`, `M. Bondarenko`, `O. Kotsar`) is normalized and compared against existing database crew members (`STATE.flightCrew` and `STATE.cabinCrew`).
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

## 4. Email Dispatch & PDF Generation (SMTP Integration)
1. **SMTP Configuration**:
   - Server: `smtp.gmail.com:465` (SSL).
   - Sender: `uh.nairobi@gmail.com`.
   - Credentials stored in `.env` (`SMTP_USER`, `SMTP_PASS`).
2. **Direct PDF Delivery (`execution/send_email_smtp.py`)**:
   - Formats complete flight report and attaches binary PDF (`application/pdf`) with encoded filename.
   - Endpoint: `POST /api/send-flight-email` in `server.js` invokes `send_email_smtp.py` with JSON payload.
3. **Client-side PDF Generation**:
   - `html2pdf.bundle.min.js` (stored locally in `js/libs/`) converts styled flight DOM into PDF base64.
4. **Fallback & Alternative Options**:
   - One-click Outlook / Default mail client with automatic PDF download to local disk.
   - One-click Gmail Web compose.
   - Clipboard copy of full plain text report.
- **Corrupted or unreadable image**: Flag file as 🔴 Failed in queue with error description.
