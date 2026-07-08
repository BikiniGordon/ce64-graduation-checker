// gradePlanner.js — Grade Planner page. Standalone: only depends on the raw
// course rows handed off via localStorage (see openGradePlanner() in ui.js)
// and i18n.js. Deliberately doesn't touch CURRICULUM/matcher.js — GPA math
// doesn't need curriculum category matching, just grade + credit.

const GRADE_POINTS = { A: 4.0, 'B+': 3.5, B: 3.0, 'C+': 2.5, C: 2.0, 'D+': 1.5, D: 1.0, F: 0.0 };
const GRADE_ORDER = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F']; // highest to lowest

let PRIOR_CREDITS = 0;
let PRIOR_POINTS = 0;
let EXCLUDED_COUNT = 0;
let SIM_ROWS = []; // { code, title, credit, grade } — grade is '' or a GRADE_ORDER key

const $ = (sel) => document.querySelector(sel);

document.addEventListener('DOMContentLoaded', () => {
  applyStaticI18n();
  wireLangSwitch();
  load();
});

function load() {
  const raw = localStorage.getItem('ce64_grade_planner_data');
  let courses = [];
  try { courses = raw ? JSON.parse(raw) : []; } catch { courses = []; }

  if (!courses.length) {
    $('#gpEmptySection').classList.remove('hidden');
    $('#gpContent').classList.add('hidden');
    return;
  }
  $('#gpEmptySection').classList.add('hidden');
  $('#gpContent').classList.remove('hidden');

  PRIOR_CREDITS = 0;
  PRIOR_POINTS = 0;
  EXCLUDED_COUNT = 0;
  SIM_ROWS = [];

  for (const c of courses) {
    const g = (c.grade || '').toUpperCase();
    const credit = Number(c.credit) || 0;
    if (!g) {
      SIM_ROWS.push({ code: c.code || '', title: c.title || '', credit, grade: '' });
    } else if (Object.prototype.hasOwnProperty.call(GRADE_POINTS, g)) {
      PRIOR_CREDITS += credit;
      PRIOR_POINTS += credit * GRADE_POINTS[g];
    } else {
      EXCLUDED_COUNT++;
    }
  }

  wireStaticControls();
  renderPrior();
  renderSimTable();
  recalc();
}

function wireStaticControls() {
  $('#gpAddRowBtn').addEventListener('click', () => {
    const row = { code: '', title: '', credit: '', grade: '' };
    SIM_ROWS.push(row);
    addSimRow(row);
    recalc();
  });
  $('#gpTargetGpa').addEventListener('input', recalc);
}

function renderPrior() {
  if (PRIOR_CREDITS > 0) {
    const gpa = PRIOR_POINTS / PRIOR_CREDITS;
    $('#gpPriorStat').innerHTML = `<div class="gp-stat-value">${t('gpPriorStat', { gpa: `<strong>${gpa.toFixed(3)}</strong>`, credits: PRIOR_CREDITS })}</div>`;
  } else {
    $('#gpPriorStat').innerHTML = `<p class="hint">${esc(t('gpPriorNone'))}</p>`;
  }
  const note = $('#gpExcludedNote');
  if (EXCLUDED_COUNT > 0) {
    note.textContent = t('gpExcludedNote', { n: EXCLUDED_COUNT });
    note.classList.remove('hidden');
  } else {
    note.classList.add('hidden');
  }
}

function renderSimTable() {
  const tbody = $('#gpSimTable tbody');
  tbody.innerHTML = '';
  SIM_ROWS.forEach(addSimRow);
}

