# Directive: Settings Page & Forms Management SOP

## 1. Goal
Define the structure, operational rules, and synchronization behavior for the **Settings** view (`#view-settings`) and dynamic **Forms (Бланки)** view (`#view-forms`) within AeroCheck.

## 2. 4-Tab Settings Architecture

### Tab 1: Резервне копіювання та Синхронізація (Backup & Sync)
- **Multi-Table Google Sheets Sync**:
  - **Table 1 (Personnel)**: `Flight_Crew` and `Cabin_Crew` sheets (`googleSpreadsheetIdPersonnel`).
  - **Table 2 (Flights)**: `Training_Flights` log (`googleSpreadsheetIdFlights`).
- **Google Cloud & Drive API**:
  - Mode: `mock` (Offline Simulation) or `live` (Google Drive v3 + Sheets v4 Live API).
  - OAuth 2.0 Client ID / API Key.
  - Root Folder ID for `[FLIGHT | CABIN] / [NAME_EN]` crew dossiers.
- **Sync Intervals**:
  - Options: Manual, 5 min, 15 min, 30 min, 60 min, 24 hours.
- **Backups & Recovery**:
  - **Full JSON Export**: downloads complete database, flights, changelog, custom forms, and settings.
  - **XLSX Export**: generates compatible Excel workbook.
  - **Snapshots**: local browser checkpoints with 1-click restore.
  - **Restore**: JSON import and Excel Smart Merge.

### Tab 2: Персонал (Personnel & Access)
- **Personnel Management**:
  - Add new personnel modal (`#crew-modal-backdrop`).
  - Fast search & category filter (All, Flight, Cabin).
  - Row actions: inline edit and safe deletion with confirmation and changelog audit logging.
- **Access Control & Permissions**:
  - Matrix of permissions: `ADMIN`, `INSTRUCTOR`, `OFFICE`, `CREW`.
  - User role assignment table for system accounts and crew emails.
- **Notifications**:
  - Warning alert threshold (default 30 days).
  - Critical deadline threshold (default 7 days).
  - Email for centralized digests (`training.dept@ukr-helicopters.ua`).
  - Event toggles: crew document update emails, instructor expiry alerts, weekly digests, in-app push/toasts.

### Tab 3: Відображення (Display & Columns)
- **Bilingual Column Visibility (UA / EN)**:
  - Toggle between Flight Crew and Cabin Crew matrices.
  - Every column has bilingual titles (e.g. `OPC` — Перевірка кваліфікації / Operator Proficiency Check).
  - Instant checkbox toggle state saved to `STATE.settings.visibleColumnsFlight` and `visibleColumnsCabin`.
  - Batch buttons: "Вибрати всі", "Зняти всі", "За замовчуванням".
- **Formatting & Calculation Rules**:
  - Date formats: ISO (`YYYY-MM-DD`), Euro (`DD.MM.YYYY`), Aviation (`DD MMM YYYY`).
  - Reference calculation date (`referenceDate`).
  - End of Month rule (Flight crew / OPC).

