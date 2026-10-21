/**
 * Asynchronously dispatches flight log notification emails and weekly reports.
 * Formats full structured text reports, copies content to clipboard, and triggers
 * direct email sending via user email clients (Outlook, Thunderbird, Mail.app) or Gmail Web.
 */

/**
 * Formats structured flight data into clean plain-text report for email
 * @param {object} flight - Full flight record object
 * @param {string} [lang='uk'] - Language code ('uk' or 'en')
 * @returns {string} Formatted text report
 */
export function formatFlightReportText(flight, lang = 'uk') {
  if (!flight) return '';
  const isUk = lang === 'uk';
  const header = isUk
    ? 'АВІАКОМПАНІЯ «УКРАЇНСЬКІ ВЕРТОЛЬОТИ»\nЗВІТ ТРЕНУВАЛЬНОГО ПОЛЬОТУ'
    : 'UKRAINIAN HELICOPTERS\nFLIGHT TRAINING LOG REPORT';

  function getRankPriority(pstn, isInstructor) {
    if (!pstn) return 999;
    const pNormalized = String(pstn).trim().toUpperCase();
    const isInst = !!isInstructor || pNormalized.includes('INST') || pNormalized.includes('ІНСТ') || pNormalized === 'PI';
    if (pNormalized === 'PI' || ((pNormalized.includes('КПС') || pNormalized.includes('PIC')) && isInst)) return 1;
    if (pNormalized === 'КПС' || pNormalized === 'PIC') return 2;
    if ((pNormalized.includes('2П') || pNormalized.includes('SIC')) && isInst) return 3;
    if (pNormalized === '2П' || pNormalized === '2P' || pNormalized === 'SIC') return 4;
    if ((pNormalized.includes('ІБ') || pNormalized.includes('FE')) && isInst) return 5;
    if (pNormalized === 'ІБ' || pNormalized === 'FE') return 6;
    if ((pNormalized.includes('БП-АР') || pNormalized.includes('БП-РА') || pNormalized.includes('БПАР') || pNormalized.includes('FA-AR') || pNormalized.includes('FA-RA') || pNormalized.includes('AR')) && isInst) return 7;
    if (pNormalized === 'БП-АР' || pNormalized === 'БП-РА' || pNormalized === 'БПАР' || pNormalized === 'FA-AR' || pNormalized === 'FA-RA') return 8;
    if ((pNormalized.includes('БП') || pNormalized.includes('FA')) && isInst) return 9;
    if (pNormalized === 'БП' || pNormalized === 'FA') return 10;
    return 100;
  }

  const crewList = Array.isArray(flight.crew) ? [...flight.crew] : [];
  crewList.sort((a, b) => getRankPriority(a.pstn, a.isInstructor) - getRankPriority(b.pstn, b.isInstructor));

  const crewText = crewList.map((c, i) => {
    const isInst = c.isInstructor && !String(c.pstn || '').toLowerCase().includes('inst') && c.pstn !== 'PI';
    const displayPstn = (c.pstn || '') + (isInst ? ' inst' : '');
    const fltDay = (c.flightTime && c.flightTime.day) || c.flightDay || '00:00';
    const fltNght = (c.flightTime && c.flightTime.nght) || c.flightNght || '00:00';
    const fltNvg = (c.flightTime && c.flightTime.nvg) || c.flightNvg || '00:00';
    const blkDay = (c.blockTime && c.blockTime.day) || c.blockDay || '00:00';
    const blkNght = (c.blockTime && c.blockTime.nght) || c.blockNght || '00:00';
    const instDay = (c.timeInstructor && c.timeInstructor.day) || c.instDay || '00:00';
    const instNght = (c.timeInstructor && (c.timeInstructor.night || c.timeInstructor.nght)) || c.instNght || '00:00';
    const task = c.flightTask || flight.mainFlightTask || '-';
    const trainTypes = (c.trainingTypes || []).join(', ') || '-';

    return `${i + 1}. [${displayPstn}] ${c.name}
   • ${isUk ? 'Наліт' : 'Flight'}: DAY: ${fltDay} | NIGHT: ${fltNght} | NVG: ${fltNvg}
   • ${isUk ? 'Блок' : 'Block'}:  DAY: ${blkDay} | NIGHT: ${blkNght}
   • ${isUk ? 'Інструктор' : 'Instructor'}: DAY: ${instDay} | NIGHT: ${instNght}
   • ${isUk ? 'Вправа' : 'Task'}: № ${task} | ${isUk ? 'Підготовка' : 'Training'}: ${trainTypes}`;
  }).join('\n\n');

  let refuelText = `${flight.refuel || '0'}`;
  if (flight.refuelMore && (flight.refuel2 || flight.refuel3)) {
    if (flight.refuel2) refuelText += ` + ${flight.refuel2}`;
    if (flight.refuel3) refuelText += ` + ${flight.refuel3}`;
  }

  return `${header}
================================================================
${isUk ? 'Борт (Helicopter Reg)' : 'Helicopter Reg'}:  ${flight.helicopterReg || '-'}
${isUk ? 'Дата польоту (Date)' : 'Date'}:            ${flight.date || '-'}
${isUk ? 'Робочий час (Duty Time)' : 'Duty Time'}:   ${flight.dutyTime || '-'}
${isUk ? 'Загальний наліт (Flight)' : 'Total Flight'}: ${flight.totalFlightTime || '00:00'}
${isUk ? 'Загальний блок (Block)' : 'Total Block'}:  ${flight.totalBlockTime || '00:00'}
${isUk ? 'Номер вправи (Task #)' : 'Flight Task #'}: ${flight.mainFlightTask || '-'}

${isUk ? 'ПАЛИВО (літрів)' : 'FUEL (liters)'}:
• ${isUk ? 'Запуск' : 'Start-up'}:   ${flight.fuelStart || 0} л
• ${isUk ? 'Зупинка' : 'Shut-down'}: ${flight.fuelEnd || 0} л
• ${isUk ? 'Заправка' : 'Refuel'}:    ${refuelText} л

${isUk ? 'ІНСТРУКТАЖ ТА РОЗБІР' : 'BRIEFINGS'}:
• ${isUk ? 'Передполітний інструктаж' : 'Pre-flight briefing'}:  ${flight.preBgn || '-'} - ${flight.preEnd || '-'} (${isUk ? 'Тривалість' : 'Duration'}: ${flight.preTtl || '00:00'})
• ${isUk ? 'Післяполітний розбір' : 'Post-flight debrief'}:      ${flight.postBgn || '-'} - ${flight.postEnd || '-'} (${isUk ? 'Тривалість' : 'Duration'}: ${flight.postTtl || '00:00'})

${isUk ? 'ЕКІПАЖ ТА НАЛІТ' : 'CREW DETAILS'}:
----------------------------------------------------------------
${crewText || (isUk ? '(Екіпаж не вказано)' : '(No crew specified)')}
================================================================
UH Training Level Dashboard`;
}

