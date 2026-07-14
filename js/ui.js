// ui.js — wires the pieces together. All state lives here.

let CURRICULUM = null;
let CURRICULUM_VERSION = (typeof localStorage !== 'undefined' && localStorage.getItem('ce64_curriculum_version')) || '2564';
let MATCH = null;
let TEMPLATE_BUFFER = null;
let selectedAltPath = null;
let LAST_PARSED = null; // { student, printedEarned } — for re-render on language switch
let CURRENT_COURSES = []; // rows from the review table as of the last check, for enrolled-course lookup
let SEMESTERS = []; // [{ label, courses }] grouped from the last parsed transcript, in transcript order
let SEMESTER_IDX = 0; // which SEMESTERS entry the pager is showing

const ALT_PATH_KEYS = {
  project: 'altPathProject', cooperative: 'altPathCooperative', overseas: 'altPathOverseas',
  academic: 'altPathAcademic',
};
function altPathLabel(key) {
  return ALT_PATH_KEYS[key] ? t(ALT_PATH_KEYS[key]) : key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const $ = (sel) => document.querySelector(sel);

document.addEventListener('DOMContentLoaded', async () => {
  applyStaticI18n();
  wireLangSwitch();
  try {
    await loadCurriculum(CURRICULUM_VERSION);
  } catch (e) {
    $('#pdfStatus').textContent = t('failedToLoadCurriculum', { msg: e.message });
    $('#pdfStatus').className = 'status error';
    return;
  }
  wireUpload();
  wireSemesterPager();
  wireReview();
  wireExcel();
  wireAltPathPicker();
  wireVersionSwitch();
  onLangChange(); // sync any language-dependent text that isn't covered by data-i18n
});

async function loadCurriculum(version) {
  CURRICULUM = await fetch(`data/curriculum_${version}.json`).then((r) => {
    if (!r.ok) throw new Error(`curriculum_${version}.json not found (serve over http, not file://)`);
    return r.json();
  });
  CURRICULUM_VERSION = version;
  if (typeof localStorage !== 'undefined') localStorage.setItem('ce64_curriculum_version', version);
  selectedAltPath = null;
  applyCurriculumText();
}

function wireVersionSwitch() {
  const sel = $('#curriculumSelect');
  sel.value = CURRICULUM_VERSION;
  sel.addEventListener('change', async () => {
    try {
      await loadCurriculum(sel.value);
      if (MATCH) runCheck(); // re-run against the new curriculum using the same reviewed table
    } catch (e) {
      $('#pdfStatus').className = 'status error';
      $('#pdfStatus').textContent = t('failedToLoadCurriculum', { msg: e.message });
    }
  });
}

// Version-aware header/disclaimer/footer text — driven by CURRICULUM.meta rather
// than static data-i18n, since the numbers/labels differ per syllabus version.
function applyCurriculumText() {
  const meta = CURRICULUM.meta;
  const vars = { year: meta.year, ver: meta.shortLabel, file: `curriculum_${meta.year}.json` };
  $('#headerTitleEl').innerHTML = t('headerTitle', vars);
  $('#subEl').innerHTML = t('subBase') + (meta.excelTemplate ? ' ' + t('subExcelNote') : '') +
    ' <strong>' + t('subPrivacy') + '</strong>';
  $('#disclaimerEl').innerHTML = t('disclaimer', vars);
  $('#newCurriculumNoteEl').innerHTML = meta.newlyIntroduced ? t('newCurriculumNote', vars) : '';
  $('#newCurriculumNoteEl').classList.toggle('hidden', !meta.newlyIntroduced);
  $('#resultHintEl').innerHTML = t('resultHint', vars);
  $('#footerEl').innerHTML = t('footer', vars);
}

function wireLangSwitch() {
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
}

// Called by i18n.js's setLang() after the static text has been re-applied.
function onLangChange() {
  if (CURRICULUM) applyCurriculumText();
  if (LAST_PARSED) renderStudent(LAST_PARSED.student, LAST_PARSED.printedEarned);
  if (SEMESTERS.length) renderSemesterSummary();
  const collapsed = $('#courseTable').classList.contains('title-collapsed');
  $('#toggleTitleBtn').textContent = t(collapsed ? 'showTitleColumn' : 'hideTitleColumn');
  if (MATCH) renderResults(MATCH);
}

// ---------- Step 1: PDF upload ----------
function wireUpload() {
  const zone = $('#dropZone');
  const input = $('#pdfInput');

  zone.addEventListener('click', (e) => {
    if (e.target.closest('#pdfBtn')) input.click();
  });
  input.addEventListener('change', () => input.files[0] && handlePdf(input.files[0]));

  ['dragenter', 'dragover'].forEach((ev) =>
    zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('drag'); }));
  zone.addEventListener('drop', (e) => {
    const f = e.dataTransfer.files[0];
    if (f) handlePdf(f);
  });
}

