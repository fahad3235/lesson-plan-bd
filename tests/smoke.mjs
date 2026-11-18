'use strict';
/**
 * Lesson Plan BD — headless-Chrome smoke test (raw CDP, no deps).
 * Drives the cached headless_shell-1187 over file:// and asserts live behaviour.
 * Usage: node tests/smoke.mjs
 * Requires: ~/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SHELL = path.join(os.homedir(), '.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell');
const PROFILE = '/tmp/lpbd-profile';
const PAGE_URL = 'file://' + path.resolve(import.meta.dirname, '..', 'index.html');
const PORT = 9335;

let passed = 0;
let failed = 0;
const failures = [];
const consoleErrors = [];
const pageExceptions = [];

function check(name, cond, extra) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failed++; failures.push(name + (extra ? ' — ' + extra : '')); console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

async function main() {
  if (!fs.existsSync(SHELL)) throw new Error('headless_shell not found at ' + SHELL);
  fs.rmSync(PROFILE, { recursive: true, force: true });
  const chrome = spawn(SHELL, [
    '--headless', '--no-sandbox', '--disable-gpu',
    '--user-data-dir=' + PROFILE,
    '--remote-debugging-port=' + PORT,
    'about:blank',
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 40 && !wsUrl; i++) {
    await sleep(250);
    try {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/version');
      const j = await res.json();
      wsUrl = j.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
  }
  if (!wsUrl) throw new Error('CDP did not come up');

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const listeners = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method) for (const fn of listeners) fn(m);
  };
  let pageWs = null;
  listeners.push((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      pageExceptions.push(JSON.stringify(m.params.exceptionDetails).slice(0, 300));
    }
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
      consoleErrors.push(m.params.type + ': ' + (m.params.args || []).map((a) => a.value || a.description || '').join(' ').slice(0, 200));
    }
  });

  try {
    const list = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
    const page = list.find((t) => t.type === 'page');
    pageWs = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { pageWs.onopen = res; pageWs.onerror = rej; });
    let pId = 0;
    const pPending = new Map();
    pageWs.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pPending.has(m.id)) {
        const { res, rej } = pPending.get(m.id);
        pPending.delete(m.id);
        if (m.error) rej(new Error(JSON.stringify(m.error)));
        else res(m.result);
      } else if (m.method) {
        for (const fn of listeners) fn(m);
      }
    };
    const psend = (method, params) => new Promise((res, rej) => {
      const id = ++pId;
      pPending.set(id, { res, rej });
      pageWs.send(JSON.stringify({ id, method, params: params || {} }));
    });
    const peval = async (expression) => {
      const r = await psend('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('page exception: ' + JSON.stringify(r.exceptionDetails).slice(0, 500));
      return r.result ? r.result.value : undefined;
    };

    await psend('Page.enable');
    await psend('Runtime.enable');
    await psend('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await psend('Page.navigate', { url: PAGE_URL });
    await sleep(1200);

    console.log('== load ==');
    check('title', await peval('document.title') === 'Lesson Plan BD — Weekly Planner for Teachers');
    check('window.__app present', await peval('!!window.__app && !!window.LessonCore && !!window.LessonData && !!window.LessonI18n'));
    check('header text', (await peval(`document.querySelector('h1').textContent`)) === 'Lesson Plan BD');
    check('6 day columns render (Sat..Thu)', (await peval(`document.querySelectorAll('.day-col').length`)) === 6);
    check('friday note present', (await peval(`document.querySelector('.friday-note').textContent`)).includes('Friday'));
    check('stat total = 0', (await peval(`document.getElementById('statTotal').textContent`)) === '0');
    check('empty state in week view', (await peval(`document.querySelectorAll('.day-col .muted').length`)) === 6);
    check('10 subjects in form select', (await peval(`document.getElementById('fSubject').options.length`)) === 10);
    check('12 classes in form select', (await peval(`document.getElementById('fClass').options.length`)) === 12);
    check('4 activity ideas for default subject', (await peval(`document.querySelectorAll('.idea-chip').length`)) === 4);

    console.log('== add plan ==');
    check('add plan -> saved message', await peval(`
      (() => {
        window.__app.showTab('new');
        document.getElementById('fSubject').value = 'Mathematics';
        document.getElementById('fClass').value = '6';
        document.getElementById('fTopic').value = 'Fractions — addition';
        document.getElementById('fDate').value = '2026-11-16';
        document.getElementById('fDuration').value = '40';
        document.getElementById('fObjectives').value = 'Add fractions with the same denominator';
        document.getElementById('fStatus').value = 'ready';
        document.getElementById('saveBtn').click();
        return document.getElementById('formMsg').textContent; })()` ) === 'Plan saved.');
    check('stat total = 1', (await peval(`document.getElementById('statTotal').textContent`)) === '1');
    check('week view shows 1 card', await peval(`
      (() => { window.__app.showTab('week'); return document.querySelectorAll('#weekGrid .plan-card').length; })()` ) === 1);
    check('card shows topic', (await peval(`document.querySelector('.plan-topic').textContent`)) === 'Fractions — addition');

    console.log('== validation ==');
    check('empty topic rejected', await peval(`
      (() => {
        window.__app.showTab('new');
        document.getElementById('fTopic').value = '';
        document.getElementById('saveBtn').click();
        return document.getElementById('formMsg').textContent; })()` ) === 'Enter a topic.');
    check('bad duration rejected', await peval(`
      (() => {
        document.getElementById('fTopic').value = 'Bad duration plan';
        document.getElementById('fDuration').value = '5';
        document.getElementById('saveBtn').click();
        return document.getElementById('formMsg').textContent; })()` ) === 'Duration must be 10–180 minutes.');
    check('still 1 plan after rejections', (await peval(`document.getElementById('statTotal').textContent`)) === '1');

    console.log('== second plan + filters ==');
    await peval(`
      (() => {
        document.getElementById('fSubject').value = 'Science';
        document.getElementById('fClass').value = '6';
        document.getElementById('fTopic').value = 'Photosynthesis';
        document.getElementById('fDate').value = '2026-11-18';
        document.getElementById('fDuration').value = '45';
        document.getElementById('fStatus').value = 'draft';
        document.getElementById('saveBtn').click(); })()`);
    check('stat total = 2', (await peval(`document.getElementById('statTotal').textContent`)) === '2');
    check('search "photo" -> 1 card', await peval(`
      (() => { window.__app.showTab('plans');
        const i = document.getElementById('searchInput'); i.value = 'photo';
        i.dispatchEvent(new Event('input', { bubbles: true }));
        return document.querySelectorAll('#plansList .plan-card').length; })()` ) === 1);
    check('subject filter Mathematics -> 1 card', await peval(`
      (() => { const i = document.getElementById('searchInput'); i.value = '';
        i.dispatchEvent(new Event('input', { bubbles: true }));
        const s = document.getElementById('filterSubject'); s.value = 'Mathematics';
        s.dispatchEvent(new Event('change', { bubbles: true }));
        return document.querySelectorAll('#plansList .plan-card').length; })()` ) === 1);
    check('status filter draft -> 1 card', await peval(`
      (() => { const s = document.getElementById('filterSubject'); s.value = 'all';
        s.dispatchEvent(new Event('change', { bubbles: true }));
        const t = document.getElementById('filterStatus'); t.value = 'draft';
        t.dispatchEvent(new Event('change', { bubbles: true }));
        return document.querySelectorAll('#plansList .plan-card').length; })()` ) === 1);
    check('nonsense search -> empty state', await peval(`
      (() => { const t = document.getElementById('filterStatus'); t.value = 'all';
        t.dispatchEvent(new Event('change', { bubbles: true }));
        const i = document.getElementById('searchInput'); i.value = 'zzzqqq';
        i.dispatchEvent(new Event('input', { bubbles: true }));
        return !!document.querySelector('#plansList .empty'); })()` ) === true);
    await peval(`(() => { const i = document.getElementById('searchInput'); i.value = '';
      i.dispatchEvent(new Event('input', { bubbles: true })); })()`);

    console.log('== mark taught + duplicate + delete ==');
    check('mark taught works', await peval(`
      (() => { const cards = document.querySelectorAll('#plansList .plan-card');
        const btns = cards[0].querySelectorAll('.plan-actions .btn-small');
        btns[2].click();
        return document.querySelectorAll('#plansList .plan-card')[0].querySelector('.plan-status').textContent; })()` ) === 'Taught');
    check('stat taught = 1', (await peval(`document.getElementById('statTaught').textContent`)) === '1');
    check('duplicate -> 3 plans', await peval(`
      (() => { const card = document.querySelectorAll('#plansList .plan-card')[0];
        card.querySelectorAll('.plan-actions .btn-small')[1].click();
        return document.getElementById('statTotal').textContent; })()` ) === '3');
    check('duplicate opens edit mode', (await peval(`document.getElementById('saveBtn').textContent`)) === 'Update plan');
    await peval(`document.getElementById('cancelEditBtn').click();`);
    check('cancel edit restores save button', (await peval(`document.getElementById('saveBtn').textContent`)) === 'Save plan');

    console.log('== persistence across reload ==');
    await psend('Page.reload', { ignoreCache: true });
    await sleep(1000);
    check('3 plans survive reload', (await peval(`document.getElementById('statTotal').textContent`)) === '3');

    console.log('== activity idea insert ==');
    check('idea chip appends to activities', await peval(`
      (() => { window.__app.showTab('new');
        document.getElementById('fSubject').value = 'Mathematics';
        document.getElementById('fSubject').dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('fActivities').value = '';
        document.querySelector('.idea-chip').click();
        return document.getElementById('fActivities').value.length > 10; })()` ) === true);

    console.log('== Bengali toggle ==');
    check('BN toggle changes title', await peval(`
      (() => { document.getElementById('langBtn').click();
        return document.querySelector('h1').textContent; })()` ) === 'পাঠ পরিকল্পনা বিডি');
    check('BN stat total uses Bengali digits', (await peval(`document.getElementById('statTotal').textContent`)) === '৩');
    check('BN toggle back to EN', await peval(`
      (() => { document.getElementById('langBtn').click();
        return document.querySelector('h1').textContent; })()` ) === 'Lesson Plan BD');

    console.log('== export / import / erase ==');
    check('export fills box with 3 plans', await peval(`
      (() => { window.__app.showTab('data');
        document.getElementById('exportBtn').click();
        const v = JSON.parse(document.getElementById('dataBox').value);
        return v.length; })()` ) === 3);
    check('bad import rejected, data intact', await peval(`
      (() => { document.getElementById('dataBox').value = 'not json';
        document.getElementById('importBtn').click();
        return document.getElementById('dataMsg').textContent; })()` ) === 'Import failed: file is not a valid plan list.');
    check('erase needs exact DELETE', await peval(`
      (() => { document.getElementById('eraseInput').value = 'delete';
        document.getElementById('eraseBtn').click();
        return document.getElementById('dataMsg').textContent; })()` ) === 'Type DELETE exactly to erase.');
    check('erase-all works', await peval(`
      (() => { document.getElementById('eraseInput').value = 'DELETE';
        document.getElementById('eraseBtn').click();
        return document.getElementById('statTotal').textContent; })()` ) === '0');

    console.log('== 390px mobile ==');
    await psend('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(600);
    check('390px: no horizontal overflow', await peval(`document.documentElement.scrollWidth <= 391`));
    check('390px: week grid is 1 column', await peval(`
      getComputedStyle(document.querySelector('.week-grid')).gridTemplateColumns.split(' ').length`) === 1);
    await psend('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(400);

    console.log('== console / page errors ==');
    check('0 console errors/warnings', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 300));
    check('0 page exceptions', pageExceptions.length === 0, pageExceptions.join(' | ').slice(0, 300));
  } finally {
    if (pageWs) pageWs.close();
    ws.close();
    chrome.kill();
  }

  console.log(`\nSMOKE: ${passed} passed, ${failed} failed`);
  if (failed) { console.log('FAILURES:\n- ' + failures.join('\n- ')); process.exit(1); }
}

main().catch((e) => { console.error('SMOKE ERROR:', e.message); process.exit(1); });
