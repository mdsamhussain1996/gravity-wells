import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = '/Users/newtonuser/.gemini/antigravity-ide/brain/3d548fb5-2b76-41d6-95e2-088477819984';
const PORT = 9222;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function capture() {
  console.log('Launching Chrome with CDP...');
  const chromeProcess = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    'about:blank'
  ]);

  await delay(1200);

  try {
    const versionInfo = await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
    const targets = await fetchJson(`http://127.0.0.1:${PORT}/json`);
    const pageTarget = targets.find(t => t.type === 'page');

    if (!pageTarget) throw new Error('No page target found');

    const wsUrl = pageTarget.webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);

    await new Promise(res => {
      ws.onopen = res;
      ws.addEventListener('open', res);
    });
    console.log('Connected to Chrome WebSocket');

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = event => {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            ws.removeEventListener('message', handler);
            if (msg.error) reject(msg.error);
            else resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    async function screenshot(filename, width = 1280, height = 720, mobile = false) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 2,
        mobile
      });
      await delay(500);
      const res = await send('Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(res.data, 'base64');
      const outPath = path.join(ARTIFACT_DIR, filename);
      fs.writeFileSync(outPath, buffer);
      console.log(`Saved screenshot: ${outPath} (${buffer.length} bytes)`);
    }

    // 1. Navigate to game
    await send('Page.navigate', { url: 'http://localhost:8096/' });
    await delay(1500);

    // Capture Title Screen
    await screenshot('phase1_title_screen.png', 1280, 720);

    // 2. Start Level 1
    await send('Runtime.evaluate', {
      expression: `
        document.getElementById('btn-start-game').click();
      `
    });
    await delay(600);
    await screenshot('phase1_level1_gameplay.png', 1280, 720);

    // 3. Load Level 2 (Slingshot 101 with planet)
    await send('Runtime.evaluate', {
      expression: `
        if (window.__gw) {
          window.__gw.startLevel(1);
        }
      `
    });
    await delay(600);
    await screenshot('phase1_level2_slingshot.png', 1280, 720);

    // 4. Load Level 3 (Custom Orbit with dotted allowed zone & inventory tray)
    await send('Runtime.evaluate', {
      expression: `
        if (window.__gw) {
          window.__gw.startLevel(2);
        }
      `
    });
    await delay(600);
    await screenshot('phase1_level3_placement.png', 1280, 720);

    // 5. Mobile Landscape (844 x 390)
    await screenshot('phase1_mobile_landscape.png', 844, 390, true);

    // 6. Mobile Portrait (390 x 844)
    await screenshot('phase1_mobile_portrait.png', 390, 844, true);

    ws.close();
    chromeProcess.kill();
    console.log('Capture finished successfully!');
  } catch (err) {
    console.error('Error in capture:', err);
    chromeProcess.kill();
  }
}

capture();
