import { spawn } from 'node:child_process';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

const origin = 'http://127.0.0.1:4321';
const routes = ['/'];
const thresholds = {
  performance: 0.9,
  accessibility: 0.95,
  'best-practices': 0.95,
  seo: 0.95,
};

const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
  detached: process.platform !== 'win32',
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Preview server không khởi động trong 30 giây.');
}

let chrome;
try {
  await waitForServer();
  chrome = await launch({
    chromePath: process.env.CHROME_PATH,
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
  });
  const failures = [];
  for (const route of routes) {
    const result = await lighthouse(`${origin}${route}`, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: Object.keys(thresholds),
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false },
    });
    const scores = Object.fromEntries(
      Object.entries(result.lhr.categories).map(([key, category]) => [key, category.score ?? 0]),
    );
    console.log(route, Object.fromEntries(Object.entries(scores).map(([key, score]) => [key, Math.round(score * 100)])));
    for (const [category, minimum] of Object.entries(thresholds)) {
      if ((scores[category] ?? 0) < minimum) failures.push(`${route} ${category}: ${scores[category]} < ${minimum}`);
    }
    const cls = result.lhr.audits['cumulative-layout-shift']?.numericValue ?? 0;
    if (cls > 0.1) failures.push(`${route} CLS: ${cls} > 0.1`);
  }
  if (failures.length) throw new Error(failures.join('\n'));
} finally {
  chrome?.kill();
  if (process.platform === 'win32') server.kill('SIGTERM');
  else if (server.pid) {
    try { process.kill(-server.pid, 'SIGTERM'); } catch {}
  }
}
