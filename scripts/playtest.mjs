// End-to-end play-test in a real browser (Chromium via Playwright).
//
//   npm run playtest                 # starts the Vite dev server itself, plays 2 quarters, then an ending
//   PLAYTEST_URL=http://... npm run playtest   # use a server that is already running
//   QUARTERS=3 npm run playtest
//
// Plays the full loop at 390x844: plan (slider, observers), live quarter (2x speed, swipe and tap
// cards), desk (all three stamps), own report with inflation, reckoning. Fails on any console
// error or page error. Screenshots go to docs/screenshots/. A final fast run steers the province
// into ruin to check the epitaph and "Start again".
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = join(root, 'docs', 'screenshots');
mkdirSync(shots, { recursive: true });
const QUARTERS = Number(process.env.QUARTERS ?? 2);
const PORT = Number(process.env.PLAYTEST_PORT ?? 5199);

const log = (...a) => console.log('[playtest]', ...a);
const errors = [];

async function startServer() {
  if (process.env.PLAYTEST_URL) return { url: process.env.PLAYTEST_URL, stop: () => {} };
  // Run Vite's own entry with node (not through npx) so that stopping it really stops the server.
  const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(
    process.execPath,
    [vite, '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('vite did not start')), 30000);
    child.stdout.on('data', (d) => {
      if (String(d).includes('Local:')) {
        clearTimeout(t);
        resolve();
      }
    });
    child.on('exit', (c) => reject(new Error(`vite exited ${c}`)));
  });
  return { url: `http://127.0.0.1:${PORT}/`, stop: () => child.kill() };
}

function attach(page) {
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
}

const phase = (page) => page.getByTestId('phase');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function press(page, label, key, times = 1, exact = false) {
  const el = page.getByLabel(label, { exact }).first();
  await el.focus();
  for (let i = 0; i < times; i++) await page.keyboard.press(key);
}

async function openPlace(page, id) {
  await page.getByTestId(`place-${id}`).click();
  await page.getByTestId('plan-sheet').waitFor();
  await sleep(450);
}
const closeSheet = (page) => page.getByRole('button', { name: /close plan sheet/i }).click();

async function planQuarter(page, q, first) {
  // A modest tweak each quarter: nudge Kolos' quota up and wage up, post two observers.
  await openPlace(page, 'kolos');
  await press(page, 'Quarterly quota', 'ArrowRight', 3);
  await press(page, 'Wage per household', 'ArrowRight', 2);
  const kolosObs = page.getByTestId('observer-toggle');
  await kolosObs.click();
  await closeSheet(page);
  await openPlace(page, q % 2 ? 'oblastgrad' : 'dalniy');
  await page.getByTestId('observer-toggle').click();
  if (first) {
    await sleep(300);
    await page.screenshot({ path: join(shots, 'sheet-plan.png') });
  }
  await closeSheet(page);
  await sleep(500);
  if (first) await page.screenshot({ path: join(shots, 'map-plan.png') });
}

async function swipe(page, dir) {
  const card = page.getByTestId('card').locator('.card');
  const box = await card.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dir * 60, y, { steps: 6 });
  await page.screenshot({ path: join(shots, 'card-swipe.png') });
  await page.mouse.move(x + dir * 150, y, { steps: 6 });
  await page.mouse.up();
}

/** At normal speed a week should last about 75 s / 13 = 5.8 s. Sample one week with no card in it. */
async function checkWeekLength(page) {
  let lastWeek = Number(/week (\d+)/i.exec(await phase(page).innerText())?.[1] ?? 0);
  let since = Date.now();
  const deadline = Date.now() + 40000;
  while (Date.now() < deadline) {
    if (await page.getByTestId('card').count()) {
      await sleep(650);
      await page
        .getByTestId('card-right')
        .click({ timeout: 3000 })
        .catch(() => {});
      await sleep(400);
      since = Date.now();
      lastWeek = Number(/week (\d+)/i.exec(await phase(page).innerText())?.[1] ?? lastWeek);
      continue;
    }
    const wk = Number(/week (\d+)/i.exec(await phase(page).innerText())?.[1] ?? lastWeek);
    if (wk === lastWeek + 1) {
      const dt = Date.now() - since;
      log(
        `one week took ${(dt / 1000).toFixed(1)} s at 1x (13 weeks is about ${((dt * 13) / 1000).toFixed(0)} s)`,
      );
      if (dt < 4800 || dt > 6800) throw new Error(`a week should take about 5.8 s, took ${dt} ms`);
      return;
    }
    await sleep(40);
  }
  throw new Error('no clean week observed');
}