async function handlePdf(file) {
  const status = $('#pdfStatus');
  status.className = 'status';
  status.textContent = t('readingFile', { name: file.name });
  try {
    const buf = await file.arrayBuffer();
    const lines = await extractTranscriptLines(buf);
    const parsed = parseTranscript(lines);
    if (!parsed.courses.length) throw new Error(t('noCoursesDetected'));
    LAST_PARSED = { student: parsed.student, printedEarned: parsed.printedEarned };
    renderStudent(parsed.student, parsed.printedEarned);
    renderCourseTable(parsed.courses);
    SEMESTERS = groupBySemester(parsed.courses);
    SEMESTER_IDX = SEMESTERS.length - 1; // default to the most recent semester
    renderSemesterSummary();
    $('#reviewSection').classList.remove('hidden');
    $('#reviewSection').dataset.printedEarned = parsed.printedEarned ?? '';
    status.className = 'status ok';
    status.textContent = t('parsedCourses', { n: parsed.courses.length });
    $('#reviewSection').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    status.className = 'status error';
    status.textContent = t('errorPrefix', { msg: e.message });
  }
}

function renderStudent(student, printedEarned) {
  const bits = [];
  if (student.name) bits.push(`<strong>${esc(student.name)}</strong>`);
  if (student.studentId) bits.push(t('idLabel', { id: esc(student.studentId) }));
  if (student.program) bits.push(esc(student.program));
  if (printedEarned != null) bits.push(t('transcriptStatesCredits', { n: printedEarned }));
  $('#studentInfo').innerHTML = bits.join(' · ');
}

// Same grade->point scale and GPA-eligibility rule as gradePlanner.js (S/U/W/I
// and ungraded courses don't count toward GPA). Duplicated rather than shared
// since gradePlanner.js isn't loaded on this page and both files already
// declare their own `$`/i18n wiring.
const GRADE_POINTS = { A: 4.0, 'B+': 3.5, B: 3.0, 'C+': 2.5, C: 2.0, 'D+': 1.5, D: 1.0, F: 0.0 };

// Groups the flat parsed course list by the semester header line each course
// followed in the source PDF, preserving transcript (chronological) order,
// and tags each group with its own GPA plus the running cumulative GPA and
// how much that cumulative GPA moved because of this semester's grades.
function groupBySemester(courses) {
  const map = new Map();
  for (const c of courses) {
    const key = c.semester || t('unknownSemester');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  }
  const semesters = [...map.entries()].map(([label, courses]) => ({ label, courses }));

  let cumCredits = 0, cumPoints = 0, prevCumulativeGpa = null;
  for (const sem of semesters) {
    let semCredits = 0, semPoints = 0;
    for (const c of sem.courses) {
      const g = (c.grade || '').toUpperCase();
      if (Object.prototype.hasOwnProperty.call(GRADE_POINTS, g)) {
        semCredits += c.credit;
        semPoints += c.credit * GRADE_POINTS[g];
      }
    }
    sem.gpa = semCredits > 0 ? semPoints / semCredits : null;
    cumCredits += semCredits;
    cumPoints += semPoints;
    sem.cumulativeGpa = cumCredits > 0 ? cumPoints / cumCredits : null;
    sem.cumulativeDelta = (sem.gpa !== null && prevCumulativeGpa !== null)
      ? sem.cumulativeGpa - prevCumulativeGpa : null;
    prevCumulativeGpa = sem.cumulativeGpa;
  }
  return semesters;
}

