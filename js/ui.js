// ui.js — wires the pieces together. All state lives here.

let CURRICULUM = null;
let MATCH = null;
let TEMPLATE_BUFFER = null;
let selectedAltPath = null;

const ALT_PATH_LABELS = {
  project: 'Project 1 + 2',
  cooperative: 'Co-operative Education',
  overseas: 'Overseas Training',
};
function altPathLabel(key) {
  return ALT_PATH_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const $ = (sel) => document.querySelector(sel);

document.addEventListener('DOMContentLoaded', async () => {
  try {
    CURRICULUM = await fetch('data/curriculum.json').then((r) => {
      if (!r.ok) throw new Error('curriculum.json not found (serve over http, not file://)');
      return r.json();
    });
  } catch (e) {
    $('#pdfStatus').textContent = 'Failed to load curriculum rules: ' + e.message;
    $('#pdfStatus').className = 'status error';
    return;
  }
  wireUpload();
  wireReview();
  wireExcel();
  wireAltPathPicker();
});

// ---------- Step 1: PDF upload ----------
function wireUpload() {
  const zone = $('#dropZone');
  const input = $('#pdfInput');
  $('#pdfBtn').addEventListener('click', () => input.click());
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
  status.textContent = 'Reading ' + file.name + ' …';
  try {
    const buf = await file.arrayBuffer();
    const lines = await extractTranscriptLines(buf);
    const parsed = parseTranscript(lines);
    if (!parsed.courses.length) throw new Error('No courses detected — is this a KMITL transcript PDF?');
    renderStudent(parsed.student, parsed.printedEarned);
    renderCourseTable(parsed.courses);
    $('#reviewSection').classList.remove('hidden');
    $('#reviewSection').dataset.printedEarned = parsed.printedEarned ?? '';
    status.className = 'status ok';
    status.textContent = `Parsed ${parsed.courses.length} courses. Review below, then check.`;
    $('#reviewSection').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    status.className = 'status error';
    status.textContent = 'Error: ' + e.message;
  }
}

function renderStudent(student, printedEarned) {
  const bits = [];
  if (student.name) bits.push(`<strong>${esc(student.name)}</strong>`);
  if (student.studentId) bits.push(`ID ${esc(student.studentId)}`);
  if (student.program) bits.push(esc(student.program));
  if (printedEarned != null) bits.push(`Transcript states ${printedEarned} credits earned`);
  $('#studentInfo').innerHTML = bits.join(' · ');
}

// ---------- Step 2: editable review table ----------
function wireReview() {
  $('#addRowBtn').addEventListener('click', () => addCourseRow({ code: '', title: '', credit: '', grade: '' }));
  $('#checkBtn').addEventListener('click', runCheck);
  $('#toggleTitleBtn').addEventListener('click', () => {
    const collapsed = $('#courseTable').classList.toggle('title-collapsed');
    $('#toggleTitleBtn').textContent = collapsed ? 'Show title column' : 'Hide title column';
  });
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
    <td><button type="button" class="del-btn" title="Remove">×</button></td>`;
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
  MATCH = runMatcher(courses, CURRICULUM);
  renderResults(MATCH);
  $('#resultSection').classList.remove('hidden');
  $('#excelSection').classList.remove('hidden');
  $('#resultSection').scrollIntoView({ behavior: 'smooth' });
}

function renderResults(m) {
  const t = m.totals;
  const pct = Math.min(100, Math.round((t.progressCredits / t.totalRequired) * 100));
  const overall = $('#overall');
  overall.innerHTML = `
    <div class="overall-num"><span class="big">${t.progressCredits}</span> / ${t.totalRequired} credits toward graduation
      &nbsp;·&nbsp; ${t.remainingToGraduate} to go</div>
    <div class="overall-bar"><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div>
    ${t.complete ? '<p class="sanity ok">✓ All categories satisfied — you meet the graduation requirements!</p>' : ''}
    ${sanityHtml(m)}`;

  // Categories grouped.
  const groups = { GenEd: [], Major: [], Free: [] };
  m.results.forEach((r) => (groups[r.group] || (groups[r.group] = [])).push(r));
  const groupNames = { GenEd: 'General Education (30)', Major: 'Major — วิชาเฉพาะ (100)', Free: 'Free Elective (6)' };
  let html = '';
  for (const g of ['GenEd', 'Major', 'Free']) {
    if (!groups[g] || !groups[g].length) continue;
    html += `<div class="group-title">${groupNames[g] || g}</div>`;
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
    return `<p class="sanity ok">Sanity check ✓ — computed ${m.totals.earnedAllPassed} earned credits matches the transcript's printed total (${p}).</p>`;
  }
  return `<p class="sanity warn">Sanity check ⚠ — computed ${m.totals.earnedAllPassed} earned credits vs transcript's printed ${p}. Some rows may be mis-parsed; review the table above.</p>`;
}