### Tab 4: Форми (Forms Generator & Editor)
- **Form Builder Components**:
  1. **Logo**: choose standard UH logo (`PICS/LOGO_UH.png`), upload custom image file (Base64), or none.
     - Position alignment: `left`, `center`, `right`.
  2. **Page Orientation, Form Title, Code & Spacing**:
     - **Орієнтація аркуша**: вибір між Книжковою (`portrait`) та Альбомною (`landscape`). Налаштовує розміри A4 live-перегляду та `@page { size: A4 portrait|landscape; }` у вікні друку.
     - Назва форми, Номер/Код форми (напр. `UH-F-22`), Підзаголовок/Інструкція.
     - **Vertical spacing control**: Слайдер (0–120px) та числове поле з пресетами (6px, 16px, 32px, 50px) для точного відступу між назвою та даними таблиці (`tableSpacing`).
  3. **Data Source & Formatting**:
     - Джерело даних: `FLIGHT_CREW` або `CABIN_CREW`.
     - Вибір стовпчиків для таблиці та додаткові оціночні поля (Результат, Термін дії, Примітка).
     - **Вмістити інформацію в один рядок (`fitSingleLine`)**: опція усунення переносів рядків (`white-space: nowrap !important;`) з динамічним пропорційним масштабуванням шрифту та відступів комірок, щоб вся інформація строго вміщувалась у межі документа без виходу за поля.
     - **Регулювання відступів комірок (`cellPadding`)**: виділений повзунок (1px – 14px) та числове поле з швидкими кнопками-пресетами (1px Мін, 3px Компакт, 5px Стандарт, 8px Просторий). Дозволяє зменшувати горизонтальні відступи комірок аж до 1px для надщільного розміщення даних.
  4. **Date Format & Footer**:
     - **Формат відображення дат**: вибір формату для таблиці та колонтитулів (`DD.MM.YY` — скорочений напр. 31.12.26, `DD.MM.YYYY`, `YYYY-MM-DD`, `DD/MM/YYYY`, `DD MMM YYYY`, `WORDS` — «DD» MMMM YYYY р.).
     - Поле дати (зліва), Посада підписанта, ПІБ та лінія підпису.
  5. **Live Paper Preview**: інтерактивний попередній перегляд аркуша A4 з миттєвою адаптацією орієнтації, відступу між назвою і даними, відступів комірок (через CSS змінні `--cell-pad-h`, `--cell-pad-v`), масштабу та формату дат.
  6. **Storage & Output**: форми зберігаються в `STATE.forms` та `localStorage`, додаються до резервних копій JSON і відображаються у вікні друку з точним врахуванням `cellPadding` (мінімум 1px по горизонталі).

## 3. Printable Blanks Page (`#view-forms`) & Print Engine
- **Multi-Crew Selection**:
  - Користувач може додати одного або більше членів екіпажу до одного бланка (чіпи з можливістю індивідуального видалення `✕`, кнопки `+ Додати`, `Всі` та `Очистити`).
  - Відображає лічильник обраних співробітників на кнопці друку: `Друк відомості (N ос.) / PDF` або `Друк бланка / PDF` (якщо порожній).
  - При виборі кількох співробітників формується єдина відомість із порядковими номерами ($1, 2, \dots, N$) та плашкою складу групи замість картки однієї особи.
- **Short Column Titles (Короткі назви колонок)**:
  - У шапці таблиці бланка/форми відображаються виключно короткі стандартизовані назви та авіаційні абревіатури (наприклад: `LPC`, `OPC`, `OPC NVG`, `DG`, `AV SEC`, `CRM`, `MED`, `Type`, `Посада`, `ПІБ`), а не довгі описи кваліфікацій.
- **Strict Table Width Containment (Не перевищувати габарити сторінки)**:
  - Таблиця та контейнер бланка мають жорстке обмеження: `width: 100% !important; max-width: 100% !important; table-layout: fixed !important; overflow: hidden !important;`.
  - При увімкненні «Вмістити інформацію в один рядок» розмір шрифту та відступи комірок динамічно масштабуються залежно від орієнтації (Portrait/Landscape) та кількості стовпчиків, запобігаючи виходу за поля аркуша А4.
- **Column Layout & Text Wrapping Rules (Спеціальні правила колонок)**:
  - **Колонка «Посада» (`col-rank`)**: має відступи максимум 1 px по горизонталі (`padding: 1px !important;`), фіксовану компактну ширину (~44-48px) та вирівнювання по центру. **Розмір шрифту в заголовку «Посада» (`th.col-rank`) строго на 2 одиниці менший за інші заголовки** (`calc(1em - 2px)` / `calc(printFontSize - 2pt)`).
  - **Всі заголовки (`th`)**: мають мінімальний відступ (1 px по горизонталі) та підтримку автоматичного переносу слів (`white-space: normal !important; word-break: break-word;`), що запобігає штучному розширенню колонок шапкою.
  - **Колонка з ім'ям («ПІБ» / «FULL NAME» / `col-name`)**: при заповненні бланків використовується коротка форма — **Прізвище та ініціали** (напр. `Алекса С.М.`). Для колонки задано пріоритетну ширину (21–25%), а ініціали захищені від розриву (`white-space: nowrap`), тому перенос ініціалів на новий рядок під прізвище відбувається **тільки коли це дійсно необхідно** через брак місця. **Вирівнювання даних у комірках — по лівому краю** (`text-align: left !important; padding-left: 5px !important;`), тоді як заголовок стовпчика залишається відцентрованим по середині.
