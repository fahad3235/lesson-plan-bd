'use strict';
/**
 * Lesson Plan BD \u2014 pure logic (no DOM). Works in Node (module.exports)
 * and in the browser (window.LessonCore).
 *
 * Bangladesh school week: Saturday to Thursday (Friday is the weekly holiday).
 * Dates are plain YYYY-MM-DD strings, handled in UTC to avoid timezone drift.
 */
const BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];

function toBengaliDigits(value) {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

function pad2(n) { return String(n).padStart(2, '0'); }

function parseDate(s) {
  if (typeof s !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 ||
      d.getUTCDate() !== Number(m[3])) return null;
  return d;
}

function isValidDateStr(s) { return parseDate(s) !== null; }

function formatDate(d) {
  return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
}

function addDaysStr(s, n) {
  const d = parseDate(s);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() + n);
  return formatDate(d);
}

/** 0 = Sunday ... 6 = Saturday (UTC). */
function weekdayIndex(s) {
  const d = parseDate(s);
  return d ? d.getUTCDay() : null;
}

/** Saturday that starts the school week containing date s. */
function weekStartStr(s) {
  const d = parseDate(s);
  if (!d) return null;
  const sinceSaturday = (d.getUTCDay() + 1) % 7; // Sat -> 0, Sun -> 1, ..., Fri -> 6
  d.setUTCDate(d.getUTCDate() - sinceSaturday);
  return formatDate(d);
}

/** Six school days of the week: Saturday .. Thursday. */
function weekDates(s) {
  const start = weekStartStr(s);
  if (!start) return [];
  const out = [];
  for (let i = 0; i < 6; i++) out.push(addDaysStr(start, i));
  return out;
}

const STATUSES = ['draft', 'ready', 'taught'];
const MIN_DURATION = 10;
const MAX_DURATION = 180;

function validatePlan(p, subjects) {
  const errors = [];
  if (!p || typeof p !== 'object') return ['plan'];
  if (!subjects.includes(p.subject)) errors.push('subject');
  if (!Number.isInteger(p.classLevel) || p.classLevel < 1 || p.classLevel > 12) errors.push('class');
  if (typeof p.topic !== 'string' || p.topic.trim().length === 0) errors.push('topic');
  if (p.topic && p.topic.length > 120) errors.push('topicLong');
  if (!isValidDateStr(p.date)) errors.push('date');
  if (!Number.isInteger(p.durationMin) || p.durationMin < MIN_DURATION || p.durationMin > MAX_DURATION) errors.push('duration');
  if (!STATUSES.includes(p.status)) errors.push('status');
  for (const f of ['objectives', 'materials', 'activities', 'homework']) {
    if (p[f] !== undefined && typeof p[f] !== 'string') errors.push(f);
    if (typeof p[f] === 'string' && p[f].length > 2000) errors.push(f + 'Long');
  }
  return errors;
}

function minutesLabel(min) {
  const m = Math.max(0, Math.floor(min));
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? h + 'h' : h + 'h ' + r + 'm';
}

function plansInRange(plans, from, to) {
  return plans.filter((p) => p.date >= from && p.date <= to);
}

function totalMinutes(plans) {
  return plans.reduce((s, p) => s + (Number.isInteger(p.durationMin) ? p.durationMin : 0), 0);
}

function weekStats(plans, anchorDate) {
  const days = weekDates(anchorDate);
  const wk = plansInRange(plans, days[0], days[5]);
  const bySubject = {};
  for (const p of wk) bySubject[p.subject] = (bySubject[p.subject] || 0) + 1;
  return {
    weekStart: days[0],
    weekEnd: days[5],
    total: wk.length,
    taught: wk.filter((p) => p.status === 'taught').length,
    minutes: totalMinutes(wk),
    bySubject,
  };
}

function subjectCounts(plans) {
  const out = {};
  for (const p of plans) out[p.subject] = (out[p.subject] || 0) + 1;
  return out;
}

function filterPlans(plans, opts) {
  const q = (opts.q || '').trim().toLowerCase();
  return plans.filter((p) => {
    if (opts.subject && opts.subject !== 'all' && p.subject !== opts.subject) return false;
    if (opts.classLevel && opts.classLevel !== 'all' && p.classLevel !== Number(opts.classLevel)) return false;
    if (opts.status && opts.status !== 'all' && p.status !== opts.status) return false;
    if (q) {
      const hay = [p.topic, p.objectives || '', p.activities || '', p.subject].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function sortPlans(plans) {
  return [...plans].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.topic.localeCompare(b.topic)));
}

/**
 * Strict import: text must be a JSON array of plans; every plan must validate.
 * Returns { ok: true, plans } or { ok: false, error }.
 */
function parseImport(text, subjects) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: 'badJson' };
  }
  if (!Array.isArray(data)) return { ok: false, error: 'notArray' };
  if (data.length > 500) return { ok: false, error: 'tooMany' };
  const seen = new Set();
  const plans = [];
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'badPlan' };
    if (typeof raw.id !== 'string' || raw.id.length === 0 || seen.has(raw.id)) {
      return { ok: false, error: 'badId' };
    }
    seen.add(raw.id);
    const errors = validatePlan(raw, subjects);
    if (errors.length) return { ok: false, error: 'badPlan' };
    plans.push({
      id: raw.id,
      subject: raw.subject,
      classLevel: raw.classLevel,
      topic: raw.topic.trim(),
      date: raw.date,
      durationMin: raw.durationMin,
      objectives: raw.objectives || '',
      materials: raw.materials || '',
      activities: raw.activities || '',
      homework: raw.homework || '',
      status: raw.status,
    });
  }
  return { ok: true, plans };
}

function newPlanId() {
  return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

const LessonCore = {
  BN_DIGITS,
  toBengaliDigits,
  isValidDateStr,
  addDaysStr,
  weekdayIndex,
  weekStartStr,
  weekDates,
  STATUSES,
  MIN_DURATION,
  MAX_DURATION,
  validatePlan,
  minutesLabel,
  plansInRange,
  totalMinutes,
  weekStats,
  subjectCounts,
  filterPlans,
  sortPlans,
  parseImport,
  newPlanId,
};

if (typeof module !== 'undefined' && module.exports) module.exports = LessonCore;
if (typeof window !== 'undefined') window.LessonCore = LessonCore;