function addSimRow(row) {
  const tbody = $('#gpSimTable tbody');
  const tr = document.createElement('tr');
  const options = ['', ...GRADE_ORDER].map((g) => {
    const label = g === '' ? t('gpGradeUnset') : g;
    return `<option value="${esc(g)}" ${g === (row.grade || '') ? 'selected' : ''}>${esc(label)}</option>`;
  }).join('');
  tr.innerHTML = `
    <td class="code-cell"><input value="${esc(row.code)}" /></td>
    <td class="title-col"><input value="${esc(row.title)}" /></td>
    <td class="credit-cell"><input value="${esc(row.credit ?? '')}" /></td>
    <td class="grade-cell"><select>${options}</select></td>
    <td><button type="button" class="del-btn" title="${esc(t('removeRowTitle'))}">×</button></td>`;

  const [codeInput, titleInput, creditInput] = tr.querySelectorAll('input');
  codeInput.addEventListener('input', () => { row.code = codeInput.value.trim(); });
  titleInput.addEventListener('input', () => { row.title = titleInput.value.trim(); });
  creditInput.addEventListener('input', () => {
    row.credit = parseInt(creditInput.value, 10) || 0;
    recalc();
  });
  tr.querySelector('select').addEventListener('change', (e) => {
    row.grade = e.target.value;
    recalc();
  });
  tr.querySelector('.del-btn').addEventListener('click', () => {
    const i = SIM_ROWS.indexOf(row);
    if (i >= 0) SIM_ROWS.splice(i, 1);
    tr.remove();
    recalc();
  });

  tbody.appendChild(tr);
}

function recalc() {
  let filledCredits = 0, filledPoints = 0, filledCount = 0, semesterTotalCredits = 0;
  for (const row of SIM_ROWS) {
    const credit = row.credit || 0;
    semesterTotalCredits += credit;
    if (row.grade && Object.prototype.hasOwnProperty.call(GRADE_POINTS, row.grade)) {
      filledCredits += credit;
      filledPoints += credit * GRADE_POINTS[row.grade];
      filledCount++;
    }
  }

  $('#gpSemesterGpaValue').textContent = filledCredits > 0 ? (filledPoints / filledCredits).toFixed(3) : t('gpNoDataYet');
  const cumCredits = PRIOR_CREDITS + filledCredits;
  $('#gpCumulativeGpaValue').textContent = cumCredits > 0 ? ((PRIOR_POINTS + filledPoints) / cumCredits).toFixed(3) : t('gpNoDataYet');
  $('#gpFilledCount').textContent = t('gpFilledCount', { filled: filledCount, total: SIM_ROWS.length });

  recalcTarget(semesterTotalCredits);
}

function recalcTarget(semesterTotalCredits) {
  const el = $('#gpTargetResult');
  const targetVal = parseFloat($('#gpTargetGpa').value);
  if (isNaN(targetVal)) { el.innerHTML = ''; return; }

  if (semesterTotalCredits <= 0) {
    el.innerHTML = `<p class="sanity warn">${esc(t('gpTargetNeedCourses'))}</p>`;
    return;
  }

  const totalCredits = PRIOR_CREDITS + semesterTotalCredits;
  const required = (targetVal * totalCredits - PRIOR_POINTS) / semesterTotalCredits;

  if (required > 4) {
    const maxGpa = (PRIOR_POINTS + semesterTotalCredits * 4) / totalCredits;
    el.innerHTML = `<p class="sanity warn">${t('gpNotAchievable', { maxGpa: maxGpa.toFixed(3) })}</p>`;
    return;
  }
  if (required <= 0) {
    el.innerHTML = `<p class="sanity ok">${esc(t('gpAlreadySecured'))}</p>`;
    return;
  }

  const letter = nearestGradeAtOrAbove(required);
  el.innerHTML = `<div class="gp-req-gpa">${required.toFixed(3)}</div>
    <div>${t('gpRequiredGpa', { gpa: required.toFixed(3) })}</div>
    ${letter ? `<div class="hint">${t('gpRequiredHint', { letter: esc(letter) })}</div>` : ''}`;
}

function nearestGradeAtOrAbove(value) {
  const ascending = [...GRADE_ORDER].reverse(); // F, D, D+, C, C+, B, B+, A
  for (const g of ascending) {
    if (GRADE_POINTS[g] >= value) return g;
  }
  return null;
}

// ---------- i18n wiring (ui.js isn't loaded on this page, so this page owns it) ----------
function wireLangSwitch() {
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
}

// Called by i18n.js's setLang() after static text has been re-applied.
function onLangChange() {
  if ($('#gpContent').classList.contains('hidden')) return;
  renderPrior();
  renderSimTable();
  recalc();
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
