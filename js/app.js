import { CREW_COMPLIANCE_RULES, isExpiring } from '../execution/compliance_rules.js';
import { parseCrewXlsx } from '../execution/excel_parser.js';
import { mergeCrewData } from '../execution/data_merger.js';
import { calculateExpiryDate, determineStatus } from '../execution/compliance_calculator.js';
import { downloadBackupJson, downloadBackupXlsx, simulateDriveSync, simulateDrivePhotoUpload, simulateDriveDocumentUpload } from '../execution/drive_sync.js';
import { dispatchFlightLogEmail } from '../execution/email_dispatcher.js';

// ================= BILINGUAL TRANSLATION DICTIONARY =================
const TRANSLATIONS = {
  uk: {
    login_title: "Вхід в систему",
    login_subtitle: "Введіть ваші авіаційні облікові дані",
    label_email: "Електронна пошта",
    label_password: "Пароль",
    btn_signin: "Увійти",
    pw_setup_title: "Встановити пароль",
    pw_setup_desc: "Вітаємо! Ви вперше входите у свій кабінет. Будь ласка, встановіть пароль для наступного доступу.",
    label_new_password: "Новий пароль",
    label_confirm_password: "Підтвердження паролю",
    btn_save_password: "Зберегти пароль",
    
    // Nav sidebar
    nav_dashboard: "Статистика",
    nav_flight_crew: "Льотний склад",
    nav_cabin_crew: "Кабінний склад",
    nav_training_flights: "Тренувальні польоти",
    nav_forms: "Бланки",
    nav_settings: "Налаштування",
    nav_portal: "Мій кабінет",
    sys_date_label: "Розрахункова дата:",
    
    // Header
    sync_offline: "Офлайн режим",
    sync_updating: "Синхронізація...",
    sync_success: "Синхронізовано з Drive",
    
    // View Titles
    title_dashboard: "Статистика",
    title_flight_crew: "Льотний склад",
    title_cabin_crew: "Кабінний склад",
    title_training_flights: "Тренувальні польоти",
    title_forms: "Бланки",
    title_settings: "Налаштування",
    title_portal: "Особистий кабінет",
    
    // KPI Cards
    kpi_compliance: "Рівень відповідності",
    kpi_total_crew: "Всього екіпажу",
    kpi_expired: "Прострочено сертифікатів",
    kpi_warning: "Закінчуються скоро",
    
    // Dashboard panels
    dash_dept_stats: "Статистика по відділах",
    dash_attention: "Потребують уваги",
    dash_last_flight: "Тренувальні польоти",
    dash_no_flights: "Записи відсутні",
    dash_audit: "Останні системні зміни",
    
    // Tables
    th_name: "Ім'я",
    th_crew_type: "Екіпаж",
    th_rank: "Посада",
    th_expired_count: "Прострочено",
    search_flight_placeholder: "Пошук пілота...",
    search_cabin_placeholder: "Пошук БП...",
    btn_import_excel: "Імпорт Excel",
    btn_add_member: "Додати члена екіпажу",
    filter_all_ranks: "Всі посади",
    filter_all_depts: "Всі відділи",
    
    // Flights Form
    logged_flights_title: "Перелік польотів",
    flights_title: "Запис тренувального польоту",
    label_crew_member: "Член екіпажу",
    label_flight_date: "Дата польоту",
    label_ac_type: "Тип ПС",
    label_flight_duration: "Тривалість польоту (години)",
    label_flight_exercise: "Вправа / Деталі тренування",
    btn_log_flight: "Зберегти та надіслати запис",
    
    // Settings
    set_sync_backup: "Синхронізація та Бекап",
    label_reference_date: "Розрахункова дата системи",
    btn_manual_sync_drive: "Синхронізувати з Drive",
    set_columns: "Відображення стовпчиків",
    set_permissions: "Матриця прав доступу",
    set_crew_mgmt: "Керування персоналом",
    label_delete_crew: "Видалити члена екіпажу",
    btn_delete_crew_member: "Видалити співробітника",
    
    // Portal
    portal_profile_title: "Особистий профіль",
    portal_expiries_title: "Терміни дії підготовок",
    portal_scans_title: "Завантажені скан-копії документів",
    portal_additional_title: "Додаткові підготовки",
    
    // Form prompts
    prompt_date_title: "Виберіть тип дати",
    prompt_expiry_date: "Дата закінчення дії (Expiration Date)",
    prompt_completion_date: "Дата проходження курсу (Completion Date)",
    btn_confirm: "Підтвердити",
    btn_cancel: "Скасувати",
    btn_save: "Зберегти зміни",
    btn_no: "Ні",
    btn_yes: "Так, видалити",
    confirm_title: "Підтвердження дії"
  },
  en: {
    login_title: "Sign In",
    login_subtitle: "Enter your aviation credentials",
    label_email: "Email Address",
    label_password: "Password",
    btn_signin: "Sign In",
    pw_setup_title: "Set Password",
    pw_setup_desc: "Welcome! This is your first login. Please choose a password for future access.",
    label_new_password: "New Password",
    label_confirm_password: "Confirm Password",
    btn_save_password: "Save Password",
    
    // Nav sidebar
    nav_dashboard: "Dashboard",
    nav_flight_crew: "Flight Crew",
    nav_cabin_crew: "Cabin Crew",
    nav_training_flights: "Training Flights",
    nav_forms: "Blank Forms",
    nav_settings: "Settings",
    nav_portal: "Personal Portal",
    sys_date_label: "Reference Date:",
    
    // Header
    sync_offline: "Offline Mode",
    sync_updating: "Syncing...",
    sync_success: "Synced with Drive",
    
    // View Titles
    title_dashboard: "Dashboard",
    title_flight_crew: "Flight CREW",
    title_cabin_crew: "Cabin CREW",
    title_training_flights: "Training Flights Log",
    title_forms: "Printable Forms",
    title_settings: "System Settings",
    title_portal: "Personal Portal",
    
    // KPI Cards
    kpi_compliance: "Compliance Rate",
    kpi_total_crew: "Total Crew",
    kpi_expired: "Expired Documents",
    kpi_warning: "Expiring Soon",
    
    // Dashboard panels
    dash_dept_stats: "Department Stats",
    dash_attention: "Attention Needed",
    dash_last_flight: "Training Flights",
    dash_no_flights: "No flights recorded",
    dash_audit: "Recent System Changes",
    
    // Tables
    th_name: "Name",
    th_crew_type: "Crew",
    th_rank: "Rank",
    th_expired_count: "Expired",
    search_flight_placeholder: "Search pilot...",
    search_cabin_placeholder: "Search cabin crew...",
    btn_import_excel: "Import Excel",
    btn_add_member: "Add Crew Member",
    filter_all_ranks: "All Ranks",
    filter_all_depts: "All Departments",
    
    // Flights Form
    logged_flights_title: "Logged Flights",
    flights_title: "Training Flight Log",
    label_crew_member: "Crew Member",
    label_flight_date: "Flight Date",
    label_ac_type: "A/C Type",
    label_flight_duration: "Flight Duration (hours)",
    label_flight_exercise: "Exercise / Training Details",
    btn_log_flight: "Save & Dispatch Record",
    
    // Settings
    set_sync_backup: "Sync & Backups",
    label_reference_date: "System Reference Date",
    btn_manual_sync_drive: "Sync with Drive",
    set_columns: "Column Visibility",
    set_permissions: "Permissions Matrix",
    set_crew_mgmt: "Crew Management",
    label_delete_crew: "Remove Crew Member",
    btn_delete_crew_member: "Delete Employee",
    
    // Portal
    portal_profile_title: "Personal Profile",
    portal_expiries_title: "Training Expirations",
    portal_scans_title: "Attached Document Scans",
    portal_additional_title: "Additional Trainings",
    
    // Form prompts
    prompt_date_title: "Select Date Type",
    prompt_expiry_date: "Expiration Date (Direct Input)",
    prompt_completion_date: "Completion Date (Auto-Calculate)",
    btn_confirm: "Confirm",
    btn_cancel: "Cancel",
    btn_save: "Save Changes",
    btn_no: "No",
    btn_yes: "Yes, delete",
    confirm_title: "Confirm Action"
  }
};

// ================= DEFAULT APP STATE =================
const STATE = {
  currentView: 'dashboard',
  lang: 'uk',
  theme: 'light',
  currentUser: null,
  flightCrew: [],
  cabinCrew: [],
  changelog: [],
  flights: [],
  selectedCrewMemberId: null,
  previousCrewView: null,
  isEditingPortalProfile: false,
  editingFlightId: null,
  sort: {
    column: null,
    direction: 'asc',
    crewType: null
  },
  settings: {
    datePrompt: true,
    autoSync: false,
    referenceDate: '2026-07-12',
    visibleColumnsFlight: [
      'Rank', 'Department', 'Name_Shrt_UA', 'OPC', 'OPC_NVG', 'LPC', 'Type', 'EMER_1', 'EMER_3', 'DG', 'AV_SEC', 'CRM', 'MED', 'LICENSE',
      'GI 275_T', 'GI 275_PRCT', 'BIRD STRIKE', 'MSB', 'PALL', 'HESLO_T', 'HESLO_PRCT', 'HHO_T', 'HHO_PRCT'
    ],
    visibleColumnsCabin: [
      'Rank', 'Department', 'Name_Shrt_UA', 'OPC', 'LPC', 'CC_Type', 'EMER_1', 'EMER_3', 'DG', 'AV_SEC', 'CRM', 'MED',
      'Resc', 'Rappel', 'Hoist', 'EOIR', 'NAIROBI'
    ]
  }
};

// Available Roles and Permissions
const ROLES = {
  ADMIN: 'ADMIN',
  INSTRUCTOR: 'INSTRUCTOR',
  OFFICE: 'OFFICE',
  CREW: 'CREW'
};

// Active date prompt waiting promise handler
let activeDatePromptResolver = null;

// ================= APPLICATION CORE LOGIC =================

/**
 * Updates UI text based on selected language
 */
function updateTranslations() {
  const dict = TRANSLATIONS[STATE.lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.setAttribute('placeholder', dict[key]);
    }
  });
  
  // Toggle button text
  document.getElementById('lang-toggle').textContent = STATE.lang === 'uk' ? 'EN' : 'UA';
}

/**
 * Saves current STATE variables to localStorage
 */
function saveStateToStorage() {
  localStorage.setItem('aerocheck_flight_crew', JSON.stringify(STATE.flightCrew));
  localStorage.setItem('aerocheck_cabin_crew', JSON.stringify(STATE.cabinCrew));
  localStorage.setItem('aerocheck_changelog', JSON.stringify(STATE.changelog));
  localStorage.setItem('aerocheck_settings', JSON.stringify(STATE.settings));
  localStorage.setItem('aerocheck_flights', JSON.stringify(STATE.flights));
}

/**
 * Renders a Toast Notification alert
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `status-badge status-${type === 'error' ? 'expired' : (type === 'warning' ? 'warning' : 'valid')}`;
  toast.style.cssText = 'padding: 12px 18px; box-shadow: var(--shadow-lg); pointer-events: auto; font-size: 13px; animation: slideIn 200ms ease-out;';
  
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="font-weight:600;">${message}</span>
    </div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 200ms ease-out forwards';
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

/**
 * Coordinates routing and displays the requested section
 */
function switchView(viewName) {
  if (viewName !== 'personal-portal') {
    STATE.selectedCrewMemberId = null;
  }
  
  // Validate Role permissions
  if (STATE.currentUser) {
    const role = STATE.currentUser.role;
    if (role === ROLES.CREW && viewName !== 'personal-portal') {
      viewName = 'personal-portal';
    } else if (role === ROLES.OFFICE && ['settings', 'training-flights'].includes(viewName)) {
      viewName = 'dashboard';
    } else if (role === ROLES.INSTRUCTOR && viewName === 'settings') {
      viewName = 'dashboard';
    }
  }

  STATE.currentView = viewName;
  
  // Update nav sidebar selected states
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
  });
  
  // Toggle view panels
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `view-${viewName}`);
  });
  
  // Update view header title
  const dict = TRANSLATIONS[STATE.lang];
  if (viewName === 'personal-portal') {
    const allCrew = [...STATE.flightCrew, ...STATE.cabinCrew];
    let member = null;
    if (STATE.selectedCrewMemberId) {
      member = allCrew.find(c => c.id === STATE.selectedCrewMemberId);
    }
    if (!member) {
      const email = STATE.currentUser ? STATE.currentUser.email : '';
      member = allCrew.find(c => c.Email && c.Email.trim().toLowerCase() === email.trim().toLowerCase()) || allCrew[0];
    }
    if (member) {
      const titleText = STATE.lang === 'uk' ? (member.Name_Shrt_UA || member.Full_Name_UA) : member.Full_Name_EN;
      document.getElementById('view-title').textContent = titleText;
    } else {
      document.getElementById('view-title').textContent = dict[`title_${viewName.replace('-', '_')}`] || viewName;
    }
  } else {
    document.getElementById('view-title').textContent = dict[`title_${viewName.replace('-', '_')}`] || viewName;
  }
  
  // Re-render requested view details
  if (viewName === 'dashboard') {
    renderDashboard();
  } else if (viewName === 'flight-crew') {
    populateTableFilters('Flight');
    renderCrewTable('Flight');
  } else if (viewName === 'cabin-crew') {
    populateTableFilters('Cabin');
    renderCrewTable('Cabin');
  } else if (viewName === 'settings') {
    renderSettings();
  } else if (viewName === 'personal-portal') {
    renderPersonalPortal();
  } else if (viewName === 'training-flights') {
    renderTrainingFlightsForm();
  }
  
  // Re-initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Calculates Dashboard overall compliance levels and renders charts
 */