function wireSemesterPager() {
  $('#semPrevBtn').addEventListener('click', () => {
    if (SEMESTER_IDX > 0) { SEMESTER_IDX--; renderSemesterSummary(); }
  });
  $('#semNextBtn').addEventListener('click', () => {
    if (SEMESTER_IDX < SEMESTERS.length - 1) { SEMESTER_IDX++; renderSemesterSummary(); }
  });
}

function renderSemesterSummary() {
  const wrap = $('#semesterSummary');
  if (!SEMESTERS.length) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');

  const sem = SEMESTERS[SEMESTER_IDX];
  const credits = sem.courses
    .filter((c) => c.status !== 'in-progress')
    .reduce((s, c) => s + c.credit, 0);

  $('#semesterLabel').textContent = sem.label;
  $('#semesterPos').textContent = t('semesterPos', { n: SEMESTER_IDX + 1, total: SEMESTERS.length });

  const gpaText = (v) => (v == null ? t('gpNoDataYet') : v.toFixed(3));
  const deltaHtml = sem.cumulativeDelta == null ? '' : `<div class="gp-filled-count">${t('semCumulativeDelta', {
    sign: sem.cumulativeDelta >= 0 ? '+' : '', delta: sem.cumulativeDelta.toFixed(3),
  })}</div>`;
  $('#semesterGpaStats').innerHTML = `
    <div class="gp-stat">
      <div class="gp-stat-label">${esc(t('semGpaLabel'))}</div>
      <div class="gp-stat-value">${gpaText(sem.gpa)}</div>
    </div>
    <div class="gp-stat">
      <div class="gp-stat-label">${esc(t('semCumulativeGpaLabel'))}</div>
      <div class="gp-stat-value">${gpaText(sem.cumulativeGpa)}</div>
      ${deltaHtml}
    </div>`;

  $('#semesterCourses').innerHTML = sem.courses.map((c) => `
    <tr>
      <td class="code-cell">${esc(c.code)}</td>
      <td class="title-col">${esc(c.title)}</td>
      <td class="credit-cell">${c.credit}</td>
      <td class="grade-cell">${esc(c.grade || '—')}</td>
    </tr>`).join('');
  $('#semesterCreditsTotal').textContent = t('semesterCreditsTotal', { n: credits });
  $('#semPrevBtn').disabled = SEMESTER_IDX === 0;
  $('#semNextBtn').disabled = SEMESTER_IDX === SEMESTERS.length - 1;
}

// ---------- Step 2: editable review table ----------
function wireReview() {
  $('#addRowBtn').addEventListener('click', () => addCourseRow({ code: '', title: '', credit: '', grade: '' }));
  $('#checkBtn').addEventListener('click', runCheck);
  $('#gradePlannerBtn').addEventListener('click', openGradePlanner);
  $('#toggleTitleBtn').addEventListener('click', () => {
    const collapsed = $('#courseTable').classList.toggle('title-collapsed');
    $('#toggleTitleBtn').textContent = t(collapsed ? 'showTitleColumn' : 'hideTitleColumn');
  });
}

// Hands the raw reviewed rows off to the Grade Planner page via localStorage
// (no backend to pass data through, and it needs the raw grade string, not
// curriculum-specific pass/fail classification).
function openGradePlanner() {
  const rows = [...$('#courseTable tbody').querySelectorAll('tr')];
  const courses = [];
  for (const tr of rows) {
    const [code, title, credit, grade] = [...tr.querySelectorAll('input')].map((i) => i.value.trim());
    if (!code) continue;
    courses.push({ code, title, credit: parseInt(credit, 10) || 0, grade: grade.toUpperCase() });
  }
  localStorage.setItem('ce64_grade_planner_data', JSON.stringify(courses));
  window.location.href = 'grade-planner.html';
}

function renderCourseTable(courses) {
  $('#courseTable tbody').innerHTML = '';
  courses.forEach(addCourseRow);
}

