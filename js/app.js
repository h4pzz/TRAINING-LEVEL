import { CREW_COMPLIANCE_RULES, isExpiring } from '../execution/compliance_rules.js';
import { parseCrewXlsx } from '../execution/excel_parser.js';
import { mergeCrewData } from '../execution/data_merger.js';
import { calculateExpiryDate, determineStatus } from '../execution/compliance_calculator.js';
import { 
  downloadBackupJson, 
  downloadBackupXlsx, 
  simulateDriveSync, 
  simulateDrivePhotoUpload, 
  simulateDriveDocumentUpload,
  getMemberNameEn,
  getMemberFolderPath,
  verifyAndCreateCrewFolders,
  testGoogleConnection
} from '../execution/drive_sync.js';
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
    label_personnel_count: "Персонал",
    label_of: "з",
    
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
    set_google_sync: "Google Drive & Sheets API",
    set_system_recommendations: "Рекомендовані системні налаштування",
    label_sync_mode: "Режим роботи API",
    label_google_client_id: "OAuth 2.0 Client ID / API Key",
    label_google_sheet_id: "Google Sheets Spreadsheet ID",
    label_google_drive_folder_id: "Google Drive Root Folder ID",
    label_sync_interval: "Інтервал автосинхронізації",
    btn_save_sync_settings: "Зберегти API",
    btn_test_connection: "Тест з'єднання",
    btn_verify_crew_folders: "Папки екіпажу (NAME_EN)",
    label_alert_days: "Попередження (днів)",
    label_critical_days: "Критичний термін (днів)",
    label_date_format: "Формат дати",
    label_backup_retention: "Кількість резервних копій у пам'яті",
    btn_save_system_settings: "Зберегти системні налаштування",
    modal_folders_title: "Реєстр особистих папок екіпажу (NAME_EN)",
    label_reference_date: "Розрахункова дата системи",
    btn_manual_sync_drive: "Синхронізувати з Drive",
    set_columns: "Відображення стовпчиків",
    set_permissions: "Матриця прав доступу",
    set_crew_mgmt: "Керування персоналом",
    label_delete_crew: "Видалити члена екіпажу",
    btn_delete_crew_member: "Видалити співробітника",
    
    // Settings Tabs & Sections
    tab_sync: "Резервне копіювання та Синхронізація",
    tab_personnel: "Персонал та Доступ",
    tab_display: "Відображення",
    tab_forms: "Форми",
    tab_log: "Лог",
    forms_list_title: "Бланки для заповнення та друку",
    forms_list_desc: "Виберіть форму, додайте співробітників та сформуйте відомість для друку або збереження в PDF. Шаблони налаштовуються в Конструкторі форм.",
    btn_manage_forms: "Конструктор та редактор форм",
    label_sync_interval_card: "Періодичність синхронізації",

    // Forms Builder
    forms_builder_title: "Генератор та редактор форм (Бланків)",
    forms_builder_subtitle: "Налаштуйте структуру та поля бланків, які відображатимуться у розділі «Бланки»",
    label_select_template: "Виберіть форму для редагування:",
    btn_form_new: "+ Створити нову форму",
    form_step_1_logo: "1. Логотип та його позиція",
    label_logo_source: "Джерело логотипу:",
    opt_logo_standard: "Стандартний логотип (UH)",
    opt_logo_custom: "Завантажити власний файл...",
    opt_logo_none: "Без логотипу",
    label_logo_pos: "Позиція логотипу на бланку:",
    logo_pos_left: "Зліва",
    logo_pos_center: "По центру",
    logo_pos_right: "Справа",
    form_step_2_details: "2. Назва форми, орієнтація та відступи",
    label_form_title: "Назва форми (Заголовок)",
    label_form_code: "Номер / Код форми",
    label_form_subtitle: "Підзаголовок або інструкція (опціонально)",
    label_form_orientation: "Орієнтація аркуша (А4):",
    orient_portrait: "Книжкова (Портрет)",
    orient_landscape: "Альбомна (Ландшафт)",
    label_table_spacing: "Відступ між назвою та даними таблиці:",
    form_step_3_data: "3. Дані (вибір таблиці та колонок)",
    label_crew_source: "Джерело даних екіпажу:",
    opt_source_flight: "Льотний склад (FLIGHT_CREW)",
    opt_source_cabin: "Кабінний склад (CABIN_CREW)",
    label_select_cols: "Виберіть стовпчики для включення у бланк:",
    label_fit_single_line: "Вмістити інформацію в один рядок",
    desc_fit_single_line: "Масштабує розмір шрифту та відступи комірок, щоб уникнути переносу тексту і не виходити за межі документу",
    label_cell_padding: "Відступ всередині комірок (Cell Padding):",
    desc_cell_padding: "Регулює відстань від тексту до меж комірки (від 1px для максимальної компактності)",
    preset_padding_min: "1 px (Мін)",
    preset_padding_compact: "3 px (Компактний)",
    preset_padding_standard: "5 px (Стандарт)",
    preset_padding_spacious: "8 px (Просторий)",
    label_extra_grade: "Додати графу «Результат перевірки / Оцінка»",
    label_extra_validity: "Додати графу «Термін дії нового свідоцтва»",
    label_extra_remarks: "Додати графу «Зауваження інструктора»",
    form_step_4_footer: "4. Дата, посада та підпис (Нижній колонтитул)",
    label_date_format_form: "Формат відображення дат у бланку:",
    label_date_left: "Поле дати (зліва):",
    label_sign_rank: "Посада підписанта:",
    label_sign_name: "ПІБ підписанта:",
    label_sign_line: "Рядок для підпису:",
    btn_save_custom_form: "Зберегти налаштування форми",
    btn_preview_custom_form: "Друк / Preview",
    preview_title_live: "Попередній перегляд бланка (А4)",
    badge_live_preview: "Живе оновлення",
    
    // Blanks page multi-crew
    label_crew_select_blank: "Співробітники для бланка:",
    placeholder_select_crew: "+ Додати члена екіпажу до бланка...",
    btn_add_to_blank: "+ Додати",
    btn_select_all_crew: "Всі",
    btn_clear_crew_list: "Очистити",
    empty_blank_desc: "Порожній бланк (для ручного заповнення). Додайте одного або декількох співробітників, щоб сформувати заповнену відомість.",
    selected_crew_count: "Обрано співробітників:",
    btn_print_pdf: "Друк бланка / PDF",
    btn_print_roster: "Друк відомості / PDF",
    btn_edit_form: "Редагувати в генераторі",

    // Settings Tab 1: Sync & Backups extra keys
    set_sync_tables_title: "Таблиці Google Sheets для синхронізації",
    set_sync_tables_desc: "Окремі таблиці для обліку персоналу та реєстрації польотів:",
    label_sheet_personnel: "1. Таблиця персоналу (Flight & Cabin Crew)",
    badge_sheets_personnel: "Аркуші: Flight_Crew, Cabin_Crew",
    placeholder_sheet_personnel: "Google Sheet ID персоналу (напр. 1BxiMVs0XRA5...)",
    btn_sync_personnel: "Синхронізувати персонал",
    label_sheet_flights: "2. Таблиця польотів (Training Flights)",
    badge_sheets_flights: "Аркуш: Training_Flights",
    placeholder_sheet_flights: "Google Sheet ID польотів (напр. 1gHkl924Ksd...)",
    btn_sync_flights: "Синхронізувати польоти",
    btn_sync_all_now: "Синхронізувати всі таблиці зараз",
    set_backup_restore_title: "Резервне копіювання та Відновлення",
    label_backup_section_1: "1. Зробити резервну копію:",
    btn_backup_snapshot: "Зберегти швидкий знімок (Snapshot)",
    label_backup_section_2: "2. Відновити за допомогою резервної копії:",
    btn_restore_json: "Відновити стан з JSON файлу",
    btn_restore_excel: "Оновити базу з Excel (Smart Merge)",
    label_saved_snapshots: "Збережені локальні знімки:",
    label_last_sync: "Остання синхронізація:",

    // Settings Tab 2: Personnel & Access extra keys
    personnel_mgmt_title: "Керування персоналом (Додати / Видалити)",
    personnel_mgmt_subtitle: "Загальний реєстр співробітників льотного та кабінного складу",
    btn_add_personnel_modal: "+ Додати персонал",
    search_personnel_placeholder: "Пошук співробітника (ПІБ, посада, email)...",
    filter_all_categories: "Всі категорії",
    filter_flight_crew: "Льотний склад",
    filter_cabin_crew: "Кабінний склад",
    th_pers_type: "Тип",
    th_pers_name_ua: "ПІБ (Укр.)",
    th_pers_name_en: "ПІБ (Англ.)",
    th_pers_rank_dept: "Посада / Підрозділ",
    th_pers_email: "Email",
    th_pers_role: "Роль",
    th_pers_actions: "Дії",
    label_quick_delete: "Швидке видалення:",
    btn_quick_delete: "Видалити вибраного співробітника",
    permissions_title: "Налаштування прав доступу",
    roles_matrix_title: "Матриця ролей системи:",
    role_admin_desc: "ADMIN — Повний доступ: налаштування, бекапи, персонал, бланки.",
    role_instructor_desc: "INSTRUCTOR — Внесення польотів, редагування тренувань персоналу.",
    role_office_desc: "OFFICE — Перегляд списків екіпажу, завантаження та друк бланків.",
    role_crew_desc: "CREW — Особистий кабінет: перегляд власних сертифікатів.",
    user_accounts_title: "Облікові записи та призначення ролей:",
    btn_add_user: "+ Додати користувача",
    th_acc_email: "Email / Користувач",
    th_acc_role: "Поточна роль",
    th_acc_change_role: "Змінити роль",
    th_acc_actions: "Дії",
    modal_add_user_title: "Додати користувача",
    notifications_title: "Налаштування повідомлень",
    notifications_desc: "Автоматичні сповіщення про вихід термінів дії документів та оновлення кваліфікацій:",
    label_alert_days_input: "Попередження (жовтий рівень, днів)",
    label_critical_days_input: "Критичний термін (червоний, днів)",
    label_notify_email_input: "Email для зведених звітів",
    notify_opt_crew_update: "Сповіщати співробітника на Email при оновленні його документів",
    notify_opt_instructor_exp: "Сповіщати відповідального інструктора при настанні критичного терміну",
    notify_opt_weekly_digest: "Надсилати щотижневий звіт про закінчення термінів підготовок",
    notify_opt_inapp: "Показувати спливаючі повідомлення в системі (In-App)",
    btn_test_notification: "Тест сповіщення",
    btn_save_notifications: "Зберегти",

    // Settings Tab 3: Display extra keys
    columns_disp_title: "Відображення стовпчиків у таблицях",
    columns_disp_desc: "Двомовна версія налаштування: виберіть, які графи показувати в основних таблицях",
    btn_cols_select_all: "Вибрати всі",
    btn_cols_deselect_all: "Зняти всі",
    btn_cols_reset_default: "За замовчуванням",
    tab_crew_flight: "Льотний склад (Flight Crew)",
    tab_crew_cabin: "Кабінний склад (Cabin Crew)",
    rules_title: "Форматування та Розрахункові правила",
    label_date_format_select: "Формат відображення дати",
    label_ref_date_calc: "Розрахункова системна дата",
    rule_eom_title: "Правило останнього дня місяця (End of Month)",
    rule_eom_desc: "Для Flight Crew та перевірок OPC",
    rule_date_prompt_title: "Уточнювати тип дати при внесенні",
    rule_date_prompt_desc: "Діалог Completion vs Expiry Date",
    label_backup_retention_count: "Кількість резервних ревізій у пам'яті",
    btn_save_disp_settings: "Зберегти параметри відображення",

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
    label_personnel_count: "Personnel",
    label_of: "of",
    
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
    set_google_sync: "Google Drive & Sheets API",
    set_system_recommendations: "Recommended System Settings",
    label_sync_mode: "API Operation Mode",
    label_google_client_id: "OAuth 2.0 Client ID / API Key",
    label_google_sheet_id: "Google Sheets Spreadsheet ID",
    label_google_drive_folder_id: "Google Drive Root Folder ID",
    label_sync_interval: "Auto-sync Interval",
    btn_save_sync_settings: "Save API Settings",
    btn_test_connection: "Test Connection",
    btn_verify_crew_folders: "Crew Folders (NAME_EN)",
    label_alert_days: "Warning Alert (days)",
    label_critical_days: "Critical Expiry (days)",
    label_date_format: "Date Format",
    label_backup_retention: "Backup Snapshots Retention",
    btn_save_system_settings: "Save System Settings",
    modal_folders_title: "Crew Personal Folders Registry (NAME_EN)",
    label_reference_date: "System Reference Date",
    btn_manual_sync_drive: "Sync with Drive",
    set_columns: "Column Visibility",
    set_permissions: "Permissions Matrix",
    set_crew_mgmt: "Crew Management",
    label_delete_crew: "Remove Crew Member",
    btn_delete_crew_member: "Delete Employee",
    
    // Settings Tabs & Sections
    tab_sync: "Backup & Sync",
    tab_personnel: "Personnel & Access",
    tab_display: "Display",
    tab_forms: "Forms",
    tab_log: "Log",
    forms_list_title: "Printable Forms & Templates",
    forms_list_desc: "Select a form, add crew members to the roster, and print or export to PDF. Templates can be configured in the Form Generator.",
    btn_manage_forms: "Forms Generator & Editor",
    label_sync_interval_card: "Sync Frequency & Schedule",

    // Forms Builder
    forms_builder_title: "Forms Generator & Editor",
    forms_builder_subtitle: "Configure form structure and fields displayed in the Blank Forms section",
    label_select_template: "Select form template to edit:",
    btn_form_new: "+ Create New Template",
    form_step_1_logo: "1. Logo & Position",
    label_logo_source: "Logo Source:",
    opt_logo_standard: "Standard Logo (UH)",
    opt_logo_custom: "Upload Custom File...",
    opt_logo_none: "No Logo",
    label_logo_pos: "Logo Position on Sheet:",
    logo_pos_left: "Left",
    logo_pos_center: "Center",
    logo_pos_right: "Right",
    form_step_2_details: "2. Form Name, Orientation & Spacing",
    label_form_title: "Form Title (Header)",
    label_form_code: "Form Code / Number",
    label_form_subtitle: "Subtitle or Instructions (Optional)",
    label_form_orientation: "Page Orientation (A4):",
    orient_portrait: "Portrait",
    orient_landscape: "Landscape",
    label_table_spacing: "Spacing between Title and Table Data:",
    form_step_3_data: "3. Data (Source & Columns Selection)",
    label_crew_source: "Crew Data Source:",
    opt_source_flight: "Flight Crew (FLIGHT_CREW)",
    opt_source_cabin: "Cabin Crew (CABIN_CREW)",
    label_select_cols: "Select columns to include in blank:",
    label_fit_single_line: "Fit information on a single line",
    desc_fit_single_line: "Scales font size and cell padding to prevent line wrapping and page border overflow",
    label_cell_padding: "Cell Padding (Horizontal / Vertical):",
    desc_cell_padding: "Adjusts spacing between text and cell borders (down to 1px for maximum compactness)",
    preset_padding_min: "1 px (Min)",
    preset_padding_compact: "3 px (Compact)",
    preset_padding_standard: "5 px (Standard)",
    preset_padding_spacious: "8 px (Spacious)",
    label_extra_grade: "Add 'Check Result / Grade' column",
    label_extra_validity: "Add 'Validity Period' column",
    label_extra_remarks: "Add 'Instructor Remarks' column",
    form_step_4_footer: "4. Date, Position & Signature (Footer)",
    label_date_format_form: "Date display format in blank:",
    label_date_left: "Date field (left):",
    label_sign_rank: "Signatory rank:",
    label_sign_name: "Signatory full name:",
    label_sign_line: "Signature line:",
    btn_save_custom_form: "Save Form Settings",
    btn_preview_custom_form: "Print / Preview",
    preview_title_live: "Blank Live Preview (A4)",
    badge_live_preview: "Live Update",
    
    // Blanks page multi-crew
    label_crew_select_blank: "Crew members for blank:",
    placeholder_select_crew: "+ Add crew member to blank...",
    btn_add_to_blank: "+ Add",
    btn_select_all_crew: "All",
    btn_clear_crew_list: "Clear",
    empty_blank_desc: "Blank form (for manual handwriting). Add one or more crew members to generate a filled roster.",
    selected_crew_count: "Selected crew members:",
    btn_print_pdf: "Print Blank / PDF",
    btn_print_roster: "Print Roster / PDF",
    btn_edit_form: "Edit in Generator",

    // Settings Tab 1: Sync & Backups extra keys
    set_sync_tables_title: "Google Sheets for Synchronization",
    set_sync_tables_desc: "Dedicated spreadsheets for crew personnel and flight logs:",
    label_sheet_personnel: "1. Personnel Spreadsheet (Flight & Cabin Crew)",
    badge_sheets_personnel: "Sheets: Flight_Crew, Cabin_Crew",
    placeholder_sheet_personnel: "Personnel Google Sheet ID (e.g. 1BxiMVs0XRA5...)",
    btn_sync_personnel: "Sync Personnel",
    label_sheet_flights: "2. Flight Logs Spreadsheet (Training Flights)",
    badge_sheets_flights: "Sheet: Training_Flights",
    placeholder_sheet_flights: "Flights Google Sheet ID (e.g. 1gHkl924Ksd...)",
    btn_sync_flights: "Sync Flight Logs",
    btn_sync_all_now: "Sync All Tables Now",
    set_backup_restore_title: "Backup & Disaster Recovery",
    label_backup_section_1: "1. Create System Backup:",
    btn_backup_snapshot: "Save Fast Snapshot",
    label_backup_section_2: "2. Restore from Backup Archive:",
    btn_restore_json: "Restore State from JSON File",
    btn_restore_excel: "Update Database from Excel (Smart Merge)",
    label_saved_snapshots: "Saved Local Snapshots:",
    label_last_sync: "Last Synchronized:",

    // Settings Tab 2: Personnel & Access extra keys
    personnel_mgmt_title: "Personnel Management (Add / Delete)",
    personnel_mgmt_subtitle: "Master directory of flight and cabin crew members",
    btn_add_personnel_modal: "+ Add Personnel",
    search_personnel_placeholder: "Search crew (Name, rank, email)...",
    filter_all_categories: "All Categories",
    filter_flight_crew: "Flight Crew",
    filter_cabin_crew: "Cabin Crew",
    th_pers_type: "Type",
    th_pers_name_ua: "Full Name (UA)",
    th_pers_name_en: "Full Name (EN)",
    th_pers_rank_dept: "Rank / Department",
    th_pers_email: "Email",
    th_pers_role: "Role",
    th_pers_actions: "Actions",
    label_quick_delete: "Quick Delete:",
    btn_quick_delete: "Delete Selected Employee",
    permissions_title: "Access Control & Permissions",
    roles_matrix_title: "System Roles Matrix:",
    role_admin_desc: "ADMIN — Full access: settings, backups, personnel, templates.",
    role_instructor_desc: "INSTRUCTOR — Flight logging, training records editing.",
    role_office_desc: "OFFICE — View crew rosters, download and print forms.",
    role_crew_desc: "CREW — Personal portal: review personal certificates.",
    user_accounts_title: "User Accounts & Role Assignments:",
    btn_add_user: "+ Add User",
    th_acc_email: "Email / User",
    th_acc_role: "Current Role",
    th_acc_change_role: "Assign Role",
    th_acc_actions: "Actions",
    modal_add_user_title: "Add User",
    notifications_title: "Notification Settings",
    notifications_desc: "Automated alerts for expiring documents and qualification renewals:",
    label_alert_days_input: "Warning Threshold (Yellow, days)",
    label_critical_days_input: "Critical Threshold (Red, days)",
    label_notify_email_input: "Email for Summary Reports",
    notify_opt_crew_update: "Email employee upon document updates",
    notify_opt_instructor_exp: "Notify lead instructor when document reaches critical expiry",
    notify_opt_weekly_digest: "Send weekly preparation expiration digest",
    notify_opt_inapp: "Display in-app system notifications",
    btn_test_notification: "Test Alert",
    btn_save_notifications: "Save",

    // Settings Tab 3: Display extra keys
    columns_disp_title: "Column Visibility in Tables",
    columns_disp_desc: "Bilingual column setup: select which columns to show in main tables",
    btn_cols_select_all: "Select All",
    btn_cols_deselect_all: "Deselect All",
    btn_cols_reset_default: "Default Columns",
    tab_crew_flight: "Flight Crew",
    tab_crew_cabin: "Cabin Crew",
    rules_title: "Formatting & Calculation Rules",
    label_date_format_select: "Date Display Format",
    label_ref_date_calc: "Reference System Date",
    rule_eom_title: "End of Month Rule (EOM)",
    rule_eom_desc: "For Flight Crew and OPC checks",
    rule_date_prompt_title: "Prompt for Date Type on Entry",
    rule_date_prompt_desc: "Completion vs Expiry Date dialog",
    label_backup_retention_count: "Backup Snapshot Revisions Retention",
    btn_save_disp_settings: "Save Display Settings",

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

