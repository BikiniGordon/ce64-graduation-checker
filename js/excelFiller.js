// excelFiller.js
// Reads the user's original tracking template (.xlsx) with ExcelJS, then fills
// the Checklist column and active placeholder rows based on the transcript +
// matcher result. Struck-through rows (removed/changed requirements) are left
// untouched. Returns a Blob of the filled workbook for download.
//
// ExcelJS is used (not SheetJS) because we need to read cell font.strike and
// preserve the template's styling on write.

/* global ExcelJS */

// Section-title keyword -> curriculum category id.
const SECTION_KEYWORDS = [
  ['วิชาพื้นฐาน', 'gened_foundation'],
  ['ภาษาและการสื่อสาร', 'gened_language'],
  ['ตามเกณฑ์ของคณะ', 'gened_faculty'],
  ['เลือก GenEd', 'gened_elective'],
  ['วิชาเลือก GenEd', 'gened_elective'],
  ['เลือกเสรี', 'free_elective'],
  ['Free Elective', 'free_elective'],
  ['วิชาแกน', 'ce_core'],
  ['บังคับเลือก', 'ce_compulsory'],
  ['เฉพาะด้าน บังคับลง', 'ce_required'],
  ['เฉพาะด้าน บังคับ', 'ce_required'],
  ['เลือกเฉพาะสาขา', 'ce_major_elective'],
  ['การศึกษาทางเลือก', 'ce_alt_study'],
];

function sectionToCategory(text) {
  if (!text) return null;
  for (const [kw, id] of SECTION_KEYWORDS) {
    if (text.includes(kw)) return id;
  }
  return null;
}

function normCode(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && v.result !== undefined) v = v.result; // formula cell
  if (typeof v === 'number') return String(Math.trunc(v));
  return String(v).trim().replace(/\.0+$/, '');
}

// Section-header labels span a merged range (e.g. A8:E8). ExcelJS reads the
// merge's master value from every cell inside it, so a "covered" cell like
// B8 reports the header text as its own value even though it's visually
// empty. Normalize that away so code/credit columns aren't fooled by it.
function ownValue(cell) {
  if (cell && cell.isMerged && cell.master !== cell) return null;
  return cell && cell.value;
}

function cellText(cell) {
  const v = cell && cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((r) => r.text).join('');
    if (v.text) return v.text;
    if (v.result !== undefined) return String(v.result);
    return '';
  }
  return String(v);
}

function isStruck(cell) {
  return !!(cell && cell.font && cell.font.strike);
}

// Placeholder course codes come in three template styles: a literal "-",
// a pattern like "9064xxxx"/"90644xxx", or (for Free Elective) a blank code
// paired with a bare type tag instead of a real course row.
function isPlaceholderCode(code) {
  return code === '-' || /x/i.test(code);
}

// Section-header labels are long descriptive strings, often with a
// "(N หน่วยกิต)" credit count; per-row type tags (บังคับลง / เลือกลง / เลือกเสรี,
// incl. common typos) are short with no parenthesis. Used to tell a section
// title apart from a blank-code item row that still needs to be filled.
function isItemTag(text) {
  return text.length > 0 && text.length <= 10 && !text.includes('(');
}

function courseFitsCategory(course, cat) {
  if (!cat) return false;
  switch (cat.mode) {
    case 'all-of':
    case 'pool':
      return cat.courses.includes(course.code);
    case 'tracks':
      return Object.values(cat.tracks).flat().includes(course.code);
    case 'one-of-paths':
      return Object.values(cat.paths).flat().includes(course.code);
    case 'prefix-pool':
      return course.code.startsWith(cat.prefix);
    case 'any':
      return true;
    default:
      return false;
  }
}

