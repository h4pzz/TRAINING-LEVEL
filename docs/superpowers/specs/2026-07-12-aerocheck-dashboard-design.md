# Design Specification: AeroCheck Crew Training Dashboard SPA (Structure & Roles)

**Date:** 2026-07-12  
**Status:** Approved (Structure and Roles)  
**Scope:** Phase 1 Sandbox Interface Layout, Navigation, and Role Permissions Model  

---

## 🌟 Project Overview

The **AeroCheck Crew Training Dashboard** is a Single Page Application (SPA) designed to track qualification levels, ground training, and practical sessions of aviation personnel. It operates in a bilingual environment (Ukrainian and English) and enforces strict role-based access control.

This document details the approved structural layout, user roles, navigation views, and dashboard widget specifications.

---

## 🔒 Role-Based Access Control (RBAC)

The system supports four distinct user roles, each with specific interface permissions:

1.  **ADMIN (Full Access)**
    *   Full read and write access to the entire application.
    *   Can import new Excel databases.
    *   Can modify all crew records, including personal/contact information (Name, Email, Phone, License Number) and training completion dates.
    *   Can log training flights.
    *   Has access to the **System Settings** section (Google Drive integration, column visibility, adding/deleting crew).
    *   Can manually add and delete crew members from the system.
    *   Has access to the **Forms** section.

2.  **INSTRUCTOR (Training Editor)**
    *   Can view all dashboards, flight crew, and cabin crew lists.
    *   Can log training flights.
    *   **Editing Restrictions:** Can edit crew records, but is **restricted to modifying training completion dates only**. Personal and contact details (Name, Email, Phone, License Number) are read-only (disabled) in the edit form.
    *   No access to System Settings or printable Forms tabs.

3.  **OFFICE (Viewer & Document Operator)**
    *   Can view the Dashboard, Flight Crew lists, and Cabin Crew lists (read-only, no import or editing controls).
    *   Has access to the **Forms** section to generate printable applications/blank forms.
    *   No access to Training Flight logging form or System Settings.

4.  **CREW (Personal Portal)**
    *   Has access **only** to a simplified personal portal view.
    *   Can view their own contact details, license number, and the status/expiration dates of their 11 expiring training items.
    *   Can view attached scanned documents synced from their individual Google Drive folder.
    *   Cannot access dashboards, lists of other crew members, flights logging, or settings.

---

## 🔑 Authentication & Login Flow

*   **Initial Screen:** When opening the website, the user is presented with a standard Sign In form (Email & Password).
*   **First-Time Login:** If a crew member logs in for the first time, they enter their email. The system verifies if the email exists in the imported Excel database. If verified, the system prompts them to set a personal password (stored locally in `localStorage` for Phase 1 sandbox).
*   **Role Mapping:** Upon successful login, the application redirects the user to their appropriate role-based workspace (Dashboard for Admin/Instructor/Office, Personal View for Crew).

---

## 📂 Sidebar Navigation Structure

The left sidebar navigation is responsive (collapses into an icon-dock on mobile viewports) and contains the following sections:

1.  **Logo Container:** Ukrainian Helicopters Logo (`LOGO_UH.png` centered horizontally).
2.  **📊 Dashboard** (Visible to: ADMIN, INSTRUCTOR, OFFICE)
3.  **✈️ Flight Crew / Льотний склад** (Visible to: ADMIN, INSTRUCTOR, OFFICE)
4.  **👥 Cabin Crew / Кабінний склад** (Visible to: ADMIN, INSTRUCTOR, OFFICE)
5.  **📝 Training Flights / Запис польоту** (Visible to: ADMIN, INSTRUCTOR)
6.  **📄 Forms / Бланки** (Visible to: ADMIN, OFFICE)
7.  **⚙️ Settings / Налаштування** (Visible to: ADMIN only)
8.  **👤 My Portal / Особистий кабінет** (Visible to: CREW only, replaces other options)

### Sidebar Footer Controls:
*   **Theme Toggle:** Swaps between Light Minimalist and Dark Mode.
*   **Language Selector:** Bilingual toggle (UA/EN).
*   **System Date Display:** Shows the date for calculations (Default: 2026-07-12).

---

## 📊 Dashboard Widget Specifications

The main dashboard view compiles aggregate stats and audit trails:

1.  **KPI Cards Row:**
    *   *Compliance Rate (%)*: Percentage of active crew members with all documents valid.
    *   *Total Crew count*: Splitting Flight and Cabin crew.
    *   *Expired Documents count*: Total number of red-badged expired training courses.
    *   *Expiring Soon count*: Total number of amber-badged items within the 30-day warning threshold.
2.  **Department Statistics Panel:** Progress bars displaying compliance rate by department (e.g., ПРВ, ВТЦ, ТВ).
3.  **Attention Needed Panel:** List of crew members with the highest count of expired documents.
4.  **Last Logged Flight Widget:** Displays details of the most recently logged flight (Crew Name, Date, Helicopter Type, Duration, Exercise Details).
5.  **Recent System Changes (Audit Trail):** Historical feed displaying recent database modifications, including imports, manual edits, and flight records, stamped with time and editor email.

---

## 📄 Personal Portal & Scanned Documents

For the `CREW` role, their workspace includes:
*   **Profile Card:** Shows Name, Rank, Dept, Phone, Email, and License Number.
*   **Expirations Grid:** Status badges for OPC, LPC, Type, CRM, MED, LICENSE, EMER, DG (color-coded: green = valid, amber = warning <30d, red = expired, gray = N/A).
*   **📂 Scanned Documents:** Lists PDF/Image attachments synced from their individual Google Drive folder (e.g., `Aleksa_OPC_2026.pdf`) for easy downloading/viewing.

---

## ⚙️ System Settings (Admin Only)

The settings view comprises:
1.  **Google Drive Sync:** Client credentials/JSON key config, database Sheet File ID, and auto-sync toggles.
2.  **Column Visibility:** Checkboxes to select which columns to display or hide in the Flight Crew and Cabin Crew data tables.
3.  **Permissions Matrix:** Config table displaying current read/write rules.
4.  **Crew Member Management (Add/Delete):** Interactive panel allowing the manual creation of new flight or cabin crew members (saving Name, Rank, Dept, Email, Phone, License number) and the deletion of existing members with immediate cascade updates to lists, KPI counters, and audit trail.
5.  **Excel Database Update:** A dedicated uploader accepting a complete workbook (with both Flight_Crew and Cabin_Crew sheets). It runs the smart merge algorithm across both datasets, updates the database cache, and displays an on-screen dialog summary logging old vs. new values for all modified crew members.

---

## 📱 Mobile Responsiveness

The interface layout is designed to be fully mobile-compatible:
*   At viewports under `650px` wide, the left sidebar transitions to an icon-only dock, and the logo is hidden.
*   KPI cards wrap into grid columns.
*   Table layouts collapse or wrap into scrollable wrappers.
*   The Crew Personal portal layout wraps the profile meta and grid into a single-column layout fit for mobile phones.

---

## 🛠️ Verification & Implementation Steps (Next Phases)

*   **Design & Styling:** A separate task/chat will refine CSS color tokens, typography, borders, shadows, and interactive micro-animations.
*   **Backend & Parsing Logic:** A separate task/chat will implement:
    *   SheetJS browser parsing of uploaded `.xlsx` databases.
    *   Date calculations based on compliance rules (Flight crew end-of-month shift vs. Cabin crew day-to-day).
    *   Smart merge (diff) logic.
    *   Google Drive OAuth and dispatcher stubs.