function renderDashboard() {
  const expiringPreparations = CREW_COMPLIANCE_RULES.EXPIRING_PREPARATIONS;
  const sysDate = STATE.settings.referenceDate;
  
  let totalChecks = 0;
  let validChecks = 0;
  let expiredChecks = 0;
  let warningChecks = 0;
  
  const allCrew = [...STATE.flightCrew, ...STATE.cabinCrew];
  const activeCrew = allCrew.filter(c => c.active !== 'NO');
  
  // Calculate aggregate stats across all expiring elements
  activeCrew.forEach(member => {
    const crewConfig = CREW_COMPLIANCE_RULES.CREW_TYPES[member.crewType];
    expiringPreparations.forEach(prepKey => {
      // Find matching column name
      const colName = Object.keys(crewConfig.columnMapping).find(k => crewConfig.columnMapping[k] === prepKey) || prepKey;
      if (member[colName] !== undefined) {
        totalChecks++;
        const status = determineStatus(member[colName], sysDate, prepKey);
        
        if (status === 'VALID') {
          validChecks++;
        } else if (status === 'EXPIRED') {
          expiredChecks++;
        } else if (status === 'WARNING_ORANGE' || status === 'WARNING_YELLOW') {
          warningChecks++;
          validChecks++; // Warning is still technically active/valid
        }
      }
    });
  });
  
  const complianceRate = totalChecks > 0 ? Math.round((validChecks / totalChecks) * 100) : 100;
  
  // Render KPI values
  document.getElementById('kpi-compliance-val').textContent = `${complianceRate}%`;
  document.getElementById('kpi-total-val').textContent = activeCrew.length;
  document.getElementById('kpi-expired-val').textContent = expiredChecks;
  document.getElementById('kpi-warning-val').textContent = warningChecks;
  
  // Draw Radial Compliance progress circle
  const dashOffset = 282.6 - (282.6 * complianceRate) / 100;
  const fillRing = document.getElementById('compliance-ring-fill');
  if (fillRing) {
    fillRing.style.strokeDashoffset = dashOffset;
    document.getElementById('compliance-ring-percent').textContent = `${complianceRate}%`;
  }
  
  // Calculate and draw Department compliance progress bars
  const depts = {};
  activeCrew.forEach(member => {
    const dept = member.Department || 'N/A';
    if (!depts[dept]) depts[dept] = { total: 0, valid: 0 };
    
    const crewConfig = CREW_COMPLIANCE_RULES.CREW_TYPES[member.crewType];
    expiringPreparations.forEach(prepKey => {
      const colName = Object.keys(crewConfig.columnMapping).find(k => crewConfig.columnMapping[k] === prepKey) || prepKey;
      if (member[colName] !== undefined) {
        depts[dept].total++;
        const status = determineStatus(member[colName], sysDate, prepKey);
        if (status === 'VALID' || status === 'WARNING_ORANGE' || status === 'WARNING_YELLOW') {
          depts[dept].valid++;
        }
      }
    });
  });
  
  const deptContainer = document.getElementById('dept-progress-container');
  deptContainer.innerHTML = '';
  Object.keys(depts).sort().forEach(dept => {
    const stats = depts[dept];
    const rate = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 100;
    
    const progressHtml = `
      <div class="progress-bar-container">
        <div class="progress-label-row">
          <span>${dept}</span>
          <span style="font-weight:700;">${rate}%</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${rate}%;"></div>
        </div>
      </div>
    `;
    deptContainer.insertAdjacentHTML('beforeend', progressHtml);
  });
  
  // Render Attention Needed table
  const attentionList = [];
  activeCrew.forEach(member => {
    let memberExpiredCount = 0;
    const crewConfig = CREW_COMPLIANCE_RULES.CREW_TYPES[member.crewType];
    
    expiringPreparations.forEach(prepKey => {
      const colName = Object.keys(crewConfig.columnMapping).find(k => crewConfig.columnMapping[k] === prepKey) || prepKey;
      if (member[colName] !== undefined) {
        const status = determineStatus(member[colName], sysDate, prepKey);
        if (status === 'EXPIRED') {
          memberExpiredCount++;
        }
      }
    });
    
    if (memberExpiredCount > 0) {
      attentionList.push({
        id: member.id,
        name: STATE.lang === 'uk' ? (member.Name_Shrt_UA || member.Full_Name_UA) : member.Full_Name_EN,
        crewType: member.crewType,
        rank: member.Rank,
        expiredCount: memberExpiredCount
      });
    }
  });
  
  // Sort attention list by highest count of expired items
  attentionList.sort((a, b) => b.expiredCount - a.expiredCount);
  
  const attentionTbody = document.querySelector('#dashboard-attention-table tbody');
  attentionTbody.innerHTML = '';
  if (attentionList.length === 0) {
    attentionTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; font-style:italic; color:var(--text-secondary);">Усі допуски дійсні / All clear</td></tr>`;
  } else {
    attentionList.slice(0, 5).forEach(item => {
      const tr = document.createElement('tr');
      
      const nameTd = document.createElement('td');
      nameTd.className = 'clickable-name';
      nameTd.style.fontWeight = 'bold';
      nameTd.textContent = item.name;
      nameTd.title = STATE.lang === 'uk' ? 'Переглянути особистий кабінет' : 'View personal portal';
      nameTd.addEventListener('click', () => {
        STATE.selectedCrewMemberId = item.id;
        STATE.previousCrewView = 'dashboard';
        switchView('personal-portal');
      });
      tr.appendChild(nameTd);
      
      const typeTd = document.createElement('td');
      typeTd.innerHTML = `<span class="status-badge status-neutral">${item.crewType}</span>`;
      tr.appendChild(typeTd);
      
      const rankTd = document.createElement('td');
      rankTd.textContent = item.rank;
      tr.appendChild(rankTd);
      
      const countTd = document.createElement('td');
      countTd.innerHTML = `<span class="status-badge status-expired">${item.expiredCount}</span>`;
      tr.appendChild(countTd);
      
      attentionTbody.appendChild(tr);
    });
  }
  
  // Render Last flight logged details widget
  const flightsChangelog = STATE.changelog.filter(log => log.type === 'FLIGHT_LOG');
  const lastFlightWidget = document.getElementById('last-flight-widget');
  if (flightsChangelog.length > 0) {
    const flight = flightsChangelog[flightsChangelog.length - 1].details[0].newValue;
    const labelDate = STATE.lang === 'uk' ? 'Дата' : 'Date';
    const labelUnit = STATE.lang === 'uk' ? 'год.' : 'hrs';
    
    if (flight.helicopterReg || Array.isArray(flight.crew)) {
      // New format
      const labelReg = STATE.lang === 'uk' ? 'Борт' : 'Helicopter Reg';
      const labelDuty = STATE.lang === 'uk' ? 'Чергування' : 'Duty Time';
      const labelCrew = STATE.lang === 'uk' ? 'Екіпаж' : 'Crew';
      
      const crewNames = flight.crew.map(c => `${c.name} (${c.pstn})`).join(', ');
      
      let trainingBadgesHtml = '';
      flight.crew.forEach(c => {
        if (c.trainingTypes && c.trainingTypes.length > 0) {
          trainingBadgesHtml += `
            <div style="margin-top:4px; font-size:12px; display:flex; gap:4px; align-items:center;">
              <span class="status-badge status-neutral" style="font-size:10px; padding:1px 5px;">${c.trainingTypes.join(', ')}</span>
              <span style="color:var(--text-secondary);">${c.name}</span>
            </div>
          `;
        }
      });
      
      lastFlightWidget.innerHTML = `
        <div style="font-weight:700; font-size:14px; color:var(--accent); word-break:break-word;">${labelCrew}: ${crewNames}</div>
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-top:4px;">
          <span><strong>${labelDate}:</strong> ${flight.date}</span>
          <span><strong>${labelReg}:</strong> ${flight.helicopterReg}</span>
        </div>
        <div style="margin-top:4px;"><strong>${labelDuty}:</strong> ${flight.dutyTime} ${labelUnit}</div>
        ${trainingBadgesHtml}
      `;
    } else {
      // Support old format rendering as fallback
      const labelType = STATE.lang === 'uk' ? 'Тип ПС' : 'A/C Type';
      const labelDuration = STATE.lang === 'uk' ? 'Час' : 'Duration';
      
      lastFlightWidget.innerHTML = `
        <div style="font-weight:700; font-size:14px; color:var(--accent); word-break:break-word;">${flight.crewName}</div>
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-top:4px;">
          <span><strong>${labelDate}:</strong> ${flight.date}</span>
          <span><strong>${labelType}:</strong> ${flight.acType}</span>
        </div>
        <div style="margin-top:4px;"><strong>${labelDuration}:</strong> ${flight.duration} ${labelUnit}</div>
        <div style="margin-top:4px; font-style:italic; color:var(--text-secondary); border-left:2px solid var(--accent); padding-left:8px; word-break:break-word;">${flight.exercise}</div>
      `;
    }
  } else {
    const labelNoFlights = STATE.lang === 'uk' ? 'Записи відсутні' : 'No entries';
    lastFlightWidget.innerHTML = `<div style="font-style: italic; color: var(--text-secondary); text-align:center;">${labelNoFlights}</div>`;
  }
  
  // Render System Audit Change log feed
  const auditList = document.getElementById('dashboard-audit-list');
  auditList.innerHTML = '';
  if (STATE.changelog.length === 0) {
    auditList.innerHTML = `<div style="font-style: italic; color: var(--text-secondary); text-align:center;">${STATE.lang === 'uk' ? 'Історія порожня' : 'History is empty'}</div>`;
  } else {
    // Show last 5 logs reversed
    const logsToShow = [...STATE.changelog].reverse().slice(0, 5);
    logsToShow.forEach(log => {
      let actionText = '';
      if (log.type === 'FLIGHT_LOG') {
        const flight = log.details[0].newValue;
        actionText = STATE.lang === 'uk' 
          ? `Записано тренувальний політ для ${flight.crewName} (${flight.duration} год.)`
          : `Recorded training flight for ${flight.crewName} (${flight.duration} hrs)`;
      } else if (log.type === 'CREW_ADD') {
        actionText = STATE.lang === 'uk'
          ? `Додано нового співробітника: ${log.crewMember}`
          : `Added new crew member: ${log.crewMember}`;
      } else if (log.type === 'CREW_DELETE') {
        actionText = STATE.lang === 'uk'
          ? `Видалено співробітника: ${log.crewMember}`
          : `Deleted crew member: ${log.crewMember}`;
      } else if (log.type === 'MERGE_IMPORT') {
        actionText = STATE.lang === 'uk'
          ? `Імпортовано оновлення Excel для ${log.crewMember} (${log.details.length} змін)`
          : `Imported Excel update for ${log.crewMember} (${log.details.length} changes)`;
      } else if (log.type === 'MANUAL_EDIT') {
        const fields = log.details.map(d=>d.field).join(', ');
        actionText = STATE.lang === 'uk'
          ? `Внесено ручні зміни для ${log.crewMember} (${fields})`
          : `Manual changes made for ${log.crewMember} (${fields})`;
      }
      
      const timeStr = new Date(log.timestamp).toLocaleTimeString();
      const dateStr = new Date(log.timestamp).toLocaleDateString();
      
      auditList.insertAdjacentHTML('beforeend', `
        <div class="audit-item">
          <div class="audit-meta">
            <span>${log.userEmail}</span>
            <span>${dateStr} ${timeStr}</span>
          </div>
          <div class="audit-content">${actionText}</div>
        </div>
      `);
    });
  }
}

/**
 * Populates dropdown filter lists for Rank and Department
 */
function populateTableFilters(crewType) {
  const list = crewType === 'Flight' ? STATE.flightCrew : STATE.cabinCrew;
  const rankSelect = document.getElementById(`${crewType.toLowerCase()}-filter-rank`);
  const deptSelect = document.getElementById(`${crewType.toLowerCase()}-filter-dept`);
  
  if (!rankSelect || !deptSelect) return;
  
  const selectedRank = rankSelect.value;
  const selectedDept = deptSelect.value;
  
  const ranks = [...new Set(list.map(member => member.Rank).filter(Boolean))];
  const rankOrder = ['КПС', '2П', 'ІБ'];
  ranks.sort((a, b) => {
    const idxA = rankOrder.indexOf(a);
    const idxB = rankOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, STATE.lang === 'uk' ? 'uk' : 'en');
  });

  const depts = [...new Set(list.map(member => member.Department).filter(Boolean))];
  const deptOrder = ['ПРВ', 'ТВ'];
  depts.sort((a, b) => {
    const idxA = deptOrder.indexOf(a);
    const idxB = deptOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, STATE.lang === 'uk' ? 'uk' : 'en');
  });
  
  const allRanksLabel = TRANSLATIONS[STATE.lang].filter_all_ranks || (STATE.lang === 'uk' ? "Всі посади" : "All Ranks");
  const allDeptsLabel = TRANSLATIONS[STATE.lang].filter_all_depts || (STATE.lang === 'uk' ? "Всі відділи" : "All Departments");
  
  rankSelect.innerHTML = `<option value="">${allRanksLabel}</option>`;
  ranks.forEach(r => {
    rankSelect.insertAdjacentHTML('beforeend', `<option value="${r}">${r}</option>`);
  });
  
  deptSelect.innerHTML = `<option value="">${allDeptsLabel}</option>`;
  depts.forEach(d => {
    deptSelect.insertAdjacentHTML('beforeend', `<option value="${d}">${d}</option>`);
  });
  
  if ([...rankSelect.options].some(o => o.value === selectedRank)) {
    rankSelect.value = selectedRank;
  }
  if ([...deptSelect.options].some(o => o.value === selectedDept)) {
    deptSelect.value = selectedDept;
  }
}

/**
 * Handles sorting when header is clicked
 */
function handleHeaderSort(crewType, col) {
  if (!STATE.sort) {
    STATE.sort = { column: null, direction: 'asc', crewType: null };
  }
  
  if (STATE.sort.crewType === crewType && STATE.sort.column === col) {
    if (STATE.sort.direction === 'asc') {
      STATE.sort.direction = 'desc';
    } else {
      STATE.sort.column = null;
      STATE.sort.direction = 'asc';
    }
  } else {
    STATE.sort.crewType = crewType;
    STATE.sort.column = col;
    STATE.sort.direction = 'asc';
  }
  
  renderCrewTable(crewType);
}

/**
 * Renders the table grid for flight or cabin crew lists
 */
function renderCrewTable(crewType) {
  const list = crewType === 'Flight' ? STATE.flightCrew : STATE.cabinCrew;
  const tableHeaders = document.getElementById(`${crewType.toLowerCase()}-table-headers`);
  const tableBody = document.querySelector(`#${crewType.toLowerCase()}-crew-table tbody`);
  const searchInput = document.getElementById(`${crewType.toLowerCase()}-search`);
  const searchQuery = searchInput.value.trim().toLowerCase();
  
  const visibleHeaders = crewType === 'Flight' ? STATE.settings.visibleColumnsFlight : STATE.settings.visibleColumnsCabin;
  const sysDate = STATE.settings.referenceDate;
  
  // Render Headers
  tableHeaders.innerHTML = '';
  visibleHeaders.forEach(col => {
    let headerLabel = col;
    if (col === 'Name_Shrt_UA') headerLabel = STATE.lang === 'uk' ? 'Ім\'я' : 'Short Name';
    else if (col === 'Full_Name_UA') headerLabel = STATE.lang === 'uk' ? 'Повне Ім\'я' : 'Full Name UA';
    else if (col === 'Full_Name_EN') headerLabel = STATE.lang === 'uk' ? 'Ім\'я (Англ.)' : 'Full Name EN';
    else if (col === 'Rank') headerLabel = STATE.lang === 'uk' ? 'Посада' : 'Rank';
    else if (col === 'Department') headerLabel = STATE.lang === 'uk' ? 'Відділ' : 'Dept';
    
    let sortIndicator = '';
    if (STATE.sort && STATE.sort.crewType === crewType && STATE.sort.column === col) {
      sortIndicator = STATE.sort.direction === 'asc' ? ' 🔼' : ' 🔽';
    }
    
    const th = document.createElement('th');
    th.style.cursor = 'pointer';
    th.style.userSelect = 'none';
    th.innerHTML = `${headerLabel}${sortIndicator}`;
    th.addEventListener('click', () => handleHeaderSort(crewType, col));
    tableHeaders.appendChild(th);
  });
  // Add edit column for editors
  const role = STATE.currentUser ? STATE.currentUser.role : 'OFFICE';
  const isEditor = role === ROLES.ADMIN || role === ROLES.INSTRUCTOR;
  if (isEditor) {
    tableHeaders.insertAdjacentHTML('beforeend', `<th style="text-align:center;">Дія</th>`);
  }
  
  // Render Rows
  tableBody.innerHTML = '';
  
  // Retrieve selected filters
  const rankFilter = document.getElementById(`${crewType.toLowerCase()}-filter-rank`)?.value || '';
  const deptFilter = document.getElementById(`${crewType.toLowerCase()}-filter-dept`)?.value || '';
  
  // Filter list by bilingual search query and dropdown filters
  let filtered = list.filter(member => {
    // 1. Search query match
    let matchSearch = true;
    if (searchQuery) {
      const nameUa = String(member.Full_Name_UA || '').toLowerCase();
      const nameShort = String(member.Name_Shrt_UA || '').toLowerCase();
      const nameEn = String(member.Full_Name_EN || '').toLowerCase();
      const rank = String(member.Rank || '').toLowerCase();
      const dept = String(member.Department || '').toLowerCase();
      
      matchSearch = nameUa.includes(searchQuery) || 
                    nameShort.includes(searchQuery) || 
                    nameEn.includes(searchQuery) || 
                    rank.includes(searchQuery) || 
                    dept.includes(searchQuery);
    }
    
    // 2. Rank dropdown match
    const matchRank = !rankFilter || member.Rank === rankFilter;
    
    // 3. Dept dropdown match
    const matchDept = !deptFilter || member.Department === deptFilter;
    
    return matchSearch && matchRank && matchDept;
  });
  
  // Sort list if sort state is active
  if (STATE.sort && STATE.sort.crewType === crewType && STATE.sort.column) {
    const sortCol = STATE.sort.column;
    const dir = STATE.sort.direction === 'asc' ? 1 : -1;
    
    filtered.sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];
      
      const isMissingA = (valA === undefined || valA === null || valA === '' || valA === '-');
      const isMissingB = (valB === undefined || valB === null || valB === '' || valB === '-');
      
      if (isMissingA && isMissingB) return 0;
      if (isMissingA) return 1;  // Put missing/empty values at the bottom
      if (isMissingB) return -1; // Put missing/empty values at the bottom
      
      const isDate = (val) => /^\d{4}-\d{2}-\d{2}$/.test(val);
      if (isDate(valA) && isDate(valB)) {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        return (timeA - timeB) * dir;
      }
      
      return String(valA).localeCompare(String(valB), STATE.lang === 'uk' ? 'uk' : 'en', { numeric: true }) * dir;
    });
  }
  
  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="${visibleHeaders.length + (isEditor?1:0)}" style="text-align:center; font-style:italic; color:var(--text-secondary);">Співробітників не знайдено</td></tr>`;
    return;
  }
  
  filtered.forEach(member => {
    const tr = document.createElement('tr');
    if (member.active === 'NO') {
      tr.style.opacity = '0.5'; // inactive crew
    }
    
    visibleHeaders.forEach(col => {
      const td = document.createElement('td');
      const val = member[col] || '';
      
      // Determine if this cell column is one of the expiring preparations
      const crewConfig = CREW_COMPLIANCE_RULES.CREW_TYPES[crewType];
      const ruleKey = crewConfig.columnMapping[col] || null;
      
      if (ruleKey && isExpiring(ruleKey)) {
        // Render only date with cell conditional formatting background
        const status = determineStatus(val, sysDate, ruleKey);
        const displayDate = val ? formatDateUa(val) : '-';
        
        td.className = `cell-status cell-${status.toLowerCase()}`;
        td.innerHTML = `<span style="font-size:13px; font-weight:600;">${displayDate}</span>`;
      } else if (col.endsWith('_T') || col.endsWith('_PRCT') || ['GI 275_T', 'GI 275_PRCT', 'BIRD STRIKE', 'MSB', 'PALL', 'HESLO_T', 'HESLO_PRCT', 'HHO_T', 'HHO_PRCT', 'Resc', 'Rappel', 'Hoist', 'EOIR', 'NAIROBI'].includes(col)) {
        // Render neutral gray badge for completion dates
        if (val) {
          td.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:2px; align-items:flex-start;">
              <span class="status-badge status-neutral" style="font-size:13px; padding: 4px 8px;">${formatDateUa(val)}</span>
            </div>
          `;
        } else {
          td.innerHTML = `<span class="status-badge status-missing">-</span>`;
        }
      } else {
        // Render standard text cell
        if (col === 'Name_Shrt_UA' || col === 'Full_Name_UA' || col === 'Full_Name_EN') {
          // Highlight primary name
          const displayName = STATE.lang === 'uk' ? (member.Name_Shrt_UA || member.Full_Name_UA) : member.Full_Name_EN;
          if (col === 'Name_Shrt_UA') {
            td.innerHTML = `<strong>${displayName}</strong>`;
          } else {
            td.textContent = val;
          }

          // Make name interactive for ADMIN and INSTRUCTOR to view individual portal
          if (isEditor) {
            td.style.cursor = 'pointer';
            td.style.color = 'var(--accent)';
            td.style.textDecoration = 'underline';
            td.title = STATE.lang === 'uk' ? 'Переглянути особистий кабінет' : 'View personal portal';
            td.addEventListener('click', () => {
              STATE.selectedCrewMemberId = member.id;
              STATE.previousCrewView = crewType === 'Flight' ? 'flight-crew' : 'cabin-crew';
              switchView('personal-portal');
            });
          }
        } else {
          td.textContent = val;
        }
      }
      tr.appendChild(td);
    });
    
    // Add action button cell for editors
    if (isEditor) {
      const actionTd = document.createElement('td');
      actionTd.style.textAlign = 'center';
      actionTd.innerHTML = `
        <button class="btn btn-secondary" style="height:30px; width:30px; padding:0;" title="Редагувати">
          <i data-lucide="edit-2" style="width:14px; height:14px;"></i>
        </button>
      `;
      actionTd.querySelector('button').addEventListener('click', () => openCrewEditModal(member));
      tr.appendChild(actionTd);
    }
    
    tableBody.appendChild(tr);
  });
}

/**
 * Converts ISO YYYY-MM-DD to Ukrainian string format
 */
function formatDateUa(dateStr) {
  if (!dateStr || dateStr === '-') return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const UA_MONTHS = ['січ', 'лют', 'бер', 'квіт', 'трав', 'черв', 'лип', 'серп', 'вер', 'жовт', 'лист', 'груд'];
  const d = date.getDate();
  const m = UA_MONTHS[date.getMonth()];
  const y = String(date.getFullYear()).substring(2);
  return `${d} ${m}. ${y}`;
}