/**
 * Generates base64 data URI of the styled flight log PDF using html2pdf
 * @param {object} flight 
 * @param {string} [htmlContent]
 * @returns {Promise<string>} Base64 data URI of the PDF
 */
export async function generateFlightPdfBase64(flight, htmlContent = '') {
  if (typeof window === 'undefined' || typeof html2pdf === 'undefined') {
    return null;
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.background = '#ffffff';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const filename = `Наліт_${((flight && flight.helicopterReg) || 'UR').replace(/[\s\/\\:]+/g, '_')}_${((flight && flight.date) || 'flight')}.pdf`;
    const opt = {
      margin: 8,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const pdfDataUri = await html2pdf().set(opt).from(container).outputPdf('datauristring');
    return pdfDataUri;
  } catch (err) {
    console.warn("Failed to generate PDF base64:", err);
    return null;
  } finally {
    container.remove();
  }
}

/**
 * Asynchronously dispatches a flight log notification email.
 * Supports direct SMTP sending with PDF attachment, mailto compose, and Gmail web.
 * 
 * @param {object} options
 * @param {string} [options.recipient] - Target email address
 * @param {string} [options.subject] - Email subject line
 * @param {string} [options.body] - Formatted email body text
 * @param {object} [options.flight] - Flight record (used if body/subject missing)
 * @param {string} [options.pdfBase64] - Base64 encoded PDF string
 * @param {string} [options.pdfFilename] - Attachment file name
 * @param {string} [options.method='smtp'] - 'smtp' | 'mailto' | 'gmail' | 'copy' | 'silent'
 * @param {string} [options.lang='uk'] - Language code
 * @returns {Promise<{ success: boolean, method: string, recipient: string, subject: string, body: string, message?: string }>}
 */
export async function dispatchFlightLogEmail(options = {}) {
  const recipient = (options.recipient || (options.logData && options.logData.recipient) || 'training.dept@ukr-helicopters.ua').trim();
  const lang = options.lang || 'uk';
  const flight = options.flight || null;

  let subject = options.subject;
  if (!subject) {
    if (flight) {
      subject = `[UH Flight Training] Наліт ${flight.helicopterReg || ''} (${flight.date || ''})`;
    } else if (options.logData) {
      subject = `[UH Flight Training] Звіт польоту - ${options.logData.crewName || options.crewName || ''} (${options.logData.date || options.date || ''})`;
    } else {
      subject = `[UH Flight Training] Звіт тренувального польоту`;
    }
  }

  let body = options.body;
  if (!body) {
    if (flight) {
      body = formatFlightReportText(flight, lang);
    } else if (options.logData || options.crewName) {
      const data = options.logData || options;
      body = `АВІАКОМПАНІЯ «УКРАЇНСЬКІ ВЕРТОЛЬОТИ»
ЗВІТ ТРЕНУВАЛЬНОГО ПОЛЬОТУ
================================================================
Борт: ${data.acType || '-'}
Дата: ${data.date || '-'}
Робочий час: ${data.duration || '-'}
Екіпаж: ${data.crewName || '-'}
Деталі: ${data.exercise || '-'}
================================================================
UH Training Level Dashboard`;
    } else {
      body = subject;
    }
  }

  const method = options.method || 'smtp';
  const pdfFilename = options.pdfFilename || `Наліт_${((flight && flight.helicopterReg) || 'UR').replace(/[\s\/\\:]+/g, '_')}_${((flight && flight.date) || 'flight')}.pdf`;

  // 1. Copy formatted text report to clipboard if available
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(body);
    } catch (e) {
      console.warn("Clipboard copy info:", e);
    }
  }

  // 2. Direct SMTP Server Dispatch (Attached PDF)
  if (method === 'smtp') {
    try {
      const response = await fetch('/api/send-flight-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: recipient,
          subject: subject,
          body: body,
          pdf_base64: options.pdfBase64 || '',
          pdf_filename: pdfFilename
        })
      });

      const rawText = await response.text();
      let resData;
      try {
        resData = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error(`Помилка сервера (${response.status}): ${rawText.slice(0, 100)}`);
      }

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || resData.message || 'Server error sending email');
      }

      console.log("✈️ [EMAIL DISPATCHER] SMTP Sent successfully:", resData);

      return {
        success: true,
        method: 'smtp',
        recipient,
        subject,
        body,
        message: resData.message || `Лист із вкладеним PDF успішно надіслано на ${recipient}`
      };
    } catch (err) {
      console.error("SMTP dispatch error:", err);
      throw err;
    }
  }

  // 3. Open via mailto (Outlook, Apple Mail, Thunderbird, Windows Mail)
  if (method === 'mailto') {
    // If htmlContent or html2pdf available, automatically trigger download of the PDF
    if (options.htmlContent && typeof html2pdf !== 'undefined') {
      try {
        const element = document.createElement('div');
        element.innerHTML = options.htmlContent;
        html2pdf().from(element).save(pdfFilename);
      } catch (err) {
        console.warn("Auto-download PDF error:", err);
      }
    }

    if (typeof window !== 'undefined') {
      const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const link = document.createElement('a');
      link.href = mailtoUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => link.remove(), 1000);
    }
    return {
      success: true,
      method: 'mailto',
      recipient,
      subject,
      body
    };
  }

  // 4. Open via Gmail Web Compose
  if (method === 'gmail') {
    if (options.htmlContent && typeof html2pdf !== 'undefined') {
      try {
        const element = document.createElement('div');
        element.innerHTML = options.htmlContent;
        html2pdf().from(element).save(pdfFilename);
      } catch (err) {
        console.warn("Auto-download PDF error:", err);
      }
    }

    if (typeof window !== 'undefined') {
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(gmailUrl, '_blank');
    }
    return {
      success: true,
      method: 'gmail',
      recipient,
      subject,
      body
    };
  }

  return {
    success: true,
    method: 'copy',
    recipient,
    subject,
    body
  };
}

