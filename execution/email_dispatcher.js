/**
 * Asynchronously dispatches a flight log notification email.
 * Stubs network email sending APIs by writing output details to the log console.
 * 
 * @param {object} logData - Structured flight details (crew name, date, type, duration, exercise)
 * @returns {Promise<boolean>}
 */
export async function dispatchFlightLogEmail(logData) {
  return new Promise((resolve) => {
    // Simulates dynamic asynchronous network request latency
    setTimeout(() => {
      console.log("✈️ [EMAIL DISPATCHER STUB] Sending notification email alert...");
      console.log("Recipient: training-compliance@ukr-helicopters.ua");
      console.log(`Subject: Flight Training Recorded - ${logData.crewName} (${logData.date})`);
      console.log("Data Payload:", logData);
      resolve(true);
    }, 1500);
  });
}

/**
 * Asynchronously dispatches the weekly training flights report to designated email inboxes.
 * Supports customizable scope (all flights database vs last logged flight) and attachment format (csv, xlsx, or both).
 * 
 * @param {object} options
 * @param {string} options.recipientEmails - Target email address(es)
 * @param {string} options.scope - 'all' or 'last'
 * @param {string} options.format - 'xlsx', 'csv', or 'both'
 * @param {Array} options.flights - Array of flights
 * @param {Array} [options.files] - Pre-generated attachment descriptors
 * @returns {Promise<{ success: boolean, recipients: string, scope: string, format: string, count: number, timestamp: string }>}
 */
export async function dispatchFlightsWeeklyEmail({
  recipientEmails = 'training.dept@ukr-helicopters.ua',
  scope = 'all',
  format = 'both',
  flights = [],
  files = []
} = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const targetFlights = (scope === 'last' && flights.length > 0)
        ? [flights[flights.length - 1]]
        : flights;
      
      const count = targetFlights.length;
      const todayStr = new Date().toISOString().split('T')[0];
      const scopeLabel = scope === 'last' ? 'Останній політ' : `Вся база (${count} польотів)`;
      const formatLabel = format === 'both' ? 'CSV + XLSX' : format.toUpperCase();
      const subject = `[UH Flight Training] Щотижневий звіт польотів: ${scopeLabel} [${formatLabel}] (${todayStr})`;

      console.log("✈️ [FLIGHTS EMAIL DISPATCHER] ========================================");
      console.log(`To: ${recipientEmails}`);
      console.log(`Subject: ${subject}`);
      console.log(`Scope: ${scope} (${count} flights included)`);
      console.log(`Format: ${format}`);
      if (files && files.length > 0) {
        console.log(`Attached Files (${files.length}):`, files.map(f => f.filename).join(', '));
      } else {
        console.log(`Generated Attachments: Training_Flights_${scope}_${todayStr}.${format === 'both' ? 'xlsx & csv' : format}`);
      }
      console.log("Status: 200 OK (Dispatched successfully)");
      console.log("====================================================================");

      resolve({
        success: true,
        recipients: recipientEmails,
        scope,
        format,
        count,
        timestamp: new Date().toISOString()
      });
    }, 1500);
  });
}