- **Bilingual Support (Повна англійська версія)**:
  - Усі вкладки налаштувань, конструктор форм, картки та елементи керування бланками мають двомовний переклад (`TRANSLATIONS.uk` / `TRANSLATIONS.en`, `data-i18n`, `data-i18n-placeholder`).
- **Direct edit button**: швидкий перехід до редагування шаблону в Генераторі форм.

## 4. Personal Crew Portal Date Editing (Редагування дат на персональній сторінці)
- **Role Permissions (Доступ за ролями)**:
  - Користувачі в режимах **ADMIN**, **INSTRUCTOR** та **OFFICE** мають право редагувати дати підготовок безпосередньо на персональній сторінці члена екіпажу (`#view-personal-portal`) при натисканні на дату або картку підготовки.
  - Користувачі в ролі **CREW** переглядають свій профіль у режимі «лише читання» (read-only) без можливості зміни дат.
- **Interactive Training Cards (Інтерактивні картки підготовок)**:
  - Для ролей з доступом картки як обов'язкових термінів (`portal-expiries-grid`), так і додаткових тренувань (`portal-additional-grid`) отримують клас `.portal-training-card--editable`, курсор `pointer`, інтерактивне підсвічування рамки при наведенні (accent color), легке підняття картки та іконку редагування `edit-3`.
  - Якщо дата ще не вказана, виводиться кнопка-підказка `+ Вказати дату`.
- **Date Edit Modal (`#portal-date-edit-modal-backdrop`)**:
  - Відображає ПІБ члена екіпажу, назву підготовки/сертифіката та поточне значення.
  - Поле введення дати (`<input type="date">`) з кнопкою «Сьогодні» для швидкого заповнення поточної дати.
  - Для періодичних обов'язкових підготовок (`isExpiring`) надається вибір:
    1. **Дата закінчення дії (Expiration Date)** — пряме збереження зазначеної дати як кінцевого строку чинності.
    2. **Дата проходження (Completion Date)** — автоматичний розрахунок дати закінчення дії відповідно до нормативних правил періодичності (`calculateExpiryDate()`).
  - Для додаткових підготовок без кінцевого терміну дата зберігається безпосередньо як дата проходження.
  - Кнопка **«Очистити»** дозволяє швидко скинути дату підготовки, якщо запис було внесено помилково.
- **Data Persistence & Audit Log**:
  - Будь-яка зміна або очищення дати негайно фіксується в аудиторському журналі `STATE.changelog` (тип `MANUAL_EDIT`, дата/час, email користувача, ПІБ, стара та нова дата).
  - Зміни зберігаються через `saveStateToStorage()`, відображаються системним тостом і миттєво оновлюють бейджі статусу та інтерфейс особистого кабінету.

## 5. Settings Sub-Navigation & System Audit Log Tab (Вкладки налаштувань та Лог)
- **Settings Tabs (Вкладки без номерів)**:
  - Усі вкладки меню «Налаштування» стандартизовані без цифрових префіксів:
    1. **Резервне копіювання та Синхронізація** (Backup & Sync)
    2. **Персонал та Доступ** (Personnel & Access)
    3. **Відображення** (Display)
    4. **Форми** (Forms)
    5. **Лог** (Log)
