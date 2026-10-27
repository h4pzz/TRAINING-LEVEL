const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 51517;

// Prevent server crash on unexpected errors
process.on('uncaughtException', err => {
  console.error('[SERVER ERROR] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER ERROR] Unhandled rejection:', reason);
});

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
  console.log(`[${req.method}] ${req.url}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // Strip query parameters from the request URL to correctly match files on disk
  const cleanUrl = req.url.split('?')[0];

  // API Endpoint: Send email with PDF attachment via SMTP
  if (req.method === 'POST' && cleanUrl === '/api/send-flight-email') {
    let body = '';
    let isTooLarge = false;

    req.on('data', chunk => {
      if (isTooLarge) return;
      body += chunk;
      // 20MB payload limit
      if (body.length > 20 * 1024 * 1024) {
        isTooLarge = true;
        if (!res.headersSent) {
          res.writeHead(413, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        }
        req.destroy();
      }
    });

    req.on('end', () => {
      if (isTooLarge) return;

      try {
        const { spawn } = require('child_process');
        const scriptPath = path.join(__dirname, 'execution', 'send_email_smtp.py');
        const pyProc = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

        let stdout = '';
        let stderr = '';
        let closed = false;

        pyProc.on('error', err => {
          console.error('[Email API] Failed to start python process:', err.message);
          if (!closed && !res.headersSent) {
            closed = true;
            res.writeHead(500, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ success: false, error: 'Python execution error: ' + err.message }));
          }
        });

        pyProc.stdin.on('error', err => {
          console.warn('[Email API] stdin error (process may have exited early):', err.message);
        });

        pyProc.stdout.on('data', data => { stdout += data.toString('utf-8'); });
        pyProc.stderr.on('data', data => { stderr += data.toString('utf-8'); });

        pyProc.on('close', code => {
          if (closed || res.headersSent) return;
          closed = true;

          let responseData;
          try {
            responseData = JSON.parse(stdout.trim());
          } catch (e) {
            responseData = {
              success: code === 0,
              message: stdout.trim() || stderr.trim() || `Exit code ${code}`
            };
          }

          res.writeHead(responseData.success ? 200 : 500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(responseData));
        });

        pyProc.stdin.write(body, 'utf-8');
        pyProc.stdin.end();
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      }
    });
    return;
  }

  // API Endpoint: Send discrepancy / pending approval email notification
  if (req.method === 'POST' && cleanUrl === '/api/discrepancy-report') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const report = JSON.parse(body || '{}');
        const { spawn } = require('child_process');
        const scriptPath = path.join(__dirname, 'execution', 'send_email_smtp.py');

        const emailSubject = `[AeroCheck] Запит на верифікацію даних: ${report.crewMemberName || 'Екіпаж'} (${report.fieldName || 'Дані'})`;
        const emailBody = `СИСТЕМА КОНТРОЛЮ КВАЛІФІКАЦІЙ AEROCHECK
--------------------------------------------------
ЗАПИТ НА ВЕРИФІКАЦІЮ ТА ЗАТВЕРДЖЕННЯ ЗМІН

Член екіпажу:  ${report.crewMemberName || '-'}
Посада:        ${report.rank || '-'} (${report.crewType || 'Crew'})
Email пілота:  ${report.crewMemberEmail || '-'}
Параметр/поле: ${report.fieldName || '-'}

Було в базі:   ${report.currentValue || '(не встановлено)'}
Запропоновано: ${report.proposedValue || '(пусто)'}

Коментар:
${report.comment || '(без коментаря)'}

Дата подачі:   ${report.timestamp || new Date().toISOString()}
--------------------------------------------------
Для підтвердження або відхилення перейдіть до адміністративної панелі AeroCheck.
`;

        const pyPayload = {
          recipient: 'training.dept@ukr-helicopters.ua',
          subject: emailSubject,
          body: emailBody
        };

        const pyProc = spawn('python', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
        let stdout = '';
        pyProc.stdout.on('data', d => { stdout += d.toString('utf-8'); });
        pyProc.on('close', () => {
          let emailSent = false;
          try {
            const parsed = JSON.parse(stdout.trim());
            emailSent = parsed.success;
          } catch(e) {}
          if (!res.headersSent) {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ success: true, emailSent: emailSent }));
          }
        });
        pyProc.on('error', (err) => {
          console.warn('[Discrepancy Email] Spawn error:', err.message);
          if (!res.headersSent) {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ success: true, emailSent: false, error: 'SMTP spawn skipped' }));
          }
        });

        pyProc.stdin.on('error', (err) => {
          console.warn('[Discrepancy Email] stdin error:', err.message);
        });

        try {
          pyProc.stdin.write(JSON.stringify(pyPayload));
          pyProc.stdin.end();
        } catch (writeErr) {
          console.warn('[Discrepancy Email] write error:', writeErr.message);
        }
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ success: true, emailSent: false, error: err.message }));
        }
      }
    });
    return;
  }

  // API Endpoint: Upload / Mirror flight scan into local DATABASE/[rootFolder]/[Month_YEAR]/ directory
  if (req.method === 'POST' && cleanUrl === '/api/upload-flight-scan') {
    let body = '';
    let isTooLarge = false;

    req.on('data', chunk => {
      if (isTooLarge) return;
      body += chunk;
      // 30MB payload limit for scans / PDFs
      if (body.length > 30 * 1024 * 1024) {
        isTooLarge = true;
        if (!res.headersSent) {
          res.writeHead(413, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, error: 'Payload too large' }));
        }
        req.destroy();
      }
    });

    req.on('end', () => {
      if (isTooLarge) return;

      try {
        const payload = JSON.parse(body || '{}');
        const rootFolder = (payload.rootFolder || 'Training_Flights').replace(/[^\w\d\-_ ]+/gi, '_');
        const subfolder = (payload.subfolder || 'Unsorted').replace(/[^\w\d\-_ ]+/gi, '_');
        let fileName = (payload.fileName || `Scan_${Date.now()}.pdf`).replace(/[^\w\d\-_\. ]+/gi, '_');

        if (!payload.fileData) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, error: 'fileData is required' }));
          return;
        }

        const targetDir = path.join(__dirname, 'DATABASE', rootFolder, subfolder);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Clean base64 header if present
        let base64Clean = payload.fileData;
        const commaIdx = base64Clean.indexOf(',');
        if (commaIdx !== -1 && base64Clean.substring(0, commaIdx).includes('base64')) {
          base64Clean = base64Clean.substring(commaIdx + 1);
        }

        const buffer = Buffer.from(base64Clean, 'base64');
        const destPath = path.join(targetDir, fileName);

        fs.writeFileSync(destPath, buffer);
        console.log(`💾 [Local Mirror] Saved scan file: ${destPath} (${buffer.length} bytes)`);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          success: true,
          savedPath: `DATABASE/${rootFolder}/${subfolder}/${fileName}`,
          rootFolder: rootFolder,
          subfolder: subfolder,
          fileName: fileName,
          sizeBytes: buffer.length
        }));
      } catch (err) {
        console.error('[Upload Scan API] Error writing scan:', err);
        if (!res.headersSent) {
          res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      }
    });
    return;
  }

  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(cleanUrl);
  } catch (e) {
    decodedUrl = cleanUrl;
  }
  let filePath = path.join(__dirname, decodedUrl === '/' ? 'index.html' : decodedUrl);
  
  // Prevent directory traversal attacks
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA Fallback: for clean routes without file extension, serve index.html
        const hasExt = path.extname(cleanUrl) !== '';
        if (!hasExt) {
          const indexPath = path.join(__dirname, 'index.html');
          fs.readFile(indexPath, (indexErr, indexContent) => {
            if (indexErr) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Server Error: ' + indexErr.code);
            } else {
              res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              });
              res.end(indexContent);
            }
          });
          return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error: ' + err.code);
      }
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error: ' + err.code);
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.end(content);
      }
    });
  });
});

server.on('clientError', (err, socket) => {
  if (err.code === 'ECONNRESET' || !socket.writable) return;
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT, () => {
  console.log(`AeroCheck local dev server is running at: http://localhost:${PORT}/`);
});