// ================= DEFAULT TEMPLATES & DICTIONARIES =================
const DEFAULT_FORMS = [
  {
    id: 'form-uh-f-22',
    name: 'Подання на присвоєння кваліфікації (Льотний склад)',
    code: 'Форма UH-F-22',
    subtitle: 'Авіакомпанія «Українські вертольоти» • Льотна служба',
    crewType: 'Flight',
    logo: 'PICS/LOGO_UH.png',
    logoPos: 'left',
    orientation: 'portrait',
    fitSingleLine: false,
    dateFormat: 'DD.MM.YYYY',
    tableSpacing: 20,
    cellPadding: 4,
    columns: ['Rank', 'Department', 'Full_Name_UA', 'OPC', 'LPC', 'Type', 'EMER_1', 'EMER_3', 'MED'],
    extraGrade: true,
    extraValidity: true,
    extraRemarks: false,
    dateText: 'Дата: «____» ___________ 202___ р.',
    signRank: 'Керівник льотної служби',
    signName: 'Ковальов В.О.'
  },
  {
    id: 'form-uh-c-09',
    name: 'Звіт про перевірку в польоті БП (Кабінний склад)',
    code: 'Форма UH-C-09',
    subtitle: 'Авіакомпанія «Українські вертольоти» • Служба бортпровідників',
    crewType: 'Cabin',
    logo: 'PICS/LOGO_UH.png',
    logoPos: 'center',
    orientation: 'landscape',
    fitSingleLine: true,
    dateFormat: 'DD.MM.YYYY',
    tableSpacing: 20,
    cellPadding: 3,
    columns: ['Rank', 'Department', 'Full_Name_UA', 'OPC', 'LPC', 'CC_Type', 'EMER_1', 'DG', 'AV_SEC', 'CRM'],
    extraGrade: true,
    extraValidity: true,
    extraRemarks: true,
    dateText: 'Дата: «____» ___________ 202___ р.',
    signRank: 'Начальник служби бортпровідників',
    signName: 'Сидоренко О.М.'
  },
  {
    id: 'form-uh-tr-01',
    name: 'Атестаційна відомість теоретичної підготовки',
    code: 'Форма UH-TR-01',
    subtitle: 'Навчально-тренувальний центр • Підсумковий контроль знань',
    crewType: 'Flight',
    logo: 'PICS/LOGO_UH.png',
    logoPos: 'right',
    orientation: 'portrait',
    fitSingleLine: false,
    dateFormat: 'DD.MM.YYYY',
    tableSpacing: 20,
    cellPadding: 4,
    columns: ['Rank', 'Full_Name_UA', 'DG', 'AV_SEC', 'CRM'],
    extraGrade: true,
    extraValidity: true,
    extraRemarks: false,
    dateText: 'Дата: «____» ___________ 202___ р.',
    signRank: 'Інструктор навчального центру',
    signName: 'Бондарчук В.П.'
  }
];

const BILINGUAL_COLUMNS = {
  Flight: [
    { key: 'Rank', ua: 'Посада', en: 'Rank' },
    { key: 'Department', ua: 'Підрозділ', en: 'Department' },
    { key: 'Name_Shrt_UA', ua: 'ПІБ скорочено (Укр.)', en: 'Short Name UA' },
    { key: 'Full_Name_UA', ua: 'ПІБ повне (Укр.)', en: 'Full Name UA' },
    { key: 'Full_Name_EN', ua: 'ПІБ повне (Англ.)', en: 'Full Name EN' },
    { key: 'OPC', ua: 'Перевірка експлуатаційної кваліфікації (OPC)', en: 'Operator Proficiency Check (OPC)', expiring: true },
    { key: 'OPC_NVG', ua: 'Перевірка польотів у ПНБ (OPC NVG)', en: 'Night Vision Goggles Check (OPC NVG)', expiring: true },
    { key: 'LPC', ua: 'Перевірка кваліфікації пілота (LPC)', en: 'License Proficiency Check (LPC)', expiring: true },
    { key: 'Type', ua: 'Кваліфікаційна перевірка типу ПС', en: 'Aircraft Type Rating Check', expiring: true },
    { key: 'EMER_1', ua: 'Аварійно-рятувальні процедури (1 рік)', en: 'Emergency Procedures (1 Year)', expiring: true },
    { key: 'EMER_3', ua: 'Аварійно-рятувальні процедури (3 роки)', en: 'Emergency Procedures (3 Years)', expiring: true },
    { key: 'DG', ua: 'Небезпечні вантажі (DG)', en: 'Dangerous Goods (DG)', expiring: true },
    { key: 'AV_SEC', ua: 'Авіаційна безпека (AV SEC)', en: 'Aviation Security (AV SEC)', expiring: true },
    { key: 'CRM', ua: 'Взаємодія екіпажу (CRM)', en: 'Crew Resource Management (CRM)', expiring: true },
    { key: 'MED', ua: 'Медичний сертифікат (MED)', en: 'Medical Certificate (MED)', expiring: true },
    { key: 'LICENSE', ua: 'Свідоцтво члена екіпажу', en: 'Crew License', expiring: true },
    { key: 'GI 275_T', ua: 'GI 275 Теорія', en: 'GI 275 Theory' },
    { key: 'GI 275_PRCT', ua: 'GI 275 Практика', en: 'GI 275 Practice' },
    { key: 'BIRD STRIKE', ua: 'Запобігання зіткненням з птахами', en: 'Bird Strike Prevention' },
    { key: 'MSB', ua: 'MSB Підготовка', en: 'MSB Training' },
    { key: 'PALL', ua: 'PALL Фільтрація', en: 'PALL Filtration' },
    { key: 'HESLO_T', ua: 'HESLO Теорія (Зовнішня підвіска)', en: 'HESLO Theory (Sling Load)' },
    { key: 'HESLO_PRCT', ua: 'HESLO Практика (Зовнішня підвіска)', en: 'HESLO Practice (Sling Load)' },
    { key: 'HHO_T', ua: 'HHO Теорія (Лебідка)', en: 'HHO Theory (Hoist)' },
    { key: 'HHO_PRCT', ua: 'HHO Практика (Лебідка)', en: 'HHO Practice (Hoist)' }
  ],
  Cabin: [
    { key: 'Rank', ua: 'Посада', en: 'Rank' },
    { key: 'Department', ua: 'Підрозділ', en: 'Department' },
    { key: 'Name_Shrt_UA', ua: 'ПІБ скорочено (Укр.)', en: 'Short Name UA' },
    { key: 'Full_Name_UA', ua: 'ПІБ повне (Укр.)', en: 'Full Name UA' },
    { key: 'Full_Name_EN', ua: 'ПІБ повне (Англ.)', en: 'Full Name EN' },
    { key: 'OPC', ua: 'Перевірка експлуатаційної кваліфікації (OPC)', en: 'Operator Proficiency Check (OPC)', expiring: true },
    { key: 'LPC', ua: 'Перевірка кваліфікації бортпровідника (LPC)', en: 'Cabin Crew Check (LPC)', expiring: true },
    { key: 'CC_Type', ua: 'Тип повітряного судна (БП)', en: 'Cabin Crew Type Rating', expiring: true },
    { key: 'EMER_1', ua: 'Аварійно-рятувальні процедури (1 рік)', en: 'Emergency Procedures (1 Year)', expiring: true },
    { key: 'EMER_3', ua: 'Аварійно-рятувальні процедури (3 роки)', en: 'Emergency Procedures (3 Years)', expiring: true },
    { key: 'DG', ua: 'Небезпечні вантажі (DG)', en: 'Dangerous Goods (DG)', expiring: true },
    { key: 'AV_SEC', ua: 'Авіаційна безпека (AV SEC)', en: 'Aviation Security (AV SEC)', expiring: true },
    { key: 'CRM', ua: 'Взаємодія екіпажу (CRM)', en: 'Crew Resource Management (CRM)', expiring: true },
    { key: 'MED', ua: 'Медичний сертифікат (MED)', en: 'Medical Certificate (MED)', expiring: true },
    { key: 'Resc', ua: 'Рятувальні операції (Resc)', en: 'Rescue Operations' },
    { key: 'Rappel', ua: 'Десантування (Rappel)', en: 'Rappel Operations' },
    { key: 'Hoist', ua: 'Робота з лебідкою (Hoist)', en: 'Hoist Operations' },
    { key: 'EOIR', ua: 'Оптико-електронна система (EOIR)', en: 'Electro-Optical Infra-Red' },
    { key: 'NAIROBI', ua: 'Спеціальний тренінг Найробі', en: 'Nairobi Special Training' }
  ]
};

/**
 * Returns concise, standardized short title for form/blank column headers
 * E.g. "LPC", "OPC", "DG", "AV_SEC", "MED", "Rank", "ПІБ"
 */
function getFormColumnShortTitle(colKey, lang = 'uk') {
  if (!colKey) return '';
  switch (colKey) {
    case 'Rank':
      return lang === 'uk' ? 'Посада' : 'Rank';
    case 'Department':
      return lang === 'uk' ? 'Підрозділ' : 'Department';
    case 'Name_Shrt_UA':
      return lang === 'uk' ? 'ПІБ (скор.)' : 'Short Name';
    case 'Full_Name_UA':
      return lang === 'uk' ? 'ПІБ' : 'Full Name';
    case 'Full_Name_EN':
      return lang === 'uk' ? 'ПІБ (англ.)' : 'Name (EN)';
    case 'LICENSE':
      return lang === 'uk' ? 'Свідоцтво' : 'License';
    case 'Type':
    case 'CC_Type':
      return lang === 'uk' ? 'Тип ПС' : 'Type';
    case 'OPC_NVG':
      return 'OPC NVG';
    case 'AV_SEC':
      return 'AV SEC';
    case 'EMER_1':
      return lang === 'uk' ? 'EMER (1р)' : 'EMER (1y)';
    case 'EMER_3':
      return lang === 'uk' ? 'EMER (3р)' : 'EMER (3y)';
    case 'GI 275_T':
      return 'GI 275 (T)';
    case 'GI 275_PRCT':
      return 'GI 275 (P)';
    case 'BIRD STRIKE':
      return 'Bird Strike';
    case 'HESLO_T':
      return 'HESLO (T)';
    case 'HESLO_PRCT':
      return 'HESLO (P)';
    case 'HHO_T':
      return 'HHO (T)';
    case 'HHO_PRCT':
      return 'HHO (P)';
    case 'MSB':
      return 'MSB';
    case 'PALL':
      return 'PALL';
    case 'Resc':
      return 'Resc';
    case 'Rappel':
      return 'Rappel';
    case 'Hoist':
      return 'Hoist';
    case 'EOIR':
      return 'EOIR';
    case 'NAIROBI':
      return 'Nairobi';
    default:
      return colKey;
  }
}

// ================= DEFAULT APP STATE =================
export const APP_VERSION = '0.2';

const STATE = {
  version: APP_VERSION,
  currentView: 'dashboard',
  lang: 'uk',
  theme: 'light',
  currentUser: null,
  flightCrew: [],
  cabinCrew: [],
  changelog: [],
  flights: [],
  forms: [],
  formSelectedCrew: {},
  snapshots: [],
  activeSettingsTab: 'sync',
  activeColumnsTab: 'Flight',
  editingFormId: null,
  lastSyncTimestamp: null,
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
    syncMode: 'mock',
    googleApiKey: '',
    googleClientId: '',
    googleSpreadsheetId: '',
    googleSpreadsheetIdPersonnel: '',
    googleSpreadsheetIdFlights: '',
    googleDriveFolderId: '',
    syncInterval: '5',
    alertThresholdDays: 30,
    criticalThresholdDays: 7,
    dateFormat: 'YYYY-MM-DD',
    eomRule: true,
    backupRetention: 5,
    notifications: {
      alertThresholdDays: 30,
      criticalThresholdDays: 7,
      digestEmail: 'training.dept@ukr-helicopters.ua',
      notifyCrewDocUpdate: true,
      notifyInstructorExpirations: true,
      notifyWeeklyDigest: true,
      notifyInApp: true
    },
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
  localStorage.setItem('aerocheck_forms', JSON.stringify(STATE.forms));
  localStorage.setItem('aerocheck_snapshots', JSON.stringify(STATE.snapshots));
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
      member = allCrew.find(c => String(c.id) === String(STATE.selectedCrewMemberId));
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
  } else if (viewName === 'forms') {
    renderForms();
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
  const dict = TRANSLATIONS[STATE.lang] || TRANSLATIONS.uk;
  
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

  // Update personnel count badge (located immediately to the right of the department filter)
  const countBadgeText = document.getElementById(`${crewType.toLowerCase()}-crew-count-text`);
  if (countBadgeText) {
    const isFiltered = Boolean(searchQuery || rankFilter || deptFilter);
    const label = dict.label_personnel_count || (STATE.lang === 'uk' ? 'Персонал' : 'Personnel');
    if (isFiltered && filtered.length !== list.length) {
      const ofWord = dict.label_of || (STATE.lang === 'uk' ? 'з' : 'of');
      countBadgeText.textContent = `${label}: ${filtered.length} ${ofWord} ${list.length}`;
    } else {
      countBadgeText.textContent = `${label}: ${filtered.length}`;
    }
  }
  
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
    tableBody.innerHTML = `<tr><td colspan="${visibleHeaders.length + (isEditor?1:0)}" style="text-align:center; font-style:italic; color:var(--text-secondary);">${STATE.lang === 'uk' ? 'Співробітників не знайдено' : 'No personnel found'}</td></tr>`;
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

          // Make name interactive for ADMIN, INSTRUCTOR and OFFICE to view individual portal
          const canViewPortal = role === ROLES.ADMIN || role === ROLES.INSTRUCTOR || role === ROLES.OFFICE;
          if (canViewPortal) {
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
 * Formats date string according to a selected pattern:
 * 'DD.MM.YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD MMM YYYY', 'WORDS'
 */
function formatDateCustom(dateStr, pattern = 'DD.MM.YYYY') {
  if (!dateStr || dateStr === '-' || dateStr === 'N/A') return '-';
  const cleanStr = String(dateStr).trim();
  const match = cleanStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  let year, month, day;
  if (match) {
    year = match[1];
    month = match[2].padStart(2, '0');
    day = match[3].padStart(2, '0');
  } else {
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return dateStr;
    year = String(d.getFullYear());
    month = String(d.getMonth() + 1).padStart(2, '0');
    day = String(d.getDate()).padStart(2, '0');
  }

  const UA_MONTHS_SHORT = ['СІЧ', 'ЛЮТ', 'БЕР', 'КВІ', 'ТРА', 'ЧЕР', 'ЛИП', 'СЕР', 'ВЕР', 'ЖОВ', 'ЛИС', 'ГРУ'];
  const UA_MONTHS_FULL = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  const mIdx = parseInt(month, 10) - 1;

  switch (pattern) {
    case 'DD.MM.YY':
      return `${day}.${month}.${year.slice(-2)}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'DD MMM YYYY':
      return `${day} ${UA_MONTHS_SHORT[mIdx] || month} ${year}`;
    case 'WORDS':
      return `«${day}» ${UA_MONTHS_FULL[mIdx] || month} ${year} р.`;
    case 'DD.MM.YYYY':
    default:
      return `${day}.${month}.${year}`;
  }
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

let currentFoldersFilter = 'all';
let cachedVerifiedFolders = { flight: [], cabin: [] };

/**
 * Opens and renders the Crew Folders Registry modal
 */
function openCrewFoldersRegistryModal() {
  const backdrop = document.getElementById('crew-folders-modal-backdrop');
  if (!backdrop) return;
  
  showToast(STATE.lang === 'uk' ? "Перевірка структури папок екіпажу (NAME_EN)..." : "Verifying crew folder structure (NAME_EN)...");
  
  verifyAndCreateCrewFolders(STATE.flightCrew, STATE.cabinCrew, STATE.settings.googleDriveFolderId, (res) => {
    if (!res.success) {
      showToast("Помилка перевірки папок: " + res.error, "error");
      return;
    }
    
    cachedVerifiedFolders.flight = res.flightFolders;
    cachedVerifiedFolders.cabin = res.cabinFolders;
    
    // Update count badges
    const countAllEl = document.getElementById('folders-count-all');
    const countFlightEl = document.getElementById('folders-count-flight');
    const countCabinEl = document.getElementById('folders-count-cabin');
    const verifiedTimeEl = document.getElementById('folders-last-verified-text');
    
    if (countAllEl) countAllEl.textContent = res.total;
    if (countFlightEl) countFlightEl.textContent = res.flightFolders.length;
    if (countCabinEl) countCabinEl.textContent = res.cabinFolders.length;
    if (verifiedTimeEl) verifiedTimeEl.textContent = `${STATE.lang === 'uk' ? 'Перевірено' : 'Verified'}: ${res.timestamp}`;
    
    renderFoldersTable(currentFoldersFilter, '');
    backdrop.classList.add('active');
    if (window.lucide) window.lucide.createIcons();
  });
}

/**
 * Renders rows in the Crew Folders Registry table
 */
function renderFoldersTable(filter, search) {
  const tbody = document.getElementById('folders-registry-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  let combined = [];
  if (filter === 'all' || filter === 'FLIGHT') {
    combined = combined.concat(cachedVerifiedFolders.flight || []);
  }
  if (filter === 'all' || filter === 'CABIN') {
    combined = combined.concat(cachedVerifiedFolders.cabin || []);
  }
  
  const query = (search || '').trim().toLowerCase();
  if (query) {
    combined = combined.filter(item => 
      (item.nameEn && item.nameEn.toLowerCase().includes(query)) || 
      (item.path && item.path.toLowerCase().includes(query))
    );
  }
  
  if (combined.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary); padding: var(--spacing-4);">Не знайдено записів</td></tr>`;
    return;
  }
  
  combined.forEach(folder => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="status-badge status-neutral" style="font-size: 10px; font-weight: 700;">${folder.crewType}</span>
      </td>
      <td style="font-weight: 600; color: var(--text-primary);">
        <i data-lucide="folder" style="width: 14px; height: 14px; margin-right: 6px; color: var(--accent); vertical-align: middle;"></i>
        <span>${folder.nameEn}</span>
      </td>
      <td>
        <code style="font-size: 11px; color: var(--text-secondary); background: var(--bg-surface-alt); padding: 2px 6px; border-radius: 4px;">${folder.path}</code>
      </td>
      <td style="text-align: center;">
        <span class="status-badge status-valid" style="font-size: 10px;">${folder.status}</span>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Coordinates settings sub-navigation and renders active tab
 */
function initSettingsSubnav() {
  document.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-settings-tab');
      activateSettingsTab(tabName);
    });
  });
}

function activateSettingsTab(tabName) {
  STATE.activeSettingsTab = tabName;
  document.querySelectorAll('.settings-tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-settings-tab') === tabName);
  });
  document.querySelectorAll('.settings-tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `settings-panel-${tabName}`);
  });

  if (tabName === 'sync') {
    renderSettingsSyncTab();
  } else if (tabName === 'personnel') {
    renderSettingsPersonnelTab();
  } else if (tabName === 'display') {
    renderSettingsDisplayTab();
  } else if (tabName === 'forms') {
    renderSettingsFormsTab();
  } else if (tabName === 'log') {
    renderSettingsLogTab();
  }
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Main Settings view entry point
 */
function renderSettings() {
  const role = STATE.currentUser ? STATE.currentUser.role : 'ADMIN';
  const logTabBtn = document.getElementById('settings-tab-btn-log');
  if (logTabBtn) {
    logTabBtn.style.display = role === ROLES.ADMIN ? 'inline-flex' : 'none';
  }
  let activeTab = STATE.activeSettingsTab || 'sync';
  if (activeTab === 'log' && role !== ROLES.ADMIN) {
    activeTab = 'sync';
  }
  activateSettingsTab(activeTab);
  populateSelectors();
}

/**
 * TAB 1: Renders Backup & Synchronization panel
 */
function renderSettingsSyncTab() {
  const syncModeSelect = document.getElementById('settings-sync-mode');
  const googleClientInput = document.getElementById('settings-google-client-id');
  const googleDriveFolderInput = document.getElementById('settings-google-drive-folder-id');
  const googleSheetPersonnelInput = document.getElementById('settings-google-sheet-id');
  const googleSheetFlightsInput = document.getElementById('settings-google-sheet-flights-id');
  const syncIntervalSelect = document.getElementById('settings-sync-interval');
  const googleBadge = document.getElementById('google-conn-status-badge');
  const lastSyncDisplay = document.getElementById('last-sync-timestamp-display');

  if (syncModeSelect) syncModeSelect.value = STATE.settings.syncMode || 'mock';
  if (googleClientInput) googleClientInput.value = STATE.settings.googleClientId || '';
  if (googleDriveFolderInput) googleDriveFolderInput.value = STATE.settings.googleDriveFolderId || '';
  if (googleSheetPersonnelInput) googleSheetPersonnelInput.value = STATE.settings.googleSpreadsheetIdPersonnel || STATE.settings.googleSpreadsheetId || '';
  if (googleSheetFlightsInput) googleSheetFlightsInput.value = STATE.settings.googleSpreadsheetIdFlights || '';
  if (syncIntervalSelect) syncIntervalSelect.value = STATE.settings.syncInterval || '5';

  if (lastSyncDisplay) {
    lastSyncDisplay.textContent = STATE.lastSyncTimestamp || 'Ще не виконувалась';
  }

  if (googleBadge) {
    if (STATE.settings.syncMode === 'live' && (STATE.settings.googleClientId || STATE.settings.googleApiKey)) {
      googleBadge.className = 'status-badge status-valid';
      googleBadge.textContent = 'Live Connected';
    } else {
      googleBadge.className = 'status-badge status-neutral';
      googleBadge.textContent = 'Offline Mock';
    }
  }

  renderSnapshotsList();
}