/**
 * Populates and opens the edit modal frame
 */
function openCrewEditModal(member) {
  const isNew = !member;
  const role = STATE.currentUser ? STATE.currentUser.role : 'OFFICE';
  const isInstructor = role === ROLES.INSTRUCTOR;
  
  document.getElementById('crew-modal-title').textContent = isNew 
    ? (STATE.lang === 'uk' ? 'Додати нового співробітника' : 'Add New Crew Member')
    : (STATE.lang === 'uk' ? 'Редагувати профіль екіпажу' : 'Edit Crew Profile');
    
  // Set metadata fields
  document.getElementById('crew-modal-id').value = isNew ? '' : member.id;
  document.getElementById('crew-modal-type').value = isNew ? STATE.currentView.split('-')[0] === 'flight' ? 'Flight' : 'Cabin' : member.crewType;
  
  const nameUaInput = document.getElementById('crew-modal-name-ua');
  const nameEnInput = document.getElementById('crew-modal-name-en');
  const rankInput = document.getElementById('crew-modal-rank');
  const deptInput = document.getElementById('crew-modal-dept');
  const phoneInput = document.getElementById('crew-modal-phone');
  const emailInput = document.getElementById('crew-modal-email');
  const licenseInput = document.getElementById('crew-modal-license');
  
  nameUaInput.value = isNew ? '' : (member.Full_Name_UA || '');
  nameEnInput.value = isNew ? '' : (member.Full_Name_EN || '');
  rankInput.value = isNew ? '' : (member.Rank || '');
  deptInput.value = isNew ? '' : (member.Department || '');
  phoneInput.value = isNew ? '' : (member.Phone || '');
  emailInput.value = isNew ? '' : (member.Email || '');
  licenseInput.value = isNew ? '' : (member.LICENSE || '');
  
  // Instructor cannot edit metadata
  const disableMeta = isInstructor && !isNew;
  nameUaInput.disabled = disableMeta;
  nameEnInput.disabled = disableMeta;
  rankInput.disabled = disableMeta;
  deptInput.disabled = disableMeta;
  phoneInput.disabled = disableMeta;
  emailInput.disabled = disableMeta;
  licenseInput.disabled = disableMeta;
  
  // Hide license field for Cabin Crew
  const crewType = isNew ? (STATE.currentView.split('-')[0] === 'flight' ? 'Flight' : 'Cabin') : member.crewType;
  document.getElementById('crew-modal-license-group').style.display = crewType === 'Flight' ? 'flex' : 'none';
  
  // Load dynamic training date input elements
  const datesFields = document.getElementById('crew-modal-dates-fields');
  datesFields.innerHTML = '';
  
  const crewConfig = CREW_COMPLIANCE_RULES.CREW_TYPES[crewType];
  const additionalCols = crewType === 'Flight' 
    ? ['GI 275_T', 'GI 275_PRCT', 'BIRD STRIKE', 'MSB', 'PALL', 'HESLO_T', 'HESLO_PRCT', 'HHO_T', 'HHO_PRCT']
    : ['Resc', 'Rappel', 'Hoist', 'EOIR', 'NAIROBI'];
  
  const allDateFields = [...Object.keys(crewConfig.columnMapping), ...additionalCols];
  const renderedFields = new Set();
  
  allDateFields.forEach(colName => {
    // Skip name headers
    if (['Rank', 'Department', 'Name_Shrt_UA', 'Full_Name_UA', 'Full_Name_EN'].includes(colName)) return;
    
    // Normalize Cabin crew CC_Type
    let ruleKey = crewConfig.columnMapping[colName] || colName;
    let actualColName = colName;
    if (crewType === 'Cabin' && colName === 'Type') {
      actualColName = 'CC_Type';
    }
    
    if (renderedFields.has(actualColName)) return;
    renderedFields.add(actualColName);
    
    const val = isNew ? '' : (member[actualColName] || '');
    const isColExpiring = isExpiring(ruleKey);
    
    const fieldHtml = `
      <div class="form-group">
        <label for="input-date-${actualColName}">${actualColName} ${isColExpiring ? '(Expiry)' : ''}</label>
        <input type="date" id="input-date-${actualColName}" class="form-input crew-date-input" data-col="${actualColName}" data-rule="${ruleKey}" value="${val}">
      </div>
    `;
    datesFields.insertAdjacentHTML('beforeend', fieldHtml);
    
    // Add date change override listener
    const dateInput = document.getElementById(`input-date-${actualColName}`);
    if (isColExpiring) {
      dateInput.addEventListener('change', async (e) => {
        const newVal = e.target.value;
        const oldVal = isNew ? '' : (member[actualColName] || '');
        
        // Only trigger prompt if value is filled and changed, and prompting is enabled
        if (newVal && newVal !== oldVal && STATE.settings.datePrompt) {
          const typeSelected = await promptForDateType(actualColName);
          if (typeSelected === 'COMPLETION') {
            // Recalculate expiry date from completion date
            const calculatedExpiry = calculateExpiryDate(newVal, ruleKey, crewType);
            e.target.value = calculatedExpiry || newVal;
            showToast(`${actualColName}: Дата закінчення автоматично розрахована до ${formatDateUa(e.target.value)}`);
          }
        }
      });
    }
  });
  
  // Open dialog
  document.getElementById('crew-modal-backdrop').classList.add('active');
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Opens modal date type selector prompt
 */
function promptForDateType(fieldName) {
  return new Promise((resolve) => {
    document.getElementById('date-prompt-fieldname').textContent = fieldName;
    document.getElementById('date-prompt-backdrop').classList.add('active');
    
    activeDatePromptResolver = resolve;
  });
}

/**
 * Handles Form submissions inside the Crew Edit Dialog
 */
function handleCrewModalSubmit(e) {
  e.preventDefault();
  
  const id = document.getElementById('crew-modal-id').value;
  const crewType = document.getElementById('crew-modal-type').value;
  const list = crewType === 'Flight' ? STATE.flightCrew : STATE.cabinCrew;
  
  const isNew = !id;
  let member = isNew ? { id: `crew_${crewType}_${Date.now()}`, crewType } : list.find(c => c.id === id);
  
  if (!member) {
    showToast("Помилка оновлення запису", "error");
    return;
  }
  
  const userRole = STATE.currentUser ? STATE.currentUser.role : 'OFFICE';
  const isInstructor = userRole === ROLES.INSTRUCTOR;
  
  const details = [];
  
  // If not instructor, save metadata
  if (!isInstructor || isNew) {
    const oldNameUa = member.Full_Name_UA || '';
    const newNameUa = document.getElementById('crew-modal-name-ua').value.trim();
    member.Full_Name_UA = newNameUa;
    member.Name_Shrt_UA = newNameUa.split(' ')[0] + ' ' + (newNameUa.split(' ')[1] ? newNameUa.split(' ')[1][0] + '.' : '') + (newNameUa.split(' ')[2] ? newNameUa.split(' ')[2][0] + '.' : '');
    member.Full_Name_EN = document.getElementById('crew-modal-name-en').value.trim();
    member.Rank = document.getElementById('crew-modal-rank').value.trim();
    member.Department = document.getElementById('crew-modal-dept').value.trim();
    member.Phone = document.getElementById('crew-modal-phone').value.trim();
    member.Email = document.getElementById('crew-modal-email').value.trim();
    if (crewType === 'Flight') {
      member.LICENSE = document.getElementById('crew-modal-license').value.trim();
    }
  }
  
  // Save dynamic dates
  const dateInputs = document.querySelectorAll('.crew-date-input');
  dateInputs.forEach(input => {
    const colName = input.getAttribute('data-col');
    const oldVal = member[colName] || '';
    const newVal = input.value;
    
    if (oldVal !== newVal) {
      member[colName] = newVal;
      details.push({
        field: colName,
        oldValue: oldVal || 'empty',
        newValue: newVal || 'empty'
      });
    }
  });
  
  if (isNew) {
    list.push(member);
    STATE.changelog.push({
      timestamp: new Date().toISOString(),
      userEmail: STATE.currentUser ? STATE.currentUser.email : 'system@aerocheck.com',
      crewMember: member.Full_Name_EN || member.Full_Name_UA,
      crewType: member.crewType,
      type: 'CREW_ADD',
      details: [{ field: 'all', oldValue: 'n/a', newValue: 'Created new profile record' }]
    });
    showToast("Співробітника успішно додано");
  } else if (details.length > 0) {
    STATE.changelog.push({
      timestamp: new Date().toISOString(),
      userEmail: STATE.currentUser ? STATE.currentUser.email : 'system@aerocheck.com',
      crewMember: member.Full_Name_EN || member.Full_Name_UA,
      crewType: member.crewType,
      type: 'MANUAL_EDIT',
      details
    });
    showToast("Профіль успішно оновлено");
  }
  
  saveStateToStorage();
  document.getElementById('crew-modal-backdrop').classList.remove('active');
  switchView(STATE.currentView);
}

/**
 * Handles training flights submissions
 */
/**
 * Calculates time difference between HH:MM format strings, supporting midnight crossings
 */
function calculateTimeDiff(startVal, endVal) {
  if (!startVal || !endVal) return '';
  const [startH, startM] = startVal.split(':').map(Number);
  const [endH, endM] = endVal.split(':').map(Number);
  
  let diffMins = (endH * 60 + endM) - (startH * 60 + startM);
  if (diffMins < 0) {
    diffMins += 24 * 60; // handle cross-midnight crossing
  }
  
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Updates Pre-flight, Post-flight, and Duty Time calculations
 */
function updateTimeCalculations() {
  const preBgn = document.getElementById('flight-pre-bgn').value;
  const preEnd = document.getElementById('flight-pre-end').value;
  const postBgn = document.getElementById('flight-post-bgn').value;
  const postEnd = document.getElementById('flight-post-end').value;
  
  const preTtl = calculateTimeDiff(preBgn, preEnd);
  const postTtl = calculateTimeDiff(postBgn, postEnd);
  const dutyTime = calculateTimeDiff(preBgn, postEnd);
  
  document.getElementById('flight-pre-ttl').value = preTtl;
  document.getElementById('flight-post-ttl').value = postTtl;
  document.getElementById('flight-duty-time').value = dutyTime;
}

/**
 * Synchronizes the top flight task ID to all crew members
 */
function syncMainTaskToCrew() {
  const mainTaskVal = document.getElementById('flight-task-main').value.trim();
  document.querySelectorAll('.crew-task-input').forEach(input => {
    input.value = mainTaskVal;
  });
}

/**
 * Disables or enables individual task inputs based on the checkbox state
 */
function toggleIndividualTasks() {
  const isSame = document.getElementById('flight-same-task').checked;
  const mainTaskVal = document.getElementById('flight-task-main').value.trim();
  
  document.querySelectorAll('.crew-task-input').forEach(input => {
    input.disabled = isSame;
    if (isSame) {
      input.value = mainTaskVal;
    }
  });
}

/**
 * Re-numbers crew card indicators and updates removal visibility
 */
function updateCrewCardsUI() {
  const cards = document.querySelectorAll('.crew-member-card');
  cards.forEach((card, idx) => {
    card.querySelector('.crew-number').textContent = idx + 1;
    const removeBtn = card.querySelector('.btn-remove-crew');
    if (cards.length > 1) {
      removeBtn.style.display = 'block';
    } else {
      removeBtn.style.display = 'none';
    }
  });
}

/**
 * Removes a crew card block from container
 */
function removeCrewMemberCard(cardNode) {
  cardNode.remove();
  updateCrewCardsUI();
}

/**
 * Dynamically updates the training types checkboxes grid based on crewType
 */
function updateTrainingTypesLayout(cardNode, crewType) {
  const grid = cardNode.querySelector('.training-types-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  if (crewType === 'Cabin') {
    const types = [
      { value: 'LPC', label: 'LPC' },
      { value: 'Resc', label: 'Line Check' },
      { value: 'Rappel', label: 'Rappel' },
      { value: 'Hoist', label: 'Hoist' },
      { value: 'EOIR', label: 'EOIR' }
    ];
    types.forEach(t => {
      grid.insertAdjacentHTML('beforeend', `
        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; color: var(--text-primary);">
          <input type="checkbox" value="${t.value}" class="crew-training-type"> <span>${t.label}</span>
        </label>
      `);
    });
  } else {
    const types = [
      { value: 'GI_275_PRCT', label: 'GI_275_PRCT' },
      { value: 'NVG', label: 'NVG' },
      { value: 'HESLO_PRCT', label: 'HESLO_PRCT' },
      { value: 'LPC', label: 'LPC' },
      { value: 'OPC', label: 'OPC' },
      { value: 'PALL', label: 'PALL' },
      { value: 'MSB', label: 'MSB' }
    ];
    types.forEach(t => {
      grid.insertAdjacentHTML('beforeend', `
        <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; color: var(--text-primary);">
          <input type="checkbox" value="${t.value}" class="crew-training-type"> <span>${t.label}</span>
        </label>
      `);
    });
  }
}

/**
 * Dynamically appends a crew member entry card to the form container with autocomplete search and accordion collapse/expand behavior
 */
function addCrewMemberCard() {
  const container = document.getElementById('crew-members-container');
  if (!container) return;
  
  // Collapse all existing cards first
  container.querySelectorAll('.crew-member-card').forEach(card => {
    const bNode = card.querySelector('.crew-card-body');
    const chev = card.querySelector('.chevron-icon');
    if (bNode) bNode.style.display = 'none';
    if (chev) chev.style.transform = 'rotate(-90deg)';
  });
  
  const count = container.querySelectorAll('.crew-member-card').length + 1;
  
  const allCrew = [...STATE.flightCrew, ...STATE.cabinCrew];
  allCrew.sort((a, b) => {
    const nameA = a.Full_Name_EN || '';
    const nameB = b.Full_Name_EN || '';
    return nameA.localeCompare(nameB);
  });
  
  const cardHtml = `
    <div class="crew-member-card card" style="border: 1px solid var(--border-color); padding: var(--spacing-4); border-radius: var(--radius-md); background-color: var(--bg-surface-alt); position: relative; display: flex; flex-direction: column; gap: var(--spacing-3);">
      
      <!-- Card Header (Always visible and clickable to expand/collapse) -->
      <div class="crew-card-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="chevron-icon" data-lucide="chevron-down" style="width: 18px; height: 18px; transition: transform var(--transition-normal);"></i>
          <span class="crew-card-title" style="font-weight: 700; font-family: var(--font-display); color: var(--text-primary);">
            Crew Member #<span class="crew-number">${count}</span>: <span class="crew-name-header-text">New Member</span>
          </span>
        </div>
        <button type="button" class="btn btn-danger btn-remove-crew" style="padding: var(--spacing-1) var(--spacing-2); font-size: 12px; height: auto; display: none;">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
      
      <!-- Card Body (Collapsible) -->
      <div class="crew-card-body" style="display: flex; flex-direction: column; gap: var(--spacing-3); border-top: 1px solid var(--border-color); padding-top: var(--spacing-3); margin-top: var(--spacing-1);">
        <div class="form-row grid-2cols" style="position: relative;">
          <div class="form-group" style="position: relative;">
            <label style="font-weight: 600; font-size: 13px;">Name</label>
            <input type="text" class="form-input crew-name-search-input" placeholder="Type to search name..." required autocomplete="off" style="background-color: var(--bg-surface);">
            <input type="hidden" class="crew-id-hidden">
            <div class="autocomplete-dropdown" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 1000; max-height: 200px; overflow-y: auto; background-color: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-lg);"></div>
          </div>
          <div class="form-group">
            <label style="font-weight: 600; font-size: 13px;">PSTN</label>
            <input type="text" class="form-input crew-pstn-input" placeholder="PSTN" readonly style="background-color: var(--bg-surface);">
          </div>
        </div>
        
        <!-- 3 Columns of Time Blocks -->
        <div class="crew-time-blocks-grid">
          
          <!-- Block 1: FLIGHT TIME (DAY, NIGHT, NVG) -->
          <div style="border: 1px solid var(--border-color); padding: var(--spacing-3); border-radius: var(--radius-sm); background-color: var(--bg-surface); display: flex; flex-direction: column; gap: var(--spacing-2);">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid var(--border-color); padding-bottom: 2px;">Flight Time</span>
            <div class="form-group">
              <label style="font-size: 11px; font-weight: 600;">DAY</label>
              <input type="time" class="form-input crew-flight-day" style="padding: 4px 8px; height: 32px; font-size: 13px; background-color: var(--bg-app);" value="00:00">
            </div>
            <div class="form-group">
              <label style="font-size: 11px; font-weight: 600;">NIGHT</label>
              <input type="time" class="form-input crew-flight-nght" style="padding: 4px 8px; height: 32px; font-size: 13px; background-color: var(--bg-app);" value="00:00">
            </div>
            <div class="form-group">
              <label style="font-size: 11px; font-weight: 600;">NVG</label>
              <input type="time" class="form-input crew-flight-nvg" style="padding: 4px 8px; height: 32px; font-size: 13px; background-color: var(--bg-app);" value="00:00">
            </div>
          </div>

          <!-- Block 2: BLOCK TIME (DAY, NIGHT) -->
          <div style="border: 1px solid var(--border-color); padding: var(--spacing-3); border-radius: var(--radius-sm); background-color: var(--bg-surface); display: flex; flex-direction: column; gap: var(--spacing-2);">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid var(--border-color); padding-bottom: 2px;">Block Time</span>
            <div class="form-group">
              <label style="font-size: 11px; font-weight: 600;">DAY</label>
              <input type="time" class="form-input crew-block-day" style="padding: 4px 8px; height: 32px; font-size: 13px; background-color: var(--bg-app);" value="00:00">
            </div>
            <div class="form-group">
              <label style="font-size: 11px; font-weight: 600;">NIGHT</label>
              <input type="time" class="form-input crew-block-nght" style="padding: 4px 8px; height: 32px; font-size: 13px; background-color: var(--bg-app);" value="00:00">
            </div>
          </div>

          <!-- Block 3: Instructor Time (DAY, NIGHT) -->
          <div style="border: 1px solid var(--border-color); padding: var(--spacing-3); border-radius: var(--radius-sm); background-color: var(--bg-surface); display: flex; flex-direction: column; gap: var(--spacing-2);">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid var(--border-color); padding-bottom: 2px;">Instructor Time</span>
            <div class="form-group">
              <label style="font-size: 11px; font-weight: 600;">DAY</label>
              <input type="time" class="form-input crew-inst-day" style="padding: 4px 8px; height: 32px; font-size: 13px; background-color: var(--bg-app);" value="00:00">
            </div>
            <div class="form-group">
              <label style="font-size: 11px; font-weight: 600;">NIGHT</label>
              <input type="time" class="form-input crew-inst-nght" style="padding: 4px 8px; height: 32px; font-size: 13px; background-color: var(--bg-app);" value="00:00">
            </div>
          </div>
        </div>
        
        <div class="form-row" style="display: grid; grid-template-columns: 1fr; gap: var(--spacing-3); margin-top: var(--spacing-2);">
          <div class="form-group">
            <label style="font-weight: 600; font-size: 13px;">Flight Task #</label>
            <input type="text" class="form-input crew-task-input" placeholder="Flight task #">
          </div>
        </div>
        
        <div style="margin-top: var(--spacing-2);">
          <label style="font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; display: block; margin-bottom: 6px;">Type of Training</label>
          <div class="training-types-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--spacing-2);">
            <!-- Dynamic Checkboxes Injection -->
          </div>
        </div>
      </div>
      
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', cardHtml);
  const cardNode = container.lastElementChild;
  
  // Wire up Autocomplete Search dropdown lookup list
  const searchInput = cardNode.querySelector('.crew-name-search-input');
  const hiddenInput = cardNode.querySelector('.crew-id-hidden');
  const pstnInput = cardNode.querySelector('.crew-pstn-input');
  const dropdown = cardNode.querySelector('.autocomplete-dropdown');
  
  function renderDropdown(query) {
    dropdown.innerHTML = '';
    const filtered = allCrew.filter(member => {
      const name = (member.Full_Name_EN || '').toLowerCase();
      return name.includes(query);
    });
    
    if (filtered.length === 0) {
      dropdown.innerHTML = '<div style="padding: 8px 12px; color: var(--text-secondary); font-size: 13px;">No results found</div>';
      dropdown.style.display = 'block';
      return;
    }
    
    filtered.forEach(member => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.style.cssText = 'padding: 8px 12px; cursor: pointer; font-size: 13px; border-bottom: 1px solid var(--border-color); color: var(--text-primary); transition: background-color var(--transition-fast);';
      item.textContent = member.Full_Name_EN;
      
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'var(--bg-surface-alt)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = '';
      });
      
      item.addEventListener('click', () => {
        searchInput.value = member.Full_Name_EN;
        hiddenInput.value = member.id;
        pstnInput.value = member.Rank || '';
        dropdown.style.display = 'none';
        
        // Update header name display!
        const headerNameText = cardNode.querySelector('.crew-name-header-text');
        if (headerNameText) {
          headerNameText.textContent = member.Full_Name_EN;
        }
        
        // Update training types options dynamically
        updateTrainingTypesLayout(cardNode, member.crewType);
      });
      dropdown.appendChild(item);
    });
    
    dropdown.style.display = 'block';
  }
  
  searchInput.addEventListener('input', (e) => {
    const queryVal = e.target.value;
    const headerNameText = cardNode.querySelector('.crew-name-header-text');
    if (headerNameText) {
      headerNameText.textContent = queryVal.trim() || 'New Member';
    }
    renderDropdown(queryVal.toLowerCase());
  });
  
  searchInput.addEventListener('focus', () => {
    const query = searchInput.value.toLowerCase();
    renderDropdown(query);
  });
  
  // Close dropdown menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!cardNode.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
  
  // Accordion Expand/Collapse event bindings
  const headerNode = cardNode.querySelector('.crew-card-header');
  const bodyNode = cardNode.querySelector('.crew-card-body');
  const chevronIcon = cardNode.querySelector('.chevron-icon');
  
  headerNode.addEventListener('click', (e) => {
    if (e.target.closest('.btn-remove-crew')) return;
    const isCollapsed = bodyNode.style.display === 'none';
    if (isCollapsed) {
      bodyNode.style.display = 'flex';
      chevronIcon.style.transform = 'rotate(0deg)';
    } else {
      bodyNode.style.display = 'none';
      chevronIcon.style.transform = 'rotate(-90deg)';
    }
  });
  
  // Wire up Task sync/disabled status
  const taskInput = cardNode.querySelector('.crew-task-input');
  const sameTaskChk = document.getElementById('flight-same-task');
  taskInput.disabled = sameTaskChk.checked;
  if (sameTaskChk.checked) {
    taskInput.value = document.getElementById('flight-task-main').value.trim();
  }
  
  // Wire up Remove button listener
  const removeBtn = cardNode.querySelector('.btn-remove-crew');
  removeBtn.addEventListener('click', () => {
    removeCrewMemberCard(cardNode);
  });
  
  updateCrewCardsUI();
  updateTrainingTypesLayout(cardNode, 'Flight');
  
  // Refresh Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Renders the right list of logged flights inside the Training Flights panel
 */
function renderLoggedFlightsList() {
  const container = document.getElementById('logged-flights-list');
  if (!container) return;
  
  const filterSelect = document.getElementById('flight-month-filter');
  
  // 1. Get unique months
  const months = new Set();
  if (STATE.flights) {
    STATE.flights.forEach(f => {
      if (f.date && f.date.length >= 7) {
        months.add(f.date.substring(0, 7));
      }
    });
  }
  const sortedMonths = Array.from(months).sort().reverse();
  
  // 2. Populate filter dropdown options
  if (filterSelect) {
    const prevSelected = STATE.selectedFilterMonth || 'all';
    
    let optionsHtml = STATE.lang === 'uk'
      ? `<option value="all">Всі місяці</option>`
      : `<option value="all">All Months</option>`;
      
    sortedMonths.forEach(m => {
      const parts = m.split('-');
      const year = parts[0];
      const monthNum = parts[1];
      const monthsUk = {
        '01': 'Січень', '02': 'Лютий', '03': 'Березень', '04': 'Квітень',
        '05': 'Травень', '06': 'Червень', '07': 'Липень', '08': 'Серпень',
        '09': 'Вересень', '10': 'Жовтень', '11': 'Листопад', '12': 'Грудень'
      };
      const monthsEn = {
        '01': 'January', '02': 'February', '03': 'March', '04': 'April',
        '05': 'May', '06': 'June', '07': 'July', '08': 'August',
        '09': 'September', '10': 'October', '11': 'November', '12': 'December'
      };
      const mName = STATE.lang === 'uk' ? monthsUk[monthNum] : monthsEn[monthNum];
      const label = `${mName} ${year}`;
      optionsHtml += `<option value="${m}">${label}</option>`;
    });
    
    filterSelect.innerHTML = optionsHtml;
    
    if (prevSelected === 'all' || sortedMonths.includes(prevSelected)) {
      filterSelect.value = prevSelected;
      STATE.selectedFilterMonth = prevSelected;
    } else {
      filterSelect.value = 'all';
      STATE.selectedFilterMonth = 'all';
    }
    
    if (!filterSelect.dataset.listenerBound) {
      filterSelect.addEventListener('change', (e) => {
        STATE.selectedFilterMonth = e.target.value;
        renderLoggedFlightsList();
      });
      filterSelect.dataset.listenerBound = 'true';
    }
  }

  container.innerHTML = '';
  
  if (!STATE.flights || STATE.flights.length === 0) {
    container.innerHTML = '<div style="font-style:italic; color:var(--text-secondary); text-align:center; padding: var(--spacing-4);">No logged flights yet</div>';
    const statFlightEl = document.getElementById('month-stat-flight');
    const statBlockEl = document.getElementById('month-stat-block');
    if (statFlightEl) statFlightEl.textContent = '00:00';
    if (statBlockEl) statBlockEl.textContent = '00:00';
    return;
  }
  
  // 3. Filter flights based on selected month
  const activeMonth = STATE.selectedFilterMonth || 'all';
  const filteredFlights = STATE.flights.filter(f => {
    if (activeMonth === 'all') return true;
    return f.date && f.date.startsWith(activeMonth);
  });
  
  // 4. Calculate stats
  let totalFlightMinutes = 0;
  let totalBlockMinutes = 0;
  
  function parseDurationToMinutes(durationStr) {
    if (!durationStr || !durationStr.includes(':')) return 0;
    const parts = durationStr.split(':');
    const hrs = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    return hrs * 60 + mins;
  }
  
  function formatMinutesToDuration(totalMins) {
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
  
  filteredFlights.forEach(f => {
    totalFlightMinutes += parseDurationToMinutes(f.totalFlightTime || '00:00');
    totalBlockMinutes += parseDurationToMinutes(f.totalBlockTime || '00:00');
  });
  
  const statFlightEl = document.getElementById('month-stat-flight');
  const statBlockEl = document.getElementById('month-stat-block');
  if (statFlightEl) statFlightEl.textContent = formatMinutesToDuration(totalFlightMinutes);
  if (statBlockEl) statBlockEl.textContent = formatMinutesToDuration(totalBlockMinutes);

  if (filteredFlights.length === 0) {
    container.innerHTML = '<div style="font-style:italic; color:var(--text-secondary); text-align:center; padding: var(--spacing-4);">No flights in this month</div>';
    return;
  }

  const role = STATE.currentUser ? STATE.currentUser.role : ROLES.PILOT;
  const showDeleteBtn = role === ROLES.ADMIN;
  
  // Render latest first
  const reversedFlights = [...filteredFlights].reverse();
  reversedFlights.forEach(flight => {
    const crewNames = flight.crew.map(c => c.name).join(', ');
    
    const editBtnHtml = showDeleteBtn ? `
      <button class="btn-edit-logged-flight" style="background:transparent; border:none; color:#f59e0b; padding:4px; cursor:pointer;" title="Edit Flight">
        <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
      </button>
    ` : '';
    
    const deleteBtnHtml = showDeleteBtn ? `
      <button class="btn-delete-logged-flight" style="background:transparent; border:none; color:var(--danger-color); padding:4px; cursor:pointer;" title="Delete Flight">
        <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
      </button>
    ` : '';
    
    const itemHtml = `
      <div class="logged-flight-item" data-id="${flight.id}" style="border: 1px solid var(--border-color); padding: var(--spacing-3); border-radius: var(--radius-md); transition: background-color var(--transition-fast); background-color: var(--bg-surface); margin-bottom: 8px; display:flex; justify-content:space-between; align-items:center;">
        <div style="flex:1; cursor:pointer;" class="logged-flight-content">
          <div style="display:flex; justify-content:space-between; font-weight:700; font-size:13px; color:var(--accent);">
            <span>${flight.helicopterReg}</span>
            <span>${flight.date}</span>
          </div>
          <div style="font-size:12px; color:var(--text-secondary); margin-top:4px; font-weight:500;">
            Duty Time: ${flight.dutyTime}
          </div>
          <div style="font-size:12px; color:var(--text-primary); margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;" title="${crewNames}">
            ${crewNames}
          </div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px; margin-left: var(--spacing-3);">
          ${editBtnHtml}
          ${deleteBtnHtml}
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHtml);
    const itemNode = container.lastElementChild;
    
    // Hover styles
    const contentNode = itemNode.querySelector('.logged-flight-content');
    itemNode.addEventListener('mouseenter', () => {
      itemNode.style.backgroundColor = 'var(--bg-surface-alt)';
    });
    itemNode.addEventListener('mouseleave', () => {
      itemNode.style.backgroundColor = 'var(--bg-surface)';
    });
    
    // Click opens print window
    contentNode.addEventListener('click', () => {
      openFlightDetailWindow(flight);
    });
    
    if (showDeleteBtn) {
      // Click edits item directly
      itemNode.querySelector('.btn-edit-logged-flight').addEventListener('click', (e) => {
        e.stopPropagation();
        startEditingFlight(flight.id);
      });
      
      // Click deletes item if Admin
      itemNode.querySelector('.btn-delete-logged-flight').addEventListener('click', (e) => {
        e.stopPropagation();
        
        const backdrop = document.getElementById('confirm-backdrop');
        const msg = STATE.lang === 'uk' 
          ? "Ви впевнені, що бажаєте видалити цей політ?" 
          : "Are you sure you want to delete this flight?";
        document.getElementById('confirm-message').textContent = msg;
        document.getElementById('confirm-title').textContent = STATE.lang === 'uk' ? "Видалення польоту" : "Delete Flight";
        
        const btnSubmit = document.getElementById('btn-submit-confirm');
        const btnCancel = document.getElementById('btn-cancel-confirm');
        
        btnSubmit.textContent = STATE.lang === 'uk' ? "Так" : "Yes";
        btnSubmit.className = "btn btn-danger";
        btnCancel.textContent = STATE.lang === 'uk' ? "Ні" : "No";
        
        backdrop.classList.add('active');
        
        const resolveDelete = (confirmed) => {
          backdrop.classList.remove('active');
          
          btnSubmit.textContent = TRANSLATIONS[STATE.lang].btn_yes || "Так, видалити";
          btnSubmit.className = "btn btn-danger";
          btnCancel.textContent = TRANSLATIONS[STATE.lang].btn_no || "Ні";
          
          const newSubmit = btnSubmit.cloneNode(true);
          const newCancel = btnCancel.cloneNode(true);
          btnSubmit.replaceWith(newSubmit);
          btnCancel.replaceWith(newCancel);
          
          newCancel.addEventListener('click', () => {
            document.getElementById('confirm-backdrop').classList.remove('active');
          });
          
          if (confirmed) {
            const flightIdx = STATE.flights.findIndex(f => f.id === flight.id);
            if (flightIdx !== -1) {
              STATE.flights.splice(flightIdx, 1);
              saveStateToStorage();
              renderLoggedFlightsList();
              renderDashboard();
              showToast(STATE.lang === 'uk' ? "Запис польоту видалено!" : "Flight log deleted!");
            }
          }
        };
        
        document.getElementById('btn-submit-confirm').addEventListener('click', () => resolveDelete(true));
        document.getElementById('btn-cancel-confirm').addEventListener('click', () => resolveDelete(false));
      });
    }
  });
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Opens dynamic print window for a logged training flight with edit possibility for admins
 */
