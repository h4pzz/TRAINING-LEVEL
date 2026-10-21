#!/usr/bin/env python3
"""
Layer 3 Execution Script: SMTP Email Dispatcher with PDF Attachment
Sends emails with PDF attachments via Gmail or any standard SMTP SSL/TLS server.
"""

import sys
import os
import json
import base64
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.header import Header
from pathlib import Path

# Force UTF-8 I/O encoding across all platforms (critical for Windows stdout/stdin)
if hasattr(sys.stdin, 'reconfigure'):
    sys.stdin.reconfigure(encoding='utf-8')
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def load_env(env_path):
    env_vars = {}
    if not os.path.exists(env_path):
        return env_vars
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars

def send_email_with_pdf(payload):
    project_root = Path(__file__).resolve().parent.parent
    env_vars = load_env(project_root / '.env')

    smtp_host = payload.get('smtp_host') or env_vars.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(payload.get('smtp_port') or env_vars.get('SMTP_PORT', 465))
    smtp_user = payload.get('smtp_user') or env_vars.get('SMTP_USER', 'uh.nairobi@gmail.com')
    smtp_pass = (payload.get('smtp_pass') or env_vars.get('SMTP_PASS', '')).replace(' ', '')
    smtp_from = payload.get('smtp_from') or env_vars.get('SMTP_FROM', smtp_user)

    if not smtp_user or not smtp_pass:
        return {
            "success": False,
            "error": "SMTP credentials missing. Please set SMTP_USER and SMTP_PASS in .env or pass in payload."
        }

    recipient_raw = payload.get('recipient') or env_vars.get('DEFAULT_EMAIL_RECIPIENT', 'training.dept@ukr-helicopters.ua')
    if isinstance(recipient_raw, list):
        recipients = [r.strip() for r in recipient_raw if r.strip()]
    else:
        recipients = [r.strip() for r in str(recipient_raw).split(',') if r.strip()]

    if not recipients:
        return {"success": False, "error": "No valid recipient email address specified."}

    subject = payload.get('subject', '[UH Flight Training] Звіт польоту')
    body_text = payload.get('body', 'Доброго дня!\n\nДо листа додано звіт тренувального польоту у форматі PDF.\n\n---\nUH Training Level Dashboard')

    msg = MIMEMultipart('mixed')
    msg['From'] = f"UH Training System <{smtp_from}>"
    msg['To'] = ", ".join(recipients)
    msg['Subject'] = Header(subject, 'utf-8').encode()

    # Body part
    body_part = MIMEText(body_text, 'plain', 'utf-8')
    msg.attach(body_part)

    # Attach PDF if provided
    pdf_base64 = payload.get('pdf_base64', '')
    pdf_filename = payload.get('pdf_filename', 'Flight_Log.pdf')

    if pdf_base64:
        if ',' in pdf_base64:
            pdf_base64 = pdf_base64.split(',', 1)[1]
        try:
            pdf_bytes = base64.b64decode(pdf_base64)
            pdf_part = MIMEApplication(pdf_bytes, _subtype="pdf")
            # Encode Ukrainian / Unicode filename properly per RFC 2231
            safe_ascii_name = "".join(c if (c.isalnum() or c in "._-") else "_" for c in pdf_filename)
            if not safe_ascii_name.lower().endswith('.pdf'):
                safe_ascii_name += '.pdf'
            pdf_part.add_header('Content-Disposition', 'attachment', filename=('utf-8', '', pdf_filename))
            msg.attach(pdf_part)
        except Exception as e:
            return {"success": False, "error": f"Failed to decode PDF attachment: {str(e)}"}

    try:
        context = ssl.create_default_context()
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=20) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)

        return {
            "success": True,
            "message": f"Лист із вкладеним PDF успішно надіслано на {', '.join(recipients)}",
            "recipients": recipients,
            "subject": subject,
            "filename": pdf_filename
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"SMTP sending failed: {str(e)}"
        }

def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        test_payload = {
            "recipient": "uh.nairobi@gmail.com",
            "subject": "[UH Test] SMTP Verification",
            "body": "Тестове повідомлення перевірки SMTP.",
            "pdf_base64": base64.b64encode(b"%PDF-1.4 test dummy pdf content").decode('utf-8'),
            "pdf_filename": "test.pdf"
        }
        res = send_email_with_pdf(test_payload)
        print(json.dumps(res, ensure_ascii=False, indent=2))
        return

    try:
        input_data = sys.stdin.read().strip()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input JSON received on stdin"}))
            sys.exit(1)
        payload = json.loads(input_data)
        result = send_email_with_pdf(payload)
        print(json.dumps(result))
        sys.exit(0 if result.get("success") else 1)
    except Exception as err:
        print(json.dumps({"success": False, "error": str(err)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
