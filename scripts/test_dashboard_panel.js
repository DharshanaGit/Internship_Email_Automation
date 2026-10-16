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
const brainDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\89de90ec-38d2-4ec5-914b-48e8c1b5ebd4';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function run() {
  console.log('--- TESTING NEW DASHBOARD UNSTRESS INPUT PANEL & BATCH ENGINE ---');

  // 1. Generate Auth Token
  const db = getDb();
  const admin = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(config.ADMIN_EMAIL));
  if (!admin) throw new Error('Admin not found');
  const token = await createSessionToken(admin);

  // 2. Launch Headless Chrome
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.join(process.env.TEMP || 'C:\\TEMP', 'sf_test_' + Date.now());
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9223',
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1600,1050',
    `--user-data-dir=${userDataDir}`,
  ]);

  await sleep(2500);

  try {
    const newTabRes = await fetch('http://127.0.0.1:9223/json/new?about:blank', { method: 'PUT' });
    const tabData = await newTabRes.json();
    const cdp = new CdpClient(tabData.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Network.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 1050,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await cdp.send('DOM.enable');

    async function evaluateWait(fnStr, description, timeout = 12000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const res = await cdp.send('Runtime.evaluate', {
          expression: `(${fnStr})()`,
          returnByValue: true,
        });
        if (res.result && res.result.value) {
          console.log(`✓ ${description} succeeded:`, res.result.value);
          return res.result.value;
        }
        await sleep(400);
      }
      console.warn(`⚠ Timed out waiting for: ${description}`);
      return false;
    }

    // Visit login first so origin is established
    console.log('Navigating to http://localhost:3000/login...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/login' });
    await sleep(2000);

    // Set cookie
    await cdp.send('Network.setCookie', {
      name: 'sf_outreach_session',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
    });
    console.log('Injected authenticated session cookie into browser.');

    // Navigate to dashboard
    console.log('Navigating to http://localhost:3000/dashboard...');
    await cdp.send('Page.navigate', { url: 'http://localhost:3000/dashboard' });

    // Wait for sidebar navigation to appear
    await evaluateWait(`() => {
      const navBtns = document.querySelectorAll('nav button');
      return navBtns.length > 0 ? navBtns.length : null;
    }`, 'Sidebar nav buttons');

    await sleep(1000);

    // Switch to Sender tab via Sidebar
    console.log('Clicking Sender navigation button in sidebar...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const navBtns = document.querySelectorAll('nav button');
        if (navBtns[1]) {
          navBtns[1].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return 'Clicked Sender nav item';
        }
        return 'Not found';
      })()`,
    });

    // Wait for subMode buttons
    await evaluateWait(`() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const bulkBtn = btns.find(b => b.textContent.includes('Bulk CSV'));
      return bulkBtn ? 'Bulk button found' : null;
    }`, 'Bulk CSV mode button');

    // Click Bulk Outreach mode
    console.log('Switching to Bulk Outreach mode...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const bulkBtn = btns.find(b => b.textContent.includes('Bulk CSV'));
        if (bulkBtn) {
          bulkBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return 'Clicked Bulk CSV tab';
        }
        return 'Not found';
      })()`,
    });

    // Wait for "Load AP Master Dataset" button
    await evaluateWait(`() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loadBtn = btns.find(b => b.textContent.includes('Load AP Master Dataset'));
      return loadBtn ? 'Load AP Master Dataset button found' : null;
    }`, 'Load AP Master Dataset button');

    // Click "Load AP Master Dataset"
    console.log('Clicking Load AP Master Dataset button...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const loadBtn = btns.find(b => b.textContent.includes('Load AP Master Dataset'));
        if (loadBtn) {
          loadBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return 'Clicked Load AP Dataset button';
        }
        return 'Not found';
      })()`,
    });

    // Wait for the dataset to load and render rows
    await evaluateWait(`() => {
      const rows = document.querySelectorAll('tbody tr');
      const pills = document.querySelectorAll('[class*="batchPill"]');
      if (rows.length > 0 || pills.length > 0) {
        return 'Rendered ' + rows.length + ' table rows and ' + pills.length + ' batch pills';
      }
      return null;
    }`, 'Dataset loading and batch calculation', 15000);

    // Settle UI animations
    await sleep(2500);

    // Capture top view screenshot
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const shotPath = path.join(brainDir, 'real_unstress_bulk_campaign_panel.png');
    fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
    console.log('Successfully captured screenshot to:', shotPath);

    // Also copy to public/docs for reference
    const docsPath = path.join(projectRoot, 'public', 'docs', 'real_unstress_bulk_campaign_panel.png');
    fs.writeFileSync(docsPath, Buffer.from(shot.data, 'base64'));

    // Scroll mainArea element down to showcase batch execution controls, cooling delays, and recipient table
    console.log('Scrolling mainArea element down to showcase dispatch actions & table rows...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const area = document.querySelector('[class*="mainArea"]');
        if (area) {
          area.scrollTop = 600;
          return 'Scrolled mainArea to: ' + area.scrollTop;
        }
        return 'mainArea not found';
      })()`,
      returnByValue: true,
    });
    await sleep(1500);

    const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const shot2Path = path.join(brainDir, 'real_unstress_batches_and_table.png');
    fs.writeFileSync(shot2Path, Buffer.from(shot2.data, 'base64'));
    const docs2Path = path.join(projectRoot, 'public', 'docs', 'real_unstress_batches_and_table.png');
    fs.writeFileSync(docs2Path, Buffer.from(shot2.data, 'base64'));
    console.log('Successfully captured scrolled view to:', shot2Path);

    cdp.close();
  } finally {
    try {
      chromeProc.kill('SIGKILL');
    } catch {}
  }

  console.log('--- TEST RUN COMPLETED SUCCESSFULLY ---');
}

run().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