async function liveQuarter(page, q) {
  const first = q === 1;
  await page.getByTestId('begin').click();
  await page.getByTestId('pause').waitFor();
  if (first) await checkWeekLength(page);
  await page.getByTestId('speed').click();
  let cards = 0;
  let shotLive = q > 2;
  let shotCard = !first;
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (await page.getByTestId('desk').count()) break;
    if (await page.getByTestId('card').count()) {
      await sleep(650); // let it slide in
      if (!shotCard) {
        await page.screenshot({ path: join(shots, 'card.png') });
        shotCard = true;
        await swipe(page, -1);
      } else if (cards % 2) {
        await page.getByTestId('card-left').click();
      } else {
        await page.getByTestId('card-right').click();
      }
      cards += 1;
      await sleep(450);
      continue;
    }
    if (!shotLive && (await page.locator('[data-train]').count()) >= 2) {
      await sleep(1200);
      await page.screenshot({
        path: join(shots, first ? 'live-quarter.png' : `live-quarter-q${q}.png`),
      });
      shotLive = true;
    }
    await sleep(200);
  }
  await page.getByTestId('desk').waitFor({ timeout: 5000 });
  log(`quarter played, ${cards} cards answered`);
  return cards;
}

async function deskPhase(page, first, inflateKeys) {
  const count = await page.getByTestId('desk-count').innerText();
  const total = Number(/of (\d+)/.exec(count)?.[1] ?? 5);
  const order = ['approve', 'reject', 'audit', 'approve', 'approve'];
  for (let i = 0; i < total; i++) {
    await page.getByTestId('report-form').waitFor();
    if (first && i === 0) {
      await sleep(3600); // let the typewriter finish
      await page.screenshot({ path: join(shots, 'desk.png') });
      await page.getByTestId('report-form').scrollIntoViewIfNeeded();
    }
    if (first && i === 1) {
      await sleep(3200);
      await page.locator('.docs').scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(shots, 'desk-documents.png') });
    }
    const pick = order[i % order.length];
    const stamp = page.getByTestId(`stamp-${pick}`);
    if (await stamp.isDisabled()) await page.getByTestId('stamp-approve').click();
    else await stamp.click();
    await page.getByTestId('ink-mark').waitFor();
    await sleep(500);
    if (first && i === 0) await page.screenshot({ path: join(shots, 'desk-stamped.png') });
    await sleep(1100);
  }
  await page.getByTestId('own-report').waitFor();
  await press(page, 'Inflate the figures', 'ArrowRight', inflateKeys);
  if (first) await page.screenshot({ path: join(shots, 'own-report.png') });
  await page.getByTestId('send-up').click();
}

async function reckoning(page, first) {
  await page.getByTestId('reckoning').waitFor();
  await sleep(1800);
  if (first) await page.screenshot({ path: join(shots, 'reckoning.png') });
  await page.getByTestId('continue').click();
}

async function mainRun(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  attach(page);
  await page.goto(`${url}?seed=1234`);
  await page.getByRole('button', { name: /take up your post/i }).click();
  await phase(page).waitFor();
  for (let q = 1; q <= QUARTERS; q++) {
    log(`quarter ${q}: planning`);
    const first = q === 1;
    await planQuarter(page, q, first);
    await liveQuarter(page, q);
    log(`quarter ${q}: desk`);
    await deskPhase(page, first, q === 1 ? 12 : 30);
    await reckoning(page, first);
    const ph = await phase(page).innerText();
    if (!/planning/i.test(ph)) throw new Error(`expected planning after quarter ${q}, got ${ph}`);
  }
  await page.screenshot({ path: join(shots, `map-plan-q${QUARTERS + 1}.png`) });
  await browser.close();
}

/** Ruin the province quickly: lowest wages, dearest shops, fast weeks. */
async function endingRun(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  attach(page);
  await page.goto(`${url}?seed=1234&tickms=150`);
  await page.getByRole('button', { name: /take up your post/i }).click();
  for (let q = 1; q <= 14; q++) {
    if (q === 1) {
      for (const id of ['lesnoy', 'kolos', 'stal', 'krasny', 'zarya']) {
        await openPlace(page, id);
        await press(page, 'Wage per household', 'Home');
        await closeSheet(page);
      }
      await openPlace(page, 'dalniy');
      await press(page, 'Grain', 'End', 1, true);
      await press(page, 'Consumer goods', 'End', 1, true);
      await closeSheet(page);
    }
    await page.getByTestId('begin').click();
    for (;;) {
      if (await page.getByTestId('epitaph').count()) break;
      if (await page.getByTestId('desk').count()) break;
      if (await page.getByTestId('card').count()) {
        await sleep(500);
        await page
          .getByTestId('card-right')
          .click({ timeout: 3000 })
          .catch(() => {});
      }
      await sleep(100);
    }
    if (await page.getByTestId('epitaph').count()) break;
    await deskPhase(page, false, 30);
    await page.getByTestId('reckoning').waitFor();
    await sleep(1600);
    await page.getByTestId('continue').click();
    if (await page.getByTestId('epitaph').count()) break;
    await phase(page).waitFor();
  }
  await page.getByTestId('epitaph').waitFor({ timeout: 10000 });
  await sleep(400);
  await page.screenshot({ path: join(shots, 'epitaph.png') });
  await page.getByTestId('restart').click();
  await page.getByTestId('begin').waitFor();
  log('ending run: epitaph shown and restart works');
  await browser.close();
}

const server = await startServer();
try {
  await mainRun(server.url);
  await endingRun(server.url);
} finally {
  server.stop();
}
if (errors.length) {
  console.error(`[playtest] FAILED with ${errors.length} browser error(s):`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
log(`OK: ${QUARTERS} quarters played end to end and the ending reached, with no console errors.`);
