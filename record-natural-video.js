const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EXTENSION_PATH = path.resolve(__dirname, 'dist');
const RAW_VIDEO = path.resolve(__dirname, 'assets', 'raw-natural.mp4');
const FINAL_NATURAL = path.resolve(__dirname, 'assets', 'inputguard-final-natural.mp4');
const ARTIFACT_NATURAL = 'C:\\Users\\Adars\\.gemini\\antigravity\\brain\\2bca593e-0469-43d2-a148-ddc68c875bea\\inputguard-final-natural.mp4';
const VOICEOVER_AUDIO = path.resolve(__dirname, 'assets', 'voiceover.m4a');

function startServer(port = 3457) {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '/demo') reqPath = '/demo.html';

    let filePath = path.join(__dirname, 'dist', 'public', reqPath);
    if (!fs.existsSync(filePath)) filePath = path.join(__dirname, 'dist', reqPath);
    if (!fs.existsSync(filePath)) filePath = path.join(__dirname, reqPath);
    if (!fs.existsSync(filePath)) filePath = path.join(__dirname, 'public', reqPath);

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
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function typeRealistic(page, selector, text, delayMs = 90) {
  await page.focus(selector);
  for (const char of text) {
    await page.keyboard.type(char, { delay: delayMs });
  }
}

async function run() {
  const server = await startServer(3457);
  const baseUrl = 'http://127.0.0.1:3457';

  console.log('Spawning ffmpeg process for natural 69s recording...');
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', '24',
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    RAW_VIDEO
  ]);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,820'
    ],
    defaultViewport: { width: 1280, height: 820 }
  });

  const page = await browser.newPage();
  const cdp = await page.target().createCDPSession();

  let isRecording = true;
  let lastFrame = null;

  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, everyNthFrame: 1 });

  cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
    try {
      lastFrame = Buffer.from(data, 'base64');
      await cdp.send('Page.screencastFrameAck', { sessionId });
    } catch (_) {}
  });

  const frameInterval = setInterval(() => {
    if (isRecording && lastFrame && ffmpeg.stdin.writable) {
      ffmpeg.stdin.write(lastFrame);
    }
  }, 1000 / 24);

  try {
    // 0:00 - 0:07.5: Landing Page
    console.log('Scene 1: Landing Page (0:00 - 0:07.5)...');
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle0' });
    await sleep(3500);
    await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'smooth' }));
    await sleep(4000);

    // 0:07.5 - 0:13.5: Transition to Sandbox
    console.log('Scene 2: Transition to Demo Sandbox (0:07.5 - 0:13.5)...');
    await page.goto(`${baseUrl}/demo.html`, { waitUntil: 'networkidle0' });
    await page.addStyleTag({ path: path.resolve(__dirname, 'dist', 'content.css') });
    await page.addScriptTag({ path: path.resolve(__dirname, 'dist', 'content.js') });
    await sleep(6000);

    // 0:13.5 - 0:29.0: Typing safe data (Name & Email)
    console.log('Scene 3: Typing safe inputs (0:13.5 - 0:29.0)...');
    await typeRealistic(page, '#nameInput', 'Johnathan Doe', 90);
    await sleep(3500);
    await typeRealistic(page, '#emailInput', 'john.doe@example.org', 85);
    await sleep(7000);

    // 0:29.0 - 0:51.5: Typing SSN & Credit Card (Red danger alerts & badges)
    console.log('Scene 4: Typing SSN & Credit Card (0:29.0 - 0:51.5)...');
    await typeRealistic(page, '#ssnInput', '123-45-6789', 110);
    await sleep(5500); // Prominent red danger outline and badge
    await typeRealistic(page, '#ccInput', '4532 0150 1234 5678', 95);
    await sleep(9500); // Hold both badges on screen while voice discusses on-device Gemini Nano

    // 0:51.5 - 0:58.5: Extension Popup
    console.log('Scene 5: Showing Extension Popup (0:51.5 - 0:58.5)...');
    await page.goto('file:///' + path.resolve(__dirname, 'dist', 'popup.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
    await sleep(7000);

    // 0:58.5 - 0:62.5: Side Panel Audit Log
    console.log('Scene 6: Showing Side Panel (0:58.5 - 0:62.5)...');
    await page.goto('file:///' + path.resolve(__dirname, 'dist', 'sidepanel.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
    await sleep(4000);

    // 0:62.5 - 0:69.5: Closing Sandbox shot
    console.log('Scene 7: Closing shot on Sandbox (0:62.5 - 0:69.5)...');
    await page.goto(`${baseUrl}/demo.html`, { waitUntil: 'networkidle0' });
    await page.addStyleTag({ path: path.resolve(__dirname, 'dist', 'content.css') });
    await page.addScriptTag({ path: path.resolve(__dirname, 'dist', 'content.js') });
    await page.evaluate(() => {
      const ssn = document.getElementById('ssnInput');
      const cc = document.getElementById('ccInput');
      const name = document.getElementById('nameInput');
      const email = document.getElementById('emailInput');
      name.value = 'Johnathan Doe';
      email.value = 'john.doe@example.org';
      ssn.value = '123-45-6789';
      cc.value = '4532 0150 1234 5678';
      ssn.dispatchEvent(new Event('input', { bubbles: true }));
      cc.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(7000);

    isRecording = false;
    clearInterval(frameInterval);
    await cdp.send('Page.stopScreencast');
  } finally {
    clearInterval(frameInterval);
    await browser.close();
    server.close();
    ffmpeg.stdin.end();

    await new Promise((resolve) => {
      ffmpeg.on('close', async () => {
        console.log('Raw video finished. Merging with original voiceover at natural speed...');
        const merge = spawn('ffmpeg', [
          '-y',
          '-i', RAW_VIDEO,
          '-i', VOICEOVER_AUDIO,
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-shortest',
          FINAL_NATURAL
        ]);
        merge.on('close', () => {
          try {
            fs.copyFileSync(FINAL_NATURAL, ARTIFACT_NATURAL);
          } catch (_) {}
          console.log(`Natural speed video created: ${FINAL_NATURAL}`);
          resolve();
        });
      });
    });
  }
}

run().catch(err => {
  console.error('Natural recording failed:', err);
  process.exit(1);
});