function renderSnapshotsList() {
  const container = document.getElementById('snapshots-list-container');
  if (!container) return;

  if (!STATE.snapshots || STATE.snapshots.length === 0) {
    container.innerHTML = `<div style="color: var(--text-secondary); padding: 8px 0; font-style: italic;">Немає збережених локальних знімків</div>`;
    return;
  }

  container.innerHTML = '';
  STATE.snapshots.slice(-8).reverse().forEach((snap) => {
    const item = document.createElement('div');
    item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 8px; border-bottom:1px solid var(--border-color);';
    item.innerHTML = `
      <div>
        <strong>${snap.name || 'Snapshot'}</strong> 
        <span style="color:var(--text-secondary); margin-left:6px; font-size:11px;">${new Date(snap.timestamp).toLocaleString()}</span>
        <div style="font-size:11px; color:var(--text-secondary);">${snap.flightCount || 0} Flight / ${snap.cabinCount || 0} Cabin • ${snap.flightsCount || 0} польотів</div>
      </div>
      <div style="display:flex; gap:6px;">
        <button class="btn btn-secondary btn-restore-snap" data-id="${snap.id}" style="height:26px; padding:0 8px; font-size:11px;">
          Відновити
        </button>
        <button class="btn btn-secondary btn-del-snap" data-id="${snap.id}" style="height:26px; padding:0 6px; font-size:11px; color:var(--badge-expired-color);">
          ✕
        </button>
      </div>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('.btn-restore-snap').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const snapId = e.currentTarget.getAttribute('data-id');
      const snap = STATE.snapshots.find(s => s.id === snapId);
      if (!snap) return;
      if (confirm(`Відновити стан системи до точки: ${snap.name} (${new Date(snap.timestamp).toLocaleString()})?`)) {
        STATE.flightCrew = snap.flightCrew || [];
        STATE.cabinCrew = snap.cabinCrew || [];
        STATE.flights = snap.flights || [];
        STATE.changelog = snap.changelog || [];
        if (snap.forms) STATE.forms = snap.forms;
        saveStateToStorage();
        showToast("Стан системи успішно відновлено зі знімка!");
        renderSettings();
      }
    });
  });

  container.querySelectorAll('.btn-del-snap').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const snapId = e.currentTarget.getAttribute('data-id');
      STATE.snapshots = STATE.snapshots.filter(s => s.id !== snapId);
      saveStateToStorage();
      renderSnapshotsList();
      showToast("Знімок видалено");
    });
  });
}

/**
 * TAB 2: Renders Personnel & Access Control panel
 */
function renderSettingsPersonnelTab() {
  const tbody = document.getElementById('settings-personnel-table-body');
  const searchInput = document.getElementById('personnel-search-input');
  const filterSelect = document.getElementById('personnel-filter-select');
  if (!tbody) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filterType = filterSelect ? filterSelect.value : 'ALL';

  const allCrew = [
    ...STATE.flightCrew.map(c => ({ ...c, crewType: 'Flight' })),
    ...STATE.cabinCrew.map(c => ({ ...c, crewType: 'Cabin' }))
  ];

  let filtered = allCrew;
  if (filterType !== 'ALL') {
    filtered = filtered.filter(c => c.crewType === filterType);
  }
  if (query) {
    filtered = filtered.filter(c => 
      (c.Full_Name_UA && c.Full_Name_UA.toLowerCase().includes(query)) ||
      (c.Full_Name_EN && c.Full_Name_EN.toLowerCase().includes(query)) ||
      (c.Name_Shrt_UA && c.Name_Shrt_UA.toLowerCase().includes(query)) ||
      (c.Rank && c.Rank.toLowerCase().includes(query)) ||
      (c.Email && c.Email.toLowerCase().includes(query))
    );
  }

  tbody.innerHTML = '';
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: var(--spacing-4);">Співробітників не знайдено</td></tr>`;
  } else {
    filtered.forEach(m => {
      const tr = document.createElement('tr');
      const userRoles = JSON.parse(localStorage.getItem('aerocheck_user_roles') || '{}');
      const assignedRole = m.Email && userRoles[m.Email.toLowerCase()] ? userRoles[m.Email.toLowerCase()] : (m.Email ? 'CREW' : '—');
      
      tr.innerHTML = `
        <td>
          <span class="status-badge status-neutral" style="font-size: 10px; font-weight: 700;">
            ${m.crewType === 'Flight' ? '✈ FLIGHT' : '👥 CABIN'}
          </span>
        </td>
        <td style="font-weight: 600;">${m.Full_Name_UA || m.Name_Shrt_UA || '-'}</td>
        <td style="color: var(--text-secondary);">${m.Full_Name_EN || '-'}</td>
        <td>${m.Rank || '-'} <span style="font-size: 11px; color: var(--text-secondary);">(${m.Department || '-'})</span></td>
        <td style="font-family: monospace; font-size: 11px;">${m.Email || '<span style="color:var(--text-secondary)">—</span>'}</td>
        <td><span class="status-badge ${assignedRole === 'ADMIN' ? 'status-expired' : 'status-neutral'}" style="font-size: 10px;">${assignedRole}</span></td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center;">
            <button class="btn btn-secondary btn-edit-crew-member" data-id="${m.id}" data-type="${m.crewType}" style="height: 28px; width: 28px; padding: 0;" title="Редагувати">
              <i data-lucide="edit-2" style="width: 13px; height: 13px;"></i>
            </button>
            <button class="btn btn-danger btn-del-crew-row" data-id="${m.id}" data-type="${m.crewType}" data-name="${m.Full_Name_UA || m.Full_Name_EN}" style="height: 28px; width: 28px; padding: 0;" title="Видалити">
              <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-edit-crew-member').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const type = e.currentTarget.getAttribute('data-type');
        const list = type === 'Flight' ? STATE.flightCrew : STATE.cabinCrew;
        const member = list.find(c => c.id === id);
        if (member) openCrewEditModal(member);
      });
    });

    tbody.querySelectorAll('.btn-del-crew-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const type = e.currentTarget.getAttribute('data-type');
        const name = e.currentTarget.getAttribute('data-name');
        confirmDeleteCrewMember(id, type, name);
      });
    });
  }

  // Populate quick delete selector
  const deleteSelect = document.getElementById('mgmt-delete-select');
  if (deleteSelect) {
    deleteSelect.innerHTML = '<option value="">-- Виберіть співробітника для видалення --</option>';
    allCrew.sort((a, b) => (a.Full_Name_UA || '').localeCompare(b.Full_Name_UA || '')).forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `[${m.crewType}] ${m.Full_Name_UA || m.Full_Name_EN} (${m.Rank || ''})`;
      deleteSelect.appendChild(opt);
    });
  }

  // Populate user accounts table
  renderUserAccountsTable();

  // Populate notifications settings
  const alertDaysInput = document.getElementById('settings-alert-days');
  const criticalDaysInput = document.getElementById('settings-critical-days');
  const notifyEmailInput = document.getElementById('settings-notify-email');
  const chkDocUpdate = document.getElementById('settings-notify-crew-doc-update');
  const chkExp = document.getElementById('settings-notify-instructor-expirations');
  const chkWeekly = document.getElementById('settings-notify-weekly-digest');
  const chkInApp = document.getElementById('settings-notify-inapp');

  const notif = STATE.settings.notifications || {};
  if (alertDaysInput) alertDaysInput.value = STATE.settings.alertThresholdDays || 30;
  if (criticalDaysInput) criticalDaysInput.value = STATE.settings.criticalThresholdDays || 7;
  if (notifyEmailInput) notifyEmailInput.value = notif.digestEmail || 'training.dept@ukr-helicopters.ua';
  if (chkDocUpdate) chkDocUpdate.checked = notif.notifyCrewDocUpdate !== false;
  if (chkExp) chkExp.checked = notif.notifyInstructorExpirations !== false;
  if (chkWeekly) chkWeekly.checked = notif.notifyWeeklyDigest !== false;
  if (chkInApp) chkInApp.checked = notif.notifyInApp !== false;

  if (window.lucide) window.lucide.createIcons();
}

function renderUserAccountsTable() {
  const tbody = document.getElementById('user-accounts-table-body');
  if (!tbody) return;

  const userRoles = JSON.parse(localStorage.getItem('aerocheck_user_roles') || '{}');
  const customUsers = JSON.parse(localStorage.getItem('aerocheck_custom_users') || '[]');
  const deletedUsers = JSON.parse(localStorage.getItem('aerocheck_deleted_users') || '[]');
  
  const systemAccounts = [
    { email: 'admin@ukr-helicopters.ua', name: 'Системний Адміністратор', role: 'ADMIN', default: true },
    { email: 'instructor@ukr-helicopters.ua', name: 'Інструктор Льотної Служби', role: 'INSTRUCTOR', default: true },
    { email: 'office@ukr-helicopters.ua', name: 'Офіс / Документообіг', role: 'OFFICE', default: true }
  ];

  const crewWithEmails = [...STATE.flightCrew, ...STATE.cabinCrew]
    .filter(c => c.Email && c.Email.trim() !== '')
    .map(c => ({
      email: c.Email.trim().toLowerCase(),
      name: c.Full_Name_UA || c.Full_Name_EN,
      role: userRoles[c.Email.trim().toLowerCase()] || 'CREW'
    }));

  const allUsersMap = new Map();
  systemAccounts.forEach(u => allUsersMap.set(u.email.toLowerCase(), u));
  crewWithEmails.forEach(u => {
    if (!allUsersMap.has(u.email.toLowerCase())) {
      allUsersMap.set(u.email.toLowerCase(), u);
    }
  });
  customUsers.forEach(u => {
    allUsersMap.set(u.email.toLowerCase(), {
      email: u.email.toLowerCase(),
      name: u.name || '',
      role: u.role || 'CREW',
      isCustom: true
    });
  });

  // Exclude deleted accounts
  deletedUsers.forEach(delEmail => {
    allUsersMap.delete(delEmail.toLowerCase());
  });

  const currentUserEmail = STATE.currentUser ? STATE.currentUser.email.toLowerCase() : '';

  tbody.innerHTML = '';
  if (allUsersMap.size === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:16px; color:var(--text-secondary); font-style:italic;">Немає користувачів</td></tr>`;
    return;
  }

  allUsersMap.forEach((user, email) => {
    const currentRole = userRoles[email] || user.role || 'CREW';
    const isCurrentSession = currentUserEmail === email;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="display:flex; align-items:center; gap:6px;">
          <strong style="color:var(--text-primary); font-size:12px;">${email}</strong>
          ${isCurrentSession ? '<span class="status-badge status-valid" style="font-size:9px; padding:1px 5px;">Поточний сеанс</span>' : ''}
        </div>
        ${user.name ? `<div style="font-size:11px; color:var(--text-secondary);">${user.name}</div>` : ''}
      </td>
      <td>
        <span class="status-badge ${currentRole === 'ADMIN' ? 'status-expired' : 'status-neutral'}" style="font-size:10px;">${currentRole}</span>
      </td>
      <td>
        <select class="form-select user-role-changer" data-email="${email}" style="height:28px; padding:0 6px; font-size:11.5px;">
          <option value="ADMIN" ${currentRole === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
          <option value="INSTRUCTOR" ${currentRole === 'INSTRUCTOR' ? 'selected' : ''}>INSTRUCTOR</option>
          <option value="OFFICE" ${currentRole === 'OFFICE' ? 'selected' : ''}>OFFICE</option>
          <option value="CREW" ${currentRole === 'CREW' ? 'selected' : ''}>CREW</option>
        </select>
      </td>
      <td style="text-align:center;">
        <button class="btn btn-secondary btn-delete-user" data-email="${email}" title="${isCurrentSession ? 'Неможливо видалити поточний сеанс' : 'Видалити користувача'}" ${isCurrentSession ? 'disabled style="opacity:0.35; cursor:not-allowed; padding:0; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center;"' : 'style="color:var(--danger-color); border-color:rgba(239,68,68,0.3); padding:0; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center;"'}>
          <i data-lucide="trash-2" style="width:13px; height:13px;"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach role changer listeners
  tbody.querySelectorAll('.user-role-changer').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const email = e.target.getAttribute('data-email');
      const newRole = e.target.value;
      const roles = JSON.parse(localStorage.getItem('aerocheck_user_roles') || '{}');
      roles[email] = newRole;
      localStorage.setItem('aerocheck_user_roles', JSON.stringify(roles));

      if (STATE.currentUser && STATE.currentUser.email.toLowerCase() === email.toLowerCase()) {
        STATE.currentUser.role = newRole;
        sessionStorage.setItem('aerocheck_session_user', JSON.stringify(STATE.currentUser));
      }

      STATE.changelog.unshift({
        timestamp: new Date().toISOString(),
        userEmail: STATE.currentUser ? STATE.currentUser.email : 'admin@ukr-helicopters.ua',
        crewMember: email,
        crewType: 'System',
        type: 'MANUAL_EDIT',
        details: [{
          field: 'user_role',
          oldValue: userRoles[email] || 'default',
          newValue: newRole
        }]
      });
      saveStateToStorage();

      showToast(`Роль для ${email} змінено на ${newRole}`);
      renderSettingsPersonnelTab();
    });
  });

  // Attach user delete listeners
  tbody.querySelectorAll('.btn-delete-user:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const email = btn.getAttribute('data-email');
      if (email) deleteUserAccount(email);
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Deletes a user account and revokes their access
 */
function deleteUserAccount(email) {
  const currentUserEmail = STATE.currentUser ? STATE.currentUser.email.toLowerCase() : '';
  if (email.toLowerCase() === currentUserEmail) {
    showToast(STATE.lang === 'uk' ? 'Неможливо видалити користувача поточного сеансу' : 'Cannot delete current session user', 'warning');
    return;
  }

  const backdrop = document.getElementById('confirm-backdrop');
  if (backdrop) {
    document.getElementById('confirm-title').textContent = STATE.lang === 'uk' ? 'Видалення користувача' : 'Delete User';
    document.getElementById('confirm-message').textContent = STATE.lang === 'uk'
      ? `Ви впевнені, що хочете видалити обліковий запис «${email}»? Користувач втратить доступ до системи.`
      : `Are you sure you want to delete user account "${email}"?`;

    const btnSubmit = document.getElementById('btn-submit-confirm');
    const btnCancel = document.getElementById('btn-cancel-confirm');
    btnSubmit.textContent = STATE.lang === 'uk' ? 'Так, видалити' : 'Yes, delete';

    const newSubmit = btnSubmit.cloneNode(true);
    btnSubmit.parentNode.replaceChild(newSubmit, btnSubmit);
    const newCancel = btnCancel.cloneNode(true);
    btnCancel.parentNode.replaceChild(newCancel, btnCancel);

    backdrop.classList.add('active');

    newCancel.addEventListener('click', () => {
      backdrop.classList.remove('active');
    });

    newSubmit.addEventListener('click', () => {
      const deletedUsers = JSON.parse(localStorage.getItem('aerocheck_deleted_users') || '[]');
      if (!deletedUsers.includes(email.toLowerCase())) {
        deletedUsers.push(email.toLowerCase());
        localStorage.setItem('aerocheck_deleted_users', JSON.stringify(deletedUsers));
      }

      let customUsers = JSON.parse(localStorage.getItem('aerocheck_custom_users') || '[]');
      customUsers = customUsers.filter(u => u.email.toLowerCase() !== email.toLowerCase());
      localStorage.setItem('aerocheck_custom_users', JSON.stringify(customUsers));

      localStorage.removeItem(`aerocheck_pass_${email.toLowerCase()}`);
      const roles = JSON.parse(localStorage.getItem('aerocheck_user_roles') || '{}');
      delete roles[email.toLowerCase()];
      localStorage.setItem('aerocheck_user_roles', JSON.stringify(roles));

      STATE.changelog.unshift({
        timestamp: new Date().toISOString(),
        userEmail: STATE.currentUser ? STATE.currentUser.email : 'admin@ukr-helicopters.ua',
        crewMember: email,
        crewType: 'System',
        type: 'CREW_DELETE',
        details: [{
          field: 'user_account',
          oldValue: email,
          newValue: 'DELETED'
        }]
      });
      saveStateToStorage();

      backdrop.classList.remove('active');
      showToast(STATE.lang === 'uk' ? `Користувача ${email} успішно видалено` : `User ${email} deleted`);
      renderUserAccountsTable();
    });
  }
}

/**
 * Creates or updates a user account
 */
function addUserAccount(email, name, role, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    showToast(STATE.lang === 'uk' ? 'Введіть коректну адресу email' : 'Please enter valid email', 'warning');
    return false;
  }

  // Remove from deleted users if previously deleted
  let deletedUsers = JSON.parse(localStorage.getItem('aerocheck_deleted_users') || '[]');
  deletedUsers = deletedUsers.filter(e => e.toLowerCase() !== cleanEmail);
  localStorage.setItem('aerocheck_deleted_users', JSON.stringify(deletedUsers));

  // Save to custom users
  let customUsers = JSON.parse(localStorage.getItem('aerocheck_custom_users') || '[]');
  const existingIdx = customUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);
  const newUserObj = {
    email: cleanEmail,
    name: name ? name.trim() : '',
    role: role || 'CREW',
    isCustom: true
  };
  if (existingIdx >= 0) {
    customUsers[existingIdx] = newUserObj;
  } else {
    customUsers.push(newUserObj);
  }
  localStorage.setItem('aerocheck_custom_users', JSON.stringify(customUsers));

  // Save role
  const roles = JSON.parse(localStorage.getItem('aerocheck_user_roles') || '{}');
  roles[cleanEmail] = role || 'CREW';
  localStorage.setItem('aerocheck_user_roles', JSON.stringify(roles));

  // Save password
  const passToSave = password ? password.trim() : '123456';
  localStorage.setItem(`aerocheck_pass_${cleanEmail}`, passToSave);

  // Changelog
  STATE.changelog.unshift({
    timestamp: new Date().toISOString(),
    userEmail: STATE.currentUser ? STATE.currentUser.email : 'admin@ukr-helicopters.ua',
    crewMember: cleanEmail,
    crewType: 'System',
    type: 'CREW_ADD',
    details: [{
      field: 'user_account',
      oldValue: 'none',
      newValue: `Created user ${cleanEmail} (${role || 'CREW'})`
    }]
  });
  saveStateToStorage();

  showToast(STATE.lang === 'uk' ? `Користувача ${cleanEmail} успішно створено!` : `User ${cleanEmail} created!`);
  renderUserAccountsTable();
  return true;
}

function confirmDeleteCrewMember(memberId, crewType, name) {
  document.getElementById('confirm-message').textContent = STATE.lang === 'uk'
    ? `Ви впевнені, що хочете остаточно видалити співробітника: ${name}?`
    : `Are you sure you want to permanently delete: ${name}?`;
    
  const backdrop = document.getElementById('confirm-backdrop');
  backdrop.classList.add('active');
  
  const btnSubmit = document.getElementById('btn-submit-confirm');
  const btnCancel = document.getElementById('btn-cancel-confirm');
  
  const handleConfirm = () => {
    backdrop.classList.remove('active');
    btnSubmit.removeEventListener('click', handleConfirm);
    btnCancel.removeEventListener('click', handleCancel);

    if (crewType === 'Flight') {
      STATE.flightCrew = STATE.flightCrew.filter(c => c.id !== memberId);
    } else {
      STATE.cabinCrew = STATE.cabinCrew.filter(c => c.id !== memberId);
    }
    
    STATE.changelog.push({
      timestamp: new Date().toISOString(),
      userEmail: STATE.currentUser ? STATE.currentUser.email : 'system@aerocheck.com',
      crewMember: name,
      crewType: crewType,
      type: 'MANUAL_EDIT',
      details: [{ field: 'status', oldValue: 'active', newValue: 'DELETED' }]
    });
    
    saveStateToStorage();
    showToast(`Співробітника ${name} успішно видалено`);
    renderSettingsPersonnelTab();
    if (STATE.currentView === 'flight-crew') renderCrewTable('Flight');
    if (STATE.currentView === 'cabin-crew') renderCrewTable('Cabin');
  };

  const handleCancel = () => {
    backdrop.classList.remove('active');
    btnSubmit.removeEventListener('click', handleConfirm);
    btnCancel.removeEventListener('click', handleCancel);
  };

  btnSubmit.addEventListener('click', handleConfirm);
  btnCancel.addEventListener('click', handleCancel);
}

/**
 * TAB 3: Renders Display & Column Visibility panel
 */
function renderSettingsDisplayTab() {
  const activeColTab = STATE.activeColumnsTab || 'Flight';
  
  const btnFlight = document.getElementById('btn-col-tab-flight');
  const btnCabin = document.getElementById('btn-col-tab-cabin');
  if (btnFlight && btnCabin) {
    btnFlight.classList.toggle('active', activeColTab === 'Flight');
    btnCabin.classList.toggle('active', activeColTab === 'Cabin');
  }

  const container = document.getElementById('columns-visibility-container');
  if (!container) return;
  container.innerHTML = '';

  const columnsList = BILINGUAL_COLUMNS[activeColTab] || [];
  const currentVisible = activeColTab === 'Flight' ? STATE.settings.visibleColumnsFlight : STATE.settings.visibleColumnsCabin;

  columnsList.forEach(col => {
    const isVisible = currentVisible.includes(col.key);
    const labelTitle = STATE.lang === 'uk' ? col.ua : col.en;
    const subTitle = STATE.lang === 'uk' ? col.en : col.ua;

    const div = document.createElement('div');
    div.style.cssText = 'display:flex; align-items:flex-start; gap:8px; padding:8px; background:var(--bg-surface-alt); border-radius:var(--radius-md); border:1px solid var(--border-color);';
    div.innerHTML = `
      <input type="checkbox" class="col-vis-checkbox" data-key="${col.key}" data-type="${activeColTab}" ${isVisible ? 'checked' : ''} style="margin-top:3px; cursor:pointer;">
      <div style="flex:1; cursor:pointer;" onclick="this.previousElementSibling.click()">
        <div style="font-weight:600; font-size:12.5px; color:var(--text-primary);">${col.key} — ${labelTitle}</div>
        <div style="font-size:11px; color:var(--text-secondary);">${subTitle}</div>
        ${col.expiring ? '<span class="status-badge status-warning" style="font-size:9.5px; padding:1px 5px; margin-top:3px; display:inline-block;">Термін дії (11 обовʼязкових)</span>' : ''}
      </div>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll('.col-vis-checkbox').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const key = e.target.getAttribute('data-key');
      const type = e.target.getAttribute('data-type');
      let targetList = type === 'Flight' ? STATE.settings.visibleColumnsFlight : STATE.settings.visibleColumnsCabin;

      if (e.target.checked) {
        if (!targetList.includes(key)) targetList.push(key);
      } else {
        targetList = targetList.filter(k => k !== key);
      }

      if (type === 'Flight') {
        STATE.settings.visibleColumnsFlight = targetList;
      } else {
        STATE.settings.visibleColumnsCabin = targetList;
      }
      saveStateToStorage();
    });
  });

  // Recommended Operational & System Settings
  const alertDaysInput = document.getElementById('settings-alert-days');
  const criticalDaysInput = document.getElementById('settings-critical-days');
  const dateFormatSelect = document.getElementById('settings-date-format');
  const refDateInput = document.getElementById('settings-ref-date');
  const eomRuleCheck = document.getElementById('settings-eom-rule');
  const datePromptCheck = document.getElementById('settings-date-prompt');
  const backupRetentionInput = document.getElementById('settings-backup-retention');

  if (alertDaysInput) alertDaysInput.value = STATE.settings.alertThresholdDays !== undefined ? STATE.settings.alertThresholdDays : 30;
  if (criticalDaysInput) criticalDaysInput.value = STATE.settings.criticalThresholdDays !== undefined ? STATE.settings.criticalThresholdDays : 7;
  if (dateFormatSelect) dateFormatSelect.value = STATE.settings.dateFormat || 'YYYY-MM-DD';
  if (refDateInput) refDateInput.value = STATE.settings.referenceDate || '2026-07-12';
  if (eomRuleCheck) eomRuleCheck.checked = STATE.settings.eomRule !== false;
  if (datePromptCheck) datePromptCheck.checked = STATE.settings.datePrompt !== false;
  if (backupRetentionInput) backupRetentionInput.value = STATE.settings.backupRetention || 5;

  if (window.lucide) window.lucide.createIcons();
}

/**
 * TAB 4: Renders Forms Generator & Editor panel
 */
function renderSettingsFormsTab() {
  const select = document.getElementById('form-select-template');
  if (!select) return;

  select.innerHTML = '';
  STATE.forms.forEach((f) => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = `${f.code || 'Form'} • ${f.name} [${f.crewType}]`;
    if (STATE.editingFormId === f.id) opt.selected = true;
    select.appendChild(opt);
  });

  if (!STATE.editingFormId && STATE.forms.length > 0) {
    STATE.editingFormId = STATE.forms[0].id;
    select.value = STATE.forms[0].id;
  }

  loadFormIntoBuilder(STATE.editingFormId);
}

function loadFormIntoBuilder(formId) {
  const form = STATE.forms.find(f => f.id === formId) || STATE.forms[0];
  if (!form) return;

  STATE.editingFormId = form.id;
  
  const titleInput = document.getElementById('form-builder-title');
  const codeInput = document.getElementById('form-builder-code');
  const subtitleInput = document.getElementById('form-builder-subtitle');
  const sourceSelect = document.getElementById('form-builder-source');
  const logoSelect = document.getElementById('form-logo-select');
  const customLogoUpload = document.getElementById('form-custom-logo-upload');
  const extraGrade = document.getElementById('form-builder-extra-grade');
  const extraValidity = document.getElementById('form-builder-extra-validity');
  const extraRemarks = document.getElementById('form-builder-extra-remarks');
  const dateTextInput = document.getElementById('form-builder-date-text');
  const signRankInput = document.getElementById('form-builder-sign-rank');
  const signNameInput = document.getElementById('form-builder-sign-name');
  const btnDelete = document.getElementById('btn-delete-custom-form');

  if (titleInput) titleInput.value = form.name || '';
  if (codeInput) codeInput.value = form.code || '';
  if (subtitleInput) subtitleInput.value = form.subtitle || '';
  if (sourceSelect) sourceSelect.value = form.crewType || 'Flight';
  
  if (logoSelect) {
    if (form.logo === 'PICS/LOGO_UH.png' || !form.logo) {
      logoSelect.value = 'PICS/LOGO_UH.png';
      if (customLogoUpload) customLogoUpload.style.display = 'none';
    } else if (form.logo === 'none') {
      logoSelect.value = 'none';
      if (customLogoUpload) customLogoUpload.style.display = 'none';
    } else {
      logoSelect.value = 'custom';
      if (customLogoUpload) customLogoUpload.style.display = 'block';
      window.currentUploadedCustomLogo = form.logo;
    }
  }

  document.querySelectorAll('.logo-pos-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-pos') === (form.logoPos || 'left'));
  });

  // Orientation
  const formOrientation = form.orientation || 'portrait';
  document.querySelectorAll('.orientation-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-orientation') === formOrientation);
  });

  // Fit single line
  const fitSingleLineCheck = document.getElementById('form-builder-fit-single-line');
  if (fitSingleLineCheck) {
    fitSingleLineCheck.checked = form.fitSingleLine === true;
  }

  // Date format
  const dateFormatSelect = document.getElementById('form-builder-date-format');
  if (dateFormatSelect) {
    dateFormatSelect.value = form.dateFormat || 'DD.MM.YYYY';
  }

  if (extraGrade) extraGrade.checked = form.extraGrade !== false;
  if (extraValidity) extraValidity.checked = form.extraValidity !== false;
  if (extraRemarks) extraRemarks.checked = form.extraRemarks === true;

  const spacingSlider = document.getElementById('form-builder-table-spacing');
  const spacingNum = document.getElementById('form-builder-table-spacing-num');
  const spacingVal = document.getElementById('form-builder-spacing-val');
  const spacing = form.tableSpacing !== undefined ? form.tableSpacing : 20;
  if (spacingSlider) spacingSlider.value = spacing;
  if (spacingNum) spacingNum.value = spacing;
  if (spacingVal) spacingVal.textContent = `${spacing} px`;

  const paddingSlider = document.getElementById('form-builder-cell-padding');
  const paddingNum = document.getElementById('form-builder-cell-padding-num');
  const paddingVal = document.getElementById('form-builder-padding-val');
  const cellPadding = form.cellPadding !== undefined ? form.cellPadding : 4;
  if (paddingSlider) paddingSlider.value = cellPadding;
  if (paddingNum) paddingNum.value = cellPadding;
  if (paddingVal) paddingVal.textContent = `${cellPadding} px`;

  if (dateTextInput) dateTextInput.value = form.dateText || 'Дата: «____» ___________ 202___ р.';
  if (signRankInput) signRankInput.value = form.signRank || 'Керівник льотної служби';
  if (signNameInput) signNameInput.value = form.signName || '';

  if (btnDelete) {
    btnDelete.style.display = STATE.forms.length > 1 ? 'inline-flex' : 'none';
  }

  populateFormBuilderColumns(form.crewType || 'Flight', form.columns || []);
  updatePaperPreview();
  if (window.lucide) window.lucide.createIcons();
}

function populateFormBuilderColumns(crewType, selectedColumns = []) {
  const container = document.getElementById('form-builder-columns');
  if (!container) return;
  container.innerHTML = '';

  const cols = BILINGUAL_COLUMNS[crewType] || [];
  cols.forEach(col => {
    const isChecked = selectedColumns.includes(col.key);
    const label = document.createElement('label');
    label.style.cssText = 'display:flex; align-items:center; gap:6px; font-size:11.5px; cursor:pointer; background:#fff; padding:4px 6px; border-radius:4px; border:1px solid var(--border-color);';
    label.innerHTML = `
      <input type="checkbox" class="form-builder-col-chk" data-col="${col.key}" ${isChecked ? 'checked' : ''}>
      <span style="font-weight:600;">${col.key}</span>
      <span style="color:var(--text-secondary); font-size:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">(${col.ua})</span>
    `;
    container.appendChild(label);
  });

  container.querySelectorAll('.form-builder-col-chk').forEach(chk => {
    chk.addEventListener('change', updatePaperPreview);
  });
}

function updatePaperPreview() {
  const title = document.getElementById('form-builder-title')?.value || 'Назва форми';
  const code = document.getElementById('form-builder-code')?.value || 'Форма UH-XX';
  const subtitle = document.getElementById('form-builder-subtitle')?.value || '';
  const dateText = document.getElementById('form-builder-date-text')?.value || 'Дата: «____» ___________ 202___ р.';
  const signRank = document.getElementById('form-builder-sign-rank')?.value || 'Посада підписанта';
  const signName = document.getElementById('form-builder-sign-name')?.value || '';
  
  const activeLogoPosBtn = document.querySelector('.logo-pos-btn.active');
  const logoPos = activeLogoPosBtn ? activeLogoPosBtn.getAttribute('data-pos') : 'left';

  const activeOrientBtn = document.querySelector('.orientation-btn.active');
  const orientation = activeOrientBtn ? activeOrientBtn.getAttribute('data-orientation') : 'portrait';
  const paperSheet = document.getElementById('form-paper-preview');
  if (paperSheet) {
    paperSheet.classList.toggle('orientation-landscape', orientation === 'landscape');
    paperSheet.classList.toggle('orientation-portrait', orientation !== 'landscape');
  }

  const fitSingleLine = document.getElementById('form-builder-fit-single-line')?.checked === true;
  const dateFormat = document.getElementById('form-builder-date-format')?.value || 'DD.MM.YYYY';
  
  const logoSelectVal = document.getElementById('form-logo-select')?.value;
  let logoSrc = 'PICS/LOGO_UH.png';
  if (logoSelectVal === 'none') {
    logoSrc = '';
  } else if (logoSelectVal === 'custom') {
    logoSrc = window.currentUploadedCustomLogo || 'PICS/LOGO_UH.png';
  }

  const header = document.getElementById('paper-preview-header');
  const logoImg = document.getElementById('paper-preview-logo');
  if (header) {
    header.className = `paper-header pos-${logoPos}`;
  }
  if (logoImg) {
    if (logoSrc) {
      logoImg.src = logoSrc;
      logoImg.style.display = 'block';
    } else {
      logoImg.style.display = 'none';
    }
  }

  const pTitle = document.getElementById('paper-preview-title');
  const pCode = document.getElementById('paper-preview-code');
  const pSub = document.getElementById('paper-preview-subtitle');
  if (pTitle) pTitle.textContent = title;
  if (pCode) pCode.textContent = code;
  if (pSub) pSub.textContent = subtitle;

  const spacing = parseInt(document.getElementById('form-builder-table-spacing')?.value, 10) || 20;
  const spacingVal = document.getElementById('form-builder-spacing-val');
  if (spacingVal) spacingVal.textContent = `${spacing} px`;

  const cellPadding = parseInt(document.getElementById('form-builder-cell-padding')?.value, 10) || 4;
  const paddingVal = document.getElementById('form-builder-padding-val');
  if (paddingVal) paddingVal.textContent = `${cellPadding} px`;

  const selectedCols = [];
  document.querySelectorAll('.form-builder-col-chk:checked').forEach(c => {
    selectedCols.push(c.getAttribute('data-col'));
  });

  const extraGrade = document.getElementById('form-builder-extra-grade')?.checked;
  const extraValidity = document.getElementById('form-builder-extra-validity')?.checked;
  const extraRemarks = document.getElementById('form-builder-extra-remarks')?.checked;

  const paperTable = document.getElementById('paper-preview-table');
  if (paperTable) {
    paperTable.style.marginTop = `${spacing}px`;
    paperTable.classList.toggle('fit-single-line', fitSingleLine);
    paperTable.style.setProperty('--cell-pad-h', `${cellPadding}px`);
    paperTable.style.setProperty('--cell-pad-v', `${Math.max(2, Math.min(6, Math.round(cellPadding * 0.75)))}px`);

    const totalColCount = selectedCols.slice(0, 8).length + (extraGrade ? 1 : 0) + (extraValidity ? 1 : 0) + (extraRemarks ? 1 : 0) + 1;
    if (fitSingleLine) {
      if (totalColCount > 10) {
        paperTable.style.fontSize = '8px';
      } else if (totalColCount > 7) {
        paperTable.style.fontSize = '9px';
      } else if (totalColCount > 5) {
        paperTable.style.fontSize = '10px';
      } else {
        paperTable.style.fontSize = '10.5px';
      }
    } else {
      paperTable.style.fontSize = '11px';
    }
  }

  const theadTr = document.getElementById('paper-preview-thead-tr');
  const tbody = document.getElementById('paper-preview-tbody');
  if (theadTr && tbody) {
    let thHtml = '<th style="width:26px; text-align:center; padding-left:1px !important; padding-right:1px !important;">№</th>';
    selectedCols.slice(0, 8).forEach(col => {
      const shortLabel = getFormColumnShortTitle(col, STATE.lang);
      const isRank = (col === 'Rank');
      const isName = ['Full_Name_UA', 'Full_Name_EN', 'Name_Shrt_UA'].includes(col);
      if (isRank) {
        thHtml += `<th class="col-rank">${shortLabel}</th>`;
      } else if (isName) {
        thHtml += `<th class="col-name" style="width:24%; min-width:80px;">${shortLabel}</th>`;
      } else {
        thHtml += `<th>${shortLabel}</th>`;
      }
    });
    const gradeTitle = STATE.lang === 'uk' ? 'Результат' : 'Result';
    const validityTitle = STATE.lang === 'uk' ? 'Термін дії' : 'Validity';
    const remarksTitle = STATE.lang === 'uk' ? 'Примітка' : 'Remarks';
    if (extraGrade) thHtml += `<th style="width:11%;">${gradeTitle}</th>`;
    if (extraValidity) thHtml += `<th style="width:13%;">${validityTitle}</th>`;
    if (extraRemarks) thHtml += `<th style="width:14%;">${remarksTitle}</th>`;
    theadTr.innerHTML = thHtml;

    let sampleTd1 = '<td style="text-align:center; padding-left:1px !important; padding-right:1px !important;">1</td>';
    let sampleTd2 = '<td style="text-align:center; padding-left:1px !important; padding-right:1px !important;">2</td>';
    selectedCols.slice(0, 8).forEach(col => {
      const isRank = (col === 'Rank');
      const isName = ['Full_Name_UA', 'Full_Name_EN', 'Name_Shrt_UA'].includes(col);
      if (isName) {
        sampleTd1 += '<td class="col-name"><strong>Алекса <span class="crew-initials" style="white-space: nowrap;">С.М.</span></strong></td>';
        sampleTd2 += '<td class="col-name"><strong>Бондар <span class="crew-initials" style="white-space: nowrap;">В.І.</span></strong></td>';
      } else if (isRank) {
        sampleTd1 += '<td class="col-rank">КПС</td>';
        sampleTd2 += '<td class="col-rank">ВП</td>';
      } else if (col === 'Department') {
        sampleTd1 += '<td style="text-align:center;">ЛЬОТНИЙ</td>';
        sampleTd2 += '<td style="text-align:center;">ЛЬОТНИЙ</td>';
      } else {
        sampleTd1 += `<td style="text-align:center;">${formatDateCustom('2026-12-31', dateFormat)}</td>`;
        sampleTd2 += `<td style="text-align:center;">${formatDateCustom('2026-12-31', dateFormat)}</td>`;
      }
    });
    if (extraGrade) {
      sampleTd1 += `<td style="color:#0f766e; font-weight:600; text-align:center;">${STATE.lang === 'uk' ? 'Зараховано' : 'Passed'}</td>`;
      sampleTd2 += `<td style="color:#0f766e; font-weight:600; text-align:center;">${STATE.lang === 'uk' ? 'Зараховано' : 'Passed'}</td>`;
    }
    if (extraValidity) {
      sampleTd1 += `<td style="text-align:center;">${formatDateCustom('2027-12-31', dateFormat)}</td>`;
      sampleTd2 += `<td style="text-align:center;">${formatDateCustom('2027-12-31', dateFormat)}</td>`;
    }
    if (extraRemarks) {
      sampleTd1 += `<td style="text-align:center;">${STATE.lang === 'uk' ? 'Без зауважень' : 'No remarks'}</td>`;
      sampleTd2 += `<td style="text-align:center;">${STATE.lang === 'uk' ? 'Без зауважень' : 'No remarks'}</td>`;
    }

    tbody.innerHTML = `<tr>${sampleTd1}</tr><tr>${sampleTd2}</tr>`;
  }

  const pDate = document.getElementById('paper-preview-footer-date');
  const pRank = document.getElementById('paper-preview-footer-rank');
  const pName = document.getElementById('paper-preview-footer-name');
  if (pDate) pDate.textContent = dateText;
  if (pRank) pRank.textContent = signRank;
  if (pName) pName.textContent = signName ? `____________ (${signName})` : (STATE.lang === 'uk' ? '____________ (підпис)' : '____________ (signature)');
}

/**
 * TAB 5: Renders System Audit & Change Log panel (ADMIN only)
 */
function renderSettingsLogTab() {
  const role = STATE.currentUser ? STATE.currentUser.role : 'ADMIN';
  const tbody = document.getElementById('settings-log-tbody');
  const counterBadge = document.getElementById('log-counter-badge');
  if (!tbody) return;

  if (role !== ROLES.ADMIN) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--danger-color); font-weight: 500;">
      ${STATE.lang === 'uk' ? 'Доступ заборонено. Перегляд журналу аудиту доступний лише адміністратору (ADMIN).' : 'Access denied. Audit log is available only for ADMIN.'}
    </td></tr>`;
    if (counterBadge) counterBadge.textContent = 'Доступ обмежено';
    return;
  }

  const searchInput = document.getElementById('log-search-input');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filterTypeSelect = document.getElementById('log-filter-type');
  const selectedType = filterTypeSelect ? filterTypeSelect.value : 'ALL';

  if (!Array.isArray(STATE.changelog)) {
    STATE.changelog = [];
  }

  // Sort newest first
  const sortedLogs = [...STATE.changelog].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Filter logs
  const filteredLogs = sortedLogs.filter(log => {
    if (selectedType !== 'ALL' && log.type !== selectedType) {
      return false;
    }

    if (query) {
      const email = (log.userEmail || '').toLowerCase();
      const crew = (log.crewMember || '').toLowerCase();
      const type = (log.type || '').toLowerCase();
      const detailsStr = JSON.stringify(log.details || '').toLowerCase();
      if (!email.includes(query) && !crew.includes(query) && !type.includes(query) && !detailsStr.includes(query)) {
        return false;
      }
    }
    return true;
  });

  // Update counter badge
  if (counterBadge) {
    counterBadge.textContent = STATE.lang === 'uk'
      ? `Всього: ${STATE.changelog.length} (Відображено: ${filteredLogs.length})`
      : `Total: ${STATE.changelog.length} (Showing: ${filteredLogs.length})`;
  }

  tbody.innerHTML = '';
  if (filteredLogs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 32px 16px; color: var(--text-secondary); font-style: italic;">
          ${STATE.lang === 'uk' ? 'Записів у журналі аудиту не знайдено' : 'No audit log entries found'}
        </td>
      </tr>
    `;
    return;
  }

  const typeConfig = {
    MANUAL_EDIT: {
      label: { uk: 'Ручна зміна', en: 'Manual Edit' },
      style: 'background-color: rgba(59, 130, 246, 0.12); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.3);'
    },
    FLIGHT_LOG: {
      label: { uk: 'Політ', en: 'Flight Log' },
      style: 'background-color: rgba(168, 85, 247, 0.12); color: #7c3aed; border: 1px solid rgba(168, 85, 247, 0.3);'
    },
    CREW_ADD: {
      label: { uk: 'Додано', en: 'Added' },
      style: 'background-color: rgba(16, 185, 129, 0.12); color: #059669; border: 1px solid rgba(16, 185, 129, 0.3);'
    },
    CREW_DELETE: {
      label: { uk: 'Видалено', en: 'Deleted' },
      style: 'background-color: rgba(239, 68, 68, 0.12); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.3);'
    },
    MERGE_IMPORT: {
      label: { uk: 'Імпорт Excel', en: 'Excel Import' },
      style: 'background-color: rgba(14, 165, 233, 0.12); color: #0284c7; border: 1px solid rgba(14, 165, 233, 0.3);'
    }
  };

  filteredLogs.forEach(log => {
    const dateObj = new Date(log.timestamp);
    const dateStr = !isNaN(dateObj.getTime())
      ? `${dateObj.toLocaleDateString('uk-UA')}, ${dateObj.toLocaleTimeString('uk-UA')}`
      : (log.timestamp || '-');

    const cfg = typeConfig[log.type] || {
      label: { uk: log.type || 'Дія', en: log.type || 'Action' },
      style: 'background-color: var(--bg-surface-alt); color: var(--text-secondary); border: 1px solid var(--border-color);'
    };
    const typeLabel = cfg.label[STATE.lang] || cfg.label.uk;

    const userEmail = log.userEmail || 'system@aerocheck.com';
    const isSpecialAdmin = userEmail.includes('admin');

    const crewTarget = log.crewMember || '-';
    const crewTypeBadge = log.crewType
      ? `<span class="status-badge status-neutral" style="font-size: 10px; padding: 1px 5px; margin-left: 4px;">${log.crewType}</span>`
      : '';

    let detailsHtml = '';
    if (Array.isArray(log.details) && log.details.length > 0) {
      detailsHtml = log.details.map(d => {
        if (!d) return '';
        if (d.field === 'flight' && typeof d.newValue === 'object') {
          const f = d.newValue;
          return `<div><strong>Тренувальний політ:</strong> дата ${f.date || '-'}, тривалість: ${f.duration || 0} год., вправи: ${(f.exercises || []).join(', ') || 'немає'}</div>`;
        }
        if (d.field === 'photo') {
          return `<div><strong>Фото профілю:</strong> ${d.newValue}</div>`;
        }
        if (d.field === 'scans') {
          return `<div><strong>Скан документа:</strong> ${d.newValue || d.oldValue}</div>`;
        }
        if (d.field === 'all') {
          return `<div>${d.newValue}</div>`;
        }
        const oldVal = (d.oldValue !== undefined && d.oldValue !== null && d.oldValue !== 'empty' && d.oldValue !== 'none') ? d.oldValue : '';
        const newVal = (d.newValue !== undefined && d.newValue !== null && d.newValue !== 'empty') ? d.newValue : '';

        const oldPart = oldVal ? `<span style="text-decoration: line-through; color: var(--text-secondary); margin-right: 4px;">${formatDateUa(oldVal) || oldVal}</span>➔ ` : '';
        const newPart = newVal ? `<strong style="color: var(--accent); margin-left: 4px;">${formatDateUa(newVal) || newVal}</strong>` : '<em style="color: var(--danger-color); margin-left: 4px;">(очищено)</em>';
        return `<div style="margin: 2px 0;"><span style="font-weight: 600; color: var(--text-primary);">${d.field}:</span> ${oldPart}${newPart}</div>`;
      }).join('');
    } else if (typeof log.details === 'string') {
      detailsHtml = log.details;
    } else {
      detailsHtml = '<span style="color: var(--text-secondary); font-style: italic;">Без додаткових деталей</span>';
    }

    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td style="white-space: nowrap; font-family: var(--font-mono, monospace); font-size: 11px; color: var(--text-secondary);">
          <i data-lucide="clock" style="width: 12px; height: 12px; vertical-align: -2px; margin-right: 4px; opacity: 0.7;"></i>
          ${dateStr}
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <i data-lucide="${isSpecialAdmin ? 'shield' : 'user'}" style="width: 13px; height: 13px; color: ${isSpecialAdmin ? 'var(--accent)' : 'var(--text-secondary)'};"></i>
            <span style="font-weight: 500; word-break: break-all;">${userEmail}</span>
          </div>
        </td>
        <td style="text-align: center;">
          <span class="status-badge" style="font-size: 11px; padding: 2px 8px; ${cfg.style}">${typeLabel}</span>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--text-primary); display: flex; align-items: center;">
            <span>${crewTarget}</span>
            ${crewTypeBadge}
          </div>
        </td>
        <td style="font-size: 12px; line-height: 1.4;">
          ${detailsHtml}
        </td>
      </tr>
    `);
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Exports system audit log to CSV with Ukrainian UTF-8 BOM
 */
function exportChangelogCsv() {
  if (!STATE.changelog || STATE.changelog.length === 0) {
    showToast(STATE.lang === 'uk' ? 'Журнал змін порожній для експорту' : 'Changelog is empty for export', 'warning');
    return;
  }

  const sortedLogs = [...STATE.changelog].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  const headers = ['Дата та час', 'Автор (Email)', 'Тип дії', 'Член екіпажу', 'Тип екіпажу', 'Деталі'];
  const rows = [headers.join(';')];

  sortedLogs.forEach(log => {
    const dateObj = new Date(log.timestamp);
    const dateStr = !isNaN(dateObj.getTime())
      ? `${dateObj.toLocaleDateString('uk-UA')} ${dateObj.toLocaleTimeString('uk-UA')}`
      : (log.timestamp || '');
    
    const userEmail = (log.userEmail || '').replace(/;/g, ',');
    const type = (log.type || '').replace(/;/g, ',');
    const crewMember = (log.crewMember || '').replace(/;/g, ',');
    const crewType = (log.crewType || '').replace(/;/g, ',');

    let detailsText = '';
    if (Array.isArray(log.details)) {
      detailsText = log.details.map(d => {
        if (!d) return '';
        if (d.field === 'flight') return 'Політ';
        return `${d.field}: ${d.oldValue || ''} -> ${d.newValue || ''}`;
      }).join(' | ');
    } else if (typeof log.details === 'string') {
      detailsText = log.details;
    }
    detailsText = detailsText.replace(/;/g, ',').replace(/"/g, '""');

    rows.push(`"${dateStr}";"${userEmail}";"${type}";"${crewMember}";"${crewType}";"${detailsText}"`);
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const todayStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `system_audit_log_${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(STATE.lang === 'uk' ? 'Журнал аудиту успішно експортовано в CSV' : 'Audit log exported to CSV');
}

/**
 * BLANKS VIEW: Renders dynamic forms catalog on the "Бланки" page with Multi-Crew support
 */
function renderForms() {
  const container = document.getElementById('forms-list-container');
  if (!container) return;

  container.innerHTML = '';
  if (!STATE.forms || STATE.forms.length === 0) {
    const emptyMsg = STATE.lang === 'uk' 
      ? 'Немає налаштованих форм. Натисніть «Конструктор та редактор форм», щоб створити першу форму.'
      : 'No form templates configured. Click "Forms Generator & Editor" to create your first template.';
    container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 30px;">${emptyMsg}</div>`;
    return;
  }

  if (!STATE.formSelectedCrew) {
    STATE.formSelectedCrew = {};
  }

  STATE.forms.forEach(form => {
    if (!Array.isArray(STATE.formSelectedCrew[form.id])) {
      STATE.formSelectedCrew[form.id] = [];
    }
    const selectedIds = STATE.formSelectedCrew[form.id];

    const card = document.createElement('div');
    card.className = 'blank-card-item';

    const crewList = form.crewType === 'Cabin' ? STATE.cabinCrew : STATE.flightCrew;
    
    // Build options for crew picker dropdown (exclude already selected)
    let crewOptions = `<option value="">${TRANSLATIONS[STATE.lang].placeholder_select_crew || '+ Додати члена екіпажу до бланка...'}</option>`;
    crewList.forEach(m => {
      const isAlreadyAdded = selectedIds.includes(m.id);
      const name = STATE.lang === 'uk' ? (m.Full_Name_UA || m.Name_Shrt_UA) : (m.Full_Name_EN || m.Full_Name_UA);
      crewOptions += `<option value="${m.id}" ${isAlreadyAdded ? 'disabled style="color:var(--text-muted);"' : ''}>${name} [${m.Rank || ''}] ${isAlreadyAdded ? '✓' : ''}</option>`;
    });

    // Build chips HTML
    let chipsHtml = '';
    if (selectedIds.length === 0) {
      chipsHtml = `<div style="font-size: 12px; color: var(--text-secondary); font-style: italic;">
        ${TRANSLATIONS[STATE.lang].empty_blank_desc || 'Порожній бланк (для ручного заповнення). Додайте одного або декількох співробітників, щоб сформувати заповнену відомість.'}
      </div>`;
    } else {
      chipsHtml = selectedIds.map(mId => {
        const m = crewList.find(c => c.id === mId);
        if (!m) return '';
        const name = STATE.lang === 'uk' ? (m.Name_Shrt_UA || m.Full_Name_UA) : (m.Full_Name_EN || m.Full_Name_UA);
        return `
          <span class="crew-chip">
            <span><strong>${name}</strong> <span style="color:var(--text-secondary); font-size:11px;">[${m.Rank || ''}]</span></span>
            <span class="crew-chip-remove" data-form-id="${form.id}" data-member-id="${m.id}" title="${STATE.lang === 'uk' ? 'Видалити з відомості' : 'Remove from roster'}">✕</span>
          </span>
        `;
      }).join('');
    }

    const printBtnLabel = selectedIds.length > 0 
      ? (STATE.lang === 'uk' ? `Друк відомості (${selectedIds.length} ос.) / PDF` : `Print Roster (${selectedIds.length}) / PDF`)
      : (TRANSLATIONS[STATE.lang].btn_print_pdf || 'Друк бланка / PDF');

    card.innerHTML = `
      <div class="blank-card-header-row">
        <div class="blank-card-meta">
          <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--accent-light); color: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i data-lucide="file-text" style="width: 22px; height: 22px;"></i>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="font-size: 15px; color: var(--text-primary);">${form.name}</strong>
              <span class="status-badge status-neutral" style="font-size: 10px; font-weight: 700;">${form.code || 'FORM'}</span>
              <span class="status-badge status-valid" style="font-size: 10px;">${form.crewType === 'Cabin' ? 'CABIN CREW' : 'FLIGHT CREW'}</span>
              <span class="status-badge status-neutral" style="font-size: 10px;">${form.orientation === 'landscape' ? (STATE.lang === 'uk' ? 'Альбомна (А4)' : 'Landscape (A4)') : (STATE.lang === 'uk' ? 'Книжкова (А4)' : 'Portrait (A4)')}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 3px;">
              ${form.subtitle || 'Авіакомпанія «Українські вертольоти»'} • ${STATE.lang === 'uk' ? 'Стовпчиків' : 'Columns'}: ${(form.columns || []).length} • ${STATE.lang === 'uk' ? 'Формат дати' : 'Date'}: ${form.dateFormat || 'DD.MM.YYYY'}
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn btn-primary btn-print-form" data-form-id="${form.id}" style="height: 36px;">
            <i data-lucide="printer"></i>
            <span>${printBtnLabel}</span>
          </button>

          <button class="btn btn-secondary btn-edit-form-direct" data-form-id="${form.id}" style="height: 36px; padding: 0 10px;" title="${TRANSLATIONS[STATE.lang].btn_edit_form || 'Редагувати в генераторі'}">
            <i data-lucide="settings" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
      </div>

      <!-- Multi-crew Selection Roster Section -->
      <div class="blank-crew-section">
        <div class="blank-crew-picker-row">
          <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
            <i data-lucide="users" style="width: 14px; height: 14px; color: var(--accent);"></i>
            <span>${TRANSLATIONS[STATE.lang].label_crew_select_blank || 'Співробітники для бланка:'}</span>
          </div>

          <select class="form-select form-crew-picker-select" data-form-id="${form.id}" style="height: 32px; font-size: 12px; flex: 1 1 240px; min-width: 180px;">
            ${crewOptions}
          </select>

          <button class="btn btn-secondary btn-add-crew-blank" data-form-id="${form.id}" style="height: 32px; font-size: 12px; padding: 0 10px;">
            <i data-lucide="user-plus" style="width: 13px; height: 13px;"></i>
            <span>${TRANSLATIONS[STATE.lang].btn_add_to_blank || '+ Додати'}</span>
          </button>

          <button class="btn btn-secondary btn-select-all-crew" data-form-id="${form.id}" style="height: 32px; font-size: 12px; padding: 0 10px;" title="${STATE.lang === 'uk' ? 'Додати всіх членів екіпажу' : 'Select all crew members'}">
            <span>${TRANSLATIONS[STATE.lang].btn_select_all_crew || 'Всі'} (${crewList.length})</span>
          </button>

          <button class="btn btn-secondary btn-clear-crew-blank" data-form-id="${form.id}" style="height: 32px; font-size: 12px; padding: 0 10px;" title="${STATE.lang === 'uk' ? 'Очистити список' : 'Clear selection'}">
            <span>${TRANSLATIONS[STATE.lang].btn_clear_crew_list || 'Очистити'}</span>
          </button>

          ${selectedIds.length > 0 ? `<span class="status-badge status-valid" style="font-size: 11px; margin-left: auto;">${TRANSLATIONS[STATE.lang].selected_crew_count || 'Обрано:'} ${selectedIds.length}</span>` : ''}
        </div>

        <div class="blank-crew-chips-list">
          ${chipsHtml}
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // Event handlers
  container.querySelectorAll('.btn-add-crew-blank').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const formId = e.currentTarget.getAttribute('data-form-id');
      const select = container.querySelector(`.form-crew-picker-select[data-form-id="${formId}"]`);
      const memberId = select?.value;
      if (!memberId) {
        showToast(STATE.lang === 'uk' ? 'Виберіть співробітника зі списку' : 'Select a crew member first', 'warning');
        return;
      }
      if (!STATE.formSelectedCrew[formId].includes(memberId)) {
        STATE.formSelectedCrew[formId].push(memberId);
        renderForms();
      }
    });
  });

  container.querySelectorAll('.form-crew-picker-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const formId = e.currentTarget.getAttribute('data-form-id');
      const memberId = e.currentTarget.value;
      if (memberId && !STATE.formSelectedCrew[formId].includes(memberId)) {
        STATE.formSelectedCrew[formId].push(memberId);
        renderForms();
      }
    });
  });

  container.querySelectorAll('.btn-select-all-crew').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const formId = e.currentTarget.getAttribute('data-form-id');
      const form = STATE.forms.find(f => f.id === formId);
      if (!form) return;
      const crewList = form.crewType === 'Cabin' ? STATE.cabinCrew : STATE.flightCrew;
      STATE.formSelectedCrew[formId] = crewList.map(m => m.id);
      renderForms();
    });
  });

  container.querySelectorAll('.btn-clear-crew-blank').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const formId = e.currentTarget.getAttribute('data-form-id');
      STATE.formSelectedCrew[formId] = [];
      renderForms();
    });
  });

  container.querySelectorAll('.crew-chip-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const formId = e.currentTarget.getAttribute('data-form-id');
      const memberId = e.currentTarget.getAttribute('data-member-id');
      STATE.formSelectedCrew[formId] = (STATE.formSelectedCrew[formId] || []).filter(id => id !== memberId);
      renderForms();
    });
  });

  container.querySelectorAll('.btn-print-form').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const formId = e.currentTarget.getAttribute('data-form-id');
      const form = STATE.forms.find(f => f.id === formId);
      if (form) {
        const memberIds = STATE.formSelectedCrew[formId] || [];
        openFormPrintWindow(form, memberIds);
      }
    });
  });

  container.querySelectorAll('.btn-edit-form-direct').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const formId = e.currentTarget.getAttribute('data-form-id');
      STATE.editingFormId = formId;
      switchView('settings');
      activateSettingsTab('forms');
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Returns crew member's short name: Surname and initials (Прізвище та ініціали, напр. Алекса С.М.)
 */
function getCrewShortNameWithInitials(member) {
  if (!member) return '-';
  if (member.Full_Name_UA && member.Full_Name_UA.trim()) {
    const parts = member.Full_Name_UA.trim().split(/\s+/);
    if (parts.length > 1) {
      const initials = parts.slice(1).map(p => p[0] ? p[0].toUpperCase() + '.' : '').join('');
      return `${parts[0]} ${initials}`.trim();
    }
    return parts[0];
  }
  if (member.Name_Shrt_UA && member.Name_Shrt_UA.trim()) {
    return member.Name_Shrt_UA.trim();
  }
  if (member.Full_Name_EN && member.Full_Name_EN.trim()) {
    const parts = member.Full_Name_EN.trim().split(/\s+/);
    if (parts.length > 1) {
      const initials = parts.slice(1).map(p => p[0] ? p[0].toUpperCase() + '.' : '').join('');
      return `${parts[0]} ${initials}`.trim();
    }
    return parts[0];
  }
  return '-';
}

/**
 * Formats crew member's name as HTML: Surname and atomic initials that wrap only if necessary
 */
function formatCrewShortNameHtml(member, col = 'Full_Name_UA') {
  if (!member) return '-';
  let surname = '';
  let initials = '';

  if (col === 'Full_Name_EN' && member.Full_Name_EN && member.Full_Name_EN.trim()) {
    const parts = member.Full_Name_EN.trim().split(/\s+/);
    surname = parts[0];
    if (parts.length > 1) {
      initials = parts.slice(1).map(p => p[0] ? p[0].toUpperCase() + '.' : '').join('');
    }
  } else if (member.Full_Name_UA && member.Full_Name_UA.trim()) {
    const parts = member.Full_Name_UA.trim().split(/\s+/);
    surname = parts[0];
    if (parts.length > 1) {
      initials = parts.slice(1).map(p => p[0] ? p[0].toUpperCase() + '.' : '').join('');
    }
  } else if (member.Name_Shrt_UA && member.Name_Shrt_UA.trim()) {
    const parts = member.Name_Shrt_UA.trim().split(/\s+/);
    surname = parts[0];
    if (parts.length > 1) {
      initials = parts.slice(1).join('');
    }
  } else if (member.Full_Name_EN && member.Full_Name_EN.trim()) {
    const parts = member.Full_Name_EN.trim().split(/\s+/);
    surname = parts[0];
    if (parts.length > 1) {
      initials = parts.slice(1).map(p => p[0] ? p[0].toUpperCase() + '.' : '').join('');
    }
  } else {
    return '-';
  }

  if (initials) {
    return `${surname} <span class="crew-initials" style="white-space: nowrap;">${initials}</span>`;
  }
  return surname;
}

/**
 * Opens print preview window for a customized blank
 * Supports single member, multiple members (roster), or empty blank (null / empty array)
 */
function openFormPrintWindow(form, memberIds = null) {
  const newWindow = window.open("", "_blank", "width=960,height=960");
  if (!newWindow) {
    showToast("Pop-up заблоковано браузером. Дозвольте спливаючі вікна для друку бланків.", "error");
    return;
  }

  // Normalize memberIds into an array
  let ids = [];
  if (Array.isArray(memberIds)) {
    ids = memberIds;
  } else if (memberIds && typeof memberIds === 'string') {
    ids = [memberIds];
  }

  const crewList = form.crewType === 'Cabin' ? STATE.cabinCrew : STATE.flightCrew;
  const members = ids.map(id => crewList.find(m => m.id === id)).filter(Boolean);

  const selectedCols = form.columns || [];
  const logoPos = form.logoPos || 'left';
  let logoHtml = '';
  if (form.logo && form.logo !== 'none') {
    logoHtml = `<img src="${form.logo}" alt="Logo" style="max-height: 52px; max-width: 160px; object-fit: contain;">`;
  }

  let headerFlex = 'justify-content: flex-start;';
  let headerTextFlex = 'text-align: left;';
  if (logoPos === 'center') {
    headerFlex = 'flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 10px;';
    headerTextFlex = 'text-align: center;';
  } else if (logoPos === 'right') {
    headerFlex = 'flex-direction: row-reverse; justify-content: space-between; align-items: center; text-align: right;';
    headerTextFlex = 'text-align: right;';
  } else {
    headerFlex = 'flex-direction: row; justify-content: flex-start; align-items: center; gap: 20px;';
  }

  const orientation = form.orientation === 'landscape' ? 'landscape' : 'portrait';
  const containerMaxWidth = orientation === 'landscape' ? '1060px' : '820px';
  const pageMargin = orientation === 'landscape' ? '8mm 10mm' : '10mm 12mm';
  const pageMinHeight = orientation === 'landscape' ? '680px' : '980px';

  const totalCols = selectedCols.length + (form.extraGrade ? 1 : 0) + (form.extraValidity ? 1 : 0) + (form.extraRemarks ? 1 : 0) + 1;
  let printFontSize = '10pt';
  
  // Cell padding resolution: use user-defined form.cellPadding (minimum 1px) or adaptive fallback
  let padH = form.cellPadding !== undefined ? Math.max(1, form.cellPadding) : (form.fitSingleLine ? 2 : 4);
  if (form.fitSingleLine && form.cellPadding === undefined) {
    if (orientation === 'landscape' && totalCols > 12) padH = 1;
    if (orientation === 'portrait' && totalCols > 9) padH = 1;
  }
  let padV = Math.max(1.5, Math.min(6, Math.round(padH * 0.75)));
  let printPadding = `${padV}px ${padH}px`;

  if (form.fitSingleLine) {
    if (orientation === 'landscape') {
      if (totalCols > 14) {
        printFontSize = '7pt';
      } else if (totalCols > 10) {
        printFontSize = '8pt';
      } else if (totalCols > 7) {
        printFontSize = '9pt';
      } else {
        printFontSize = '10pt';
      }
    } else {
      if (totalCols > 11) {
        printFontSize = '6.5pt';
      } else if (totalCols > 8) {
        printFontSize = '7.5pt';
      } else if (totalCols > 5) {
        printFontSize = '8.5pt';
      } else {
        printFontSize = '9.5pt';
      }
    }
  }

  // Header font size for "Посада" must be 2 units smaller than other headers
  const ptVal = parseFloat(printFontSize) || 10;
  const rankHeaderFontSize = `${Math.max(5, (ptVal - 2)).toFixed(1).replace(/\.0$/, '')}pt`;

  // Build rows HTML
  let rowsHtml = '';
  if (members.length > 0) {
    members.forEach((member, idx) => {
      rowsHtml += '<tr>';
      rowsHtml += `<td style="text-align: center; font-weight: bold; width: 26px; padding-left: 1px !important; padding-right: 1px !important;">${idx + 1}</td>`;
      selectedCols.forEach(col => {
        let val = member[col] || '-';
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
          val = formatDateCustom(val, form.dateFormat || 'DD.MM.YYYY');
        }
        const isRank = (col === 'Rank');
        const isName = ['Full_Name_UA', 'Full_Name_EN', 'Name_Shrt_UA'].includes(col);
        if (isRank) {
          rowsHtml += `<td class="col-rank">${val}</td>`;
        } else if (isName) {
          const shortNameHtml = formatCrewShortNameHtml(member, col);
          rowsHtml += `<td class="col-name"><strong>${shortNameHtml}</strong></td>`;
        } else {
          rowsHtml += `<td>${val}</td>`;
        }
      });
      if (form.extraGrade) rowsHtml += `<td style="text-align: center; font-weight: 600; color: #0f766e;">${STATE.lang === 'uk' ? 'Зараховано' : 'Passed'}</td>`;
      if (form.extraValidity) rowsHtml += '<td style="text-align: center;">____________</td>';
      if (form.extraRemarks) rowsHtml += `<td>${STATE.lang === 'uk' ? 'Без зауважень' : 'No remarks'}</td>`;
      rowsHtml += '</tr>';
    });
  } else {
    // Empty blank for handwriting (8 rows)
    for (let r = 1; r <= 8; r++) {
      rowsHtml += '<tr>';
      rowsHtml += `<td style="text-align: center; color: #64748b; width: 26px; padding-left: 1px !important; padding-right: 1px !important;">${r}</td>`;
      selectedCols.forEach(col => {
        const isRank = (col === 'Rank');
        const isName = ['Full_Name_UA', 'Full_Name_EN', 'Name_Shrt_UA'].includes(col);
        if (isRank) {
          rowsHtml += '<td class="col-rank">&nbsp;</td>';
        } else if (isName) {
          rowsHtml += '<td class="col-name">&nbsp;</td>';
        } else {
          rowsHtml += '<td>&nbsp;</td>';
        }
      });
      if (form.extraGrade) rowsHtml += '<td>&nbsp;</td>';
      if (form.extraValidity) rowsHtml += '<td>&nbsp;</td>';
      if (form.extraRemarks) rowsHtml += '<td>&nbsp;</td>';
      rowsHtml += '</tr>';
    }
  }

  // Build column headers HTML using SHORT titles ONLY!
  let colsThHtml = '<th style="width: 26px; text-align: center; padding-left: 1px !important; padding-right: 1px !important;">№</th>';
  selectedCols.forEach(col => {
    const shortLabel = getFormColumnShortTitle(col, STATE.lang);
    const isRank = (col === 'Rank');
    const isName = ['Full_Name_UA', 'Full_Name_EN', 'Name_Shrt_UA'].includes(col);
    if (isRank) {
      colsThHtml += `<th class="col-rank">${shortLabel}</th>`;
    } else if (isName) {
      const nameColWidth = totalCols > 12 ? '17%' : (totalCols > 8 ? '21%' : '25%');
      colsThHtml += `<th class="col-name" style="width: ${nameColWidth}; min-width: 85px;">${shortLabel}</th>`;
    } else {
      colsThHtml += `<th>${shortLabel}</th>`;
    }
  });
  if (form.extraGrade) colsThHtml += `<th style="text-align: center; width: 11%;">${STATE.lang === 'uk' ? 'Результат' : 'Result'}</th>`;
  if (form.extraValidity) colsThHtml += `<th style="text-align: center; width: 13%;">${STATE.lang === 'uk' ? 'Термін дії' : 'Validity'}</th>`;
  if (form.extraRemarks) colsThHtml += `<th style="width: 14%;">${STATE.lang === 'uk' ? 'Примітка' : 'Remarks'}</th>`;

  // Top info block
  let memberInfoBlock = '';
  if (members.length === 1) {
    const single = members[0];
    memberInfoBlock = `
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin: 12px 0; font-size: 12px; box-sizing: border-box;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
          <div><strong>${STATE.lang === 'uk' ? 'ПІБ:' : 'Name:'}</strong> ${getCrewShortNameWithInitials(single)}</div>
          <div><strong>${STATE.lang === 'uk' ? 'Посада:' : 'Rank:'}</strong> ${single.Rank || '-'}</div>
          <div><strong>${STATE.lang === 'uk' ? 'Підрозділ:' : 'Dept:'}</strong> ${single.Department || '-'}</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 4px; color: #475569; font-size: 11px;">
          <div><strong>${STATE.lang === 'uk' ? 'Категорія:' : 'Category:'}</strong> ${form.crewType === 'Cabin' ? (STATE.lang === 'uk' ? 'Кабінний склад' : 'Cabin Crew') : (STATE.lang === 'uk' ? 'Льотний склад' : 'Flight Crew')}</div>
          <div><strong>${STATE.lang === 'uk' ? 'Англ.:' : 'EN Name:'}</strong> ${single.Full_Name_EN || '-'}</div>
          <div><strong>Email:</strong> ${single.Email || '-'}</div>
        </div>
      </div>
    `;
  } else if (members.length > 1) {
    memberInfoBlock = `
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin: 12px 0; font-size: 11.5px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; box-sizing: border-box;">
        <div>
          <strong>${STATE.lang === 'uk' ? 'Склад групи:' : 'Roster group:'}</strong> ${members.length} ${STATE.lang === 'uk' ? 'осіб' : 'crew members'} • 
          <strong>${STATE.lang === 'uk' ? 'Підрозділ:' : 'Dept:'}</strong> ${form.crewType === 'Cabin' ? 'CABIN CREW' : 'FLIGHT CREW'}
        </div>
        <div style="color: #64748b; font-size: 11px;">
          ${STATE.lang === 'uk' ? 'Дата формування відомості:' : 'Generated on:'} ${new Date().toLocaleDateString(STATE.lang === 'uk' ? 'uk-UA' : 'en-GB')}
        </div>
      </div>
    `;
  }

  newWindow.document.write(`
    <!DOCTYPE html>
    <html lang="${STATE.lang === 'uk' ? 'uk' : 'en'}">
      <head>
        <meta charset="UTF-8">
        <title>${form.code || 'Form'} — ${form.name}</title>
        <style>
          @page {
            size: A4 ${orientation};
            margin: ${pageMargin};
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0;
            padding: 20px;
            background-color: #f1f5f9;
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 12px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .sheet-container {
            width: 100% !important;
            max-width: ${containerMaxWidth} !important;
            margin: 0 auto;
            background: #ffffff;
            padding: 28px 32px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
            min-height: ${pageMinHeight};
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          .table-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          .paper-header {
            display: flex;
            ${headerFlex}
            margin-bottom: 16px;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
          }
          .title-area {
            ${headerTextFlex}
          }
          h1 {
            font-size: 17px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            margin: 0;
            color: #0f172a;
          }
          .doc-code {
            font-size: 12px;
            font-weight: 700;
            color: #475569;
            margin-top: 3px;
          }
          .doc-sub {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
          }
          table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            margin-top: ${form.tableSpacing !== undefined ? form.tableSpacing : 20}px !important;
            margin-bottom: 16px !important;
            font-size: ${printFontSize};
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          th, td {
            border: 1px solid #94a3b8 !important;
            padding: ${printPadding} !important;
            text-align: center;
            vertical-align: middle;
            box-sizing: border-box !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            ${form.fitSingleLine ? 'white-space: nowrap !important;' : 'word-break: break-word !important; overflow-wrap: break-word !important;'}
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: 700 !important;
            color: #1e293b !important;
            text-align: center !important;
            padding-left: 1px !important;
            padding-right: 1px !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
          }
          th.col-rank {
            font-size: ${rankHeaderFontSize} !important;
            padding-left: 1px !important;
            padding-right: 1px !important;
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
            width: 44px !important;
            max-width: 48px !important;
          }
          td.col-rank {
            padding-left: 1px !important;
            padding-right: 1px !important;
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
            width: 44px !important;
            max-width: 48px !important;
          }
          th.col-name {
            text-align: center !important;
            vertical-align: middle !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
            line-height: 1.2 !important;
          }
          td.col-name {
            text-align: left !important;
            vertical-align: middle !important;
            white-space: normal !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
            text-overflow: clip !important;
            overflow: visible !important;
            line-height: 1.2 !important;
            padding-left: 5px !important;
            padding-right: 4px !important;
          }
          .footer-section {
            margin-top: 28px;
            border-top: 1px solid #cbd5e1;
            padding-top: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 12px;
          }
          .sign-area {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }
          .sign-line {
            display: inline-block;
            min-width: 160px;
            border-bottom: 1px solid #0f172a;
            margin-top: 14px;
          }
          .no-print-bar {
            max-width: ${containerMaxWidth};
            margin: 0 auto 16px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .btn-print {
            background-color: #4f46e5;
            color: #ffffff;
            border: none;
            padding: 8px 20px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
          }
          @media print {
            .no-print-bar { display: none !important; }
            html, body {
              background: #ffffff !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .sheet-container {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
              min-height: auto !important;
              overflow: hidden !important;
            }
            table {
              width: 100% !important;
              max-width: 100% !important;
              table-layout: fixed !important;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div style="font-weight: 600; color: #475569;">
            ${STATE.lang === 'uk' ? 'Попередній перегляд перед друком' : 'Print Preview'} (${form.code || 'Form'})
          </div>
          <button class="btn-print" onclick="window.print()">
            🖨 ${STATE.lang === 'uk' ? 'Друк бланку / Зберегти як PDF' : 'Print Form / Save as PDF'}
          </button>
        </div>

        <div class="sheet-container">
          <div style="width: 100%; max-width: 100%; box-sizing: border-box; overflow: hidden;">
            <div class="paper-header">
              ${logoHtml}
              <div class="title-area">
                <h1>${form.name}</h1>
                <div class="doc-code">${form.code || ''}</div>
                <div class="doc-sub">${form.subtitle || ''}</div>
              </div>
            </div>

            ${memberInfoBlock}

            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>${colsThHtml}</tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </div>

          <div class="footer-section">
            <div style="font-weight: 500;">
              ${form.dateText || (STATE.lang === 'uk' ? 'Дата: «____» ___________ 202___ р.' : 'Date: _____ / _____ / 202___')}
            </div>
            <div class="sign-area">
              <div style="font-weight: 700;">${form.signRank || (STATE.lang === 'uk' ? 'Керівник льотної служби' : 'Chief of Flight Operations')}</div>
              <div class="sign-line"></div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                ${form.signName ? `(${form.signName})` : (STATE.lang === 'uk' ? '(підпис / печатка)' : '(signature / stamp)')}
              </div>
            </div>
          </div>

        </div>
      </body>
    </html>
  `);
  newWindow.document.close();
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
    member = allCrew.find(c => String(c.id) === String(STATE.selectedCrewMemberId));
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
      STATE.isEditingPortalProfile = false;
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
    editProfileBtn.style.display = (role === ROLES.ADMIN && !STATE.isEditingPortalProfile) ? 'inline-flex' : 'none';
  }

  // Render profile (either Edit form or static view)
  if (STATE.isEditingPortalProfile && role === ROLES.ADMIN) {
    // Generate unique Ranks and Depts from the table
    const crewList = (member.crewType && member.crewType.toUpperCase().includes('CABIN')) ? STATE.cabinCrew : STATE.flightCrew;
    const allRanks = [...new Set(crewList.map(c => c.Rank).filter(Boolean))];
    if (member.Rank && !allRanks.includes(member.Rank)) allRanks.push(member.Rank);
    const rankOrder = ['КПС', '2П', 'ІБ', 'БП-РА', 'БП'];
    allRanks.sort((a, b) => {
      const idxA = rankOrder.indexOf(a);
      const idxB = rankOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, STATE.lang === 'uk' ? 'uk' : 'en');
    });

    const allDepts = [...new Set(crewList.map(c => c.Department).filter(Boolean))];
    if (member.Department && !allDepts.includes(member.Department)) allDepts.push(member.Department);
    const deptOrder = ['ПРВ', 'ТВ'];
    allDepts.sort((a, b) => {
      const idxA = deptOrder.indexOf(a);
      const idxB = deptOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, STATE.lang === 'uk' ? 'uk' : 'en');
    });

    const rankOptionsHtml = allRanks.map(r => `<option value="${r}" ${r === member.Rank ? 'selected' : ''}>${r}</option>`).join('');
    const deptOptionsHtml = allDepts.map(d => `<option value="${d}" ${d === member.Department ? 'selected' : ''}>${d}</option>`).join('');

    profileDetails.innerHTML = `
      ${avatarHtml}
      <form id="portal-profile-edit-form" style="display: flex; flex-direction: column; gap: var(--spacing-3); width: 100%;">
        <div id="portal-profile-name-row" style="white-space: nowrap;"><span class="profile-name-text-measure"><strong>Прізвище Ім'я:</strong> ${member.Full_Name_UA}</span></div>
        <div style="white-space: nowrap;"><strong>Name:</strong> ${member.Full_Name_EN}</div>
        
        <div class="form-group">
          <label style="font-weight: 600; font-size: 13px;">Посада / Rank:</label>
          <select id="edit-portal-rank" class="form-input" required>
            ${rankOptionsHtml}
          </select>
        </div>
        <div class="form-group">
          <label style="font-weight: 600; font-size: 13px;">Відділ / Dept:</label>
          <select id="edit-portal-dept" class="form-input" required>
            ${deptOptionsHtml}
          </select>
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
      <div id="portal-profile-name-row" style="white-space: nowrap;"><span class="profile-name-text-measure"><strong>Прізвище Ім'я:</strong> ${member.Full_Name_UA}</span></div>
      <div style="white-space: nowrap;"><strong>Name:</strong> ${member.Full_Name_EN}</div>
      <div><strong>Посада / Rank:</strong> <span class="status-badge status-neutral">${member.Rank}</span></div>
      <div><strong>Відділ / Dept:</strong> ${member.Department}</div>
      <div><strong>Email:</strong> ${member.Email}</div>
      <div><strong>Phone:</strong> ${member.Phone || '-'}</div>
      ${member.LICENSE ? `<div><strong>License:</strong> <code>${member.LICENSE}</code></div>` : ''}
      <div style="margin-top: 8px; padding: 10px; background-color: var(--bg-surface-alt); border-radius: var(--radius-md); border: 1px solid var(--border-color); font-size: 12px; box-sizing: border-box; max-width: 100%;">
        <div style="font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          <i data-lucide="folder" style="width: 14px; height: 14px; color: var(--accent); flex-shrink: 0;"></i>
          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Папка на Google Drive (${member.crewType}):</span>
        </div>
        <code style="word-break: break-all; color: var(--text-primary); font-size: 11px; display: block;">${getMemberFolderPath(member)}</code>
      </div>
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
  const canEditDates = (role === ROLES.ADMIN || role === ROLES.INSTRUCTOR || role === ROLES.OFFICE);
  const editPrompt = STATE.lang === 'uk' ? 'Натисніть на дату для редагування' : 'Click date to edit';
  const addDateText = STATE.lang === 'uk' ? '+ Вказати дату' : '+ Set date';
  
  Object.keys(crewConfig.columnMapping).forEach(colName => {
    if (['Rank', 'Department', 'Name_Shrt_UA', 'Full_Name_UA', 'Full_Name_EN'].includes(colName)) return;
    
    const ruleKey = crewConfig.columnMapping[colName];
    const val = member[colName] || '';
    
    if (isExpiring(ruleKey)) {
      const status = determineStatus(val, sysDate, ruleKey);
      const theme = CREW_COMPLIANCE_RULES.STATUS_THEME[status];
      const label = theme.label[STATE.lang];
      
      expiriesGrid.insertAdjacentHTML('beforeend', `
        <div class="portal-training-card ${canEditDates ? 'portal-training-card--editable' : ''}"
             data-col="${colName}" data-rule="${ruleKey}"
             ${canEditDates ? `title="${editPrompt}"` : ''}
             style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--spacing-3); display:flex; flex-direction:column; gap:4px; align-items:center; text-align:center; background-color: var(--bg-surface-alt);">
          <div style="font-size:12px; font-weight:700; font-family:var(--font-display);">${colName}</div>
          <span class="status-badge ${theme.class}" style="font-size:10px; padding: 2px 6px;">${label}</span>
          <div style="font-size:13px; font-weight:600; margin-top:2px; display:flex; align-items:center; justify-content:center; gap:4px;">
            <span>${val ? formatDateUa(val) : (canEditDates ? `<span style="color:var(--accent); font-size:11px; font-weight:500;">${addDateText}</span>` : '-')}</span>
            ${canEditDates ? '<i data-lucide="edit-3" class="portal-date-edit-icon" style="width:12px; height:12px; opacity:0.5; color:var(--text-secondary);"></i>' : ''}
          </div>
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
        <div class="portal-training-card ${canEditDates ? 'portal-training-card--editable' : ''}"
             data-col="${colName}" data-rule=""
             ${canEditDates ? `title="${editPrompt}"` : ''}
             style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--spacing-3); display:flex; flex-direction:column; gap:4px; align-items:center; text-align:center; background-color: var(--bg-surface-alt);">
          <div style="font-size:12px; font-weight:700; font-family:var(--font-display);">${colName}</div>
          <span class="status-badge ${theme.class}" style="font-size:10px; padding: 2px 6px;">${label}</span>
          <div style="font-size:13px; font-weight:600; margin-top:2px; display:flex; align-items:center; justify-content:center; gap:4px;">
            <span>${val ? formatDateUa(val) : (canEditDates ? `<span style="color:var(--accent); font-size:11px; font-weight:500;">${addDateText}</span>` : '-')}</span>
            ${canEditDates ? '<i data-lucide="edit-3" class="portal-date-edit-icon" style="width:12px; height:12px; opacity:0.5; color:var(--text-secondary);"></i>' : ''}
          </div>
        </div>
      `);
    });
  }
  
  // Wire up click event on editable cards for date modification
  if (canEditDates) {
    document.querySelectorAll('.portal-training-card--editable').forEach(card => {
      card.addEventListener('click', () => {
        const colName = card.dataset.col;
        const ruleKey = card.dataset.rule;
        openPortalDateEditModal(member, colName, ruleKey);
      });
    });
  }
  
  // Initialize default scans if missing
  if (!member.scans) {
    const safeNameEn = (member.Full_Name_EN || member.Full_Name_UA || 'Crew').replace(/\s+/g, '_');
    const safeLastName = (member.Full_Name_EN || member.Full_Name_UA || 'Crew').split(/\s+/)[1] || 'Crew';
    member.scans = [
      { name: 'OPC 2026', fileName: `${safeNameEn}_OPC_2026.pdf`, dateAdded: '2026-07-15' },
      { name: 'Medical Certificate', fileName: `Medical_Certificate_${safeLastName}.pdf`, dateAdded: '2026-07-15' }
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

  // Adjust card width so it strictly equals the name row width + exact left and right padding
  const adjustProfileCardWidth = () => {
    const card = document.getElementById('portal-profile-card');
    const nameRow = document.getElementById('portal-profile-name-row');
    if (card && nameRow) {
      const nameTextSpan = nameRow.querySelector('.profile-name-text-measure');
      const textWidth = nameTextSpan ? nameTextSpan.getBoundingClientRect().width : nameRow.scrollWidth;
      if (textWidth > 50) {
        // card padding is var(--spacing-6) = 24px on left, 24px on right, border is 1px on left, 1px on right (total 50px)
        const targetWidth = Math.ceil(textWidth + 48 + 2);
        card.style.width = `${targetWidth}px`;
        card.style.minWidth = `${targetWidth}px`;
        card.style.maxWidth = `${targetWidth}px`;
        card.style.flexShrink = '0';
      }
    }
  };
  adjustProfileCardWidth();
  setTimeout(adjustProfileCardWidth, 30);
  setTimeout(adjustProfileCardWidth, 150);
}

/**
 * Opens modal for editing training date directly from personal portal
 */
function openPortalDateEditModal(member, colName, ruleKey) {
  if (!member || !colName) return;

  const currentVal = member[colName] || '';
  const crewName = member.Full_Name_UA || member.Full_Name_EN || '';
  const isExp = ruleKey && isExpiring(ruleKey);

  const crewNameEl = document.getElementById('portal-date-edit-crew-name');
  if (crewNameEl) crewNameEl.textContent = crewName;

  const trainingNameEl = document.getElementById('portal-date-edit-training-name');
  if (trainingNameEl) trainingNameEl.textContent = colName;

  const colNameInput = document.getElementById('portal-date-edit-col-name');
  if (colNameInput) colNameInput.value = colName;

  const ruleKeyInput = document.getElementById('portal-date-edit-rule-key');
  if (ruleKeyInput) ruleKeyInput.value = ruleKey || '';
  
  // Format current value display
  const currentValEl = document.getElementById('portal-date-edit-current-val');
  if (currentValEl) {
    if (currentVal) {
      currentValEl.textContent = `${formatDateUa(currentVal)} (${currentVal})`;
    } else {
      currentValEl.textContent = STATE.lang === 'uk' ? 'не встановлено' : 'not set';
    }
  }

  // Set date input value (extract ISO YYYY-MM-DD)
  const inputEl = document.getElementById('portal-date-edit-input');
  let isoDate = '';
  if (currentVal) {
    const match = String(currentVal).trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) {
      isoDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    } else {
      const d = new Date(currentVal);
      if (!isNaN(d.getTime())) {
        isoDate = d.toISOString().split('T')[0];
      }
    }
  }
  if (inputEl) inputEl.value = isoDate;

  // Type selector visibility
  const typeWrapper = document.getElementById('portal-date-edit-type-wrapper');
  const inputLabel = document.getElementById('portal-date-edit-input-label');
  const expiryRadio = document.querySelector('input[name="portal-date-edit-mode"][value="EXPIRY"]');

  if (typeWrapper) {
    if (isExp) {
      typeWrapper.style.display = 'block';
      if (expiryRadio) expiryRadio.checked = true;
      if (inputLabel) inputLabel.textContent = STATE.lang === 'uk' ? 'Дата закінчення дії:' : 'Expiration Date:';
    } else {
      typeWrapper.style.display = 'none';
      if (inputLabel) inputLabel.textContent = STATE.lang === 'uk' ? 'Дата проходження:' : 'Completion Date:';
    }
  }

  // Store active member reference on the form
  const form = document.getElementById('portal-date-edit-form');
  if (form) form.dataset.memberId = member.id;

  // Open modal
  const modal = document.getElementById('portal-date-edit-modal-backdrop');
  if (modal) modal.classList.add('active');
  if (window.lucide) window.lucide.createIcons();
  
  if (inputEl) {
    setTimeout(() => inputEl.focus(), 50);
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

  // Check if account was deleted
  const deletedUsers = JSON.parse(localStorage.getItem('aerocheck_deleted_users') || '[]');
  if (deletedUsers.includes(email)) {
    showToast(STATE.lang === 'uk' ? "Цей обліковий запис було видалено або заблоковано" : "This user account has been deleted", "error");
    return;
  }

  const userRoles = JSON.parse(localStorage.getItem('aerocheck_user_roles') || '{}');
  const customUsers = JSON.parse(localStorage.getItem('aerocheck_custom_users') || '[]');
  const customUser = customUsers.find(u => u.email.toLowerCase() === email);

  let role = userRoles[email] || null;

  if (email === 'admin@ukr-helicopters.ua') {
    role = role || ROLES.ADMIN;
  } else if (email === 'instructor@ukr-helicopters.ua') {
    role = role || ROLES.INSTRUCTOR;
  } else if (email === 'office@ukr-helicopters.ua') {
    role = role || ROLES.OFFICE;
  } else if (customUser) {
    role = role || customUser.role || ROLES.CREW;
    const savedPass = localStorage.getItem(`aerocheck_pass_${email}`) || '123456';
    if (savedPass !== pass) {
      showToast(STATE.lang === 'uk' ? "Невірний пароль для цього облікового запису" : "Invalid password", "error");
      return;
    }
  } else {
    // Check if email exists in database
    const allCrew = [...STATE.flightCrew, ...STATE.cabinCrew];
    const member = allCrew.find(c => c.Email && c.Email.trim().toLowerCase() === email);
    
    if (member) {
      role = role || ROLES.CREW;
      
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

      // Migrate Google API & Recommended Settings defaults
      if (STATE.settings.syncMode === undefined) { STATE.settings.syncMode = 'mock'; settingsUpdated = true; }
      if (STATE.settings.googleApiKey === undefined) { STATE.settings.googleApiKey = ''; settingsUpdated = true; }
      if (STATE.settings.googleClientId === undefined) { STATE.settings.googleClientId = ''; settingsUpdated = true; }
      if (STATE.settings.googleSpreadsheetId === undefined) { STATE.settings.googleSpreadsheetId = ''; settingsUpdated = true; }
      if (STATE.settings.googleDriveFolderId === undefined) { STATE.settings.googleDriveFolderId = ''; settingsUpdated = true; }
      if (STATE.settings.syncInterval === undefined) { STATE.settings.syncInterval = '5'; settingsUpdated = true; }
      if (STATE.settings.alertThresholdDays === undefined) { STATE.settings.alertThresholdDays = 30; settingsUpdated = true; }
      if (STATE.settings.criticalThresholdDays === undefined) { STATE.settings.criticalThresholdDays = 7; settingsUpdated = true; }
      if (STATE.settings.dateFormat === undefined) { STATE.settings.dateFormat = 'YYYY-MM-DD'; settingsUpdated = true; }
      if (STATE.settings.eomRule === undefined) { STATE.settings.eomRule = true; settingsUpdated = true; }
      if (STATE.settings.backupRetention === undefined) { STATE.settings.backupRetention = 5; settingsUpdated = true; }

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
    
    // Load custom forms & snapshots from storage
    const localForms = localStorage.getItem('aerocheck_forms');
    STATE.forms = localForms ? JSON.parse(localForms) : JSON.parse(JSON.stringify(DEFAULT_FORMS));
    const localSnapshots = localStorage.getItem('aerocheck_snapshots');
    STATE.snapshots = localSnapshots ? JSON.parse(localSnapshots) : [];

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
      STATE.forms = JSON.parse(JSON.stringify(DEFAULT_FORMS));
      STATE.snapshots = [];
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

  // Portal Date Edit Modal triggers
  const portalDateModal = document.getElementById('portal-date-edit-modal-backdrop');
  if (portalDateModal) {
    const closePortalDateBtn = document.getElementById('btn-close-portal-date-edit-modal');
    if (closePortalDateBtn) {
      closePortalDateBtn.addEventListener('click', () => {
        portalDateModal.classList.remove('active');
      });
    }

    const cancelPortalDateBtn = document.getElementById('btn-cancel-portal-date-edit');
    if (cancelPortalDateBtn) {
      cancelPortalDateBtn.addEventListener('click', () => {
        portalDateModal.classList.remove('active');
      });
    }

    // Close when clicking on backdrop outside modal content
    portalDateModal.addEventListener('click', (e) => {
      if (e.target === portalDateModal) {
        portalDateModal.classList.remove('active');
      }
    });

    // "Today" button
    const btnToday = document.getElementById('btn-portal-date-set-today');
    if (btnToday) {
      btnToday.addEventListener('click', () => {
        const input = document.getElementById('portal-date-edit-input');
        if (input) input.value = new Date().toISOString().split('T')[0];
      });
    }

    // Radio change for mode
    const modeRadios = document.querySelectorAll('input[name="portal-date-edit-mode"]');
    modeRadios.forEach(r => {
      r.addEventListener('change', (e) => {
        const inputLabel = document.getElementById('portal-date-edit-input-label');
        if (inputLabel) {
          if (e.target.value === 'COMPLETION') {
            inputLabel.textContent = STATE.lang === 'uk' ? 'Дата проходження (розрахувати термін):' : 'Completion Date (calc expiry):';
          } else {
            inputLabel.textContent = STATE.lang === 'uk' ? 'Дата закінчення дії:' : 'Expiration Date:';
          }
        }
      });
    });

    // Clear button
    const btnClear = document.getElementById('btn-portal-date-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        const form = document.getElementById('portal-date-edit-form');
        const colName = document.getElementById('portal-date-edit-col-name').value;
        const memberId = form ? form.dataset.memberId : null;
        if (!memberId || !colName) return;

        const allCrew = [...STATE.flightCrew, ...STATE.cabinCrew];
        const member = allCrew.find(c => c.id === memberId);
        if (!member) return;

        const oldVal = member[colName] || '';
        member[colName] = '';

        // Audit log
        STATE.changelog.unshift({
          timestamp: new Date().toISOString(),
          userEmail: STATE.currentUser ? STATE.currentUser.email : 'admin@ukr-helicopters.ua',
          crewMember: member.Full_Name_EN || member.Full_Name_UA,
          crewType: member.crewType,
          type: 'MANUAL_EDIT',
          details: [{
            field: colName,
            oldValue: oldVal || 'empty',
            newValue: 'empty'
          }]
        });

        saveStateToStorage();
        portalDateModal.classList.remove('active');
        showToast(STATE.lang === 'uk' ? `Дату для "${colName}" очищено` : `Date for "${colName}" cleared`);
        renderPersonalPortal();
      });
    }

    // Form submit
    const portalDateForm = document.getElementById('portal-date-edit-form');
    if (portalDateForm) {
      portalDateForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const colName = document.getElementById('portal-date-edit-col-name').value;
        const ruleKey = document.getElementById('portal-date-edit-rule-key').value;
        const memberId = portalDateForm.dataset.memberId;
        if (!memberId || !colName) return;

        const allCrew = [...STATE.flightCrew, ...STATE.cabinCrew];
        const member = allCrew.find(c => c.id === memberId);
        if (!member) return;

        const dateInput = document.getElementById('portal-date-edit-input');
        const inputVal = dateInput ? dateInput.value.trim() : '';
        const oldVal = member[colName] || '';

        let finalVal = inputVal;
        let calculatedMsg = null;

        const isExp = ruleKey && isExpiring(ruleKey);
        const modeRadio = document.querySelector('input[name="portal-date-edit-mode"]:checked');
        const mode = modeRadio ? modeRadio.value : 'EXPIRY';

        if (inputVal && isExp && mode === 'COMPLETION') {
          const calculated = calculateExpiryDate(inputVal, ruleKey, member.crewType);
          if (calculated) {
            finalVal = calculated;
            calculatedMsg = STATE.lang === 'uk'
              ? `Термін дії для "${colName}" автоматично розраховано до ${formatDateUa(finalVal)}`
              : `Expiry date for "${colName}" calculated to ${finalVal}`;
          }
        }

        member[colName] = finalVal;

        // Audit log
        STATE.changelog.unshift({
          timestamp: new Date().toISOString(),
          userEmail: STATE.currentUser ? STATE.currentUser.email : 'admin@ukr-helicopters.ua',
          crewMember: member.Full_Name_EN || member.Full_Name_UA,
          crewType: member.crewType,
          type: 'MANUAL_EDIT',
          details: [{
            field: colName,
            oldValue: oldVal || 'empty',
            newValue: finalVal || 'empty'
          }]
        });

        saveStateToStorage();
        portalDateModal.classList.remove('active');
        showToast(STATE.lang === 'uk' ? `Дату для "${colName}" успішно оновлено!` : `Date for "${colName}" updated!`);
        if (calculatedMsg) {
          showToast(calculatedMsg);
        }
        renderPersonalPortal();
      });
    }
  }

  // Admin button crew additions
  document.getElementById('btn-add-crew-flight').addEventListener('click', () => openCrewEditModal(null));
  document.getElementById('btn-add-crew-cabin').addEventListener('click', () => openCrewEditModal(null));
  
  // Flights Form submit
  document.getElementById('training-flight-form').addEventListener('submit', handleTrainingFlightSubmit);
  
  // Add crew member button click listener
  document.getElementById('btn-add-crew-member').addEventListener('click', () => addCrewMemberCard());
  
  // Setup listeners for time calculations
  ['flight-pre-bgn', 'flight-pre-end', 'flight-post-bgn', 'flight-post-end'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateTimeCalculations);
  });
  
  // Initialize Settings Subnavigation tabs
  initSettingsSubnav();

  // ================= TAB 1: SYNC & BACKUP LISTENERS =================
  const btnSaveGoogle = document.getElementById('btn-save-google-settings');
  if (btnSaveGoogle) {
    btnSaveGoogle.addEventListener('click', () => {
      STATE.settings.syncMode = document.getElementById('settings-sync-mode').value;
      STATE.settings.googleClientId = document.getElementById('settings-google-client-id').value.trim();
      STATE.settings.googleSpreadsheetId = document.getElementById('settings-google-sheet-id').value.trim();
      STATE.settings.googleSpreadsheetIdPersonnel = document.getElementById('settings-google-sheet-id').value.trim();
      STATE.settings.googleSpreadsheetIdFlights = document.getElementById('settings-google-sheet-flights-id') ? document.getElementById('settings-google-sheet-flights-id').value.trim() : '';
      STATE.settings.googleDriveFolderId = document.getElementById('settings-google-drive-folder-id').value.trim();
      STATE.settings.syncInterval = document.getElementById('settings-sync-interval').value;
      saveStateToStorage();
      
      const badge = document.getElementById('google-conn-status-badge');
      if (badge) {
        if (STATE.settings.syncMode === 'live' && STATE.settings.googleClientId) {
          badge.className = 'status-badge status-valid';
          badge.textContent = 'Live Connected';
        } else {
          badge.className = 'status-badge status-neutral';
          badge.textContent = 'Offline Mock';
        }
      }
      showToast("Параметри Google API та таблиць успішно збережено!");
    });
  }

  const btnTestGoogle = document.getElementById('btn-test-google-connection');
  if (btnTestGoogle) {
    btnTestGoogle.addEventListener('click', () => {
      const tempSettings = {
        syncMode: document.getElementById('settings-sync-mode').value,
        googleClientId: document.getElementById('settings-google-client-id').value.trim(),
        googleSpreadsheetId: document.getElementById('settings-google-sheet-id').value.trim(),
        googleSpreadsheetIdPersonnel: document.getElementById('settings-google-sheet-id').value.trim(),
        googleSpreadsheetIdFlights: document.getElementById('settings-google-sheet-flights-id') ? document.getElementById('settings-google-sheet-flights-id').value.trim() : '',
        googleDriveFolderId: document.getElementById('settings-google-drive-folder-id').value.trim()
      };
      
      showToast("Перевірка з'єднання з Google Cloud API...");
      testGoogleConnection(tempSettings, (res) => {
        const badge = document.getElementById('google-conn-status-badge');
        if (res.success) {
          showToast(res.message, 'success');
          if (badge) {
            badge.className = res.mode === 'live' ? 'status-badge status-valid' : 'status-badge status-neutral';
            badge.textContent = res.mode === 'live' ? 'Live Connected' : 'Offline Mock';
          }
        } else {
          showToast(res.message, 'error');
          if (badge) {
            badge.className = 'status-badge status-expired';
            badge.textContent = 'Auth Error';
          }
        }
      });
    });
  }

  // Sync Table 1 (Personnel)
  const btnSyncPersonnel = document.getElementById('btn-sync-personnel');
  if (btnSyncPersonnel) {
    btnSyncPersonnel.addEventListener('click', () => {
      showToast("Синхронізація таблиці персоналу (Flight_Crew & Cabin_Crew)...");
      setTimeout(() => {
        STATE.lastSyncTimestamp = new Date().toLocaleString();
        document.getElementById('last-sync-timestamp-display').textContent = STATE.lastSyncTimestamp;
        showToast("Таблицю персоналу успішно синхронізовано з Google Sheets!", "success");
      }, 1000);
    });
  }

  // Sync Table 2 (Flights)
  const btnSyncFlights = document.getElementById('btn-sync-flights');
  if (btnSyncFlights) {
    btnSyncFlights.addEventListener('click', () => {
      showToast("Синхронізація таблиці польотів (Training_Flights)...");
      setTimeout(() => {
        STATE.lastSyncTimestamp = new Date().toLocaleString();
        document.getElementById('last-sync-timestamp-display').textContent = STATE.lastSyncTimestamp;
        showToast("Таблицю польотів успішно синхронізовано з Google Sheets!", "success");
      }, 1000);
    });
  }

  // Sync all
  const btnManualSync = document.getElementById('btn-manual-sync');
  if (btnManualSync) {
    btnManualSync.addEventListener('click', () => {
      triggerManualSync();
      STATE.lastSyncTimestamp = new Date().toLocaleString();
      const lastSyncEl = document.getElementById('last-sync-timestamp-display');
      if (lastSyncEl) lastSyncEl.textContent = STATE.lastSyncTimestamp;
    });
  }
  document.getElementById('sync-status-indicator').addEventListener('click', triggerManualSync);

  // Backup buttons
  document.getElementById('btn-backup-json').addEventListener('click', () => {
    downloadBackupJson(STATE.flightCrew, STATE.cabinCrew, STATE.changelog, STATE.settings, STATE.flights, STATE.forms);
    showToast("Повну резервну копію (JSON) успішно збережено!");
  });
  
  document.getElementById('btn-backup-xlsx').addEventListener('click', () => {
    downloadBackupXlsx(STATE.flightCrew, STATE.cabinCrew);
    showToast("Базу даних XLSX успішно експортовано!");
  });

  // Save quick snapshot
  const btnSaveSnapshot = document.getElementById('btn-save-snapshot');
  if (btnSaveSnapshot) {
    btnSaveSnapshot.addEventListener('click', () => {
      const snapName = prompt("Введіть коментар/назву для збереження точки відновлення:", `Знімок від ${new Date().toLocaleTimeString()}`);
      if (snapName === null) return;
      
      const newSnapshot = {
        id: 'snap_' + Date.now(),
        name: snapName || `Знімок ${new Date().toLocaleDateString()}`,
        timestamp: new Date().toISOString(),
        flightCount: STATE.flightCrew.length,
        cabinCount: STATE.cabinCrew.length,
        flightsCount: STATE.flights.length,
        flightCrew: JSON.parse(JSON.stringify(STATE.flightCrew)),
        cabinCrew: JSON.parse(JSON.stringify(STATE.cabinCrew)),
        flights: JSON.parse(JSON.stringify(STATE.flights)),
        changelog: JSON.parse(JSON.stringify(STATE.changelog)),
        forms: JSON.parse(JSON.stringify(STATE.forms))
      };

      STATE.snapshots.push(newSnapshot);
      saveStateToStorage();
      renderSnapshotsList();
      showToast("Локальний знімок системи успішно збережено!");
    });
  }

  // Restore from JSON file
  const fileRestoreJson = document.getElementById('file-restore-json');
  const btnRestoreJsonTrigger = document.getElementById('btn-restore-json-trigger');
  if (btnRestoreJsonTrigger && fileRestoreJson) {
    btnRestoreJsonTrigger.addEventListener('click', () => fileRestoreJson.click());
    fileRestoreJson.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          const data = parsed.data || parsed;
          if (!data.flightCrew && !data.cabinCrew) {
            throw new Error("Невірний формат файлу резервної копії");
          }
          if (confirm(`Ви впевнені, що хочете відновити базу даних із файлу? Поточні незбережені зміни будуть перезаписані.`)) {
            if (data.flightCrew) STATE.flightCrew = data.flightCrew;
            if (data.cabinCrew) STATE.cabinCrew = data.cabinCrew;
            if (data.flights) STATE.flights = data.flights;
            if (data.changelog) STATE.changelog = data.changelog;
            if (data.forms) STATE.forms = data.forms;
            if (data.settings) STATE.settings = { ...STATE.settings, ...data.settings };
            saveStateToStorage();
            showToast("Базу даних та налаштування успішно відновлено!");
            switchView(STATE.currentView);
          }
        } catch (err) {
          showToast("Помилка читання резервної копії: " + err.message, "error");
        }
        e.target.value = '';
      };
      reader.readAsText(file);
    });
  }

  // Folders modal triggers
  const btnVerifyFolders = document.getElementById('btn-verify-crew-folders');
  if (btnVerifyFolders) btnVerifyFolders.addEventListener('click', openCrewFoldersRegistryModal);
  const btnCloseFoldersModal = document.getElementById('btn-close-folders-modal');
  const btnCloseFoldersModalX = document.getElementById('btn-close-folders-modal-x');
  const foldersModalBackdrop = document.getElementById('crew-folders-modal-backdrop');
  if (btnCloseFoldersModal && foldersModalBackdrop) {
    btnCloseFoldersModal.addEventListener('click', () => foldersModalBackdrop.classList.remove('active'));
  }
  if (btnCloseFoldersModalX && foldersModalBackdrop) {
    btnCloseFoldersModalX.addEventListener('click', () => foldersModalBackdrop.classList.remove('active'));
  }

  // ================= TAB 2: PERSONNEL LISTENERS =================
  const btnSettingsAddCrew = document.getElementById('btn-settings-add-crew');
  if (btnSettingsAddCrew) {
    btnSettingsAddCrew.addEventListener('click', () => openCrewEditModal(null));
  }
  const personnelSearchInput = document.getElementById('personnel-search-input');
  if (personnelSearchInput) {
    personnelSearchInput.addEventListener('input', renderSettingsPersonnelTab);
  }
  const personnelFilterSelect = document.getElementById('personnel-filter-select');
  if (personnelFilterSelect) {
    personnelFilterSelect.addEventListener('change', renderSettingsPersonnelTab);
  }

  // User Accounts Management Modal Listeners
  const userModal = document.getElementById('user-modal-backdrop');
  const btnAddUserAccount = document.getElementById('btn-add-user-account');
  if (btnAddUserAccount && userModal) {
    btnAddUserAccount.addEventListener('click', () => {
      const addUserForm = document.getElementById('add-user-form');
      if (addUserForm) addUserForm.reset();
      userModal.classList.add('active');
      if (window.lucide) window.lucide.createIcons();
      setTimeout(() => document.getElementById('new-user-email')?.focus(), 50);
    });

    const btnCloseUserModal = document.getElementById('btn-close-user-modal');
    if (btnCloseUserModal) {
      btnCloseUserModal.addEventListener('click', () => {
        userModal.classList.remove('active');
      });
    }

    const btnCancelUserModal = document.getElementById('btn-cancel-user-modal');
    if (btnCancelUserModal) {
      btnCancelUserModal.addEventListener('click', () => {
        userModal.classList.remove('active');
      });
    }

    userModal.addEventListener('click', (e) => {
      if (e.target === userModal) {
        userModal.classList.remove('active');
      }
    });

    const addUserForm = document.getElementById('add-user-form');
    if (addUserForm) {
      addUserForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('new-user-email').value.trim();
        const name = document.getElementById('new-user-name').value.trim();
        const role = document.getElementById('new-user-role').value;
        const pass = document.getElementById('new-user-password').value;

        const success = addUserAccount(email, name, role, pass);
        if (success) {
          userModal.classList.remove('active');
          addUserForm.reset();
        }
      });
    }
  }

  // Notification settings buttons
  const btnSaveNotifications = document.getElementById('btn-save-notification-settings');
  if (btnSaveNotifications) {
    btnSaveNotifications.addEventListener('click', () => {
      STATE.settings.alertThresholdDays = parseInt(document.getElementById('settings-alert-days').value, 10) || 30;
      STATE.settings.criticalThresholdDays = parseInt(document.getElementById('settings-critical-days').value, 10) || 7;
      
      STATE.settings.notifications = {
        alertThresholdDays: STATE.settings.alertThresholdDays,
        criticalThresholdDays: STATE.settings.criticalThresholdDays,
        digestEmail: document.getElementById('settings-notify-email') ? document.getElementById('settings-notify-email').value.trim() : '',
        notifyCrewDocUpdate: document.getElementById('settings-notify-crew-doc-update') ? document.getElementById('settings-notify-crew-doc-update').checked : true,
        notifyInstructorExpirations: document.getElementById('settings-notify-instructor-expirations') ? document.getElementById('settings-notify-instructor-expirations').checked : true,
        notifyWeeklyDigest: document.getElementById('settings-notify-weekly-digest') ? document.getElementById('settings-notify-weekly-digest').checked : true,
        notifyInApp: document.getElementById('settings-notify-inapp') ? document.getElementById('settings-notify-inapp').checked : true
      };

      saveStateToStorage();
      showToast("Налаштування повідомлень успішно збережено!");
    });
  }

  const btnTestNotification = document.getElementById('btn-test-notification');
  if (btnTestNotification) {
    btnTestNotification.addEventListener('click', () => {
      const email = document.getElementById('settings-notify-email')?.value || 'training.dept@ukr-helicopters.ua';
      showToast(`Тестове сповіщення надіслано на ${email}! (Емуляція Email Dispatcher)`);
    });
  }

  // ================= TAB 3: DISPLAY & COLUMNS LISTENERS =================
  const btnColFlight = document.getElementById('btn-col-tab-flight');
  const btnColCabin = document.getElementById('btn-col-tab-cabin');
  if (btnColFlight && btnColCabin) {
    btnColFlight.addEventListener('click', () => {
      STATE.activeColumnsTab = 'Flight';
      renderSettingsDisplayTab();
    });
    btnColCabin.addEventListener('click', () => {
      STATE.activeColumnsTab = 'Cabin';
      renderSettingsDisplayTab();
    });
  }

  const btnColsSelectAll = document.getElementById('btn-cols-select-all');
  if (btnColsSelectAll) {
    btnColsSelectAll.addEventListener('click', () => {
      const type = STATE.activeColumnsTab || 'Flight';
      const allKeys = (BILINGUAL_COLUMNS[type] || []).map(c => c.key);
      if (type === 'Flight') STATE.settings.visibleColumnsFlight = allKeys;
      else STATE.settings.visibleColumnsCabin = allKeys;
      saveStateToStorage();
      renderSettingsDisplayTab();
      showToast("Всі стовпчики активовано!");
    });
  }

  const btnColsDeselectAll = document.getElementById('btn-cols-deselect-all');
  if (btnColsDeselectAll) {
    btnColsDeselectAll.addEventListener('click', () => {
      const type = STATE.activeColumnsTab || 'Flight';
      const mandatory = ['Rank', 'Department', 'Name_Shrt_UA'];
      if (type === 'Flight') STATE.settings.visibleColumnsFlight = mandatory;
      else STATE.settings.visibleColumnsCabin = mandatory;
      saveStateToStorage();
      renderSettingsDisplayTab();
      showToast("Стовпчики вимкнено (крім обов'язкових ідентифікаторів)");
    });
  }

  const btnColsResetDefault = document.getElementById('btn-cols-reset-default');
  if (btnColsResetDefault) {
    btnColsResetDefault.addEventListener('click', () => {
      const type = STATE.activeColumnsTab || 'Flight';
      if (type === 'Flight') {
        STATE.settings.visibleColumnsFlight = [
          'Rank', 'Department', 'Name_Shrt_UA', 'OPC', 'OPC_NVG', 'LPC', 'Type', 'EMER_1', 'EMER_3', 'DG', 'AV_SEC', 'CRM', 'MED', 'LICENSE',
          'GI 275_T', 'GI 275_PRCT', 'BIRD STRIKE', 'MSB', 'PALL', 'HESLO_T', 'HESLO_PRCT', 'HHO_T', 'HHO_PRCT'
        ];
      } else {
        STATE.settings.visibleColumnsCabin = [
          'Rank', 'Department', 'Name_Shrt_UA', 'OPC', 'LPC', 'CC_Type', 'EMER_1', 'EMER_3', 'DG', 'AV_SEC', 'CRM', 'MED',
          'Resc', 'Rappel', 'Hoist', 'EOIR', 'NAIROBI'
        ];
      }
      saveStateToStorage();
      renderSettingsDisplayTab();
      showToast("Стовпчики скинуто до значень за замовчуванням");
    });
  }

  // System Settings Save
  const btnSaveSystem = document.getElementById('btn-save-system-settings');
  if (btnSaveSystem) {
    btnSaveSystem.addEventListener('click', () => {
      STATE.settings.alertThresholdDays = parseInt(document.getElementById('settings-alert-days').value, 10) || 30;
      STATE.settings.criticalThresholdDays = parseInt(document.getElementById('settings-critical-days').value, 10) || 7;
      STATE.settings.dateFormat = document.getElementById('settings-date-format').value;
      STATE.settings.referenceDate = document.getElementById('settings-ref-date').value;
      STATE.settings.eomRule = document.getElementById('settings-eom-rule').checked;
      STATE.settings.datePrompt = document.getElementById('settings-date-prompt').checked;
      STATE.settings.backupRetention = parseInt(document.getElementById('settings-backup-retention').value, 10) || 5;
      
      document.getElementById('sidebar-ref-date').textContent = STATE.settings.referenceDate;
      saveStateToStorage();
      showToast("Системні налаштування відображення збережено!");
      switchView(STATE.currentView);
    });
  }

  // ================= TAB 4: FORMS BUILDER LISTENERS =================
  const formSelectTemplate = document.getElementById('form-select-template');
  if (formSelectTemplate) {
    formSelectTemplate.addEventListener('change', (e) => {
      loadFormIntoBuilder(e.target.value);
    });
  }

  const btnFormNew = document.getElementById('btn-form-new');
  if (btnFormNew) {
    btnFormNew.addEventListener('click', () => {
      STATE.editingFormId = 'form_' + Date.now();
      const newForm = {
        id: STATE.editingFormId,
        name: 'Новий бланк звіту / перевірки',
        code: `Форма UH-${Math.floor(10 + Math.random() * 90)}`,
        subtitle: 'Авіакомпанія «Українські вертольоти»',
        crewType: 'Flight',
        logo: 'PICS/LOGO_UH.png',
        logoPos: 'left',
        orientation: 'portrait',
        fitSingleLine: false,
        dateFormat: 'DD.MM.YYYY',
        tableSpacing: 20,
        cellPadding: 4,
        columns: ['Rank', 'Full_Name_UA', 'OPC', 'LPC', 'Type'],
        extraGrade: true,
        extraValidity: true,
        extraRemarks: false,
        dateText: 'Дата: «____» ___________ 202___ р.',
        signRank: 'Інструктор-екзаменатор',
        signName: ''
      };
      STATE.forms.push(newForm);
      saveStateToStorage();
      renderSettingsFormsTab();
      showToast("Створено нову форму! Налаштуйте її в конструкторі.");
    });
  }

  // Logo selection
  const formLogoSelect = document.getElementById('form-logo-select');
  const formCustomLogoUpload = document.getElementById('form-custom-logo-upload');
  const formLogoFile = document.getElementById('form-logo-file');
  if (formLogoSelect) {
    formLogoSelect.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        if (formCustomLogoUpload) formCustomLogoUpload.style.display = 'block';
      } else {
        if (formCustomLogoUpload) formCustomLogoUpload.style.display = 'none';
      }
      updatePaperPreview();
    });
  }
  if (formLogoFile) {
    formLogoFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        window.currentUploadedCustomLogo = event.target.result;
        updatePaperPreview();
      };
      reader.readAsDataURL(file);
    });
  }

  // Logo position buttons
  document.querySelectorAll('.logo-pos-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.logo-pos-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      updatePaperPreview();
    });
  });

  // Orientation buttons
  document.querySelectorAll('.orientation-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.orientation-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      updatePaperPreview();
    });
  });

  // Table Spacing controls
  const spacingSlider = document.getElementById('form-builder-table-spacing');
  const spacingNum = document.getElementById('form-builder-table-spacing-num');
  if (spacingSlider && spacingNum) {
    spacingSlider.addEventListener('input', (e) => {
      spacingNum.value = e.target.value;
      updatePaperPreview();
    });
    spacingNum.addEventListener('input', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) val = 0;
      if (val < 0) val = 0;
      if (val > 120) val = 120;
      spacingSlider.value = val;
      updatePaperPreview();
    });
  }

  document.querySelectorAll('.btn-spacing-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const val = e.currentTarget.getAttribute('data-spacing');
      if (spacingSlider) spacingSlider.value = val;
      if (spacingNum) spacingNum.value = val;
      updatePaperPreview();
    });
  });

  // Cell Padding controls (1px - 14px)
  const paddingSlider = document.getElementById('form-builder-cell-padding');
  const paddingNum = document.getElementById('form-builder-cell-padding-num');
  if (paddingSlider && paddingNum) {
    paddingSlider.addEventListener('input', (e) => {
      paddingNum.value = e.target.value;
      updatePaperPreview();
    });
    paddingNum.addEventListener('input', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) val = 1;
      if (val < 1) val = 1;
      if (val > 14) val = 14;
      paddingSlider.value = val;
      updatePaperPreview();
    });
  }

  document.querySelectorAll('.btn-padding-preset').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const val = e.currentTarget.getAttribute('data-padding');
      if (paddingSlider) paddingSlider.value = val;
      if (paddingNum) paddingNum.value = val;
      updatePaperPreview();
    });
  });

  // Data source select
  const formBuilderSource = document.getElementById('form-builder-source');
  if (formBuilderSource) {
    formBuilderSource.addEventListener('change', (e) => {
      const source = e.target.value;
      populateFormBuilderColumns(source, ['Rank', 'Full_Name_UA', 'OPC', 'LPC']);
      updatePaperPreview();
    });
  }

  // Fit single line toggle
  const formFitSingleLine = document.getElementById('form-builder-fit-single-line');
  if (formFitSingleLine) {
    formFitSingleLine.addEventListener('change', updatePaperPreview);
  }

  // Date format select
  const formDateFormatSelect = document.getElementById('form-builder-date-format');
  if (formDateFormatSelect) {
    formDateFormatSelect.addEventListener('change', updatePaperPreview);
  }

  // Live input change listeners for paper preview
  ['form-builder-title', 'form-builder-code', 'form-builder-subtitle', 'form-builder-date-text', 'form-builder-sign-rank', 'form-builder-sign-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updatePaperPreview);
  });
  ['form-builder-extra-grade', 'form-builder-extra-validity', 'form-builder-extra-remarks'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updatePaperPreview);
  });

  // Save custom form
  const btnSaveCustomForm = document.getElementById('btn-save-custom-form');
  if (btnSaveCustomForm) {
    btnSaveCustomForm.addEventListener('click', () => {
      const activeLogoPosBtn = document.querySelector('.logo-pos-btn.active');
      const logoPos = activeLogoPosBtn ? activeLogoPosBtn.getAttribute('data-pos') : 'left';

      const activeOrientBtn = document.querySelector('.orientation-btn.active');
      const orientation = activeOrientBtn ? activeOrientBtn.getAttribute('data-orientation') : 'portrait';
      
      const logoSelectVal = document.getElementById('form-logo-select')?.value;
      let logoVal = 'PICS/LOGO_UH.png';
      if (logoSelectVal === 'none') {
        logoVal = 'none';
      } else if (logoSelectVal === 'custom') {
        logoVal = window.currentUploadedCustomLogo || 'PICS/LOGO_UH.png';
      }

      const selectedCols = [];
      document.querySelectorAll('.form-builder-col-chk:checked').forEach(c => {
        selectedCols.push(c.getAttribute('data-col'));
      });

      const formId = STATE.editingFormId || 'form_' + Date.now();
      const updatedForm = {
        id: formId,
        name: document.getElementById('form-builder-title')?.value || 'Бланк',
        code: document.getElementById('form-builder-code')?.value || 'Форма UH-XX',
        subtitle: document.getElementById('form-builder-subtitle')?.value || '',
        crewType: document.getElementById('form-builder-source')?.value || 'Flight',
        logo: logoVal,
        logoPos: logoPos,
        orientation: orientation,
        fitSingleLine: document.getElementById('form-builder-fit-single-line')?.checked === true,
        dateFormat: document.getElementById('form-builder-date-format')?.value || 'DD.MM.YYYY',
        tableSpacing: parseInt(document.getElementById('form-builder-table-spacing')?.value, 10) || 20,
        cellPadding: parseInt(document.getElementById('form-builder-cell-padding')?.value, 10) || 4,
        columns: selectedCols,
        extraGrade: document.getElementById('form-builder-extra-grade')?.checked !== false,
        extraValidity: document.getElementById('form-builder-extra-validity')?.checked !== false,
        extraRemarks: document.getElementById('form-builder-extra-remarks')?.checked === true,
        dateText: document.getElementById('form-builder-date-text')?.value || 'Дата: «____» ___________ 202___ р.',
        signRank: document.getElementById('form-builder-sign-rank')?.value || 'Керівник льотної служби',
        signName: document.getElementById('form-builder-sign-name')?.value || ''
      };

      const existingIndex = STATE.forms.findIndex(f => f.id === formId);
      if (existingIndex >= 0) {
        STATE.forms[existingIndex] = updatedForm;
      } else {
        STATE.forms.push(updatedForm);
      }

      saveStateToStorage();
      renderSettingsFormsTab();
      showToast("Форму успішно збережено! Вона доступна у розділі «Бланки».");
    });
  }

  // Delete custom form
  const btnDeleteCustomForm = document.getElementById('btn-delete-custom-form');
  if (btnDeleteCustomForm) {
    btnDeleteCustomForm.addEventListener('click', () => {
      if (STATE.forms.length <= 1) {
        showToast("Неможливо видалити останню форму системи", "warning");
        return;
      }
      if (confirm("Видалити цю форму з каталогу бланків?")) {
        STATE.forms = STATE.forms.filter(f => f.id !== STATE.editingFormId);
        STATE.editingFormId = STATE.forms[0].id;
        saveStateToStorage();
        renderSettingsFormsTab();
        showToast("Форму видалено");
      }
    });
  }

  // Preview form button in generator
  const btnPreviewCustomForm = document.getElementById('btn-preview-custom-form');
  if (btnPreviewCustomForm) {
    btnPreviewCustomForm.addEventListener('click', () => {
      const activeLogoPosBtn = document.querySelector('.logo-pos-btn.active');
      const logoPos = activeLogoPosBtn ? activeLogoPosBtn.getAttribute('data-pos') : 'left';

      const activeOrientBtn = document.querySelector('.orientation-btn.active');
      const orientation = activeOrientBtn ? activeOrientBtn.getAttribute('data-orientation') : 'portrait';
      
      const logoSelectVal = document.getElementById('form-logo-select')?.value;
      let logoVal = 'PICS/LOGO_UH.png';
      if (logoSelectVal === 'none') {
        logoVal = 'none';
      } else if (logoSelectVal === 'custom') {
        logoVal = window.currentUploadedCustomLogo || 'PICS/LOGO_UH.png';
      }

      const selectedCols = [];
      document.querySelectorAll('.form-builder-col-chk:checked').forEach(c => {
        selectedCols.push(c.getAttribute('data-col'));
      });

      const tempForm = {
        name: document.getElementById('form-builder-title')?.value || 'Бланк',
        code: document.getElementById('form-builder-code')?.value || 'Форма UH-XX',
        subtitle: document.getElementById('form-builder-subtitle')?.value || '',
        crewType: document.getElementById('form-builder-source')?.value || 'Flight',
        logo: logoVal,
        logoPos: logoPos,
        orientation: orientation,
        fitSingleLine: document.getElementById('form-builder-fit-single-line')?.checked === true,
        dateFormat: document.getElementById('form-builder-date-format')?.value || 'DD.MM.YYYY',
        tableSpacing: parseInt(document.getElementById('form-builder-table-spacing')?.value, 10) || 20,
        cellPadding: parseInt(document.getElementById('form-builder-cell-padding')?.value, 10) || 4,
        columns: selectedCols,
        extraGrade: document.getElementById('form-builder-extra-grade')?.checked !== false,
        extraValidity: document.getElementById('form-builder-extra-validity')?.checked !== false,
        extraRemarks: document.getElementById('form-builder-extra-remarks')?.checked === true,
        dateText: document.getElementById('form-builder-date-text')?.value || 'Дата: «____» ___________ 202___ р.',
        signRank: document.getElementById('form-builder-sign-rank')?.value || 'Керівник льотної служби',
        signName: document.getElementById('form-builder-sign-name')?.value || ''
      };

      openFormPrintWindow(tempForm, null);
    });
  }

  // Go to forms builder from Blanks page
  const btnGotoFormsBuilder = document.getElementById('btn-goto-forms-builder');
  if (btnGotoFormsBuilder) {
    btnGotoFormsBuilder.addEventListener('click', () => {
      switchView('settings');
      activateSettingsTab('forms');
    });
  }

  // ================= TAB 5: AUDIT LOG LISTENERS =================
  const logSearchInput = document.getElementById('log-search-input');
  if (logSearchInput) {
    logSearchInput.addEventListener('input', renderSettingsLogTab);
  }

  const logFilterType = document.getElementById('log-filter-type');
  if (logFilterType) {
    logFilterType.addEventListener('change', renderSettingsLogTab);
  }

  const btnRefreshLog = document.getElementById('btn-refresh-log');
  if (btnRefreshLog) {
    btnRefreshLog.addEventListener('click', () => {
      renderSettingsLogTab();
      showToast(STATE.lang === 'uk' ? 'Журнал аудиту оновлено' : 'Audit log refreshed');
    });
  }

  const btnExportLogCsv = document.getElementById('btn-export-log-csv');
  if (btnExportLogCsv) {
    btnExportLogCsv.addEventListener('click', exportChangelogCsv);
  }

  const btnClearLog = document.getElementById('btn-clear-log');
  if (btnClearLog) {
    btnClearLog.addEventListener('click', () => {
      if (!STATE.changelog || STATE.changelog.length === 0) {
        showToast(STATE.lang === 'uk' ? 'Журнал уже порожній' : 'Changelog is already empty');
        return;
      }
      const backdrop = document.getElementById('confirm-backdrop');
      if (backdrop) {
        document.getElementById('confirm-title').textContent = STATE.lang === 'uk' ? 'Очищення журналу аудиту' : 'Clear Audit Log';
        document.getElementById('confirm-message').textContent = STATE.lang === 'uk'
          ? 'Ви впевнені, що хочете видалити всі записи журналу аудиту? Цю дію неможливо скасувати.'
          : 'Are you sure you want to delete all audit log records? This action cannot be undone.';
        
        const btnSubmit = document.getElementById('btn-submit-confirm');
        const btnCancel = document.getElementById('btn-cancel-confirm');
        btnSubmit.textContent = STATE.lang === 'uk' ? 'Так, очистити' : 'Yes, clear';

        const newSubmit = btnSubmit.cloneNode(true);
        btnSubmit.parentNode.replaceChild(newSubmit, btnSubmit);
        const newCancel = btnCancel.cloneNode(true);
        btnCancel.parentNode.replaceChild(newCancel, btnCancel);

        backdrop.classList.add('active');

        newCancel.addEventListener('click', () => {
          backdrop.classList.remove('active');
        });

        newSubmit.addEventListener('click', () => {
          STATE.changelog = [];
          saveStateToStorage();
          backdrop.classList.remove('active');
          showToast(STATE.lang === 'uk' ? 'Журнал змін успішно очищено' : 'Audit log cleared');
          renderSettingsLogTab();
        });
      }
    });
  }

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
  
  if (document.getElementById('btn-import-flight')) {
    document.getElementById('btn-import-flight').addEventListener('click', () => fileFlight.click());
  }
  if (document.getElementById('btn-import-cabin')) {
    document.getElementById('btn-import-cabin').addEventListener('click', () => fileCabin.click());
  }
  
  if (fileFlight) fileFlight.addEventListener('change', (e) => handleExcelImport(e, 'Flight'));
  if (fileCabin) fileCabin.addEventListener('change', (e) => handleExcelImport(e, 'Cabin'));
  
  // Settings crew deletions
  const btnMgmtDelete = document.getElementById('btn-mgmt-delete');
  if (btnMgmtDelete) {
    btnMgmtDelete.addEventListener('click', handleCrewMemberDelete);
  }
  
  // Settings database update Excel import triggers
  const fileUpdateDbInput = document.getElementById('file-update-db');
  const btnUpdateDbExcel = document.getElementById('btn-update-db-excel');
  if (btnUpdateDbExcel && fileUpdateDbInput) {
    btnUpdateDbExcel.addEventListener('click', () => fileUpdateDbInput.click());
    fileUpdateDbInput.addEventListener('change', handleDatabaseExcelUpdate);
  }
  
  // Close import report modal
  const btnCloseImportReport = document.getElementById('btn-close-import-report');
  if (btnCloseImportReport) {
    btnCloseImportReport.addEventListener('click', () => {
      document.getElementById('import-report-backdrop').classList.remove('active');
    });
  }
  
  // Close confirmation backdrops
  const btnCancelConfirm = document.getElementById('btn-cancel-confirm');
  if (btnCancelConfirm) {
    btnCancelConfirm.addEventListener('click', () => {
      document.getElementById('confirm-backdrop').classList.remove('active');
    });
  }
  
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