// Fill an active placeholder row (pattern/dash/blank code) with an unused
// transcript course that fits `currentCat`, ticking Checklist only if graded.
function fillPlaceholder({ catById, currentCat, poolByCat, match, usedInProgress, log,
  writtenCodes, codeCell, titleCell, creditCell, checkCell }) {
  const cat = catById[currentCat];
  if (!cat) return;
  const queue = poolByCat[currentCat] || [];
  let course = queue.shift();
  let graded = true;
  if (!course) {
    course = match.inProgress.find(
      (c) => !usedInProgress.has(c._i) && courseFitsCategory(c, cat));
    if (course) { usedInProgress.add(course._i); graded = false; }
  }
  if (course) {
    codeCell.value = course.code;
    titleCell.value = course.title;
    if (!cellText(creditCell).trim()) creditCell.value = course.credit;
    checkCell.value = graded;
    writtenCodes.add(course.code);
    log.push(`Filled ${cat.name}: ${course.code} ${course.title}` +
      (graded ? ' ✓' : ' (in-progress, unticked)'));
  }
}

// Fixed drop zone for anything that never made it into the template (the
// template only has so many rows): the "Overall" sheet, starting at row 30,
// in the same Type / Course No. / Course Title / Credit(s) / Checklist
// layout the template's own blocks use. Row 30 is a known-empty spot in that
// column group on the reference template — the sheet's other column group
// (CE Major) runs much further down, but this only touches columns A-E.
const OVERFLOW_SHEET_NAME = 'overall';
const OVERFLOW_START_ROW = 30;

function appendOverflowSection(match, writtenCodes, log, workbook) {
  const overflow = [...match.passed, ...match.inProgress].filter((c) => !writtenCodes.has(c.code));
  if (!overflow.length) return;

  const sheet = workbook.worksheets.find((s) => s.name.trim().toLowerCase() === OVERFLOW_SHEET_NAME) ||
    workbook.worksheets[0];
  if (!sheet) return;

  const [typeCol, codeCol, titleCol, creditCol, checkCol] = [1, 2, 3, 4, 5];
  let r = OVERFLOW_START_ROW;

  sheet.getCell(r, typeCol).value = 'Overflow';
  sheet.getCell(r, typeCol).font = { bold: true };
  r++;

  const headerRow = sheet.getRow(r);
  headerRow.getCell(typeCol).value = 'Type';
  headerRow.getCell(codeCol).value = 'Course No.';
  headerRow.getCell(titleCol).value = 'Course Title';
  headerRow.getCell(creditCol).value = 'Credit(s)';
  headerRow.getCell(checkCol).value = 'Checklist';
  headerRow.font = { bold: true };
  r++;

  for (const c of overflow) {
    const row = sheet.getRow(r);
    row.getCell(typeCol).value = '-';
    row.getCell(codeCol).value = c.code;
    row.getCell(titleCol).value = c.title;
    row.getCell(creditCol).value = c.credit;
    row.getCell(checkCol).value = c.status !== 'in-progress';
    r++;
  }
  log.push(`Added an "Overflow" section to "${sheet.name}" at row ${OVERFLOW_START_ROW}: ` +
    `${overflow.length} course(s) didn't fit any row in the template.`);
}

/**
 * @param {ArrayBuffer} templateBuffer  the user's original template .xlsx
 * @param {object} match                result of runMatcher()
 * @param {object} curriculum
 * @returns {Promise<{blob:Blob, log:string[]}>}
 */
