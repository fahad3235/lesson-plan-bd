'use strict';
/* Lesson Plan BD \u2014 app wiring (DOM + localStorage). No network use. */
(function () {
  const Core = window.LessonCore;
  const Data = window.LessonData;
  const I18n = window.LessonI18n;
  const STORE_KEY = 'lesson-plan-bd:v1';

  const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH_BN = ['\u099c\u09be\u09a8\u09c1', '\u09ab\u09c7\u09ac', '\u09ae\u09be\u09b0\u09cd\u099a', '\u098f\u09aa\u09cd\u09b0\u09bf', '\u09ae\u09c7', '\u099c\u09c1\u09a8', '\u099c\u09c1\u09b2\u09be\u0987', '\u0986\u0997', '\u09b8\u09c7\u09aa', '\u0985\u0995\u09cd\u099f\u09cb', '\u09a8\u09ad\u09c7', '\u09a1\u09bf\u09b8\u09c7'];

  function todayStr() {
    const d = new Date();
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return { plans: [], lang: 'en' };
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.plans)) return { plans: [], lang: 'en' };
      const valid = data.plans.filter((p) => Core.validatePlan(p, Data.SUBJECTS).length === 0 && typeof p.id === 'string');
      return { plans: valid, lang: data.lang === 'bn' ? 'bn' : 'en' };
    } catch (e) { return { plans: [], lang: 'en' }; }
  }

  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify({ plans: state.plans, lang: state.lang }));
  }

  const stored = load();
  const state = {
    plans: stored.plans,
    lang: stored.lang,
    tab: 'week',
    weekAnchor: todayStr(),
    editingId: null,
    q: '', fSubject: 'all', fClass: 'all', fStatus: 'all',
  };

  function t(key) { return I18n.I18N[state.lang][key]; }
  function subjectName(s) { return state.lang === 'bn' ? (I18n.SUBJECT_BN[s] || s) : s; }
  function fmtNum(n) { return state.lang === 'bn' ? Core.toBengaliDigits(n) : String(n); }
  function fmtDate(ds) {
    const parts = ds.split('-');
    const y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
    const wd = Core.weekdayIndex(ds);
    const wdName = state.lang === 'bn' ? I18n.WEEKDAY_BN[wd] : I18n.WEEKDAY_EN[wd];
    const mon = state.lang === 'bn' ? MONTH_BN[m - 1] : MONTH_EN[m - 1];
    const day = state.lang === 'bn' ? Core.toBengaliDigits(d) : String(d);
    const year = state.lang === 'bn' ? Core.toBengaliDigits(y) : String(y);
    return wdName + ', ' + day + ' ' + mon + ' ' + year;
  }
  function fmtDateShort(ds) {
    const parts = ds.split('-');
    const m = Number(parts[1]), d = Number(parts[2]);
    const mon = state.lang === 'bn' ? MONTH_BN[m - 1] : MONTH_EN[m - 1];
    return (state.lang === 'bn' ? Core.toBengaliDigits(d) : String(d)) + ' ' + mon;
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  function statusLabel(s) {
    return s === 'draft' ? t('statusDraft') : s === 'ready' ? t('statusReady') : t('statusTaught');
  }

  /* ---------- plan card ---------- */
  function planCard(p) {
    const card = el('article', 'plan-card status-' + p.status);
    const head = el('div', 'plan-head');
    head.appendChild(el('span', 'plan-subject', subjectName(p.subject)));
    head.appendChild(el('span', 'plan-class', t('classLabel') + ' ' + fmtNum(p.classLevel)));
    card.appendChild(head);
    card.appendChild(el('h3', 'plan-topic', p.topic));
    const meta = el('div', 'plan-meta');
    meta.appendChild(el('span', '', fmtDateShort(p.date)));
    const dur = Core.minutesLabel(p.durationMin);
    meta.appendChild(el('span', '', state.lang === 'bn' ? Core.toBengaliDigits(dur) : dur));
    meta.appendChild(el('span', 'plan-status', statusLabel(p.status)));
    card.appendChild(meta);
    if (p.objectives) {
      const obj = el('p', 'plan-obj', p.objectives.split('\n').filter(Boolean)[0]);
      card.appendChild(obj);
    }
    const actions = el('div', 'plan-actions');
    const bEdit = el('button', 'btn btn-small', t('edit')); bEdit.type = 'button';
    bEdit.addEventListener('click', () => startEdit(p.id));
    const bDup = el('button', 'btn btn-small', t('dup')); bDup.type = 'button';
    bDup.addEventListener('click', () => duplicatePlan(p.id));
    const bMark = el('button', 'btn btn-small', p.status === 'taught' ? t('reopen') : t('markTaught')); bMark.type = 'button';
    bMark.addEventListener('click', () => toggleTaught(p.id));
    const bDel = el('button', 'btn btn-small btn-danger', t('del')); bDel.type = 'button';
    bDel.addEventListener('click', () => deletePlan(p.id));
    actions.append(bEdit, bDup, bMark, bDel);
    card.appendChild(actions);
    return card;
  }

  /* ---------- stats ---------- */
  function renderStats() {
    const ws = Core.weekStats(state.plans, state.weekAnchor);
    document.getElementById('statTotal').textContent = fmtNum(state.plans.length);
    document.getElementById('statWeek').textContent = fmtNum(ws.total);
    document.getElementById('statTaught').textContent = fmtNum(ws.taught);
    document.getElementById('statMinutes').textContent = fmtNum(ws.minutes);
    document.getElementById('weekLabel').textContent =
      fmtDateShort(ws.weekStart) + ' \u2013 ' + fmtDate(ws.weekEnd);
  }

  /* ---------- week view ---------- */
  function renderWeek() {
    renderStats();
    const wrap = document.getElementById('weekGrid');
    wrap.innerHTML = '';
    const days = Core.weekDates(state.weekAnchor);
    const today = todayStr();
    for (const ds of days) {
      const col = el('section', 'day-col' + (ds === today ? ' day-today' : ''));
      const h = el('h3', 'day-head', fmtDate(ds));
      col.appendChild(h);
      const todays = Core.sortPlans(state.plans.filter((p) => p.date === ds));
      if (!todays.length) col.appendChild(el('p', 'muted', t('noPlansDay')));
      for (const p of todays) col.appendChild(planCard(p));
      wrap.appendChild(col);
    }
    const fri = el('p', 'friday-note', t('fridayNote'));
    wrap.appendChild(fri);
  }

  /* ---------- all plans ---------- */
  function renderPlans() {
    const list = document.getElementById('plansList');
    list.innerHTML = '';
    const filtered = Core.sortPlans(Core.filterPlans(state.plans, {
      q: state.q, subject: state.fSubject, classLevel: state.fClass, status: state.fStatus,
    }));
    if (!state.plans.length) { list.appendChild(el('p', 'empty', t('noPlans'))); return; }
    if (!filtered.length) { list.appendChild(el('p', 'empty', t('noMatch'))); return; }
    for (const p of filtered) list.appendChild(planCard(p));
  }

  /* ---------- form ---------- */
  function fillSelects() {
    const sub = document.getElementById('fSubject');
    sub.innerHTML = '';
    for (const s of Data.SUBJECTS) {
      const o = document.createElement('option');
      o.value = s; o.textContent = subjectName(s); sub.appendChild(o);
    }
    const cls = document.getElementById('fClass');
    cls.innerHTML = '';
    for (const c of Data.CLASS_LEVELS) {
      const o = document.createElement('option');
      o.value = String(c); o.textContent = t('classLabel') + ' ' + fmtNum(c); cls.appendChild(o);
    }
    const st = document.getElementById('fStatus');
    st.innerHTML = '';
    for (const s of Core.STATUSES) {
      const o = document.createElement('option');
      o.value = s; o.textContent = statusLabel(s); st.appendChild(o);
    }
  }

  function fillFilterSelects() {
    const sub = document.getElementById('filterSubject');
    sub.innerHTML = '';
    const oAll = document.createElement('option'); oAll.value = 'all'; oAll.textContent = t('allSubjects'); sub.appendChild(oAll);
    for (const s of Data.SUBJECTS) {
      const o = document.createElement('option');
      o.value = s; o.textContent = subjectName(s); sub.appendChild(o);
    }
    sub.value = state.fSubject;
    const cls = document.getElementById('filterClass');
    cls.innerHTML = '';
    const cAll = document.createElement('option'); cAll.value = 'all'; cAll.textContent = t('allClasses'); cls.appendChild(cAll);
    for (const c of Data.CLASS_LEVELS) {
      const o = document.createElement('option');
      o.value = String(c); o.textContent = t('classLabel') + ' ' + fmtNum(c); cls.appendChild(o);
    }
    cls.value = state.fClass;
    const st = document.getElementById('filterStatus');
    st.innerHTML = '';
    const sAll = document.createElement('option'); sAll.value = 'all'; sAll.textContent = t('allStatuses'); st.appendChild(sAll);
    for (const s of Core.STATUSES) {
      const o = document.createElement('option');
      o.value = s; o.textContent = statusLabel(s); st.appendChild(o);
    }
    st.value = state.fStatus;
  }

  function readForm() {
    return {
      subject: document.getElementById('fSubject').value,
      classLevel: Number(document.getElementById('fClass').value),
      topic: document.getElementById('fTopic').value.trim(),
      date: document.getElementById('fDate').value,
      durationMin: Number(document.getElementById('fDuration').value),
      objectives: document.getElementById('fObjectives').value,
      materials: document.getElementById('fMaterials').value,
      activities: document.getElementById('fActivities').value,
      homework: document.getElementById('fHomework').value,
      status: document.getElementById('fStatus').value,
    };
  }

  function formToPlan() {
    const p = readForm();
    const errors = Core.validatePlan(p, Data.SUBJECTS);
    const msg = document.getElementById('formMsg');
    if (errors.length) {
      const first = errors[0];
      msg.textContent = first === 'topic' ? t('errTopic')
        : first === 'date' ? t('errDate')
        : first === 'duration' ? t('errDuration')
        : t('errSubject');
      return null;
    }
    msg.textContent = '';
    return p;
  }

  function clearForm() {
    document.getElementById('planForm').reset();
    document.getElementById('fDate').value = todayStr();
    document.getElementById('fDuration').value = '40';
    state.editingId = null;
    document.getElementById('saveBtn').textContent = t('savePlan');
    document.getElementById('cancelEditBtn').hidden = true;
    document.getElementById('formMsg').textContent = '';
  }

  function startEdit(id) {
    const p = state.plans.find((x) => x.id === id);
    if (!p) return;
    state.editingId = id;
    document.getElementById('fSubject').value = p.subject;
    document.getElementById('fClass').value = String(p.classLevel);
    document.getElementById('fTopic').value = p.topic;
    document.getElementById('fDate').value = p.date;
    document.getElementById('fDuration').value = String(p.durationMin);
    document.getElementById('fObjectives').value = p.objectives || '';
    document.getElementById('fMaterials').value = p.materials || '';
    document.getElementById('fActivities').value = p.activities || '';
    document.getElementById('fHomework').value = p.homework || '';
    document.getElementById('fStatus').value = p.status;
    document.getElementById('saveBtn').textContent = t('updatePlan');
    document.getElementById('cancelEditBtn').hidden = false;
    document.getElementById('formMsg').textContent = '';
    showTab('new');
    document.getElementById('fTopic').focus();
  }

  function duplicatePlan(id) {
    const p = state.plans.find((x) => x.id === id);
    if (!p) return;
    const copy = Object.assign({}, p, { id: Core.newPlanId(), status: 'draft' });
    state.plans.push(copy);
    save();
    renderAll();
    document.getElementById('formMsg').textContent = '';
    startEdit(copy.id);
    document.getElementById('formMsg').textContent = t('msgDuplicated');
  }

  function toggleTaught(id) {
    const p = state.plans.find((x) => x.id === id);
    if (!p) return;
    p.status = p.status === 'taught' ? 'draft' : 'taught';
    save(); renderAll();
  }

  function deletePlan(id) {
    if (!window.confirm(t('confirmDel'))) return;
    state.plans = state.plans.filter((x) => x.id !== id);
    save(); renderAll();
  }

  /* ---------- activity ideas ---------- */
  function renderIdeas() {
    const wrap = document.getElementById('ideasList');
    wrap.innerHTML = '';
    const subject = document.getElementById('fSubject').value;
    for (const idea of Data.ACTIVITY_IDEAS[subject] || []) {
      const b = el('button', 'idea-chip', idea);
      b.type = 'button';
      b.addEventListener('click', () => {
        const ta = document.getElementById('fActivities');
        ta.value = ta.value.trim() ? ta.value.replace(/\s+$/, '') + '\n' + idea : idea;
        ta.focus();
      });
      wrap.appendChild(b);
    }
  }

  /* ---------- tabs + i18n ---------- */
  function showTab(name) {
    state.tab = name;
    for (const b of document.querySelectorAll('.tab-btn')) {
      b.classList.toggle('active', b.dataset.tab === name);
    }
    for (const s of document.querySelectorAll('.tab-panel')) {
      s.hidden = s.id !== 'tab-' + name;
    }
    if (name === 'week') renderWeek();
    if (name === 'plans') renderPlans();
  }

  function applyI18n() {
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    document.getElementById('langBtn').textContent = t('langBtn');
    const map = {
      appTitle: 'title', appSubtitle: 'subtitle',
      tabWeekBtn: 'tabWeek', tabPlansBtn: 'tabPlans', tabNewBtn: 'tabNew', tabDataBtn: 'tabData',
      statTotalLabel: 'statTotal', statWeekLabel: 'statWeek', statTaughtLabel: 'statTaught', statMinutesLabel: 'statMinutes',
      weekPrevBtn: 'weekPrev', weekNextBtn: 'weekNext', weekTodayBtn: 'weekToday',
      searchInput: 'searchPh', fSubjectLabel: 'fSubject', fClassLabel: 'fClass', fTopicLabel: 'fTopic',
      fDateLabel: 'fDate', fDurationLabel: 'fDuration', fObjectivesLabel: 'fObjectives',
      fMaterialsLabel: 'fMaterials', fActivitiesLabel: 'fActivities', fHomeworkLabel: 'fHomework',
      fStatusLabel: 'fStatus', saveBtn: 'savePlan', cancelEditBtn: 'cancelEdit',
      ideasTitle: 'ideasTitle', exportTitle: 'exportTitle', exportBtn: 'exportBtn',
      importBtn: 'importBtn', eraseTitle: 'eraseTitle', eraseHint: 'eraseHint', eraseBtn: 'eraseBtn',
      disclaimer: 'disclaimer',
    };
    for (const [id, key] of Object.entries(map)) {
      const node = document.getElementById(id);
      if (!node) continue;
      if (node.tagName === 'INPUT' && node.type === 'search') node.placeholder = t(key);
      else if (node.tagName === 'TEXTAREA' || node.tagName === 'INPUT') node.placeholder = t(key);
      else node.textContent = t(key);
    }
    document.getElementById('fTopic').placeholder = t('fTopicPh');
    document.getElementById('fObjectives').placeholder = t('fObjectivesPh');
    document.getElementById('fMaterials').placeholder = t('fMaterialsPh');
    document.getElementById('fActivities').placeholder = t('fActivitiesPh');
    document.getElementById('fHomework').placeholder = t('fHomeworkPh');
    document.getElementById('searchInput').placeholder = t('searchPh');
    document.getElementById('eraseInput').placeholder = 'DELETE';
    if (state.editingId) document.getElementById('saveBtn').textContent = t('updatePlan');
    fillSelects(); fillFilterSelects(); renderIdeas();
    renderWeek(); renderPlans();
  }

  function renderAll() { renderWeek(); renderPlans(); }

  /* ---------- wire up ---------- */
  function init() {
    document.getElementById('langBtn').addEventListener('click', () => {
      state.lang = state.lang === 'bn' ? 'en' : 'bn';
      save(); applyI18n();
    });
    for (const b of document.querySelectorAll('.tab-btn')) {
      b.addEventListener('click', () => showTab(b.dataset.tab));
    }
    document.getElementById('weekPrevBtn').addEventListener('click', () => {
      state.weekAnchor = Core.addDaysStr(Core.weekStartStr(state.weekAnchor), -7); renderWeek();
    });
    document.getElementById('weekNextBtn').addEventListener('click', () => {
      state.weekAnchor = Core.addDaysStr(Core.weekStartStr(state.weekAnchor), 7); renderWeek();
    });
    document.getElementById('weekTodayBtn').addEventListener('click', () => {
      state.weekAnchor = todayStr(); renderWeek();
    });
    document.getElementById('searchInput').addEventListener('input', (e) => {
      state.q = e.target.value; renderPlans();
    });
    document.getElementById('filterSubject').addEventListener('change', (e) => {
      state.fSubject = e.target.value; renderPlans();
    });
    document.getElementById('filterClass').addEventListener('change', (e) => {
      state.fClass = e.target.value; renderPlans();
    });
    document.getElementById('filterStatus').addEventListener('change', (e) => {
      state.fStatus = e.target.value; renderPlans();
    });
    document.getElementById('fSubject').addEventListener('change', renderIdeas);
    document.getElementById('planForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const p = formToPlan();
      if (!p) return;
      const msg = document.getElementById('formMsg');
      if (state.editingId) {
        const idx = state.plans.findIndex((x) => x.id === state.editingId);
        if (idx >= 0) state.plans[idx] = Object.assign({}, p, { id: state.editingId });
        msg.textContent = t('msgUpdated');
      } else {
        state.plans.push(Object.assign({}, p, { id: Core.newPlanId() }));
        msg.textContent = t('msgSaved');
      }
      save(); renderAll();
      clearFormKeepMsg(msg.textContent);
    });
    document.getElementById('cancelEditBtn').addEventListener('click', clearForm);
    document.getElementById('exportBtn').addEventListener('click', () => {
      document.getElementById('dataBox').value = JSON.stringify(state.plans, null, 2);
      document.getElementById('dataMsg').textContent = t('exportDone');
    });
    document.getElementById('importBtn').addEventListener('click', () => {
      const res = Core.parseImport(document.getElementById('dataBox').value, Data.SUBJECTS);
      const msg = document.getElementById('dataMsg');
      if (!res.ok) { msg.textContent = t('importBad'); return; }
      state.plans = res.plans;
      save(); renderAll();
      msg.textContent = t('importOk').replace('N', fmtNum(res.plans.length));
    });
    document.getElementById('eraseBtn').addEventListener('click', () => {
      const msg = document.getElementById('dataMsg');
      if (document.getElementById('eraseInput').value !== 'DELETE') {
        msg.textContent = t('eraseWrong'); return;
      }
      state.plans = [];
      document.getElementById('eraseInput').value = '';
      save(); renderAll();
      msg.textContent = t('eraseDone');
    });
    applyI18n();
    document.getElementById('fDate').value = todayStr();
    document.getElementById('fDuration').value = '40';
    showTab('week');
  }

  function clearFormKeepMsg(keep) {
    document.getElementById('planForm').reset();
    document.getElementById('fDate').value = todayStr();
    document.getElementById('fDuration').value = '40';
    state.editingId = null;
    document.getElementById('saveBtn').textContent = t('savePlan');
    document.getElementById('cancelEditBtn').hidden = true;
    document.getElementById('formMsg').textContent = keep;
  }

  window.__app = { state, showTab, startEdit, duplicatePlan, toggleTaught, deletePlan, renderAll, todayStr };
  document.addEventListener('DOMContentLoaded', init);
})();
