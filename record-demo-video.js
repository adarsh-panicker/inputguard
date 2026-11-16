const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EXTENSION_PATH = path.resolve(__dirname, 'dist');
const OUTPUT_VIDEO = path.resolve(__dirname, 'assets', 'inputguard-demo.mp4');
const ARTIFACT_VIDEO = 'C:\\Users\\Adars\\.gemini\\antigravity\\brain\\2bca593e-0469-43d2-a148-ddc68c875bea\\inputguard-demo.mp4';

// Start local HTTP server for assets and demo files
function startServer(port = 3456) {
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
    server.listen(port, '127.0.0.1', () => {
      console.log(`Demo server running at http://127.0.0.1:${port}/`);
      resolve(server);
    });
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function typeRealistic(page, selector, text, delayMs = 60) {
  await page.focus(selector);
  for (const char of text) {
    await page.keyboard.type(char, { delay: delayMs + Math.random() * 20 });
  }
}

async function record() {
  const server = await startServer(3456);
  const baseUrl = 'http://127.0.0.1:3456';

  console.log('Spawning ffmpeg process to record MP4...');
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', '24',
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'medium',
    '-crf', '20',
    OUTPUT_VIDEO
  ]);

  ffmpeg.stderr.on('data', () => {}); // silence ffmpeg logs

  console.log('Launching Google Chrome for video recording...');
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

  // Start Screencast frame capture via CDP
  let isRecording = true;
  let lastFrame = null;

  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    everyNthFrame: 1
  });

  cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
    try {
      lastFrame = Buffer.from(data, 'base64');
      await cdp.send('Page.screencastFrameAck', { sessionId });
    } catch (_) {}
  });

  // Maintain steady 24 fps stream to ffmpeg regardless of static screen pauses
  const frameInterval = setInterval(() => {
    if (isRecording && lastFrame && ffmpeg.stdin.writable) {
      ffmpeg.stdin.write(lastFrame);
    }
  }, 1000 / 24);

  try {
    // SCENE 1: Landing Page (0:00 - 0:05.5)
    // Audio: "Every day, users accidentally leak sensitive data into untrusted web forms. Meet InputGuard..."
    console.log('Scene 1: Landing Page (0:00 - 0:05.5)...');
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle0' });
    await sleep(2000);
    await page.evaluate(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    });
    await sleep(3500);

    // SCENE 2: Navigate to Demo Sandbox (0:05.5 - 0:09.5)
    // Audio: "Let's test it on this simulated sketchy loan application."
    console.log('Scene 2: Demo Sandbox (0:05.5 - 0:09.5)...');
    await page.goto(`${baseUrl}/demo.html`, { waitUntil: 'networkidle0' });
    await page.addStyleTag({ path: path.resolve(__dirname, 'dist', 'content.css') });
    await page.addScriptTag({ path: path.resolve(__dirname, 'dist', 'content.js') });
    await sleep(4000);

    // SCENE 3: Type Safe Non-Sensitive Data (0:09.5 - 0:20.5)
    // Audio: "When I type standard details like my name or email, the fields stay neutral..."
    console.log('Scene 3: Typing safe inputs (0:09.5 - 0:20.5)...');
    await typeRealistic(page, '#nameInput', 'Johnathan Doe', 60);
    await sleep(1500);
    await typeRealistic(page, '#emailInput', 'john.doe@example.org', 60);
    await sleep(3500);

    // SCENE 4: The Red Alert - Typing SSN and Credit Card (0:20.5 - 0:36.0)
    // Audio: "Now watch what happens when I enter a Social Security Number or Credit Card..."
    console.log('Scene 4: Typing SSN & Credit Card (0:20.5 - 0:36.0)...');
    await typeRealistic(page, '#ssnInput', '123-45-6789', 75);
    await sleep(3000); // Red outline & on-device badge pop up

    await typeRealistic(page, '#ccInput', '4532 0150 1234 5678', 65);
    await sleep(5500); // Prominently hold both red danger badges on screen

    // SCENE 5: Show Popup Card overlay (0:36.0 - 0:41.0)
    // Audio: "Opening the extension popup shows Firebase AI Logic..."
    console.log('Scene 5: Showing Extension Popup (0:36.0 - 0:41.0)...');
    await page.goto('file:///' + path.resolve(__dirname, 'dist', 'popup.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
    await sleep(5000);

    // SCENE 6: Show Side Panel Security Audit Stream (0:41.0 - 0:44.0)
    // Audio: "In the side panel, anonymized security events sync in real time..."
    console.log('Scene 6: Showing Extension Side Panel (0:41.0 - 0:44.0)...');
    await page.goto('file:///' + path.resolve(__dirname, 'dist', 'sidepanel.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
    await sleep(3000);

    // SCENE 7: Return to Demo Sandbox for closing shot (0:44.0 - 0:48.9)
    // Audio: "InputGuard: true hybrid AI that proves privacy-critical intelligence belongs on-device. Thank you!"
    console.log('Scene 7: Closing shot on Demo Sandbox (0:44.0 - 0:48.9)...');
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
    await sleep(11900); // Hold final overview shot to reach exact 48.9s audio match

    console.log('Stopping recording...');
    isRecording = false;
    clearInterval(frameInterval);
    await cdp.send('Page.stopScreencast');
  } finally {
    clearInterval(frameInterval);
    await browser.close();
    server.close();
    ffmpeg.stdin.end();

    await new Promise((resolve) => {
      ffmpeg.on('close', () => {
        console.log(`Video encoded and saved to: ${OUTPUT_VIDEO}`);
        try {
          fs.copyFileSync(OUTPUT_VIDEO, ARTIFACT_VIDEO);
          console.log(`Also copied to artifact directory: ${ARTIFACT_VIDEO}`);
        } catch (_) {}
        resolve();
      });
    });
  }
}

record().catch(err => {
  console.error('Recording failed:', err);
  process.exit(1);
});