function openFlightDetailWindow(flight) {
  const newWindow = window.open("", "_blank", "width=850,height=800");
  if (!newWindow) {
    showToast("Pop-up blocked. Please allow pop-ups for this site.", "error");
    return;
  }
  
  const role = STATE.currentUser ? STATE.currentUser.role : ROLES.PILOT;
  const isAdmin = role === ROLES.ADMIN;
  const editBtnHtml = isAdmin ? `<button class="print-btn" style="background-color: #f59e0b; margin-left: 10px;" onclick="editFlight()">EDIT</button>` : '';
  
  function getRankPriority(pstn) {
    if (!pstn) return 999;
    const pNormalized = pstn.trim().toUpperCase();
    if (pNormalized.includes('КПС') && (pNormalized.includes('ІНСТР') || pNormalized.includes('INSTRUCTOR') || pNormalized.includes('ІНС'))) return 1;
    if (pNormalized === 'КПС') return 2;
    if (pNormalized === '2П' || pNormalized === '2P') return 3;
    if (pNormalized.includes('ІБ') && (pNormalized.includes('ІНСТР') || pNormalized.includes('INSTRUCTOR') || pNormalized.includes('ІНС'))) return 4;
    if (pNormalized === 'ІБ') return 5;
    if ((pNormalized.includes('БП-АР') || pNormalized.includes('БП-РА')) && (pNormalized.includes('ІНСТР') || pNormalized.includes('INSTRUCTOR') || pNormalized.includes('ІНС'))) return 6;
    if (pNormalized === 'БП-АР' || pNormalized === 'БП-РА') return 7;
    if (pNormalized.includes('БП') && (pNormalized.includes('ІНСТР') || pNormalized.includes('INSTRUCTOR') || pNormalized.includes('ІНС'))) return 8;
    if (pNormalized === 'БП') return 9;
    return 100;
  }

  const sortedCrew = [...flight.crew].sort((a, b) => {
    return getRankPriority(a.pstn) - getRankPriority(b.pstn);
  });

  const crewRows = sortedCrew.map(c => `
    <tr>
      <td>${c.pstn}</td>
      <td><strong>${c.name}</strong></td>
      <td style="white-space: nowrap; line-height: 1.25;">
        DAY: ${c.flightTime.day || '00:00'}<br>
        NIGHT: ${c.flightTime.nght || '00:00'}<br>
        NVG: ${c.flightTime.nvg || '00:00'}
      </td>
      <td style="white-space: nowrap; line-height: 1.25;">
        DAY: ${c.blockTime.day || '00:00'}<br>
        NIGHT: ${c.blockTime.nght || '00:00'}
      </td>
      <td style="white-space: nowrap; line-height: 1.25;">
        DAY: ${c.timeInstructor.day || '00:00'}<br>
        NIGHT: ${c.timeInstructor.night || '00:00'}
      </td>
      <td>${c.flightTask || '-'}</td>
      <td>${c.trainingTypes.join(', ') || '-'}</td>
    </tr>
  `).join('');
  
  let refuelText = `${flight.refuel}`;
  if (flight.refuelMore && (flight.refuel2 || flight.refuel3)) {
    if (flight.refuel2) refuelText += ` + ${flight.refuel2}`;
    if (flight.refuel3) refuelText += ` + ${flight.refuel3}`;
  }
  
  newWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Flight Log - ${flight.helicopterReg} (${flight.date})</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 20px; color: #1e293b; background-color: #f8fafc; font-size: 13px; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
          h2 { font-family: inherit; color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 0; font-size: 20px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
          .block { background-color: #f1f5f9; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e1; }
          .block-title { font-weight: 700; font-size: 11px; text-transform: uppercase; color: #475569; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; }
          .block p, .grid p { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; vertical-align: middle; }
          th { background-color: #e2e8f0; font-weight: 700; color: #334155; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .print-btn { display: inline-block; background-color: #4f46e5; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-weight: 600; margin-top: 20px; cursor: pointer; border: none; }
          
          @media print {
            .print-btn { display: none; }
            body { background: white; padding: 0; margin: 0; font-size: 9.5px; color: #000; }
            .container { box-shadow: none; border: none; max-width: 100%; padding: 0; margin: 0; }
            h2 { font-size: 14px; margin-bottom: 4px; padding-bottom: 2px; }
            .grid { gap: 8px; margin-top: 6px; }
            .block { padding: 4px 6px; border-radius: 4px; background-color: #fff !important; }
            .block p, .grid p { margin: 1px 0; }
            .block-title { font-size: 8.5px; margin-bottom: 1px; padding-bottom: 1px; }
            h3 { margin-top: 8px; margin-bottom: 3px; font-size: 10.5px; padding-bottom: 1px; }
            table { margin-top: 6px; font-size: 8.5px; }
            th, td { padding: 2px 4px; line-height: 1.15; }
            th { background-color: #f1f5f9 !important; }
            tr:nth-child(even) { background-color: #fff !important; }
          }
        </style>
        <script>
          function editFlight() {
            if (window.opener && !window.opener.closed) {
              window.opener.startEditingFlight("${flight.id}");
              window.close();
            } else {
              alert("Main window is closed. Cannot edit.");
            }
          }
        </script>
      </head>
      <body>
        <div class="container">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">
            <h2 style="margin:0; border:none; padding:0;">Flight Training Log</h2>
            <div>
              <button class="print-btn" onclick="window.print()">Print Details</button>
              ${editBtnHtml}
            </div>
          </div>
          
          <div class="grid">
            <div>
              <p><strong>Date:</strong> ${flight.date}</p>
              <p><strong>Helicopter Reg:</strong> ${flight.helicopterReg}</p>
              <p><strong>Duty Time:</strong> <span style="color:#4f46e5; font-weight:700;">${flight.dutyTime}</span></p>
              <p><strong>Total Flight Time:</strong> ${flight.totalFlightTime || '00:00'}</p>
              <p><strong>Total Block Time:</strong> ${flight.totalBlockTime || '00:00'}</p>
              <p><strong>Flight Task # (Common):</strong> ${flight.mainFlightTask || '-'}</p>
            </div>
            <div class="block">
              <div class="block-title">Fuel (Liters)</div>
              <p><strong>Start-up:</strong> ${flight.fuelStart}</p>
              <p><strong>Shut-down:</strong> ${flight.fuelEnd}</p>
              <p><strong>Refuel:</strong> ${refuelText}</p>
            </div>
          </div>
          
          <div class="grid" style="margin-top: 10px;">
            <div class="block">
              <div class="block-title">Pre-Flight Instructions</div>
              <p><strong>BGN:</strong> ${flight.preBgn}</p>
              <p><strong>END:</strong> ${flight.preEnd}</p>
              <p><strong>TTL (Duration):</strong> ${flight.preTtl}</p>
            </div>
            <div class="block">
              <div class="block-title">Post-Flight Debrief</div>
              <p><strong>BGN:</strong> ${flight.postBgn}</p>
              <p><strong>END:</strong> ${flight.postEnd}</p>
              <p><strong>TTL (Duration):</strong> ${flight.postTtl}</p>
            </div>
          </div>
          
          <h3 style="margin-top:20px; margin-bottom:8px; font-family:inherit; color:#1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom:4px; font-size: 14px;">Crew Members Details</h3>
          <table>
            <thead>
              <tr>
                <th>PSTN</th>
                <th>Name</th>
                <th>Flight Time</th>
                <th>Block Time</th>
                <th>Instructor Time</th>
                <th>Task #</th>
                <th>Training Types</th>
              </tr>
            </thead>
            <tbody>
              ${crewRows}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `);
  newWindow.document.close();
}

/**
 * Switches the app to edit mode for a specific flight, loading its values
 */
window.startEditingFlight = function(flightId) {
  const flight = STATE.flights.find(f => f.id === flightId);
  if (!flight) return;
  
  switchView('training-flights');
  
  STATE.editingFlightId = flightId;
  
  const titleEl = document.querySelector('[data-i18n="flights_title"]');
  if (titleEl) {
    titleEl.textContent = STATE.lang === 'uk' ? "Редагувати запис польоту" : "Edit Training Flight Log";
  }
  
  document.getElementById('flight-date').value = flight.date;
  document.getElementById('flight-helicopter-reg').value = flight.helicopterReg;
  document.getElementById('flight-task-main').value = flight.mainFlightTask || '';
  document.getElementById('flight-same-task').checked = flight.sameFlightTask;
  
  document.getElementById('flight-fuel-start').value = flight.fuelStart;
  document.getElementById('flight-fuel-end').value = flight.fuelEnd;
  document.getElementById('flight-refuel').value = flight.refuel;
  document.getElementById('flight-refuel-more').checked = !!flight.refuelMore;
  document.getElementById('refuel-extra-row').style.display = flight.refuelMore ? 'block' : 'none';
  document.getElementById('flight-refuel-2').value = flight.refuel2 || 0;
  document.getElementById('flight-refuel-3').value = flight.refuel3 || 0;
  
  document.getElementById('flight-pre-bgn').value = flight.preBgn;
  document.getElementById('flight-pre-end').value = flight.preEnd;
  document.getElementById('flight-pre-ttl').value = flight.preTtl;
  
  document.getElementById('flight-post-bgn').value = flight.postBgn;
  document.getElementById('flight-post-end').value = flight.postEnd;
  document.getElementById('flight-post-ttl').value = flight.postTtl;
  
  document.getElementById('flight-duty-time').value = flight.dutyTime;
  document.getElementById('flight-total-flight-time').value = flight.totalFlightTime || '00:00';
  document.getElementById('flight-total-block-time').value = flight.totalBlockTime || '00:00';
  
  const container = document.getElementById('crew-members-container');
  container.innerHTML = '';
  
  flight.crew.forEach((c, idx) => {
    addCrewMemberCard();
    const cards = container.querySelectorAll('.crew-member-card');
    const card = cards[cards.length - 1];
    
    const searchInput = card.querySelector('.crew-name-search-input');
    const hiddenInput = card.querySelector('.crew-id-hidden');
    const pstnInput = card.querySelector('.crew-pstn-input');
    
    searchInput.value = c.name;
    hiddenInput.value = c.crewId;
    pstnInput.value = c.pstn;
    
    // Set card header name text
    const headerNameText = card.querySelector('.crew-name-header-text');
    if (headerNameText) {
      headerNameText.textContent = c.name || 'New Member';
    }
    
    card.querySelector('.crew-flight-day').value = c.flightTime.day || '00:00';
    card.querySelector('.crew-flight-nght').value = c.flightTime.nght || '00:00';
    card.querySelector('.crew-flight-nvg').value = c.flightTime.nvg || '00:00';
    
    card.querySelector('.crew-block-day').value = c.blockTime.day || '00:00';
    card.querySelector('.crew-block-nght').value = c.blockTime.nght || '00:00';
    
    card.querySelector('.crew-inst-day').value = c.timeInstructor.day || '00:00';
    card.querySelector('.crew-inst-nght').value = c.timeInstructor.night || '00:00';
    
    card.querySelector('.crew-task-input').value = c.flightTask || '';
    
    updateTrainingTypesLayout(card, c.crewType || 'Flight');
    
    c.trainingTypes.forEach(tType => {
      const chk = card.querySelector(`.crew-training-type[value="${tType}"]`);
      if (chk) chk.checked = true;
    });
  });
  
  toggleIndividualTasks();
};

/**
 * Initializes and resets the wide Training Flights Log form
 */
function renderTrainingFlightsForm() {
  const container = document.getElementById('crew-members-container');
  if (!container) return;
  container.innerHTML = '';
  
  // Clear edit mode
  STATE.editingFlightId = null;
  const titleEl = document.querySelector('[data-i18n="flights_title"]');
  if (titleEl) {
    titleEl.textContent = STATE.lang === 'uk' ? "Запис польоту" : "Training Flight Log";
  }
  
  // Add first crew member card by default
  addCrewMemberCard();
  
  // Reset general fields
  document.getElementById('training-flight-form').reset();
  
  // Clear calculated TTL fields
  document.getElementById('flight-pre-ttl').value = '';
  document.getElementById('flight-post-ttl').value = '';
  document.getElementById('flight-duty-time').value = '';
  document.getElementById('flight-total-flight-time').value = '00:00';
  document.getElementById('flight-total-block-time').value = '00:00';
  
  // Reset refuel add-more state
  const refuelMoreChk = document.getElementById('flight-refuel-more');
  const refuelExtraRow = document.getElementById('refuel-extra-row');
  if (refuelMoreChk && refuelExtraRow) {
    refuelMoreChk.checked = false;
    refuelExtraRow.style.display = 'none';
    document.getElementById('flight-refuel-2').value = 0;
    document.getElementById('flight-refuel-3').value = 0;
  }
  
  // Set default date to system reference date
  document.getElementById('flight-date').value = STATE.settings.referenceDate || new Date().toISOString().split('T')[0];
  
  // Render right list of logged flights
  renderLoggedFlightsList();
  
  const sameTaskChk = document.getElementById('flight-same-task');
  const mainTaskInput = document.getElementById('flight-task-main');
  
  mainTaskInput.addEventListener('input', () => {
    if (sameTaskChk.checked) {
      syncMainTaskToCrew();
    }
  });
  
  sameTaskChk.addEventListener('change', () => {
    toggleIndividualTasks();
  });
  
  if (refuelMoreChk && refuelExtraRow) {
    refuelMoreChk.addEventListener('change', () => {
      refuelExtraRow.style.display = refuelMoreChk.checked ? 'block' : 'none';
      if (!refuelMoreChk.checked) {
        document.getElementById('flight-refuel-2').value = 0;
        document.getElementById('flight-refuel-3').value = 0;
      }
    });
  }
  
  toggleIndividualTasks();
}

/**
 * Handles training flights submissions and saves data back to database profiles
 */
function handleTrainingFlightSubmit(e) {
  e.preventDefault();
  
  const date = document.getElementById('flight-date').value;
  const helicopterReg = document.getElementById('flight-helicopter-reg').value.trim();
  const isSameTask = document.getElementById('flight-same-task').checked;
  const mainTask = document.getElementById('flight-task-main').value.trim();
  
  const fuelStart = parseFloat(document.getElementById('flight-fuel-start').value) || 0;
  const fuelEnd = parseFloat(document.getElementById('flight-fuel-end').value) || 0;
  const refuel = parseFloat(document.getElementById('flight-refuel').value) || 0;
  
  const preBgn = document.getElementById('flight-pre-bgn').value;
  const preEnd = document.getElementById('flight-pre-end').value;
  const preTtl = document.getElementById('flight-pre-ttl').value;
  
  const postBgn = document.getElementById('flight-post-bgn').value;
  const postEnd = document.getElementById('flight-post-end').value;
  const postTtl = document.getElementById('flight-post-ttl').value;
  
  const dutyTime = document.getElementById('flight-duty-time').value;
  
  const crewCards = document.querySelectorAll('.crew-member-card');
  const crewMembers = [];
  
  if (crewCards.length === 0) {
    showToast("Please add at least one crew member", "error");
    return;
  }
  
  const allCrew = [...STATE.flightCrew, ...STATE.cabinCrew];
  
  function timeToMinutes(tStr) {
    if (!tStr) return 0;
    const parts = tStr.split(':');
    const hrs = parseInt(parts[0], 10) || 0;
    const mins = parseInt(parts[1], 10) || 0;
    return hrs * 60 + mins;
  }

  const seenCrewIds = new Set();

  // Validation and data compilation
  for (const card of crewCards) {
    const hiddenInput = card.querySelector('.crew-id-hidden');
    const selectedId = hiddenInput ? hiddenInput.value : '';
    if (!selectedId) {
      showToast(STATE.lang === 'uk' ? "Будь ласка, виберіть ім'я зі списку пошуку для всіх членів екіпажу" : "Please select a name from the search suggestions for all crew members", "error");
      return;
    }
    
    const member = allCrew.find(c => c.id === selectedId);
    if (!member) continue;
    
    const crewName = member.Full_Name_UA || member.Full_Name_EN;
    
    // 1. Duplicate check
    if (seenCrewIds.has(selectedId)) {
      showToast(STATE.lang === 'uk'
        ? `Помилка: ${crewName} вже доданий в екіпаж!`
        : `Error: ${crewName} is already added in the crew list!`, "error");
      return;
    }
    seenCrewIds.add(selectedId);
    
    const pstn = card.querySelector('.crew-pstn-input').value;
    
    const flightDay = card.querySelector('.crew-flight-day').value;
    const flightNght = card.querySelector('.crew-flight-nght').value;
    const flightNvg = card.querySelector('.crew-flight-nvg').value;
    
    const blockDay = card.querySelector('.crew-block-day').value;
    const blockNght = card.querySelector('.crew-block-nght').value;
    
    // 2. Block time vs Flight time check
    const fltDayMins = timeToMinutes(flightDay);
    const blkDayMins = timeToMinutes(blockDay);
    if (blkDayMins < fltDayMins) {
      showToast(STATE.lang === 'uk'
        ? `Помилка для ${crewName}: Блок День (${blockDay}) має бути не менше за Польотний День (${flightDay})!`
        : `Error for ${crewName}: Block Day (${blockDay}) must be greater than or equal to Flight Day (${flightDay})!`, "error");
      return;
    }
    
    const fltNghtMins = timeToMinutes(flightNght);
    const blkNghtMins = timeToMinutes(blockNght);
    if (blkNghtMins < fltNghtMins) {
      showToast(STATE.lang === 'uk'
        ? `Помилка для ${crewName}: Блок Ніч (${blockNght}) має бути не менше за Польотну Ніч (${flightNght})!`
        : `Error for ${crewName}: Block Night (${blockNght}) must be greater than or equal to Flight Night (${flightNght})!`, "error");
      return;
    }
    
    const instDay = card.querySelector('.crew-inst-day').value;
    const instNght = card.querySelector('.crew-inst-nght').value;
    
    const individualTask = card.querySelector('.crew-task-input').value.trim();
    const task = isSameTask ? mainTask : individualTask;
    
    const trainingTypes = [];
    card.querySelectorAll('.crew-training-type:checked').forEach(chk => {
      trainingTypes.push(chk.value);
    });
    
    crewMembers.push({
      crewId: selectedId,
      name: member.Full_Name_EN || member.Full_Name_UA,
      pstn,
      flightTime: { day: flightDay, nght: flightNght, nvg: flightNvg },
      blockTime: { day: blockDay, nght: blockNght },
      timeInstructor: { day: instDay, night: instNght },
      flightTask: task,
      trainingTypes,
      crewType: member.crewType
    });
  }
  
  const totalFlightTime = document.getElementById('flight-total-flight-time').value || '00:00';
  const totalBlockTime = document.getElementById('flight-total-block-time').value || '00:00';
  
  const fltTotalMins = timeToMinutes(totalFlightTime);
  const blkTotalMins = timeToMinutes(totalBlockTime);
  if (blkTotalMins < fltTotalMins) {
    showToast(STATE.lang === 'uk'
      ? `Помилка: Загальний час Блок (${totalBlockTime}) має бути не менше за Загальний час Польоту (${totalFlightTime})!`
      : `Error: Total Block Time (${totalBlockTime}) must be greater than or equal to Total Flight Time (${totalFlightTime})!`, "error");
    return;
  }
  
  const isEditing = !!STATE.editingFlightId;
  const flightId = isEditing ? STATE.editingFlightId : `flight_${Date.now()}`;
  
  const flightRecord = {
    id: flightId,
    date,
    helicopterReg,
    fuelStart,
    fuelEnd,
    refuel,
    preBgn,
    preEnd,
    preTtl,
    postBgn,
    postEnd,
    postTtl,
    dutyTime,
    totalFlightTime,
    totalBlockTime,
    sameFlightTask: isSameTask,
    mainFlightTask: mainTask,
    crew: crewMembers
  };
  
  // Confirm action using custom styled confirmation dialog modal
  const backdrop = document.getElementById('confirm-backdrop');
  const msgLabel = STATE.lang === 'uk' 
    ? "Ви впевнені що внесли всю необхідну інформацію?" 
    : "Are you sure you have entered all the required information?";
  const titleLabel = STATE.lang === 'uk' ? "Підтвердження збереження" : "Confirm Saving";
  
  document.getElementById('confirm-message').textContent = msgLabel;
  document.getElementById('confirm-title').textContent = titleLabel;
  
  const btnSubmit = document.getElementById('btn-submit-confirm');
  const btnCancel = document.getElementById('btn-cancel-confirm');
  
  btnSubmit.textContent = STATE.lang === 'uk' ? "Так" : "Yes";
  btnSubmit.className = "btn btn-primary";
  btnCancel.textContent = STATE.lang === 'uk' ? "Ні" : "No";
  
  backdrop.classList.add('active');
  
  const cleanupAndRestore = (confirmed) => {
    backdrop.classList.remove('active');
    
    // Restore button labels and styles
    btnSubmit.textContent = TRANSLATIONS[STATE.lang].btn_yes || "Так, видалити";
    btnSubmit.className = "btn btn-danger";
    btnCancel.textContent = TRANSLATIONS[STATE.lang].btn_no || "Ні";
    
    // Replace buttons with clones to remove event listeners
    const newSubmit = btnSubmit.cloneNode(true);
    const newCancel = btnCancel.cloneNode(true);
    btnSubmit.replaceWith(newSubmit);
    btnCancel.replaceWith(newCancel);
    
    // Rebind default cancel delete click event
    newCancel.addEventListener('click', () => {
      document.getElementById('confirm-backdrop').classList.remove('active');
    });
    
    if (confirmed) {
      saveFlightRecord(flightRecord);
    }
  };
  
  document.getElementById('btn-submit-confirm').addEventListener('click', () => cleanupAndRestore(true));
  document.getElementById('btn-cancel-confirm').addEventListener('click', () => cleanupAndRestore(false));
}

/**
 * Saves compiled flight record and updates compliance dates
 */
function saveFlightRecord(flightRecord) {
  const isEditing = !!STATE.editingFlightId;
  
  if (isEditing) {
    const idx = STATE.flights.findIndex(f => f.id === STATE.editingFlightId);
    if (idx !== -1) {
      STATE.flights[idx] = flightRecord;
    }
    STATE.editingFlightId = null;
    
    const titleEl = document.querySelector('[data-i18n="flights_title"]');
    if (titleEl) {
      titleEl.textContent = STATE.lang === 'uk' ? "Тренувальні польоти" : "Training Flight Log";
    }
  } else {
    // 1. Save to state flights collection
    STATE.flights.push(flightRecord);
  }
  
  // 2. Dispatch mock email alert
  const crewNamesStr = flightRecord.crew.map(c => `${c.name} (${c.pstn})`).join(', ');
  dispatchFlightLogEmail({
    crewName: crewNamesStr,
    date: flightRecord.date,
    acType: flightRecord.helicopterReg,
    duration: flightRecord.dutyTime,
    exercise: `Fuel Start/End/Refuel: ${flightRecord.fuelStart}/${flightRecord.fuelEnd}/${flightRecord.refuel} L. Pre-ttl/Post-ttl: ${flightRecord.preTtl}/${flightRecord.postTtl}.`
  });
  
  // 3. Add system audit log entry
  STATE.changelog.push({
    timestamp: new Date().toISOString(),
    userEmail: STATE.currentUser ? STATE.currentUser.email : 'system@aerocheck.com',
    crewMember: crewNamesStr,
    crewType: 'Flight',
    type: 'FLIGHT_LOG',
    details: [{ field: 'flight', oldValue: 'none', newValue: flightRecord }]
  });
  
  // 4. Update crew member compliance profiles automatically
  const TRAINING_COLUMN_MAP = {
    Flight: {
      'GI_275_PRCT': 'GI 275_PRCT',
      'NVG': 'OPC_NVG',
      'HESLO_PRCT': 'HESLO_PRCT',
      'LPC': 'LPC',
      'OPC': 'OPC',
      'PALL': 'PALL',
      'MSB': 'MSB'
    },
    Cabin: {
      'OPC': 'OPC',
      'LPC': 'LPC',
      'Resc': 'Resc',
      'Rappel': 'Rappel',
      'Hoist': 'Hoist',
      'EOIR': 'EOIR'
    }
  };
  
  flightRecord.crew.forEach(c => {
    if (c.trainingTypes.length === 0) return;
    
    const list = c.crewType === 'Flight' ? STATE.flightCrew : STATE.cabinCrew;
    const idx = list.findIndex(member => member.id === c.crewId);
    if (idx === -1) return;
    
    const member = list[idx];
    const mappings = TRAINING_COLUMN_MAP[c.crewType];
    
    c.trainingTypes.forEach(tType => {
      const columnName = mappings[tType];
      if (!columnName) return;
      
      let ruleKey = columnName;
      if (c.crewType === 'Cabin' && columnName === 'CC_Type') {
        ruleKey = 'Type';
      }
      
      let dateToSave = flightRecord.date;
      const isColExpiring = isExpiring(ruleKey);
      
      if (isColExpiring) {
        dateToSave = calculateExpiryDate(flightRecord.date, ruleKey, c.crewType);
      }
      
      const oldVal = member[columnName] || '';
      if (oldVal !== dateToSave) {
        member[columnName] = dateToSave;
        
        STATE.changelog.push({
          timestamp: new Date().toISOString(),
          userEmail: STATE.currentUser ? STATE.currentUser.email : 'system@aerocheck.com',
          crewMember: member.Full_Name_EN || member.Full_Name_UA,
          crewType: c.crewType,
          type: 'MANUAL_EDIT',
          details: [{
            field: columnName,
            oldValue: oldVal || 'empty',
            newValue: dateToSave
          }]
        });
      }
    });
  });
  
  saveStateToStorage();
  
  // Render right list of logged flights
  renderLoggedFlightsList();
  
  showToast(STATE.lang === 'uk' ? "Запис польоту збережено, допуски екіпажу оновлено!" : "Flight log saved and crew compliance updated!");
  
  // Reset form details and refresh sidebar lists, staying on this tab
  renderTrainingFlightsForm();
}

/**
 * Populates drop-down selectors with names
 */
function populateSelectors() {
  const flightSelect = document.getElementById('flight-crew-select');
  const deleteSelect = document.getElementById('mgmt-delete-select');
  
  if (flightSelect) {
    flightSelect.innerHTML = '<option value="" disabled selected>Виберіть співробітника...</option>';
  }
  if (deleteSelect) {
    deleteSelect.innerHTML = '<option value="" disabled selected>Виберіть співробітника...</option>';
  }
  
  const allCrew = [...STATE.flightCrew, ...STATE.cabinCrew];
  allCrew.sort((a, b) => {
    const nameA = a.Full_Name_EN || a.Full_Name_UA || '';
    const nameB = b.Full_Name_EN || b.Full_Name_UA || '';
    return nameA.localeCompare(nameB);
  });
  
  allCrew.forEach(member => {
    const displayName = STATE.lang === 'uk' ? (member.Name_Shrt_UA || member.Full_Name_UA) : member.Full_Name_EN;
    const optionHtml = `<option value="${member.id}">${displayName} (${member.crewType === 'Flight' ? 'Flight' : 'Cabin'})</option>`;
    
    if (flightSelect) {
      flightSelect.insertAdjacentHTML('beforeend', optionHtml);
    }
    if (deleteSelect) {
      deleteSelect.insertAdjacentHTML('beforeend', optionHtml);
    }
  });
}

/**
 * Renders the Settings views variables and check-grids
 */
function renderSettings() {
  document.getElementById('settings-ref-date').value = STATE.settings.referenceDate;
  document.getElementById('settings-auto-sync').checked = STATE.settings.autoSync;
  document.getElementById('settings-date-prompt').checked = STATE.settings.datePrompt;
  
  // Render column checkbox settings
  const columnsContainer = document.getElementById('columns-visibility-container');
  columnsContainer.innerHTML = '';
  
  // Add section headers
  columnsContainer.insertAdjacentHTML('beforeend', `<div style="grid-column: 1/-1; font-weight:700; margin-top:8px; border-bottom:1px solid var(--border-color); padding-bottom:4px;">Flight Crew Columns</div>`);
  
  const flightAllHeaders = [
    'Rank', 'Department', 'Name_Shrt_UA', 'Full_Name_UA', 'Full_Name_EN', 
    'OPC', 'OPC_NVG', 'LPC', 'Type', 'EMER_1', 'EMER_3', 'DG', 'AV_SEC', 'CRM', 'MED', 'LICENSE'
  ];
  
  flightAllHeaders.forEach(col => {
    const isVisible = STATE.settings.visibleColumnsFlight.includes(col);
    columnsContainer.insertAdjacentHTML('beforeend', `
      <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer;">
        <input type="checkbox" class="col-vis-checkbox-flight" data-col="${col}" ${isVisible ? 'checked' : ''}>
        <span>${col}</span>
      </label>
    `);
  });
  
  columnsContainer.insertAdjacentHTML('beforeend', `<div style="grid-column: 1/-1; font-weight:700; margin-top:16px; border-bottom:1px solid var(--border-color); padding-bottom:4px;">Cabin Crew Columns</div>`);
  
  const cabinAllHeaders = [
    'Rank', 'Department', 'Name_Shrt_UA', 'Full_Name_UA', 'Full_Name_EN', 
    'OPC', 'LPC', 'CC_Type', 'EMER_1', 'EMER_3', 'DG', 'AV_SEC', 'CRM', 'MED'
  ];
  
  cabinAllHeaders.forEach(col => {
    const isVisible = STATE.settings.visibleColumnsCabin.includes(col);
    columnsContainer.insertAdjacentHTML('beforeend', `
      <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer;">
        <input type="checkbox" class="col-vis-checkbox-cabin" data-col="${col}" ${isVisible ? 'checked' : ''}>
        <span>${col}</span>
      </label>
    `);
  });
  
  // Add listeners to checks
  document.querySelectorAll('.col-vis-checkbox-flight').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const colName = e.target.getAttribute('data-col');
      if (e.target.checked) {
        if (!STATE.settings.visibleColumnsFlight.includes(colName)) {
          STATE.settings.visibleColumnsFlight.push(colName);
        }
      } else {
        STATE.settings.visibleColumnsFlight = STATE.settings.visibleColumnsFlight.filter(c => c !== colName);
      }
      saveStateToStorage();
    });
  });
  
  document.querySelectorAll('.col-vis-checkbox-cabin').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const colName = e.target.getAttribute('data-col');
      if (e.target.checked) {
        if (!STATE.settings.visibleColumnsCabin.includes(colName)) {
          STATE.settings.visibleColumnsCabin.push(colName);
        }
      } else {
        STATE.settings.visibleColumnsCabin = STATE.settings.visibleColumnsCabin.filter(c => c !== colName);
      }
      saveStateToStorage();
    });
  });
  
  populateSelectors();
}

/**
 * Handles the delete crew member button click
 */
function handleCrewMemberDelete() {
  const select = document.getElementById('mgmt-delete-select');
  const memberId = select.value;
  if (!memberId) {
    showToast("Будь ласка, виберіть співробітника", "warning");
    return;
  }
  
  const allCrew = [...STATE.flightCrew, ...STATE.cabinCrew];
  const member = allCrew.find(c => c.id === memberId);
  if (!member) return;
  
  const name = member.Full_Name_EN || member.Full_Name_UA;
  
  // Confirm action
  document.getElementById('confirm-message').textContent = STATE.lang === 'uk'
    ? `Ви впевнені, що хочете остаточно видалити співробітника: ${name}?`
    : `Are you sure you want to permanently delete: ${name}?`;
    
  const backdrop = document.getElementById('confirm-backdrop');
  backdrop.classList.add('active');
  
  const btnSubmit = document.getElementById('btn-submit-confirm');
  const btnCancel = document.getElementById('btn-cancel-confirm');
  
  const resolveConfirm = (confirmed) => {
    backdrop.classList.remove('active');
    btnSubmit.replaceWith(btnSubmit.cloneNode(true)); // remove listeners
    btnCancel.replaceWith(btnCancel.cloneNode(true));
    
    // Add event listeners back to confirmation buttons
    document.getElementById('btn-cancel-confirm').addEventListener('click', () => {
      document.getElementById('confirm-backdrop').classList.remove('active');
    });
    
    if (confirmed) {
      if (member.crewType === 'Flight') {
        STATE.flightCrew = STATE.flightCrew.filter(c => c.id !== memberId);
      } else {
        STATE.cabinCrew = STATE.cabinCrew.filter(c => c.id !== memberId);
      }
      
      STATE.changelog.push({
        timestamp: new Date().toISOString(),
        userEmail: STATE.currentUser ? STATE.currentUser.email : 'system@aerocheck.com',
        crewMember: name,
        crewType: member.crewType,
        type: 'CREW_DELETE',
        details: [{ field: 'all', oldValue: 'n/a', newValue: 'Removed profile record' }]
      });
      
      saveStateToStorage();
      showToast("Співробітника видалено");
      populateSelectors();
      switchView(STATE.currentView);
    }
  };
  
  document.getElementById('btn-submit-confirm').addEventListener('click', () => resolveConfirm(true));
  document.getElementById('btn-cancel-confirm').addEventListener('click', () => resolveConfirm(false));
}

/**
 * Renders the Crew Personal Portal view
 */
function renderPersonalPortal() {
  const profileDetails = document.getElementById('portal-profile-details');
  const expiriesGrid = document.getElementById('portal-expiries-grid');
  const documentsList = document.getElementById('portal-documents-list');
  
  // Find matching crew member record by selected ID or fallback to current user email
  const allCrew = [...STATE.flightCrew, ...STATE.cabinCrew];
  let member = null;
  
  if (STATE.selectedCrewMemberId) {
    member = allCrew.find(c => c.id === STATE.selectedCrewMemberId);
  }
  
  if (!member) {
    const email = STATE.currentUser ? STATE.currentUser.email : '';
    member = allCrew.find(c => c.Email && c.Email.trim().toLowerCase() === email.trim().toLowerCase()) || allCrew[0];
  }
  
  // Render back button if admin/instructor is viewing an individual crew member portal
  const backContainer = document.getElementById('portal-back-btn-container');
  backContainer.innerHTML = '';
  
  const role = STATE.currentUser ? STATE.currentUser.role : 'CREW';
  if ((role === ROLES.ADMIN || role === ROLES.INSTRUCTOR || role === ROLES.OFFICE) && STATE.selectedCrewMemberId) {
    const backBtnText = STATE.lang === 'uk' ? 'Назад до списку' : 'Back to list';
    backContainer.innerHTML = `
      <button class="btn btn-secondary" id="btn-portal-back" style="margin-bottom: var(--spacing-4);">
        <i data-lucide="arrow-left"></i>
        <span>${backBtnText}</span>
      </button>
    `;
    
    document.getElementById('btn-portal-back').addEventListener('click', () => {
      STATE.selectedCrewMemberId = null;
      switchView(STATE.previousCrewView || 'flight-crew');
    });
  }
  
  if (!member) {
    profileDetails.innerHTML = `<div style="font-style:italic; color:var(--text-secondary);">Профіль не знайдено у базі даних</div>`;
    expiriesGrid.innerHTML = '';
    documentsList.innerHTML = '';
    return;
  }
  
  // Generate initials for placeholder
  let initials = 'CR';
  if (member.Full_Name_EN) {
    const parts = member.Full_Name_EN.trim().split(/\s+/);
    if (parts.length > 1) {
      initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length > 0 && parts[0].length > 0) {
      initials = parts[0].substring(0, 2).toUpperCase();
    }
  } else if (member.Full_Name_UA) {
    const parts = member.Full_Name_UA.trim().split(/\s+/);
    if (parts.length > 1) {
      initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length > 0 && parts[0].length > 0) {
      initials = parts[0].substring(0, 2).toUpperCase();
    }
  }

  const avatarHtml = `
    <div class="profile-avatar-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: var(--spacing-4); width: 100%;">
       <div class="avatar-circle-wrapper" style="position: relative; width: 120px; height: 120px; border-radius: 50%; border: 3px solid var(--border-color); background: var(--bg-surface-alt); display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: var(--shadow-md);">
          <!-- Spinner overlay -->
          <div id="avatar-spinner" style="display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.5); z-index: 10; align-items: center; justify-content: center; color: white;">
             <i data-lucide="loader-2" class="spin" style="width: 24px; height: 24px;"></i>
          </div>
          <!-- Image or Placeholder -->
          <img id="avatar-image" src="${member.photo || ''}" style="width: 100%; height: 100%; object-fit: cover; display: ${member.photo ? 'block' : 'none'};" />
          <div id="avatar-placeholder" style="font-size: 36px; font-weight: 700; color: var(--text-tertiary); font-family: var(--font-display); text-transform: uppercase; display: ${member.photo ? 'none' : 'block'};">${initials}</div>
          <!-- Admin Edit Overlay -->
          ${role === ROLES.ADMIN ? `
          <button id="btn-upload-photo" style="position: absolute; bottom: 0; left: 0; right: 0; height: 32px; background: rgba(0, 0, 0, 0.6); border: none; border-radius: 0; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: opacity 0.2s; opacity: 0;" title="Upload Photo">
             <i data-lucide="camera" style="width: 16px; height: 16px;"></i>
          </button>
          ` : ''}
       </div>
       <input type="file" id="photo-file-input" accept="image/*" style="display: none;" />
    </div>
  `;

  // Show / Hide edit profile button for admin
  const editProfileBtn = document.getElementById('btn-edit-portal-profile');
  if (editProfileBtn) {
    editProfileBtn.style.display = role === ROLES.ADMIN ? 'inline-flex' : 'none';
  }

  // Render profile (either Edit form or static view)
  if (STATE.isEditingPortalProfile && role === ROLES.ADMIN) {
    profileDetails.innerHTML = `
      ${avatarHtml}
      <form id="portal-profile-edit-form" style="display: flex; flex-direction: column; gap: var(--spacing-3); width: 100%;">
        <div><strong>Прізвище Ім'я:</strong> ${member.Full_Name_UA}</div>
        <div><strong>Name:</strong> ${member.Full_Name_EN}</div>
        
        <div class="form-group">
          <label style="font-weight: 600; font-size: 13px;">Посада / Rank:</label>
          <input type="text" id="edit-portal-rank" class="form-input" value="${member.Rank || ''}" required />
        </div>
        <div class="form-group">
          <label style="font-weight: 600; font-size: 13px;">Відділ / Dept:</label>
          <input type="text" id="edit-portal-dept" class="form-input" value="${member.Department || ''}" required />
        </div>
        <div class="form-group">
          <label style="font-weight: 600; font-size: 13px;">Email:</label>
          <input type="email" id="edit-portal-email" class="form-input" value="${member.Email || ''}" required />
        </div>
        <div class="form-group">
          <label style="font-weight: 600; font-size: 13px;">Phone:</label>
          <input type="text" id="edit-portal-phone" class="form-input" value="${member.Phone || ''}" />
        </div>
        
        <div style="display: flex; gap: var(--spacing-2); margin-top: var(--spacing-2);">
          <button type="submit" class="btn btn-primary" style="flex: 1; height: 36px; font-size: 13px;">
            ${STATE.lang === 'uk' ? 'Зберегти' : 'Save'}
          </button>
          <button type="button" id="btn-cancel-portal-edit" class="btn btn-secondary" style="flex: 1; height: 36px; font-size: 13px;">
            ${STATE.lang === 'uk' ? 'Скасувати' : 'Cancel'}
          </button>
        </div>
      </form>
    `;
    
    // Wire up save and cancel listeners
    document.getElementById('portal-profile-edit-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const newRank = document.getElementById('edit-portal-rank').value.trim();
      const newDept = document.getElementById('edit-portal-dept').value.trim();
      const newEmail = document.getElementById('edit-portal-email').value.trim();
      const newPhone = document.getElementById('edit-portal-phone').value.trim();
      
      const oldRank = member.Rank || '';
      const oldDept = member.Department || '';
      const oldEmail = member.Email || '';
      const oldPhone = member.Phone || '';
      
      const details = [];
      if (oldRank !== newRank) {
        member.Rank = newRank;
        details.push({ field: 'Rank', oldValue: oldRank, newValue: newRank });
      }
      if (oldDept !== newDept) {
        member.Department = newDept;
        details.push({ field: 'Department', oldValue: oldDept, newValue: newDept });
      }
      if (oldEmail !== newEmail) {
        member.Email = newEmail;
        details.push({ field: 'Email', oldValue: oldEmail, newValue: newEmail });
      }
      if (oldPhone !== newPhone) {
        member.Phone = newPhone;
        details.push({ field: 'Phone', oldValue: oldPhone, newValue: newPhone });
      }
      
      if (details.length > 0) {
        STATE.changelog.unshift({
          timestamp: new Date().toISOString(),
          userEmail: STATE.currentUser ? STATE.currentUser.email : 'admin@ukr-helicopters.ua',
          crewMember: member.Full_Name_EN || member.Full_Name_UA,
          crewType: member.crewType,
          type: 'MANUAL_EDIT',
          details: details
        });
        
        saveStateToStorage();
        showToast(STATE.lang === 'uk' ? 'Профіль успішно оновлено!' : 'Profile updated successfully!');
      }
      
      STATE.isEditingPortalProfile = false;
      switchView('personal-portal');
    });
    
    document.getElementById('btn-cancel-portal-edit').addEventListener('click', () => {
      STATE.isEditingPortalProfile = false;
      renderPersonalPortal();
    });
    
  } else {
    // Render static profile details
    profileDetails.innerHTML = `
      ${avatarHtml}
      <div><strong>Прізвище Ім'я:</strong> ${member.Full_Name_UA}</div>
      <div><strong>Name:</strong> ${member.Full_Name_EN}</div>
      <div><strong>Посада / Rank:</strong> <span class="status-badge status-neutral">${member.Rank}</span></div>
      <div><strong>Відділ / Dept:</strong> ${member.Department}</div>
      <div><strong>Email:</strong> ${member.Email}</div>
      <div><strong>Phone:</strong> ${member.Phone || '-'}</div>
      ${member.LICENSE ? `<div><strong>License:</strong> <code>${member.LICENSE}</code></div>` : ''}
    `;
    
    // Wire up Edit button click event
    if (editProfileBtn) {
      const newEditBtn = editProfileBtn.cloneNode(true);
      editProfileBtn.parentNode.replaceChild(newEditBtn, editProfileBtn);
      newEditBtn.addEventListener('click', () => {
        STATE.isEditingPortalProfile = true;
        renderPersonalPortal();
      });
    }
  }

  // Attach photo upload events if Admin
  if (role === ROLES.ADMIN) {
    const uploadBtn = document.getElementById('btn-upload-photo');
    const fileInput = document.getElementById('photo-file-input');
    
    if (uploadBtn && fileInput) {
      const newUploadBtn = uploadBtn.cloneNode(true);
      uploadBtn.parentNode.replaceChild(newUploadBtn, uploadBtn);
      
      const newFileInput = fileInput.cloneNode(true);
      fileInput.parentNode.replaceChild(newFileInput, fileInput);
      
      newUploadBtn.addEventListener('click', () => {
        newFileInput.click();
      });
      
      newFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        // Show spinner
        const spinner = document.getElementById('avatar-spinner');
        if (spinner) spinner.style.display = 'flex';
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            // Resize using canvas to 200x200px
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            
            // Center crop/fit logic
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 200, 200);
            
            // Export compact JPEG
            const base64Data = canvas.toDataURL('image/jpeg', 0.8);
            
            // Sync to simulated Google Drive
            simulateDrivePhotoUpload(member, base64Data, (res) => {
              if (spinner) spinner.style.display = 'none';
              
              if (res.success) {
                // Save base64 to member photo
                member.photo = base64Data;
                
                // Write audit log entry
                const timestamp = new Date().toISOString();
                const editorEmail = STATE.currentUser ? STATE.currentUser.email : 'admin@ukr-helicopters.ua';
                STATE.changelog.unshift({
                  timestamp,
                  userEmail: editorEmail,
                  crewMember: member.Full_Name_EN || member.Full_Name_UA,
                  crewType: member.crewType,
                  type: 'MANUAL_EDIT',
                  details: [{
                    field: 'photo',
                    oldValue: 'none',
                    newValue: `Uploaded photo to Google Drive: ${res.folder}/photo.jpg`
                  }]
                });
                
                // Persist state
                saveStateToStorage();
                
                // Show success toast
                const successMsg = STATE.lang === 'uk' ? 'Фото успішно завантажено та збережено!' : 'Photo uploaded and saved successfully!';
                showToast(successMsg);
                
                // Update UI elements directly
                const avatarImg = document.getElementById('avatar-image');
                const avatarPl = document.getElementById('avatar-placeholder');
                if (avatarImg && avatarPl) {
                  avatarImg.src = base64Data;
                  avatarImg.style.display = 'block';
                  avatarPl.style.display = 'none';
                }
              } else {
                const errorMsg = STATE.lang === 'uk' ? 'Помилка завантаження фото: ' : 'Error uploading photo: ';
                showToast(errorMsg + res.error, 'error');
              }
            });
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }
  }
  
  // Render Expirations Grid
  expiriesGrid.innerHTML = '';
  const crewConfig = CREW_COMPLIANCE_RULES.CREW_TYPES[member.crewType];
  const sysDate = STATE.settings.referenceDate;
  
  Object.keys(crewConfig.columnMapping).forEach(colName => {
    if (['Rank', 'Department', 'Name_Shrt_UA', 'Full_Name_UA', 'Full_Name_EN'].includes(colName)) return;
    
    const ruleKey = crewConfig.columnMapping[colName];
    const val = member[colName] || '';
    
    if (isExpiring(ruleKey)) {
      const status = determineStatus(val, sysDate, ruleKey);
      const theme = CREW_COMPLIANCE_RULES.STATUS_THEME[status];
      const label = theme.label[STATE.lang];
      
      expiriesGrid.insertAdjacentHTML('beforeend', `
        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--spacing-3); display:flex; flex-direction:column; gap:4px; align-items:center; text-align:center; background-color: var(--bg-surface-alt);">
          <div style="font-size:12px; font-weight:700; font-family:var(--font-display);">${colName}</div>
          <span class="status-badge ${theme.class}" style="font-size:10px; padding: 2px 6px;">${label}</span>
          <div style="font-size:13px; font-weight:600; margin-top:2px;">${val ? formatDateUa(val) : '-'}</div>
        </div>
      `);
    }
  });

  // Render Additional Trainings Grid
  const additionalGrid = document.getElementById('portal-additional-grid');
  if (additionalGrid) {
    additionalGrid.innerHTML = '';
    
    const additionalCols = member.crewType === 'Flight' 
      ? ['GI 275_T', 'GI 275_PRCT', 'BIRD STRIKE', 'MSB', 'PALL', 'HESLO_T', 'HESLO_PRCT', 'HHO_T', 'HHO_PRCT']
      : ['Resc', 'Rappel', 'Hoist', 'EOIR', 'NAIROBI'];
      
    additionalCols.forEach(colName => {
      const val = member[colName] || '';
      const status = val ? 'NEUTRAL' : 'MISSING';
      const theme = CREW_COMPLIANCE_RULES.STATUS_THEME[status];
      const label = theme.label[STATE.lang];
      
      additionalGrid.insertAdjacentHTML('beforeend', `
        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--spacing-3); display:flex; flex-direction:column; gap:4px; align-items:center; text-align:center; background-color: var(--bg-surface-alt);">
          <div style="font-size:12px; font-weight:700; font-family:var(--font-display);">${colName}</div>
          <span class="status-badge ${theme.class}" style="font-size:10px; padding: 2px 6px;">${label}</span>
          <div style="font-size:13px; font-weight:600; margin-top:2px;">${val ? formatDateUa(val) : '-'}</div>
        </div>
      `);
    });
  }
  
  // Initialize default scans if missing
  if (!member.scans) {
    member.scans = [
      { name: 'OPC 2026', fileName: `${member.Full_Name_EN.replace(/\s+/g, '_')}_OPC_2026.pdf`, dateAdded: '2026-07-15' },
      { name: 'Medical Certificate', fileName: `Medical_Certificate_${member.Full_Name_EN.split(/\s+/)[1] || 'Crew'}.pdf`, dateAdded: '2026-07-15' }
    ];
  }

  // Render scans list
  documentsList.innerHTML = '';
  member.scans.forEach((scan, scanIdx) => {
    documentsList.insertAdjacentHTML('beforeend', `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--spacing-3); border:1px solid var(--border-color); border-radius:var(--radius-md); font-size:13px; background-color: var(--bg-surface-alt);">
        <div style="display:flex; align-items:center; gap:8px;">
          <i data-lucide="file-text" style="color:var(--accent);"></i>
          <span style="font-weight: 500;">${scan.name}</span>
          <span style="font-size:11px; color:var(--text-secondary);">(${scan.fileName})</span>
        </div>
        <div style="display:flex; gap: var(--spacing-2);">
          <button class="btn btn-secondary" style="height:32px; padding:0 8px;" onclick="alert('Скачування скан-копії: ${scan.fileName} ...')">
            <i data-lucide="download" style="width:14px; height:14px;"></i>
          </button>
          ${role === ROLES.ADMIN ? `
          <button class="btn btn-secondary btn-delete-scan" data-index="${scanIdx}" style="height:32px; padding:0 8px; border-color: var(--danger-color); color: var(--danger-color);" title="Delete scan">
            <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
          </button>
          ` : ''}
        </div>
      </div>
    `);
  });

  // Attach delete handlers for scans
  if (role === ROLES.ADMIN) {
    document.querySelectorAll('.btn-delete-scan').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const deletedScan = member.scans[idx];
        member.scans.splice(idx, 1);
        
        // Log to changelog
        STATE.changelog.unshift({
          timestamp: new Date().toISOString(),
          userEmail: STATE.currentUser ? STATE.currentUser.email : 'admin@ukr-helicopters.ua',
          crewMember: member.Full_Name_EN || member.Full_Name_UA,
          crewType: member.crewType,
          type: 'MANUAL_EDIT',
          details: [{
            field: 'scans',
            oldValue: deletedScan.name,
            newValue: 'removed'
          }]
        });
        
        saveStateToStorage();
        showToast(STATE.lang === 'uk' ? 'Скан-копію видалено!' : 'Scan document removed!');
        renderPersonalPortal();
      });
    });
  }

  // Show / Hide scan button for admin
  const scanBtn = document.getElementById('btn-scan-document');
  if (scanBtn) {
    scanBtn.style.display = role === ROLES.ADMIN ? 'inline-flex' : 'none';
    
    const newScanBtn = scanBtn.cloneNode(true);
    scanBtn.parentNode.replaceChild(newScanBtn, scanBtn);
    
    newScanBtn.addEventListener('click', () => {
      // Dynamically populate select dropdown based on crew type
      const docTypeSelect = document.getElementById('scan-doc-type');
      if (docTypeSelect) {
        docTypeSelect.innerHTML = '';
        
        // Expirations columns
        const expiringKeys = Object.keys(crewConfig.columnMapping).filter(colName => 
          !['Rank', 'Department', 'Name_Shrt_UA', 'Full_Name_UA', 'Full_Name_EN'].includes(colName)
        );
        
        // Additional columns
        const additionalCols = member.crewType === 'Flight' 
          ? ['GI 275_T', 'GI 275_PRCT', 'BIRD STRIKE', 'MSB', 'PALL', 'HESLO_T', 'HESLO_PRCT', 'HHO_T', 'HHO_PRCT']
          : ['Resc', 'Rappel', 'Hoist', 'EOIR', 'NAIROBI'];
          
        const allTypes = [...expiringKeys, ...additionalCols];
        allTypes.forEach(t => {
          const option = document.createElement('option');
          option.value = t;
          option.textContent = t;
          docTypeSelect.appendChild(option);
        });
      }
      
      document.getElementById('scan-doc-date').value = '';
      document.getElementById('scan-file-input').value = '';
      
      const submitBtn = document.getElementById('btn-submit-scan');
      submitBtn.disabled = false;
      submitBtn.innerHTML = STATE.lang === 'uk' ? 'Сканувати' : 'Scan';
      
      document.getElementById('scan-modal-backdrop').classList.add('active');
    });
  }

  // Setup Scan modal submit handler
  const scanForm = document.getElementById('scan-modal-form');
  if (scanForm) {
    scanForm.onsubmit = (e) => {
      e.preventDefault();
      
      const selectedType = document.getElementById('scan-doc-type').value;
      const completionDate = document.getElementById('scan-doc-date').value;
      const fileInput = document.getElementById('scan-file-input');
      const file = fileInput.files[0];
      if (!file || !completionDate) return;
      
      const submitBtn = document.getElementById('btn-submit-scan');
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i data-lucide="loader-2" class="spin" style="width: 14px; height: 14px; margin-right: 6px;"></i> ${STATE.lang === 'uk' ? 'Сканування...' : 'Scanning...'}`;
      if (window.lucide) window.lucide.createIcons();
      
      // Determine saving date (recalculate expiry if expiring training)
      let ruleKey = crewConfig.columnMapping[selectedType] || selectedType;
      // Handle CC_Type logic override
      if (member.crewType === 'Cabin' && selectedType === 'CC_Type') {
        ruleKey = 'Type';
      }
      
      let dateToSave = completionDate;
      let notificationMsg = '';
      
      if (isExpiring(ruleKey)) {
        dateToSave = calculateExpiryDate(completionDate, ruleKey, member.crewType);
        notificationMsg = STATE.lang === 'uk' 
          ? `Термін дії для ${selectedType} автоматично розраховано до ${formatDateUa(dateToSave)}`
          : `Expiry date for ${selectedType} automatically calculated to ${dateToSave}`;
      } else {
        notificationMsg = STATE.lang === 'uk'
          ? `Дату проходження ${selectedType} встановлено на ${formatDateUa(dateToSave)}`
          : `Completion date for ${selectedType} set to ${dateToSave}`;
      }
      
      // Generate filename format: TYPE_OF_TRAINING_Full_Name_EN_currentYEAR.ext
      const cleanTypeName = selectedType.replace(/\s+/g, '_');
      const cleanName = member.Full_Name_EN.trim().replace(/\s+/g, '_');
      const currentYear = new Date().getFullYear();
      const fileExt = file.name.substring(file.name.lastIndexOf('.'));
      const generatedFileName = `${cleanTypeName}_${cleanName}_${currentYear}${fileExt}`;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileData = event.target.result;
        
        simulateDriveDocumentUpload(member, selectedType, generatedFileName, fileData, (res) => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = STATE.lang === 'uk' ? 'Сканувати' : 'Scan';
          
          if (res.success) {
            // Update personal table date
            member[selectedType] = dateToSave;
            
            // Add to crew member's scan list
            if (!member.scans) {
              member.scans = [];
            }
            member.scans.push({
              name: selectedType,
              fileName: generatedFileName,
              fileData: fileData,
              dateAdded: new Date().toISOString().split('T')[0]
            });
            
            // Log to audit log
            STATE.changelog.unshift({
              timestamp: new Date().toISOString(),
              userEmail: STATE.currentUser ? STATE.currentUser.email : 'admin@ukr-helicopters.ua',
              crewMember: member.Full_Name_EN || member.Full_Name_UA,
              crewType: member.crewType,
              type: 'MANUAL_EDIT',
              details: [
                {
                  field: selectedType,
                  oldValue: 'empty',
                  newValue: dateToSave
                },
                {
                  field: 'scans',
                  oldValue: 'none',
                  newValue: `Scanned document "${selectedType}" uploaded as "${generatedFileName}" to Drive folder: ${res.folder}`
                }
              ]
            });
            
            saveStateToStorage();
            document.getElementById('scan-modal-backdrop').classList.remove('active');
            
            showToast(STATE.lang === 'uk' ? 'Документ збережено, таблицю оновлено!' : 'Document saved and table updated!');
            if (notificationMsg) {
              showToast(notificationMsg);
            }
            
            renderPersonalPortal();
          } else {
            showToast(res.error || 'Scan failed', 'error');
          }
        });
      };
      reader.readAsDataURL(file);
    };
  }
  
  // Close / cancel scan modal events
  const closeScanBtn = document.getElementById('btn-close-scan-modal');
  if (closeScanBtn) {
    closeScanBtn.onclick = () => {
      document.getElementById('scan-modal-backdrop').classList.remove('active');
    };
  }
  const cancelScanBtn = document.getElementById('btn-cancel-scan-modal');
  if (cancelScanBtn) {
    cancelScanBtn.onclick = () => {
      document.getElementById('scan-modal-backdrop').classList.remove('active');
    };
  }

  // Re-initialize Lucide Icons for dynamic content
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Handles the login form verification
 */
function handleLoginSubmit(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass = document.getElementById('login-password').value;
  
  if (!email || !pass) return;
  
  // 1. Check Hardcoded credentials first for test roles
  let role = null;
  if (email === 'admin@ukr-helicopters.ua') {
    role = ROLES.ADMIN;
  } else if (email === 'instructor@ukr-helicopters.ua') {
    role = ROLES.INSTRUCTOR;
  } else if (email === 'office@ukr-helicopters.ua') {
    role = ROLES.OFFICE;
  } else {
    // 2. Check if email exists in database
    const allCrew = [...STATE.flightCrew, ...STATE.cabinCrew];
    const member = allCrew.find(c => c.Email && c.Email.trim().toLowerCase() === email);
    
    if (member) {
      role = ROLES.CREW;
      
      // Verify password set in LocalStorage
      const savedPass = localStorage.getItem(`aerocheck_pass_${email}`);
      if (!savedPass) {
        // First login: open password setup modal
        document.getElementById('pw-setup-backdrop').classList.add('active');
        return;
      } else if (savedPass !== pass) {
        showToast("Невірний пароль для цього профілю", "error");
        return;
      }
    } else {
      showToast("Користувача з такою поштою не знайдено", "error");
      return;
    }
  }
  
  executeLogin(email, role);
}

/**
 * Logs the session in and updates views/permissions
 */
function executeLogin(email, role) {
  STATE.currentUser = { email, role };
  sessionStorage.setItem('aerocheck_session_user', JSON.stringify(STATE.currentUser));
  
  // Show UI elements corresponding to roles
  document.getElementById('user-email-display').textContent = email;
  document.getElementById('user-role-display').textContent = role;
  document.getElementById('login-backdrop').style.display = 'none';
  
  // Hide settings and forms button for unauthorized roles
  document.getElementById('nav-btn-settings').style.display = role === ROLES.ADMIN ? 'flex' : 'none';
  document.getElementById('nav-btn-forms').style.display = (role === ROLES.ADMIN || role === ROLES.OFFICE) ? 'flex' : 'none';
  document.getElementById('nav-btn-flights').style.display = (role === ROLES.ADMIN || role === ROLES.INSTRUCTOR) ? 'flex' : 'none';
  
  // Hide action buttons in table lists for non-editors
  const isEditor = role === ROLES.ADMIN || role === ROLES.INSTRUCTOR;
  document.querySelectorAll('.action-btn-admin').forEach(btn => {
    btn.style.display = isEditor ? 'flex' : 'none';
  });
  
  if (role === ROLES.CREW) {
    document.getElementById('nav-btn-flight').style.display = 'none';
    document.getElementById('nav-btn-cabin').style.display = 'none';
    document.getElementById('nav-btn-flights').style.display = 'none';
    document.getElementById('nav-btn-forms').style.display = 'none';
    document.getElementById('nav-btn-settings').style.display = 'none';
    document.getElementById('nav-btn-portal').style.display = 'flex';
    switchView('personal-portal');
  } else {
    document.getElementById('nav-btn-flight').style.display = 'flex';
    document.getElementById('nav-btn-cabin').style.display = 'flex';
    document.getElementById('nav-btn-portal').style.display = 'none';
    switchView('dashboard');
  }
  
  showToast(`Вітаємо, ви увійшли як ${role}`);
}

/**
 * Executes a manual Google Drive sync simulation
 */
function triggerManualSync() {
  const syncBtn = document.getElementById('btn-manual-sync');
  const syncBtnText = syncBtn.querySelector('span');
  const syncBtnIcon = syncBtn.querySelector('svg');
  
  const statusIndicator = document.getElementById('sync-status-indicator');
  const statusDot = document.getElementById('sync-status-dot');
  const statusText = document.getElementById('sync-status-text');
  
  syncBtn.disabled = true;
  if (syncBtnIcon) syncBtnIcon.style.animation = 'spin 1s linear infinite';
  
  statusDot.style.backgroundColor = 'var(--badge-warning-color)';
  statusText.textContent = TRANSLATIONS[STATE.lang].sync_updating;
  statusIndicator.className = 'status-badge status-warning';
  
  simulateDriveSync({
    flightCrew: STATE.flightCrew,
    cabinCrew: STATE.cabinCrew,
    changelog: STATE.changelog
  }, (res) => {
    syncBtn.disabled = false;
    if (syncBtnIcon) syncBtnIcon.style.animation = 'none';
    
    if (res.success) {
      showToast("Дані успішно синхронізовано з Google Диском!");
      statusDot.style.backgroundColor = 'var(--badge-valid-color)';
      statusText.textContent = TRANSLATIONS[STATE.lang].sync_success;
      statusIndicator.className = 'status-badge status-valid';
    } else {
      showToast("Помилка синхронізації: " + res.error, "error");
      statusDot.style.backgroundColor = 'var(--badge-expired-color)';
      statusText.textContent = "Помилка";
      statusIndicator.className = 'status-badge status-expired';
    }
  });
}

/**
 * Renders the import update details in a modal report
 */
function renderImportReport(logs) {
  const body = document.getElementById('import-report-body');
  
  if (logs.length === 0) {
    body.innerHTML = `
      <div style="text-align: center; padding: var(--spacing-6) 0;">
        <i data-lucide="check-circle-2" style="width: 48px; height: 48px; color: var(--badge-valid-color); margin-bottom: var(--spacing-3); display: block; margin-left: auto; margin-right: auto;"></i>
        <div style="font-weight: 700; font-size: 15px;">Жодних нових змін не виявлено</div>
        <div style="color: var(--text-secondary); margin-top: 4px; font-size: 12px;">Всі дані у локальній базі є актуальними.</div>
      </div>
    `;
  } else {
    let html = `
      <div style="margin-bottom: var(--spacing-4); padding: var(--spacing-3); background-color: var(--bg-surface-alt); border-radius: var(--radius-md); border-left: 4px solid var(--accent); font-size: 14px;">
        <strong>Загальний підсумок:</strong> Оновлено профілів екіпажу: <strong>${logs.length}</strong>.
      </div>
      <div style="display: flex; flex-direction: column; gap: var(--spacing-4); max-height: 450px; overflow-y: auto; padding-right: 4px;">
    `;
    
    logs.forEach(log => {
      const isAdd = log.type === 'CREW_ADD';
      const badgeClass = isAdd ? 'status-valid' : 'status-warning';
      const typeLabel = isAdd ? 'Додано' : 'Оновлено';
      
      html += `
        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--spacing-3); background-color: var(--bg-surface);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-2);">
            <span style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${log.crewMember}</span>
            <span class="status-badge ${badgeClass}" style="font-size: 10px; padding: 2px 6px;">${typeLabel} (${log.crewType})</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; padding-left: var(--spacing-2); border-left: 2px solid var(--border-color);">
      `;
      
      log.details.forEach(det => {
        if (isAdd) {
          html += `<div style="font-size: 12px; color: var(--text-secondary);">${det.newValue}</div>`;
        } else {
          const oldDisplay = det.oldValue === 'empty' ? 'немає' : det.oldValue;
          const newDisplay = det.newValue;
          html += `
            <div style="font-size: 12px; color: var(--text-primary);">
              <strong>${det.field}</strong>: <span style="text-decoration: line-through; color: var(--text-secondary);">${oldDisplay}</span> ➡️ <span style="font-weight: 600; color: var(--badge-valid-color);">${newDisplay}</span>
            </div>
          `;
        }
      });
      
      html += `
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
    body.innerHTML = html;
  }
  
  // Show modal
  document.getElementById('import-report-backdrop').classList.add('active');
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Handles full database update Excel upload (merging both Flight and Cabin lists)
 */
async function handleDatabaseExcelUpdate(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  showToast("Зчитування файлу Excel...");
  try {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      const parsed = parseCrewXlsx(arrayBuffer);
      
      showToast("Співставлення даних (Smart Merge)...");
      const flightMerged = mergeCrewData(STATE.flightCrew, parsed.flightCrew, STATE.currentUser.email);
      const cabinMerged = mergeCrewData(STATE.cabinCrew, parsed.cabinCrew, STATE.currentUser.email);
      
      // Update state
      STATE.flightCrew = flightMerged.mergedList;
      STATE.cabinCrew = cabinMerged.mergedList;
      
      // Combine changelogs
      const allNewLogs = [...flightMerged.changelogEntries, ...cabinMerged.changelogEntries];
      STATE.changelog.push(...allNewLogs);
      
      saveStateToStorage();
      
      // Render report modal dialog
      renderImportReport(allNewLogs);
      
      switchView(STATE.currentView);
      // Reset input
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  } catch (err) {
    showToast("Помилка оновлення бази: " + err.message, "error");
    e.target.value = '';
  }
}

/**
 * Bootstraps the application database. If cached storage is empty,
 * it fetches the database XLSX file in background and initializes cache.
 */
async function bootstrapDatabase() {
  const localFlight = localStorage.getItem('aerocheck_flight_crew');
  const localCabin = localStorage.getItem('aerocheck_cabin_crew');
  const localChangelog = localStorage.getItem('aerocheck_changelog');
  const localSettings = localStorage.getItem('aerocheck_settings');
  
  if (localFlight && localCabin) {
    // Load cached state
    STATE.flightCrew = JSON.parse(localFlight);
    STATE.cabinCrew = JSON.parse(localCabin);
    STATE.flights = JSON.parse(localStorage.getItem('aerocheck_flights') || '[]');
    
    // Auto-fix any transliterated Name_Shrt_UA if Full_Name_UA is in Cyrillic
    let migrated = false;
    [STATE.flightCrew, STATE.cabinCrew].forEach(list => {
      list.forEach(member => {
        if (member.Name_Shrt_UA && member.Full_Name_UA) {
          const hasEnglish = /[a-zA-Z]/.test(member.Name_Shrt_UA);
          const hasCyrillicFull = /[а-яА-ЯёЁіІїЇєЄґҐ]/.test(member.Full_Name_UA);
          if (hasEnglish && hasCyrillicFull) {
            const nameParts = member.Full_Name_UA.trim().split(/\s+/);
            member.Name_Shrt_UA = nameParts[0] + ' ' + 
                                  (nameParts[1] ? nameParts[1][0] + '.' : '') + 
                                  (nameParts[2] ? nameParts[2][0] + '.' : '');
            migrated = true;
          }
        }
      });
    });
    if (migrated) {
      saveStateToStorage();
    }
    
    STATE.changelog = localChangelog ? JSON.parse(localChangelog) : [];
    if (localSettings) {
      STATE.settings = JSON.parse(localSettings);
      
      let settingsUpdated = false;
      // Auto-migration: ensure the new flight columns are added if missing
      const newCols = ['GI 275_T', 'GI 275_PRCT', 'BIRD STRIKE', 'MSB', 'PALL', 'HESLO_T', 'HESLO_PRCT', 'HHO_T', 'HHO_PRCT'];
      newCols.forEach(col => {
        if (!STATE.settings.visibleColumnsFlight.includes(col)) {
          STATE.settings.visibleColumnsFlight.push(col);
          settingsUpdated = true;
        }
      });
      
      // Auto-migration: ensure the new cabin columns are added if missing
      const newCabinCols = ['Resc', 'Rappel', 'Hoist', 'EOIR', 'NAIROBI'];
      newCabinCols.forEach(col => {
        if (!STATE.settings.visibleColumnsCabin.includes(col)) {
          STATE.settings.visibleColumnsCabin.push(col);
          settingsUpdated = true;
        }
      });
      
      if (settingsUpdated) {
        saveStateToStorage();
      }
    }
    initAppComponents();
  } else {
    // Cache is empty: bootstrap from Excel file automatically
    showToast("Ініціалізація бази даних з файлу Excel...");
    try {
      const res = await fetch('DATABASE/Training_level_FLIGHT_and CABIN.xlsx');
      if (!res.ok) throw new Error("Excel file not found in DATABASE/ folder");
      
      const buffer = await res.arrayBuffer();
      const parsed = parseCrewXlsx(buffer);
      
      STATE.flightCrew = parsed.flightCrew;
      STATE.cabinCrew = parsed.cabinCrew;
      STATE.flights = [];
      STATE.changelog = [{
        timestamp: new Date().toISOString(),
        userEmail: 'system@aerocheck.com',
        crewMember: 'All Systems',
        crewType: 'System',
        type: 'MERGE_IMPORT',
        details: [{ field: 'database', oldValue: 'empty', newValue: 'Bootstrap database from excel sheet' }]
      }];
      
      saveStateToStorage();
      showToast("Базу даних успішно ініціалізовано!");
      initAppComponents();
    } catch (e) {
      console.error(e);
      showToast("Помилка ініціалізації бази: " + e.message, "error");
      initAppComponents();
    }
  }
}

/**
 * Sets up all UI listeners and displays initial workspace screens
 */
function initAppComponents() {
  // Restore session if exists
  const activeSession = sessionStorage.getItem('aerocheck_session_user');
  if (activeSession) {
    const session = JSON.parse(activeSession);
    executeLogin(session.email, session.role);
  } else {
    // Show login page
    document.getElementById('login-backdrop').style.display = 'flex';
  }
  
  // Set reference dates in settings
  document.getElementById('sidebar-ref-date').textContent = STATE.settings.referenceDate;
  
  populateSelectors();
}

// ================= BIND EVENT LISTENERS & INITS =================
document.addEventListener('DOMContentLoaded', () => {
  // Switch theme toggle
  document.getElementById('theme-toggle').addEventListener('click', () => {
    STATE.theme = STATE.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', STATE.theme);
    
    // Switch icon
    const themeIcon = document.getElementById('theme-icon');
    themeIcon.setAttribute('data-lucide', STATE.theme === 'light' ? 'moon' : 'sun');
    if (window.lucide) window.lucide.createIcons();
  });
  
  // Language toggle
  document.getElementById('lang-toggle').addEventListener('click', () => {
    STATE.lang = STATE.lang === 'uk' ? 'en' : 'uk';
    updateTranslations();
    switchView(STATE.currentView);
  });
  
  // Tab Routing
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      switchView(view);
    });
  });
  
  // Login Form Submission
  document.getElementById('login-form').addEventListener('submit', handleLoginSubmit);
  
  // First-time Password Configuration Form Submission
  document.getElementById('pw-setup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-password').value;
    
    if (pass !== confirm) {
      showToast("Паролі не співпадають", "error");
      return;
    }
    
    localStorage.setItem(`aerocheck_pass_${email}`, pass);
    document.getElementById('pw-setup-backdrop').classList.remove('active');
    document.getElementById('pw-setup-form').reset();
    
    executeLogin(email, ROLES.CREW);
  });
  
  // Logout Button click handler
  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('aerocheck_session_user');
    STATE.currentUser = null;
    document.getElementById('login-backdrop').style.display = 'flex';
    document.getElementById('login-form').reset();
  });
  
  // Search Inputs change triggers
  document.getElementById('flight-search').addEventListener('input', () => renderCrewTable('Flight'));
  document.getElementById('flight-filter-rank').addEventListener('change', () => renderCrewTable('Flight'));
  document.getElementById('flight-filter-dept').addEventListener('change', () => renderCrewTable('Flight'));
  
  document.getElementById('cabin-search').addEventListener('input', () => renderCrewTable('Cabin'));
  document.getElementById('cabin-filter-rank').addEventListener('change', () => renderCrewTable('Cabin'));
  document.getElementById('cabin-filter-dept').addEventListener('change', () => renderCrewTable('Cabin'));
  
  // Modal Edit Dialog triggers
  document.getElementById('btn-close-crew-modal').addEventListener('click', () => {
    document.getElementById('crew-modal-backdrop').classList.remove('active');
  });
  document.getElementById('btn-cancel-crew-modal').addEventListener('click', () => {
    document.getElementById('crew-modal-backdrop').classList.remove('active');
  });
  document.getElementById('crew-modal-form').addEventListener('submit', handleCrewModalSubmit);
  
  // Date selection prompt confirms
  document.getElementById('btn-submit-date-prompt').addEventListener('click', () => {
    const selected = document.querySelector('input[name="date-type"]:checked').value;
    document.getElementById('date-prompt-backdrop').classList.remove('active');
    if (activeDatePromptResolver) {
      activeDatePromptResolver(selected);
      activeDatePromptResolver = null;
    }
  });
  
  // Admin button crew additions
  document.getElementById('btn-add-crew-flight').addEventListener('click', () => {
    openCrewEditModal(null);
  });
  document.getElementById('btn-add-crew-cabin').addEventListener('click', () => {
    openCrewEditModal(null);
  });
  
  // Flights Form submit
  document.getElementById('training-flight-form').addEventListener('submit', handleTrainingFlightSubmit);
  
  // Add crew member button click listener
  document.getElementById('btn-add-crew-member').addEventListener('click', () => {
    addCrewMemberCard();
  });
  
  // Setup listeners for time calculations
  ['flight-pre-bgn', 'flight-pre-end', 'flight-post-bgn', 'flight-post-end'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateTimeCalculations);
  });
  
  // Manual sync with Google Drive
  document.getElementById('btn-manual-sync').addEventListener('click', triggerManualSync);
  document.getElementById('sync-status-indicator').addEventListener('click', triggerManualSync);
  
  // Settings values change triggers
  document.getElementById('settings-ref-date').addEventListener('change', (e) => {
    STATE.settings.referenceDate = e.target.value;
    document.getElementById('sidebar-ref-date').textContent = e.target.value;
    saveStateToStorage();
    showToast("Системну дату розрахунку змінено!");
  });
  
  document.getElementById('settings-auto-sync').addEventListener('change', (e) => {
    STATE.settings.autoSync = e.target.checked;
    saveStateToStorage();
  });
  
  document.getElementById('settings-date-prompt').addEventListener('change', (e) => {
    STATE.settings.datePrompt = e.target.checked;
    saveStateToStorage();
  });
  
  // Backup buttons triggers
  document.getElementById('btn-backup-json').addEventListener('click', () => {
    downloadBackupJson(STATE.flightCrew, STATE.cabinCrew, STATE.changelog, STATE.settings);
    showToast("Резервну копію JSON успішно збережено!");
  });
  
  document.getElementById('btn-backup-xlsx').addEventListener('click', () => {
    downloadBackupXlsx(STATE.flightCrew, STATE.cabinCrew);
    showToast("Базу даних XLSX успішно експортовано!");
  });
  
  // Excel File Manual Imports
  const handleExcelImport = async (e, crewType) => {
    const file = e.target.files[0];
    if (!file) return;
    
    showToast("Зчитування файлу Excel...");
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        const parsed = parseCrewXlsx(arrayBuffer);
        const importedList = crewType === 'Flight' ? parsed.flightCrew : parsed.cabinCrew;
        
        showToast("Співставлення даних (Smart Merge)...");
        const cachedList = crewType === 'Flight' ? STATE.flightCrew : STATE.cabinCrew;
        const mergeResult = mergeCrewData(cachedList, importedList, STATE.currentUser.email);
        
        if (crewType === 'Flight') {
          STATE.flightCrew = mergeResult.mergedList;
        } else {
          STATE.cabinCrew = mergeResult.mergedList;
        }
        
        STATE.changelog.push(...mergeResult.changelogEntries);
        saveStateToStorage();
        showToast(`Успішно імпортовано та об'єднано! Оновлено ${mergeResult.changelogEntries.length} профілів.`);
        
        switchView(STATE.currentView);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      showToast("Помилка імпорту Excel: " + err.message, "error");
    }
  };
  
  const fileFlight = document.getElementById('file-import-flight');
  const fileCabin = document.getElementById('file-import-cabin');
  
  document.getElementById('btn-import-flight').addEventListener('click', () => fileFlight.click());
  document.getElementById('btn-import-cabin').addEventListener('click', () => fileCabin.click());
  
  fileFlight.addEventListener('change', (e) => handleExcelImport(e, 'Flight'));
  fileCabin.addEventListener('change', (e) => handleExcelImport(e, 'Cabin'));
  
  // Settings crew deletions
  document.getElementById('btn-mgmt-delete').addEventListener('click', handleCrewMemberDelete);
  
  // Settings database update Excel import triggers
  const fileUpdateDbInput = document.getElementById('file-update-db');
  document.getElementById('btn-update-db-excel').addEventListener('click', () => fileUpdateDbInput.click());
  fileUpdateDbInput.addEventListener('change', handleDatabaseExcelUpdate);
  
  // Close import report modal
  document.getElementById('btn-close-import-report').addEventListener('click', () => {
    document.getElementById('import-report-backdrop').classList.remove('active');
  });
  
  // Close confirmation backdrops
  document.getElementById('btn-cancel-confirm').addEventListener('click', () => {
    document.getElementById('confirm-backdrop').classList.remove('active');
  });
  
  // Initiate databases
  bootstrapDatabase();
  
  // Update translation text
  updateTranslations();
  
  // Set up spinner styling animation in headers
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin { 100% { transform:rotate(360deg); } }
    @keyframes slideIn { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
  `;
  document.head.appendChild(style);
});
