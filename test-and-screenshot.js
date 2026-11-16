const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EXTENSION_PATH = path.resolve(__dirname, 'dist');
const ARTIFACT_DIR = 'C:\\Users\\Adars\\.gemini\\antigravity\\brain\\2bca593e-0469-43d2-a148-ddc68c875bea\\screenshots';
const REPO_ASSETS_DIR = path.resolve(__dirname, 'assets', 'screenshots');

// Ensure output directories exist
[ARTIFACT_DIR, REPO_ASSETS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Simple static HTTP server for demo files
function startServer(port = 3456) {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '/demo') reqPath = '/demo.html';

    let filePath = path.join(__dirname, 'dist', 'public', reqPath);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, 'dist', reqPath);
    }
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, reqPath);
    }
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, 'public', reqPath);
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.svg': 'image/svg+xml',
        '.png': 'image/png'
      };
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`Local test server running at http://127.0.0.1:${port}/`);
      resolve(server);
    });
  });
}

async function run() {
  const server = await startServer(3456);
  const baseUrl = 'http://127.0.0.1:3456';

  console.log('Launching Google Chrome with InputGuard extension...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,920'
    ],
    defaultViewport: { width: 1280, height: 920 }
  });

  try {
    const page = await browser.newPage();

    page.on('console', msg => console.log('   [PAGE LOG]:', msg.text()));
    page.on('pageerror', err => console.log('   [PAGE ERR]:', err.message));

    // 1. Landing Page
    console.log('1. Navigating to landing page...');
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01-landing-page.png') });
    await page.screenshot({ path: path.join(REPO_ASSETS_DIR, '01-landing-page.png') });
    console.log('   Saved: 01-landing-page.png');

    // 2. Demo Sandbox - Initial State
    console.log('2. Navigating to Interactive Demo Sandbox...');
    await page.goto(`${baseUrl}/demo.html`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02-demo-initial.png') });
    await page.screenshot({ path: path.join(REPO_ASSETS_DIR, '02-demo-initial.png') });
    console.log('   Saved: 02-demo-initial.png');

    // 3. Test form input interactions with content script
    console.log('3. Testing inputs with on-device detection...');
    
    // Ensure content script is active in the test page
    await page.addStyleTag({ path: path.resolve(__dirname, 'dist', 'content.css') });
    await page.addScriptTag({ path: path.resolve(__dirname, 'dist', 'content.js') });

    await page.type('#nameInput', 'Johnathan Doe', { delay: 30 });
    await new Promise(r => setTimeout(r, 400));

    await page.type('#emailInput', 'john.doe@example.org', { delay: 30 });
    await new Promise(r => setTimeout(r, 400));

    // Type SSN -> triggers on-device detection & badge
    console.log('   Typing sensitive SSN (123-45-6789)...');
    await page.type('#ssnInput', '123-45-6789', { delay: 50 });
    await new Promise(r => setTimeout(r, 1500));

    // Type Credit Card
    console.log('   Typing credit card (4532 0150 1234 5678)...');
    await page.type('#ccInput', '4532 0150 1234 5678', { delay: 40 });
    await new Promise(r => setTimeout(r, 1500));

    // Check if badges were rendered in DOM
    const badgeCount = await page.evaluate(() => document.querySelectorAll('.inputguard-badge').length);
    console.log(`   Detected ${badgeCount} InputGuard badges injected into the DOM!`);

    // Capture the interactive detection state
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03-live-pii-detection.png') });
    await page.screenshot({ path: path.join(REPO_ASSETS_DIR, '03-live-pii-detection.png') });
    console.log('   Saved: 03-live-pii-detection.png');

    // 4. Test Extension Popup
    console.log('4. Capturing Extension Popup...');
    const popupPage = await browser.newPage();
    await popupPage.setViewport({ width: 360, height: 460 });
    const popupPath = 'file:///' + path.resolve(__dirname, 'dist', 'popup.html').replace(/\\/g, '/');
    await popupPage.goto(popupPath, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));
    await popupPage.screenshot({ path: path.join(ARTIFACT_DIR, '04-extension-popup.png') });
    await popupPage.screenshot({ path: path.join(REPO_ASSETS_DIR, '04-extension-popup.png') });
    console.log('   Saved: 04-extension-popup.png');

    // 5. Test Extension Side Panel
    console.log('5. Capturing Side Panel with live security audit stream...');
    const sidepanelPage = await browser.newPage();
    await sidepanelPage.setViewport({ width: 420, height: 580 });
    const sidepanelPath = 'file:///' + path.resolve(__dirname, 'dist', 'sidepanel.html').replace(/\\/g, '/');
    await sidepanelPage.goto(sidepanelPath, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));
    await sidepanelPage.screenshot({ path: path.join(ARTIFACT_DIR, '05-sidepanel-audit-log.png') });
    await sidepanelPage.screenshot({ path: path.join(REPO_ASSETS_DIR, '05-sidepanel-audit-log.png') });
    console.log('   Saved: 05-sidepanel-audit-log.png');

    console.log('\nAll test actions executed and screenshots captured successfully!');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
