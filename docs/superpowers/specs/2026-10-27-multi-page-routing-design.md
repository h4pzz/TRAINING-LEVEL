# AeroCheck — Multi-Page SPA Routing & Blanks/Forms Separation Design Spec

**Date:** 2026-10-27  
**Status:** Approved by User  
**Target Architecture:** HTML5 History API SPA Router with Role-Based Route Guards

---

## 1. Executive Summary

AeroCheck is transitioning from a tab-toggling single-page monolith to a **multi-page SPA with clean URLs** (HTML5 History API) and dedicated functional sections.

Key architectural shifts:
1. **Clean URL Routing (`js/router.js`)**: Real URLs (`/dashboard`, `/flight-crew`, `/training-flights`, `/blanks`, `/forms`, `/settings`, `/portal`) with browser history navigation (`pushState`, `popstate`), bookmarks, and deep links, with zero page reloads or memory loss.
2. **Separation of Blanks & Forms**:
   - **`/blanks` (Бланки для друку)**: Catalog of clean, standard printable blank templates and PDFs for offline flights/shifts.
   - **`/forms` (Інтерактивні форми та відомості)**: Dynamic forms that auto-populate crew qualification data from the database, allow interactive input, and generate print-ready reports/examinations.
3. **Role-Based Access Control (RBAC) & Router Guards**:
   - `CREW`: Strictly locked to `/portal` (their own personal profile). Attempting to visit any other URL redirects immediately to `/portal`.
   - `OFFICE`: Read-only access to `/training-flights` (views archive and flight logs, but creation, AI scan import, and editing are hidden); access to `/flight-crew`, `/cabin-crew`, `/dashboard`, `/blanks`, and `/forms`; `/settings` is restricted.
   - `INSTRUCTOR`: Full access to create, edit, and AI-import flights in `/training-flights`, access to matrix tables and blanks/forms; `/settings` is restricted.
   - `ADMIN`: Unrestricted access across all routes and settings.
4. **Draft Safety**: Switching between pages preserves active inputs in memory (e.g., flight logs or custom forms) without data loss.

---

## 2. Route Map & Permissions Matrix

| URL Path | Section Name (UA / EN) | View Container ID | `CREW` | `OFFICE` | `INSTRUCTOR` | `ADMIN` |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **`/`** or **`/dashboard`** | Аналітика / Dashboard | `#view-dashboard` | ❌ *(Redirect `/portal`)* | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **`/flight-crew`** | Льотний екіпаж / Flight Crew | `#view-flight-crew` | ❌ *(Redirect `/portal`)* | 👁️ View / Export | ✍️ Edit / View | ✍️ Full Admin |
| **`/cabin-crew`** | Кабінний екіпаж / Cabin Crew | `#view-cabin-crew` | ❌ *(Redirect `/portal`)* | 👁️ View / Export | ✍️ Edit / View | ✍️ Full Admin |
| **`/training-flights`** | Тренувальні польоти / Flights | `#view-training-flights` | ❌ *(Redirect `/portal`)* | 👁️ **Read-Only** | ✍️ **Log & Edit** | ✍️ Full Admin |
| **`/blanks`** | Бланки для друку / Blanks | `#view-blanks` | ❌ *(Redirect `/portal`)* | ✅ View / Print | ✅ View / Print | ✅ Upload / Print |
| **`/forms`** | Інтерактивні форми / Forms | `#view-forms` | ❌ *(Redirect `/portal`)* | ✅ Fill / Print | ✅ Fill / Print | ✅ + Builder |
| **`/settings`** | Налаштування / Settings | `#view-settings` | ❌ *(Redirect `/portal`)* | ❌ *(Redirect `/dashboard`)* | ❌ *(Redirect `/dashboard`)* | ✅ Full Admin |
| **`/portal`** | Мій кабінет / Personal Portal | `#view-personal-portal` | ✅ **Own profile only** | ✅ View any crew | ✅ View any crew | ✅ Full Admin |

---

## 3. Router System Architecture (`js/router.js`)

### 3.1 Routing Engine
* Handles internal link interception:
  - Links with attribute `data-route="/path"` or navigation buttons with `data-view="view-name"` are handled by `navigateTo(path)`.
  - Dispatches `history.pushState(state, '', path)`.
  - Listens to `window.addEventListener('popstate', onPopState)`.
* Updates active states:
  - Toggles `active` class on `.view-panel` elements.
  - Updates active highlight on sidebar `.nav-item`.
  - Sets browser tab title: `document.title = route.title`.
  - Triggers view initialization functions (`renderDashboard()`, `renderCrewTable()`, `renderBlanks()`, etc.).

