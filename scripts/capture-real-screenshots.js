import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createSessionToken } from '../src/lib/auth.js';
import { getDb } from '../src/lib/db.js';
import { config, normalizeEmail } from '../src/lib/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const docsDir = path.join(projectRoot, 'public', 'docs');
const brainDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\89de90ec-38d2-4ec5-914b-48e8c1b5ebd4';

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simple CDP client over native WebSocket
class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message));
          } else {
            resolve(msg.result);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function capture() {
  console.log('--- CAPTURING GENUINE LIVE SCREENSHOTS FROM SHORTFUNDLY PORTAL ---');

  // 1. Generate Auth Token
  const db = getDb();
  const admin = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(config.ADMIN_EMAIL));
  if (!admin) {
    throw new Error('Admin user not found in database');
  }
  const token = await createSessionToken(admin);
  console.log('Generated Admin Session Token successfully.');

  // 2. Launch Headless Chrome
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.join(process.env.TEMP || 'C:\\TEMP', 'sf_chrome_capture_' + Date.now());
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,920',
    `--user-data-dir=${userDataDir}`,
  ]);

  await sleep(2500);

  try {
    // 3. Connect to CDP
    const versionRes = await fetch('http://127.0.0.1:9222/json/version');
    const versionData = await versionRes.json();
    console.log('Connected to Chrome:', versionData.Browser);

    const newTabRes = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
    const tabData = await newTabRes.json();
    const cdp = new CdpClient(tabData.webSocketDebuggerUrl);
    await cdp.connect();
    console.log('CDP WebSocket established.');

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 920,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // --- SCREENSHOT 1: LOGIN SCREEN ---
    console.log('Navigating to http://localhost:3000/login...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/login' });
    await sleep(2000);
    const loginScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const loginPath = path.join(docsDir, 'real_login_page.png');
    fs.writeFileSync(loginPath, Buffer.from(loginScreenshot.data, 'base64'));
    console.log('✓ Captured real login screen:', loginPath);

    // --- SET SESSION COOKIE FOR AUTHENTICATED VIEWS ---
    await cdp.send('Network.setCookie', {
      name: 'sf_outreach_session',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
    });
    console.log('Injected authenticated session cookie into browser.');

    // --- SCREENSHOT 2: DASHBOARD OVERVIEW ---
    console.log('Navigating to http://localhost:3000/dashboard...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/dashboard' });
    await sleep(3000);
    const dashScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const dashPath = path.join(docsDir, 'real_dashboard_overview.png');
    fs.writeFileSync(dashPath, Buffer.from(dashScreenshot.data, 'base64'));
    console.log('✓ Captured real dashboard overview:', dashPath);

    // --- SCREENSHOT 3: MANUAL OUTREACH DISPATCHER ---
    console.log('Switching to Manual Sender tab...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const navBtns = document.querySelectorAll('nav button');
        if (navBtns[1]) {
          navBtns[1].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      })()`,
    });
    await sleep(2000);
    const senderScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const senderPath = path.join(docsDir, 'real_manual_outreach.png');
    fs.writeFileSync(senderPath, Buffer.from(senderScreenshot.data, 'base64'));
    console.log('✓ Captured real manual outreach dispatcher:', senderPath);

    // --- SCREENSHOT 4: BULK CSV CAMPAIGN ENGINE ---
    console.log('Switching to Bulk CSV Outreach mode...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const bulkBtn = btns.find(b => b.textContent.includes('Bulk CSV'));
        if (bulkBtn) {
          bulkBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      })()`,
    });
    await sleep(2000);
    const bulkScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const bulkPath = path.join(docsDir, 'real_bulk_campaign.png');
    fs.writeFileSync(bulkPath, Buffer.from(bulkScreenshot.data, 'base64'));
    console.log('✓ Captured real bulk CSV campaign engine:', bulkPath);

    // --- SCREENSHOT 5: EMAIL TEMPLATES MANAGER ---
    console.log('Switching to Email Templates tab...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const navBtns = document.querySelectorAll('nav button');
        if (navBtns[2]) {
          navBtns[2].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      })()`,
    });
    await sleep(2000);
    const tplScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const tplPath = path.join(docsDir, 'real_templates_manager.png');
    fs.writeFileSync(tplPath, Buffer.from(tplScreenshot.data, 'base64'));
    console.log('✓ Captured real email templates manager:', tplPath);

    // --- SCREENSHOT 6: SYSTEM & SMTP SETTINGS ---
    console.log('Switching to Settings tab...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const navBtns = document.querySelectorAll('nav button');
        if (navBtns[3]) {
          navBtns[3].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      })()`,
    });
    await sleep(2500);
    const settingsScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const settingsPath = path.join(docsDir, 'real_smtp_settings.png');
    fs.writeFileSync(settingsPath, Buffer.from(settingsScreenshot.data, 'base64'));
    console.log('✓ Captured real system & SMTP settings:', settingsPath);

    // --- SCREENSHOT 7: GOOGLE SMTP DIAGNOSTICS MODAL ---
    console.log('Opening Google SMTP Diagnostics Modal...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const smtpBtn = btns.find(b => b.textContent.includes('Google SMTP'));
        if (smtpBtn) {
          smtpBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      })()`,
    });
    await sleep(2500);
    const modalScreenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const modalPath = path.join(docsDir, 'real_smtp_diagnostics_modal.png');
    fs.writeFileSync(modalPath, Buffer.from(modalScreenshot.data, 'base64'));
    console.log('✓ Captured real Google SMTP diagnostics modal:', modalPath);

    // Copy all to brain directory as well
    if (fs.existsSync(brainDir)) {
      const allFiles = [
        'real_login_page.png',
        'real_dashboard_overview.png',
        'real_manual_outreach.png',
        'real_bulk_campaign.png',
        'real_templates_manager.png',
        'real_smtp_settings.png',
        'real_smtp_diagnostics_modal.png'
      ];
      for (const f of allFiles) {
        fs.copyFileSync(path.join(docsDir, f), path.join(brainDir, f));
      }
      console.log('✓ Synchronized all screenshots to brain artifacts directory.');
    }

    cdp.close();
    console.log('\n--- ALL REAL SCREENSHOTS CAPTURED CLEANLY ---');
  } finally {
    chromeProc.kill('SIGKILL');
  }
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
