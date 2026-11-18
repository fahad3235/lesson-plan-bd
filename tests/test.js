'use strict';
/**
 * Lesson Plan BD — unit tests for js/core.js + js/data.js (pure logic, no DOM).
 * Hand-computed expected values (verified by hand before writing):
 *   2026-11-18 is a Wednesday (run context). Week starts Saturday 2026-11-14.
 *   weekDates('2026-11-18') = 14,15,16,17,18,19 Nov (Sat..Thu, Friday excluded)
 *   weekStartStr('2026-11-20') = '2026-11-14' (Friday belongs to the week that
 *     started the previous Saturday)
 *   weekStartStr('2026-11-15') = '2026-11-14' (Sunday -> previous Saturday)
 *   weekStartStr('2026-11-14') = '2026-11-14' (Saturday -> itself)
 *   weekdayIndex('2026-11-18') = 3 (0=Sun, 3=Wed)
 *   addDaysStr('2026-11-01', -1) = '2026-10-31' (month boundary)
 *   addDaysStr('2026-12-31', 1) = '2027-01-01' (year boundary)
 *   isValidDateStr('2026-02-30') = false (Feb has 28 days in 2026)
 *   isValidDateStr('2026-02-29') = false (2026 is not a leap year)
 *   isValidDateStr('2024-02-29') = true (2024 is a leap year)
 *   toBengaliDigits('2026') = '২০২৬'; toBengaliDigits('45 min') = '৪৫ min'
 *   minutesLabel(45) = '45m'; minutesLabel(60) = '1h'; minutesLabel(90) = '1h 30m'
 *   minutesLabel(0) = '0m'; minutesLabel(135) = '2h 15m'
 *   weekStats: plans on 14th (40m, taught), 16th (45m, ready), 18th (90m, draft)
 *     -> total 3, taught 1, minutes 175; bySubject {Mathematics: 2, Science: 1}
 *   parseImport rejects bad JSON, non-array, bad subject, bad date, duplicate id.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../js/core.js');
const Data = require('../js/data.js');

const SUBJECTS = Data.SUBJECTS;

function plan(over) {
  return Object.assign({
    id: 'p1', subject: 'Mathematics', classLevel: 6, topic: 'Fractions',
    date: '2026-11-16', durationMin: 40, objectives: '', materials: '',
    activities: '', homework: '', status: 'draft',
  }, over);
}

test('digits', () => {
  assert.equal(Core.toBengaliDigits('2026'), '২০২৬');
  assert.equal(Core.toBengaliDigits('45 min'), '৪৫ min');
  assert.equal(Core.toBengaliDigits(7), '৭');
});

test('date parsing and validity', () => {
  assert.equal(Core.isValidDateStr('2026-11-18'), true);
  assert.equal(Core.isValidDateStr('2026-02-30'), false);
  assert.equal(Core.isValidDateStr('2026-02-29'), false);
  assert.equal(Core.isValidDateStr('2024-02-29'), true);
  assert.equal(Core.isValidDateStr('2026-13-01'), false);
  assert.equal(Core.isValidDateStr('18-11-2026'), false);
  assert.equal(Core.isValidDateStr(''), false);
  assert.equal(Core.isValidDateStr(null), false);
});

test('addDaysStr boundaries', () => {
  assert.equal(Core.addDaysStr('2026-11-01', -1), '2026-10-31');
  assert.equal(Core.addDaysStr('2026-12-31', 1), '2027-01-01');
  assert.equal(Core.addDaysStr('2026-11-18', 0), '2026-11-18');
  assert.equal(Core.addDaysStr('bad', 1), null);
});

test('weekdayIndex', () => {
  assert.equal(Core.weekdayIndex('2026-11-18'), 3); // Wednesday
  assert.equal(Core.weekdayIndex('2026-11-14'), 6); // Saturday
  assert.equal(Core.weekdayIndex('2026-11-20'), 5); // Friday
  assert.equal(Core.weekdayIndex('bad'), null);
});

test('weekStartStr — Saturday start', () => {
  assert.equal(Core.weekStartStr('2026-11-18'), '2026-11-14');
  assert.equal(Core.weekStartStr('2026-11-14'), '2026-11-14');
  assert.equal(Core.weekStartStr('2026-11-15'), '2026-11-14');
  assert.equal(Core.weekStartStr('2026-11-20'), '2026-11-14'); // Friday stays in its week
  assert.equal(Core.weekStartStr('2026-11-21'), '2026-11-21'); // next Saturday
  assert.equal(Core.weekStartStr('bad'), null);
});

test('weekDates — six school days Sat..Thu', () => {
  assert.deepEqual(Core.weekDates('2026-11-18'), [
    '2026-11-14', '2026-11-15', '2026-11-16',
    '2026-11-17', '2026-11-18', '2026-11-19',
  ]);
  assert.equal(Core.weekDates('bad').length, 0);
});

test('minutesLabel', () => {
  assert.equal(Core.minutesLabel(45), '45m');
  assert.equal(Core.minutesLabel(60), '1h');
  assert.equal(Core.minutesLabel(90), '1h 30m');
  assert.equal(Core.minutesLabel(0), '0m');
  assert.equal(Core.minutesLabel(135), '2h 15m');
});

test('validatePlan', () => {
  assert.deepEqual(Core.validatePlan(plan(), SUBJECTS), []);
  assert.deepEqual(Core.validatePlan(plan({ topic: '  ' }), SUBJECTS), ['topic']);
  assert.deepEqual(Core.validatePlan(plan({ topic: 'x'.repeat(121) }), SUBJECTS), ['topicLong']);
  assert.deepEqual(Core.validatePlan(plan({ date: '2026-02-30' }), SUBJECTS), ['date']);
  assert.deepEqual(Core.validatePlan(plan({ durationMin: 5 }), SUBJECTS), ['duration']);
  assert.deepEqual(Core.validatePlan(plan({ durationMin: 181 }), SUBJECTS), ['duration']);
  assert.deepEqual(Core.validatePlan(plan({ durationMin: 40.5 }), SUBJECTS), ['duration']);
  assert.deepEqual(Core.validatePlan(plan({ subject: 'Astrology' }), SUBJECTS), ['subject']);
  assert.deepEqual(Core.validatePlan(plan({ classLevel: 0 }), SUBJECTS), ['class']);
  assert.deepEqual(Core.validatePlan(plan({ classLevel: 13 }), SUBJECTS), ['class']);
  assert.deepEqual(Core.validatePlan(plan({ status: 'done' }), SUBJECTS), ['status']);
  assert.deepEqual(Core.validatePlan(null, SUBJECTS), ['plan']);
});

test('plansInRange + totalMinutes', () => {
  const ps = [
    plan({ id: 'a', date: '2026-11-14', durationMin: 40 }),
    plan({ id: 'b', date: '2026-11-19', durationMin: 45 }),
    plan({ id: 'c', date: '2026-11-21', durationMin: 90 }),
  ];
  assert.equal(Core.plansInRange(ps, '2026-11-14', '2026-11-19').length, 2);
  assert.equal(Core.totalMinutes(ps), 175);
});

test('weekStats', () => {
  const ps = [
    plan({ id: 'a', subject: 'Mathematics', date: '2026-11-14', durationMin: 40, status: 'taught' }),
    plan({ id: 'b', subject: 'Mathematics', date: '2026-11-16', durationMin: 45, status: 'ready' }),
    plan({ id: 'c', subject: 'Science', date: '2026-11-18', durationMin: 90, status: 'draft' }),
    plan({ id: 'd', subject: 'Science', date: '2026-11-21', durationMin: 30, status: 'draft' }),
  ];
  const ws = Core.weekStats(ps, '2026-11-18');
  assert.equal(ws.weekStart, '2026-11-14');
  assert.equal(ws.weekEnd, '2026-11-19');
  assert.equal(ws.total, 3);
  assert.equal(ws.taught, 1);
  assert.equal(ws.minutes, 175);
  assert.deepEqual(ws.bySubject, { Mathematics: 2, Science: 1 });
});

test('subjectCounts', () => {
  const ps = [plan({ subject: 'Science' }), plan({ subject: 'Science' }), plan({ subject: 'Bangla' })];
  assert.deepEqual(Core.subjectCounts(ps), { Science: 2, Bangla: 1 });
});

test('filterPlans', () => {
  const ps = [
    plan({ id: 'a', subject: 'Mathematics', classLevel: 6, topic: 'Fractions', status: 'draft' }),
    plan({ id: 'b', subject: 'Science', classLevel: 6, topic: 'Photosynthesis', status: 'taught' }),
    plan({ id: 'c', subject: 'Mathematics', classLevel: 8, topic: 'Algebra', status: 'ready' }),
  ];
  assert.equal(Core.filterPlans(ps, { q: 'frac' }).length, 1);
  assert.equal(Core.filterPlans(ps, { q: 'FRACTIONS' }).length, 1);
  assert.equal(Core.filterPlans(ps, { subject: 'Mathematics' }).length, 2);
  assert.equal(Core.filterPlans(ps, { classLevel: '6' }).length, 2);
  assert.equal(Core.filterPlans(ps, { status: 'taught' }).length, 1);
  assert.equal(Core.filterPlans(ps, { subject: 'Mathematics', status: 'ready' }).length, 1);
  assert.equal(Core.filterPlans(ps, { q: 'zzz' }).length, 0);
  assert.equal(Core.filterPlans(ps, {}).length, 3);
});

test('sortPlans by date then topic', () => {
  const ps = [
    plan({ id: 'a', date: '2026-11-18', topic: 'Zebra' }),
    plan({ id: 'b', date: '2026-11-16', topic: 'Apple' }),
    plan({ id: 'c', date: '2026-11-16', topic: 'Mango' }),
  ];
  assert.deepEqual(Core.sortPlans(ps).map((p) => p.id), ['b', 'c', 'a']);
});

test('parseImport — valid and invalid', () => {
  const good = JSON.stringify([plan({ id: 'x1' }), plan({ id: 'x2', subject: 'Science' })]);
  const res = Core.parseImport(good, SUBJECTS);
  assert.equal(res.ok, true);
  assert.equal(res.plans.length, 2);
  assert.equal(res.plans[0].topic, 'Fractions');

  assert.equal(Core.parseImport('{bad json', SUBJECTS).ok, false);
  assert.equal(Core.parseImport('{"a":1}', SUBJECTS).error, 'notArray');
  assert.equal(Core.parseImport(JSON.stringify([plan({ subject: 'Nope' })]), SUBJECTS).ok, false);
  assert.equal(Core.parseImport(JSON.stringify([plan({ date: '2026-02-30' })]), SUBJECTS).ok, false);
  assert.equal(Core.parseImport(JSON.stringify([plan({ id: 'd' }), plan({ id: 'd' })]), SUBJECTS).error, 'badId');
  assert.equal(Core.parseImport(JSON.stringify([plan({ id: '' })]), SUBJECTS).error, 'badId');
  assert.equal(Core.parseImport(JSON.stringify([42]), SUBJECTS).error, 'badPlan');
  assert.equal(Core.parseImport(JSON.stringify(new Array(501).fill(plan())), SUBJECTS).error, 'tooMany');
});

test('data — subjects and activity ideas', () => {
  assert.equal(Data.SUBJECTS.length, 10);
  assert.ok(Data.SUBJECTS.includes('Mathematics'));
  assert.ok(Data.SUBJECTS.includes('Bangla'));
  assert.deepEqual(Data.CLASS_LEVELS, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  for (const s of Data.SUBJECTS) {
    assert.equal(Data.ACTIVITY_IDEAS[s].length, 4, s);
    for (const idea of Data.ACTIVITY_IDEAS[s]) assert.ok(idea.length > 10, idea);
  }
  const I18n = require('../js/i18n.js');
  assert.equal(I18n.I18N.en.title, 'Lesson Plan BD');
  assert.equal(I18n.I18N.bn.title, 'পাঠ পরিকল্পনা বিডি');
  assert.equal(I18n.SUBJECT_BN.Mathematics, 'গণিত');
  assert.equal(I18n.WEEKDAY_EN.length, 7);
  assert.equal(I18n.WEEKDAY_BN.length, 7);
});
