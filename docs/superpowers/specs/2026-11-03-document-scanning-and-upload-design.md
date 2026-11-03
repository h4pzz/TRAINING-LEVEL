# Design Specification: Document Scanning & Direct Upload to Crew Folder

**Document Date:** 2026-11-03  
**Status:** Approved by User  
**Target View:** Personal Portal (`#view-personal-portal`)  
**Eligible Roles:** `ADMIN`, `INSTRUCTOR`

---

## 1. Overview & Problem Statement

Currently, inside a crew member's personal portal (`#view-personal-portal`), the document section header features a button labeled `+ Сканувати` (`#btn-scan-document`). Clicking it opens a modal window that simply offers a standard browser `<input type="file">` element ("Вибрати файл"), requiring the user to locate an existing pre-scanned file on their computer or mobile device.

Instructors and administrators frequently use mobile devices (smartphones, tablets) on the flight line, in briefing rooms, and at training centers. They require an efficient, direct method to:
1. Capture/scan certificates and training logs directly via their smartphone's native camera or document scanner (such as Apple's native Document Scanner on iOS Safari or Android document capture).
2. Alternatively select an existing PDF/image if already saved on the device.
3. Automatically upload the resulting document to the crew member's designated Google Drive folder (`Training level / [Flight Crew | Cabin crew] / [LastName_FirstName]`) with standard naming (`{TYPE}_{Full_Name_EN}_{YEAR}.{ext}`).
4. Automatically update the database compliance date for that training type and append the scan to the crew member's personal scan records.

---

## 2. User Experience & Architecture (Option A)

### 2.1 Personal Portal Header Renaming
* The button in `#portal-scans-card` is renamed from `+ Сканувати` to **`+ 📄 Додати документ`** (`btn_add_document`), accurately reflecting that users can either directly scan with a camera or pick an existing document.
* Access is granted to `ADMIN` and `INSTRUCTOR` roles (read-only for `OFFICE` and `CREW`).

### 2.2 Modal Window Redesign (`#scan-modal-backdrop`)
The modal is updated to present a clear, mobile-friendly interface:
1. **Header & Context:**
   * Modal title: **«Додати документ до папки співробітника»** / **«Add Document to Crew Member Folder»**.
   * A sub-header pill displaying the crew member's name and rank (e.g. `👤 Бондаренко Михайло [КПС]`) to provide immediate visual reassurance that documents are placed into the correct personnel folder.
2. **Form Fields:**
   * **Тип підготовки (`#scan-doc-type`):** Populated dynamically with all training types relevant to the crew type (Flight vs Cabin: OPC, LPC, MED, CRM, EMER_1, etc.).
   * **Дата проходження (`#scan-doc-date`):** Date picker for training completion date.
3. **Document Source Cards (Option A Touch-Friendly Layout):**
   * Replaces the plain `<input type="file">` with two prominent action cards:
     * 📷 **«Сканувати камерою» (`#btn-scan-camera`):**
       * Programmatically invokes a hidden input: `<input type="file" id="scan-camera-input" accept="image/*,application/pdf" capture="environment">`.
       * On iOS Safari, launches Apple's Document Scanner / Camera.
       * On Android Chrome, launches the system camera / document capture.
     * 📁 **«Вибрати файл» (`#btn-scan-file`):**
       * Programmatically invokes `<input type="file" id="scan-file-input" accept="application/pdf,image/*">`.
       * Opens the device file manager / gallery for existing files.
4. **Document Ready Status Card:**
   * Once a file is acquired (via camera or file selection):
     * The modal hides the action cards and shows an active green badge:
       `✓ [Generated_Filename] ([File_Size])` with an icon and a `✕` button to clear and retake/reselect.
5. **Footer Actions:**
   * **Скасувати (`#btn-cancel-scan-modal`):** Closes modal without changes.
   * **Зберегти на Google Диск (`#btn-submit-scan`):**
     * Label: `☁️ Зберегти на Google Диск` / `☁️ Save to Google Drive`.
     * Enabled only when both a valid date and a document file are present.
     * Shows spinner animation during network upload and file writing.

---

## 3. Data Flow & Execution Details

### 3.1 Filename Normalization
Files are formatted according to the unified project standard:
```javascript
const cleanTypeName = selectedType.replace(/\s+/g, '_');
const cleanName = member.Full_Name_EN.trim().replace(/\s+/g, '_');
const currentYear = new Date().getFullYear();
const fileExt = file.name ? file.name.substring(file.name.lastIndexOf('.')) : '.jpg';
const generatedFileName = `${cleanTypeName}_${cleanName}_${currentYear}${fileExt}`;
```

### 3.2 Storage & Google Drive Integration
1. **Google Drive Sync:**
   * If a valid Google Drive OAuth access token exists:
     * Calls `uploadCrewDocumentToDrive(member, selectedType, generatedFileName, fileData, token)`.
     * Destination folder: `Training level / [Flight Crew | Cabin crew] / [LastName_FirstName]`.
     * Receives `webViewLink` and folder metadata.
   * If offline or Google Drive is not connected:
     * Saves the document in base64 data format in local state and shows an informational toast.
2. **Crew Record Update:**
   * Calculates expiry date if the training is an expiring type (via `calculateExpiryDate(completionDate, ruleKey, member.crewType)`) or sets the direct completion date.
   * Updates `member[selectedType] = dateToSave`.
   * Appends scan object to `member.scans`:
     ```javascript
     member.scans.push({
       name: selectedType,
       fileName: generatedFileName,
       fileData: fileData,
       driveLink: driveLink,
       dateAdded: new Date().toISOString().split('T')[0]
     });
     ```
3. **Audit Log:**
   * Pushes entry to `STATE.changelog` recording user, timestamp, training type, updated date, and uploaded file details.
4. **State Persistence & Re-render:**
   * Calls `saveStateToStorage()`.
   * Closes modal and re-renders the personal portal via `renderPersonalPortal()`.

---

## 4. Error Handling & Edge Cases

1. **Camera Permission Denied:**
   * If camera permission is denied on mobile, standard browser permission prompt alerts the user, and the fallback `📁 Вибрати файл` remains accessible.
2. **Large File Uploads:**
   * Maximum file size checked client-side (warns if file exceeds 15MB).
3. **Drive Token Expiry:**
   * Graceful fallback: local save succeeds, warning toast displayed prompting Drive re-authorization in Settings.
4. **Crew Type Normalization:**
   * Correctly resolves column mappings for Flight Crew vs Cabin Crew (including `CC_Type` to `Type`).

---

## 5. Verification & Testing Plan

1. **Desktop Test:**
   * Open Personal Portal as Admin or Instructor.
   * Click `+ 📄 Додати документ`.
   * Verify modal UI with two source buttons and crew name display.
   * Select a PDF via `📁 Вибрати файл`.
   * Verify file ready badge, save document, verify table date update and Google Drive/local scan list.
2. **Mobile Device Test (iOS / Android):**
   * Open app on mobile browser.
   * Tap `+ 📄 Додати документ`.
   * Tap `📷 Сканувати камерою`.
   * Confirm camera / document scan activates, captures document, displays file ready preview, and uploads successfully.
3. **Permission Check:**
   * Login as Office or Crew member: confirm button is hidden and portal documents are read-only.