function catHtml(r) {
  const pct = Math.min(100, Math.round((Math.min(r.earnedCredits, r.requiredCredits) / r.requiredCredits) * 100) || 0);
  const pill = r.complete
    ? '<span class="pill done">DONE</span>'
    : '<span class="pill todo">TODO</span>';
  let detail = '';
  if (r.mode === 'one-of-paths') {
    detail += altPathPickerHtml(r);
  } else {
    if (r.reason) detail += `<div class="cat-detail">${esc(r.reason)}</div>`;
    if (r.path) detail += `<div class="cat-detail">Path: <code>${esc(r.path)}</code></div>`;
  }
  if (r.fullTrack) detail += `<div class="cat-detail">Full track: <code>${esc(r.fullTrack)}</code></div>`;
  if (r.missingMandatory && r.missingMandatory.length)
    detail += `<div class="cat-detail">Missing mandatory: ${r.missingMandatory.map(courseChip).join(' ')}</div>`;
  if (r.missingCourses && r.missingCourses.length) {
    detail += `<div class="cat-detail">Still required (${r.missingCourses.length}):<ul class="missing-list">` +
      r.missingCourses.map((c) => `<li>${courseChip(c)}</li>`).join('') + '</ul></div>';
  }
  if (!r.complete && r.remainingCredits > 0 && r.mode !== 'all-of')
    detail += `<div class="cat-detail">Need <strong>${r.remainingCredits}</strong> more credit(s).</div>`;
  if (r.note) detail += `<div class="cat-detail" style="opacity:.7">${esc(r.note)}</div>`;

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
    <label>Choose your path:
      <select id="altPathSelect">${options}</select>
    </label>
    <div id="altPathChecklist">${altPathChecklistHtml(paths[selectedAltPath], r.requiredCredits)}</div>
  </div>`;
}

function altPathChecklistHtml(codes, requiredCredits) {
  let earned = 0;
  const items = codes.map((code) => {
    const passedCourse = MATCH.passed.find((c) => c.code === code);
    const inProgCourse = MATCH.inProgress.find((c) => c.code === code);
    const title = (CURRICULUM.courseTitles && CURRICULUM.courseTitles[code]) || '';
    let icon = '○', note = 'not taken';
    if (passedCourse) { icon = '✓'; note = passedCourse.grade || 'passed'; earned += passedCourse.credit; }
    else if (inProgCourse) { icon = '⏳'; note = 'in progress'; }
    return `<li>${icon} <code>${esc(code)}</code>${title ? ' – ' + esc(title) : ''} <span class="path-note">(${esc(note)})</span></li>`;
  }).join('');
  const done = earned >= requiredCredits;
  return `<ul class="missing-list path-checklist">${items}</ul>
    <div class="path-progress ${done ? 'done' : ''}">${earned} / ${requiredCredits} cr in this path${done ? ' ✓' : ''}</div>`;
}

function wireAltPathPicker() {
  $('#categories').addEventListener('change', (e) => {
    if (e.target.id !== 'altPathSelect') return;
    selectedAltPath = e.target.value;
    const catDef = CURRICULUM.categories.find((c) => c.id === 'ce_alt_study');
    $('#altPathChecklist').innerHTML = altPathChecklistHtml(catDef.paths[selectedAltPath], catDef.requiredCredits);
  });
}

function extrasHtml(m) {
  let html = '<div class="extras">';
  if (m.inProgress.length) {
    html += '<h3>⏳ In progress (no grade yet — not counted)</h3>' +
      m.inProgress.map((c) => `<span class="chip">${esc(c.code)} ${esc(c.title)}</span>`).join('');
  }
  if (m.failed.length) {
    html += '<h3>✗ Failed / withdrawn</h3>' +
      m.failed.map((c) => `<span class="chip warn">${esc(c.code)} ${esc(c.grade || '')}</span>`).join('');
  }
  if (m.unmatched.length) {
    html += '<h3>❓ Passed but not applied to any requirement</h3>' +
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
    $('#excelStatus').textContent = 'Template loaded: ' + input.files[0].name;
  });

  $('#fillBtn').addEventListener('click', async () => {
    if (!MATCH || !TEMPLATE_BUFFER) return;
    const status = $('#excelStatus');
    try {
      status.className = 'status';
      status.textContent = 'Filling…';
      const { blob, log } = await fillTemplate(TEMPLATE_BUFFER, MATCH, CURRICULUM);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'checklist_filled.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      status.className = 'status ok';
      status.textContent = 'Done — downloaded checklist_filled.xlsx';
      $('#excelLog').innerHTML = log.map((l) => `<li>${esc(l)}</li>`).join('');
    } catch (e) {
      status.className = 'status error';
      status.textContent = 'Error filling template: ' + e.message;
    }
  });
}

function courseChip(code) {
  const title = CURRICULUM.courseTitles && CURRICULUM.courseTitles[code];
  return `<code>${esc(code)}</code>${title ? ' – ' + esc(title) : ''}`;
}

// ---------- util ----------
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