- **Audit Log Tab (`#settings-panel-log`)**:
  - Доступний виключно в режимі **ADMIN** (для інших ролей вкладка прихована або доступ обмежено).
  - Відображає повний реєстр усіх змін на сайті (`STATE.changelog`) у зворотному хронологічному порядку (найновіші зверху):
    - **Дата і час**: точний момент здійснення дії.
    - **Хто вніс зміни**: email користувача (`userEmail`), підсвічування облікового запису адміністратора.
    - **Тип дії**: кольорові бейджі (`MANUAL_EDIT` — Ручна зміна, `FLIGHT_LOG` — Політ, `CREW_ADD` — Додано, `CREW_DELETE` — Видалено, `MERGE_IMPORT` — Імпорт Excel).
    - **Член екіпажу**: ПІБ та склад (Flight/Cabin).
    - **Деталі змін**: назва поля, стара перекреслена дата та нова встановлена дата (`oldVal ➔ newVal`), інформація про польоти, фотографії та скани.
  - **Інструменти керування логом**:
    - **Живий пошук**: миттєва фільтрація за автором (email), екіпажем або полем.
    - **Фільтр за типами дій**: швидка вибірка (ручні зміни, польоти, додавання, видалення, імпорт).
    - **Лічильник подій**: відображає загальну кількість та кількість відфільтрованих записів.
    - **Експорт у CSV**: вивантаження повного звіту у форматі CSV з підтримкою кирилиці (UTF-8 BOM).
    - **Очищення логу**: можливість скидання журналу з підтвердженням дії.

## 6. Access Control & User Accounts Management (Керування користувачами та правами доступу)
- **User Addition (`#btn-add-user-account`, `#user-modal-backdrop`)**:
  - Кнопка «+ Додати користувача» над таблицею облікових записів у вкладці «Персонал та Доступ».
  - Модальне вікно дозволяє вказати:
    - **Email** (обов'язково)
    - **ПІБ / Name** (необов'язково)
    - **Роль** (`ADMIN`, `INSTRUCTOR`, `OFFICE`, `CREW`)
    - **Початковий пароль** (за замовчуванням `123456`, якщо поле порожнє)
  - Створений користувач зберігається в `aerocheck_custom_users`, отримує призначену роль в `aerocheck_user_roles` і пароль в `aerocheck_pass_${email}`.
  - Дія автоматично фіксується в аудиторському журналі `STATE.changelog` (тип `CREW_ADD`).
- **User Deletion (`btn-delete-user`)**:
  - У колонці «Дії» для кожного користувача доступна кнопка видалення (іконка смітника `trash-2`).
  - **Захист поточного сеансу**: користувач, під яким зараз авторизовано сесію, захищений від видалення (кнопка заблокована з бейджем «Поточний сеанс»).
  - При натисканні відкривається діалог підтвердження з попередженням про втрату доступу.
  - При підтвердженні:
    - Обліковий запис додається до списку заблокованих/видалених (`aerocheck_deleted_users`), видаляється зі сховища кастомних акаунтів, скидаються його роль та пароль.
    - Якщо користувач спробує увійти, система повідомляє: «Цей обліковий запис було видалено або заблоковано».
    - Фіксується в `STATE.changelog` (тип `CREW_DELETE`).
- **Role Assignment (Зміна ролей)**:
  - Зміна ролі через селектор миттєво зберігається в `aerocheck_user_roles`, фіксується в журналі аудиту та оновлює права сесії (якщо змінено роль поточного користувача).

## 7. Crew Personal Portal Routing & DOM Hierarchy (Особистий кабінет екіпажу)
- **DOM Hierarchy**:
  - Панель `#view-personal-portal` є прямим нащадком контейнера `.views-container` на одному рівні з `#view-dashboard`, `#view-flight-crew`, `#view-cabin-crew`, `#view-forms` та `#view-settings`.
  - Усі вкладки налаштувань (`#settings-panel-*`) мають бути коректно закриті всередині `#view-settings` перед початком інших панелей перегляду.
- **Routing & Interactivity (`switchView('personal-portal')`)**:
  - Натискання на ПІБ / прізвище в таблицях льотного (`flight-crew`), кабінного (`cabin-crew`) складу та на панелі дашборду відкриває персональний профіль обраного співробітника (`STATE.selectedCrewMemberId = member.id`).
  - Доступно для ролей `ADMIN`, `INSTRUCTOR`, `OFFICE`.
  - Забезпечується string-безпечний пошук `String(c.id) === String(STATE.selectedCrewMemberId)`.
  - Відображає кнопку «Назад до списку», яка повертає користувача на попередню таблицю зі збереженням фільтрів та стану.



