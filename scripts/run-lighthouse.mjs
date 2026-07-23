import { spawn } from 'node:child_process';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

const port = Number(process.env.LIGHTHOUSE_PORT ?? 4321);
const origin = `http://127.0.0.1:${port}`;
const repository = process.env.GITHUB_REPOSITORY ?? '';
const [owner = '', repo = ''] = repository.split('/');
const isUserSite = repo === `${owner}.github.io`;
const base = repo && !isUserSite ? `/${repo}/` : '/';
const targets = [{ label: '/', url: new URL(base, origin).href }];
const runCount = Number(process.env.LIGHTHOUSE_RUNS ?? (process.env.CI ? 3 : 1));
const performanceTarget = 0.9;
const qualityThresholds = {
  accessibility: 0.95,
  'best-practices': 0.95,
  seo: 0.95,
};
const categories = ['performance', ...Object.keys(qualityThresholds)];
const metricIds = [
  'first-contentful-paint',
  'largest-contentful-paint',
  'total-blocking-time',
  'cumulative-layout-shift',
  'speed-index',
];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

const server = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port), '--strict-port'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
  detached: process.platform !== 'win32',
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(targets[0].url);
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
  for (const target of targets) {
    const samples = Object.fromEntries(categories.map((category) => [category, []]));
    const clsSamples = [];

    for (let run = 1; run <= runCount; run++) {
      const result = await lighthouse(target.url, {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: categories,
        formFactor: 'mobile',
        screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false },
      });
      const scores = Object.fromEntries(
        Object.entries(result.lhr.categories).map(([key, category]) => [key, category.score ?? 0]),
      );
      for (const category of categories) samples[category].push(scores[category] ?? 0);
      clsSamples.push(result.lhr.audits['cumulative-layout-shift']?.numericValue ?? 0);
      const metrics = Object.fromEntries(metricIds.map((id) => [id, result.lhr.audits[id]?.displayValue ?? 'n/a']));
      console.log(`${target.label} run ${run}/${runCount}`, {
        scores: Object.fromEntries(Object.entries(scores).map(([key, score]) => [key, Math.round(score * 100)])),
        metrics,
      });
    }

    const scores = Object.fromEntries(categories.map((category) => [category, median(samples[category])]));
    const cls = median(clsSamples);
    console.log(`${target.label} median`, Object.fromEntries(Object.entries(scores).map(([key, score]) => [key, Math.round(score * 100)])));
    for (const [category, minimum] of Object.entries(qualityThresholds)) {
      if ((scores[category] ?? 0) < minimum) failures.push(`${target.label} ${category}: ${scores[category]} < ${minimum}`);
    }
    if (cls > 0.1) failures.push(`${target.label} CLS: ${cls} > 0.1`);
    if ((scores.performance ?? 0) < performanceTarget) {
      console.warn(`${target.label} performance advisory: ${scores.performance} < ${performanceTarget}; shared CI runners are not a stable performance lab.`);
    }
  }
  if (failures.length) throw new Error(failures.join('\n'));
} finally {
  chrome?.kill();
  if (process.platform === 'win32') server.kill('SIGTERM');
  else if (server.pid) {
    try { process.kill(-server.pid, 'SIGTERM'); } catch {}
  }
}