async function fillTemplate(templateBuffer, match, curriculum) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);

  const catById = Object.fromEntries(curriculum.categories.map((c) => [c.id, c]));
  const passedCodes = new Set(match.passed.map((c) => c.code));
  const inProgressCodes = new Set(match.inProgress.map((c) => c.code));

  // Per-category queue of passed courses available to fill placeholders,
  // drawn from the matcher's assignment.
  const poolByCat = {};
  for (const r of match.results) poolByCat[r.id] = (r.assigned || []).slice();
  const usedInProgress = new Set();
  const writtenCodes = new Set(); // every course code that actually landed in a cell

  const log = [];

  workbook.eachSheet((sheet) => {
    // Find every "Course No." header cell -> defines a block of columns.
    const blocks = [];
    sheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (cellText(cell).trim().toLowerCase() === 'course no.') {
          const block = { headerRow: rowNumber, codeCol: colNumber };
          // Resolve sibling columns by header text in the same row.
          for (let c = colNumber; c <= colNumber + 4; c++) {
            const t = cellText(sheet.getRow(rowNumber).getCell(c)).trim().toLowerCase();
            if (t === 'course title') block.titleCol = c;
            else if (t.startsWith('credit')) block.creditCol = c;
            else if (t === 'checklist') block.checklistCol = c;
          }
          block.typeCol = colNumber - 1;
          block.titleCol = block.titleCol || colNumber + 1;
          block.creditCol = block.creditCol || colNumber + 2;
          block.checklistCol = block.checklistCol || colNumber + 3;
          blocks.push(block);
        }
      });
    });

    for (const block of blocks) {
      let currentCat = null;
      const lastRow = sheet.rowCount;
      for (let r = block.headerRow + 1; r <= lastRow; r++) {
        const row = sheet.getRow(r);
        const codeCell = row.getCell(block.codeCol);
        const typeCell = row.getCell(block.typeCol);
        const titleCell = row.getCell(block.titleCol);
        const creditCell = row.getCell(block.creditCol);
        const checkCell = row.getCell(block.checklistCol);

        const codeVal = normCode(ownValue(codeCell));
        const typeText = cellText(typeCell).trim();

        // Stop this block if we hit another header row.
        if (cellText(codeCell).trim().toLowerCase() === 'course no.') break;

        // A row with no code is either a section-header label (long text,
        // often "(N หน่วยกิต)") or, for blank-code item rows like Free
        // Elective's placeholders, a bare per-row type tag ("เลือกเสรี").
        if (!codeVal) {
          if (typeText && !isItemTag(typeText)) {
            const cat = sectionToCategory(typeText);
            if (cat) currentCat = cat;
            continue;
          }
          const hasCredit = !!cellText(creditCell).trim();
          if (!typeText || !isItemTag(typeText) || !hasCredit) continue; // true spacer row

          // Skip struck-through (removed / changed) rows entirely.
          if (isStruck(titleCell) || isStruck(typeCell)) continue;
          fillPlaceholder({ catById, currentCat, poolByCat, match, usedInProgress, log,
            writtenCodes, codeCell, titleCell, creditCell, checkCell });
          continue;
        }

        // Skip struck-through (removed / changed) rows entirely.
        if (isStruck(titleCell) || isStruck(codeCell) || isStruck(typeCell)) continue;

        if (isPlaceholderCode(codeVal)) {
          fillPlaceholder({ catById, currentCat, poolByCat, match, usedInProgress, log,
            writtenCodes, codeCell, titleCell, creditCell, checkCell });
          continue;
        }

        // Explicit course code row -> tick based on transcript.
        const passed = passedCodes.has(codeVal);
        checkCell.value = passed;
        if (passed) {
          writtenCodes.add(codeVal);
          // This course now has a dedicated, hardcoded slot in the template.
          // Remove it from every category's pool (not just currentCat's) so a
          // placeholder row elsewhere can't reuse the same course a second time
          // (the matcher may have independently assigned it to a different
          // abstract category than the one the template hardcodes it under).
          for (const catId in poolByCat) {
            const i = poolByCat[catId].findIndex((c) => c.code === codeVal);
            if (i >= 0) poolByCat[catId].splice(i, 1);
          }
        }
        if (!passed && inProgressCodes.has(codeVal)) {
          writtenCodes.add(codeVal);
          log.push(`Note: ${codeVal} is in-progress (left unticked).`);
        }
      }
    }
  });

  appendOverflowSection(match, writtenCodes, log, workbook);

  const out = await workbook.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return { blob, log };
}

window.fillTemplate = fillTemplate;