/**
 * Asynchronously dispatches the weekly training flights report to designated email inboxes.
 * Supports customizable scope and attachment format.
 * 
 * @param {object} options
 * @param {string} options.recipientEmails - Target email address(es)
 * @param {string} options.scope - 'all' or 'last'
 * @param {string} options.format - 'xlsx', 'csv', or 'both'
 * @param {Array} options.flights - Array of flights
 * @param {Array} [options.files] - Pre-generated attachment descriptors
 * @param {string} [options.method='mailto'] - Dispatch method
 * @returns {Promise<{ success: boolean, recipients: string, scope: string, format: string, count: number, timestamp: string, message: string }>}
 */
export async function dispatchFlightsWeeklyEmail({
  recipientEmails = 'training.dept@ukr-helicopters.ua',
  scope = 'all',
  format = 'both',
  flights = [],
  files = [],
  method = 'mailto'
} = {}) {
  const targetFlights = (scope === 'last' && flights.length > 0)
    ? [flights[flights.length - 1]]
    : flights;
  
  const count = targetFlights.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const scopeLabel = scope === 'last' ? 'Останній політ' : `Вся база (${count} польотів)`;
  const formatLabel = format === 'both' ? 'CSV + XLSX' : format.toUpperCase();
  const subject = `[UH Flight Training] Щотижневий звіт польотів: ${scopeLabel} [${formatLabel}] (${todayStr})`;

  const body = `АВІАКОМПАНІЯ «УКРАЇНСЬКІ ВЕРТОЛЬОТИ»
ЩОТИЖНЕВИЙ ЗВІТ ТРЕНУВАЛЬНИХ ПОЛЬОТІВ
================================================================
Дата формування: ${new Date().toLocaleString()}
Отримувач(і):    ${recipientEmails}
Охоплення даних: ${scopeLabel}
Кількість:       ${count} польотів
Формат файлів:   ${formatLabel}
================================================================
Файли бази польотів підготовлено та доступні для департаменту льотної підготовки.`;

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(body);
    } catch (_) {}
  }

  if (method === 'mailto' && typeof window !== 'undefined') {
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmails)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const a = document.createElement('a');
    a.href = mailtoUrl;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  }

  console.log("✈️ [FLIGHTS EMAIL DISPATCHER] Weekly flights report prepared:", { recipientEmails, scope, format, count });

  return {
    success: true,
    recipients: recipientEmails,
    scope,
    format,
    count,
    timestamp: new Date().toISOString(),
    message: `Поштовий клієнт відкрито для відправки на ${recipientEmails}`
  };
}