### 3.2 Router Guard Implementation
```javascript
function canAccessRoute(userRole, path) {
  if (userRole === ROLES.CREW) {
    return path === '/portal';
  }
  if (userRole === ROLES.OFFICE || userRole === ROLES.INSTRUCTOR) {
    return path !== '/settings';
  }
  return true; // ADMIN
}

function resolveRoute(path) {
  const role = STATE.currentUser ? STATE.currentUser.role : ROLES.CREW;
  if (!canAccessRoute(role, path)) {
    return role === ROLES.CREW ? '/portal' : '/dashboard';
  }
  return path;
}
```

### 3.3 Server Fallback (`server.js`)
* In `server.js`, incoming GET requests that do not target static assets (no dot in the last URL segment, e.g. `/blanks`, `/training-flights`) return `index.html` with HTTP 200.
* The browser runs `js/router.js`, inspects `window.location.pathname`, verifies user role, and opens the requested view without page refresh.

---

## 4. UI Components & Layout Adjustments

### 4.1 Sidebar Navigation
Add a distinct entry for **Бланки** and **Форми**:
1. **Аналітика** (`/dashboard`, icon: `layout-dashboard`)
2. **Льотний екіпаж** (`/flight-crew`, icon: helicopter svg)
3. **Кабінний екіпаж** (`/cabin-crew`, icon: `users`)
4. **Тренувальні польоти** (`/training-flights`, icon: `clipboard-list`)
5. **Бланки** (`/blanks`, icon: `printer`) — *NEW*
6. **Форми** (`/forms`, icon: `file-edit`) — *NEW*
7. **Налаштування** (`/settings`, icon: `settings`) — *Admin only*
8. **Мій кабінет** (`/portal`, icon: `user`) — *For CREW role, only this navigation item is displayed*

### 4.2 Split: `/blanks` vs `/forms`
* **`#view-blanks`**:
  - Filter tabs: *Льотний екіпаж*, *Кабінний екіпаж*, *Загальні форми*.
  - Search input for fast blank discovery.
  - Catalog cards with action pills: `[ Переглянути ]`, `[ Завантажити PDF ]`, `[ Друк ]`.
  - Admin-only PDF upload modal (`#form-upload-pdf-blank`).
* **`#view-forms`**:
  - List of interactive report templates (e.g., flight check records, medical referrals, recurrent training reports).
  - Crew selection chip selector (auto-fetching rank, license, LPC/OPC dates from database).
  - Dynamic input controls for examiner notes, marks, and flight task references.
  - Live A4 document preview.
  - Form Builder tab for admins to design and customize new templates.

### 4.3 Training Flights Read-Only Mode for `OFFICE`
* In `renderTrainingFlightsForm()`:
  - If `userRole === ROLES.OFFICE`:
    - Switch active tab to `archive` (`switchTrainingFlightsTab('archive')`).
    - Hide the `Внесення польоту` tab header button (`#btn-flights-tab-entry`).
    - Hide `Імпорт сканів журналів (ШІ)` (`#btn-import-scans-ai`).
    - Hide `EDIT` and `DELETE` actions in flight log detail modals.

---

## 5. Verification & Testing Checklist

1. **URL History Navigation:**
   - Navigating between `/flight-crew` and `/training-flights` updates the URL without page reload.
   - Clicking browser "Back" and "Forward" toggles the corresponding views.
   - Refreshing (F5) on `/training-flights` re-opens `/training-flights`.
2. **Role Restrictions:**
   - Log in as `CREW` (e.g. `aleksa@ukr-helicopters.ua`):
     * URL defaults to `/portal`.
     * Sidebar shows only `Мій кабінет`.
     * Manually entering `/settings` or `/flight-crew` in the URL bar redirects to `/portal`.
   - Log in as `OFFICE` (`office@ukr-helicopters.ua`):
     * Can navigate to `/training-flights`.
     * Entry tab and AI import button are hidden.
     * Attempting `/settings` redirects to `/dashboard`.
   - Log in as `INSTRUCTOR` (`instructor@ukr-helicopters.ua`):
     * Full access to flight entry, editing, and AI scan imports.
     * Attempting `/settings` redirects to `/dashboard`.
   - Log in as `ADMIN` (`admin@ukr-helicopters.ua`):
     * Full access to all routes including `/settings`.
3. **Blanks & Forms Separation:**
   - Clicking `/blanks` displays clean printable PDF templates.
   - Clicking `/forms` displays the interactive generator and form builder.
4. **Draft Preservation:**
   - Entering values into a form and clicking a different menu item does not erase entered values when returning.