function addCourseRow(course) {
  const tbody = $('#courseTable tbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="code-cell"><input value="${esc(course.code || '')}" /></td>
    <td class="title-col"><input value="${esc(course.title || '')}" /></td>
    <td class="credit-cell"><input value="${esc(course.credit ?? '')}" /></td>
    <td class="grade-cell"><input value="${esc(course.grade || '')}" /></td>
    <td><button type="button" class="del-btn" title="${esc(t('removeRowTitle'))}">×</button></td>`;
  tr.querySelector('.del-btn').addEventListener('click', () => tr.remove());
  tbody.appendChild(tr);
}

function readCourseTable() {
  const passing = new Set(CURRICULUM.passingGrades);
  const rows = [...$('#courseTable tbody').querySelectorAll('tr')];
  const courses = [];
  for (const tr of rows) {
    const [code, title, credit, grade] = [...tr.querySelectorAll('input')].map((i) => i.value.trim());
    if (!code) continue;
    const g = grade.toUpperCase();
    let status;
    if (!g) status = 'in-progress';
    else if (['F', 'U', 'W', 'I'].includes(g)) status = 'failed';
    else if (passing.has(g)) status = 'passed';
    else status = 'passed'; // unknown grade token — treat as passed but keep the value
    courses.push({ code, title, credit: parseInt(credit, 10) || 0, grade: g || null, status });
  }
  return courses;
}

// ---------- Step 3: results ----------
function runCheck() {
  const courses = readCourseTable();
  CURRENT_COURSES = courses;
  MATCH = runMatcher(courses, CURRICULUM);
  renderResults(MATCH);
  $('#resultSection').classList.remove('hidden');
  $('#excelSection').classList.toggle('hidden', !CURRICULUM.meta.excelTemplate);
  $('#resultSection').scrollIntoView({ behavior: 'smooth' });
}

function renderResults(m) {
  const tot = m.totals;
  const pct = Math.min(100, Math.round((tot.progressCredits / tot.totalRequired) * 100));
  const overall = $('#overall');
  overall.innerHTML = `
    <div class="overall-num"><span class="big">${t('overallProgress', { earned: tot.progressCredits, total: tot.totalRequired })}</span>
      &nbsp;·&nbsp; ${t('toGo', { n: tot.remainingToGraduate })}</div>
    <div class="overall-bar"><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div>
    ${tot.complete ? `<p class="sanity ok">${t('allSatisfied')}</p>` : ''}
    ${sanityHtml(m)}`;

  // Categories grouped.
  const groups = { GenEd: [], Major: [], Free: [] };
  m.results.forEach((r) => (groups[r.group] || (groups[r.group] = [])).push(r));
  const groupKeys = { GenEd: 'groupGenEd', Major: 'groupMajor', Free: 'groupFree' };
  let html = '';
  for (const g of ['GenEd', 'Major', 'Free']) {
    if (!groups[g] || !groups[g].length) continue;
    const n = groups[g].reduce((s, r) => s + r.requiredCredits, 0);
    html += `<div class="group-title">${t(groupKeys[g], { n }) || g}</div>`;
    html += groups[g].map(catHtml).join('');
  }
  $('#categories').innerHTML = html;

  $('#extras').innerHTML = extrasHtml(m);
}

function sanityHtml(m) {
  const printed = $('#reviewSection').dataset.printedEarned;
  if (printed === '' || printed == null) return '';
  const p = parseInt(printed, 10);
  const diff = m.totals.earnedAllPassed - p;
  if (Math.abs(diff) <= 0) {
    return `<p class="sanity ok">${t('sanityOk', { a: m.totals.earnedAllPassed, b: p })}</p>`;
  }
  return `<p class="sanity warn">${t('sanityWarn', { a: m.totals.earnedAllPassed, b: p })}</p>`;
}

function catHtml(r) {
  const pct = Math.min(100, Math.round((Math.min(r.earnedCredits, r.requiredCredits) / r.requiredCredits) * 100) || 0);
  const pill = r.complete
    ? `<span class="pill done">${t('pillDone')}</span>`
    : `<span class="pill todo">${t('pillTodo')}</span>`;
  let detail = '';
  if (r.mode === 'one-of-paths') {
    detail += altPathPickerHtml(r);
  } else {
    if (r.reasonKey) detail += `<div class="cat-detail">${esc(t(r.reasonKey, r.reasonParams))}</div>`;
    if (r.path) detail += `<div class="cat-detail">${t('pathLabel', { path: `<code>${esc(r.path)}</code>` })}</div>`;
  }
  if (r.fullTrack) detail += `<div class="cat-detail">${t('fullTrackLabel', { track: `<code>${esc(r.fullTrack)}</code>` })}</div>`;
  if (r.missingMandatory && r.missingMandatory.length)
    detail += `<div class="cat-detail">${t('missingMandatory', { list: r.missingMandatory.map(courseChip).join(' ') })}</div>`;
  if (r.missingCourses && r.missingCourses.length) {
    detail += `<div class="cat-detail">${t('stillRequired', { n: r.missingCourses.length })}<ul class="missing-list">` +
      r.missingCourses.map((c) => `<li>${courseChip(c)}</li>`).join('') + '</ul></div>';
  }
  if (!r.complete && r.remainingCredits > 0 && r.mode !== 'all-of')
    detail += `<div class="cat-detail">${t('needMoreCredits', { n: r.remainingCredits })}</div>`;
  const localizedNote = LANG === 'th' && r.noteTh ? r.noteTh : r.note;
  if (localizedNote) detail += `<div class="cat-detail" style="opacity:.7">${esc(localizedNote)}</div>`;

  return `<div class="cat">
    <div class="cat-head">
      <div class="cat-name">${esc(r.name)} ${pill}</div>
      <div class="cat-credits">${r.earnedCredits} / ${r.requiredCredits} cr</div>
    </div>
    <div class="cat-bar-track"><div class="cat-bar-fill ${r.complete ? 'done' : ''}" style="width:${pct}%"></div></div>
    ${detail}
  </div>`;
}

function altPathPickerHtml(r) {
  const catDef = CURRICULUM.categories.find((c) => c.id === r.id);
  const paths = catDef.paths;
  if (!selectedAltPath || !paths[selectedAltPath]) {
    selectedAltPath = r.path || Object.keys(paths)[0];
  }
  const options = Object.keys(paths)
    .map((k) => `<option value="${esc(k)}" ${k === selectedAltPath ? 'selected' : ''}>${esc(altPathLabel(k))}</option>`)
    .join('');
  return `<div class="cat-detail path-picker">
    <label>${t('chooseYourPath')}
      <select id="altPathSelect">${options}</select>
    </label>
    <div id="altPathChecklist">${altPathDetailHtml(catDef, selectedAltPath)}</div>
  </div>`;
}

// A path is either a fixed course-code list, or `{ poolFrom: <categoryId> }`
// meaning "N more credits from that category's own elective pool".
function altPathDetailHtml(catDef, key) {
  const def = catDef.paths[key];
  if (Array.isArray(def)) return altPathChecklistHtml(def, catDef.requiredCredits);
  if (def && def.poolFrom) return altPathPoolHtml(def, catDef);
  return '';
}

function altPathChecklistHtml(codes, requiredCredits) {
  let earned = 0;
  const items = codes.map((code) => {
    const passedCourse = MATCH.passed.find((c) => c.code === code);
    const inProgCourse = MATCH.inProgress.find((c) => c.code === code);
    const title = (CURRICULUM.courseTitles && CURRICULUM.courseTitles[code]) || '';
    let icon = '○', note = t('notTaken');
    if (passedCourse) { icon = '✓'; note = passedCourse.grade || t('passedFallback'); earned += passedCourse.credit; }
    else if (inProgCourse) { icon = '⏳'; note = t('inProgressNote'); }
    return `<li>${icon} <code>${esc(code)}</code>${title ? ' – ' + esc(title) : ''} <span class="path-note">(${esc(note)})</span></li>`;
  }).join('');
  const done = earned >= requiredCredits;
  return `<ul class="missing-list path-checklist">${items}</ul>
    <div class="path-progress ${done ? 'done' : ''}">${t('pathProgressLabel', { earned, required: requiredCredits })}${done ? ' ✓' : ''}</div>`;
}

// Pool-backed path preview: since the pool is shared with another category
// (e.g. Specialized Elective), completing it requires that category's own
// quota PLUS this path's requiredCredits — shown here as one combined total.
function altPathPoolHtml(def, catDef) {
  const poolCat = CURRICULUM.categories.find((c) => c.id === def.poolFrom);
  const eligible = new Set(poolCat.courses);
  const passedInPool = MATCH.passed.filter((c) => eligible.has(c.code));
  const inProgInPool = MATCH.inProgress.filter((c) => eligible.has(c.code));
  const earned = passedInPool.reduce((s, c) => s + c.credit, 0);
  const required = poolCat.requiredCredits + catDef.requiredCredits;
  const rows = (icon, note, list) => list.map((c) => {
    const title = (CURRICULUM.courseTitles && CURRICULUM.courseTitles[c.code]) || '';
    return `<li>${icon} <code>${esc(c.code)}</code>${title ? ' – ' + esc(title) : ''} <span class="path-note">(${esc(note)})</span></li>`;
  }).join('');
  const items = rows('✓', t('passedFallback'), passedInPool) + rows('⏳', t('inProgressNote'), inProgInPool);
  const done = earned >= required;
  return `<div class="cat-detail">${esc(t('altPathPoolNote', { poolName: poolCat.name }))}</div>
    <ul class="missing-list path-checklist">${items}</ul>
    <div class="path-progress ${done ? 'done' : ''}">${t('altPathPoolProgress', { earned, required })}${done ? ' ✓' : ''}</div>`;
}

function wireAltPathPicker() {
  $('#categories').addEventListener('change', (e) => {
    if (e.target.id !== 'altPathSelect') return;
    selectedAltPath = e.target.value;
    const catDef = CURRICULUM.categories.find((c) => c.id === 'ce_alt_study');
    $('#altPathChecklist').innerHTML = altPathDetailHtml(catDef, selectedAltPath);
  });
}

function extrasHtml(m) {
  let html = '<div class="extras">';
  if (m.inProgress.length) {
    html += `<h3>${t('inProgressHeader')}</h3>` +
      m.inProgress.map((c) => `<span class="chip">${esc(c.code)} ${esc(c.title)}</span>`).join('');
  }
  if (m.failed.length) {
    html += `<h3>${t('failedHeader')}</h3>` +
      m.failed.map((c) => `<span class="chip warn">${esc(c.code)} ${esc(c.grade || '')}</span>`).join('');
  }
  if (m.unmatched.length) {
    html += `<h3>${t('unmatchedHeader')}</h3>` +
      m.unmatched.map((c) => `<span class="chip warn">${esc(c.code)} ${esc(c.title)}</span>`).join('');
  }
  html += '</div>';
  return html;
}

// ---------- Step 4: Excel ----------
function wireExcel() {
  const input = $('#excelInput');
  input.addEventListener('change', async () => {
    if (!input.files[0]) return;
    TEMPLATE_BUFFER = await input.files[0].arrayBuffer();
    $('#fillBtn').disabled = false;
    $('#excelStatus').className = 'status';
    $('#excelStatus').textContent = t('templateLoaded', { name: input.files[0].name });
  });

  $('#fillBtn').addEventListener('click', async () => {
    if (!MATCH || !TEMPLATE_BUFFER) return;
    const status = $('#excelStatus');
    try {
      status.className = 'status';
      status.textContent = t('filling');
      const { blob, log } = await fillTemplate(TEMPLATE_BUFFER, MATCH, CURRICULUM);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'checklist_filled.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      status.className = 'status ok';
      status.textContent = t('doneDownloaded');
      $('#excelLog').innerHTML = log.map((l) => `<li>${esc(l)}</li>`).join('');
    } catch (e) {
      status.className = 'status error';
      status.textContent = t('errorFillingTemplate', { msg: e.message });
    }
  });
}

function isEnrolled(code) {
  const c = CURRENT_COURSES.find(x => x.code?.toUpperCase() === code.toUpperCase());
  return !!c && c.status === 'in-progress'; // on the transcript, no grade posted yet
}

function courseChip(code) {
  const title = CURRICULUM.courseTitles && CURRICULUM.courseTitles[code];
  const enrolled = isEnrolled(code) ? ' [enrolled]' : '';
  return `<code>${esc(code)}</code>${title ? ' – ' + esc(title) : ''}${enrolled}`;
}

// ---------- util ----------
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
