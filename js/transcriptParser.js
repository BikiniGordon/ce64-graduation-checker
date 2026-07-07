// transcriptParser.js
// Turns the ordered text lines from pdfParser.js into structured data:
//   { student, courses, printedEarned }
// A course line begins with an 8-digit course code. Titles may wrap onto a
// following line, in which case the credit/grade land on that continuation.

const NOISE_PATTERNS = [
  /\bGPA\b/i,
  /\bGPS\b/i,
  /semester/i,
  /transfer credit/i,
  /total number of credit/i,
  /cumulative/i,
  /transcript closed/i,
  /continue next column/i,
  /checked by/i,
  /unofficial transcript/i,
  /this document is/i,
  /date issued/i,
  /^course title/i,
  /^credit\b/i,
  /^grade\b/i,
  /xxxxx/i,
];

// Valid grade tokens at the end of a course line.
const GRADE_RE = /(A|B\+|B|C\+|C|D\+|D|F|S|U|W|I)$/;

function isNoise(line) {
  return NOISE_PATTERNS.some((re) => re.test(line));
}

/**
 * @param {string[]} lines
 * @returns {{student:object, courses:object[], printedEarned:(number|null)}}
 */
function parseTranscript(lines) {
  const student = extractStudentInfo(lines);
  const printedEarned = extractPrintedEarned(lines);

  const courses = [];
  let pending = null;

  const finalize = () => {
    if (!pending) return;
    // credit is mandatory; a code entry with no credit found is dropped as noise.
    if (pending.credit !== null) {
      courses.push({
        code: pending.code,
        title: pending.title.replace(/\s+/g, ' ').trim(),
        credit: pending.credit,
        grade: pending.grade,
        status: gradeStatus(pending.grade),
      });
    }
    pending = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const codeMatch = line.match(/^(\d{8})\b\s*(.*)$/);
    if (codeMatch) {
      finalize();
      pending = { code: codeMatch[1], title: '', credit: null, grade: null };
      absorb(pending, codeMatch[2]);
      continue;
    }

    if (isNoise(line)) {
      finalize();
      continue;
    }

    // Continuation line: either supplies a still-missing credit/grade, or is
    // pure title overflow that we append to the title.
    if (pending) absorb(pending, line);
  }
  finalize();

  return { student, courses, printedEarned };
}

/**
 * Fold a chunk of text into the pending course. In this transcript the credit
 * and grade sit on the code line's row; wrapped titles overflow to later lines.
 * So: if credit isn't set yet and the chunk ends with "<int> [grade]", capture
 * it and treat the leading part as title text; otherwise append to the title.
 */
function absorb(pending, chunk) {
  const text = chunk.replace(/\s+/g, ' ').trim();
  if (!text) return;

  if (pending.credit === null) {
    const m = text.match(/^(.*?)\s*(\d{1,2})\s*(A|B\+|B|C\+|C|D\+|D|F|S|U|W|I)?$/);
    if (m && parseInt(m[2], 10) <= 12) {
      if (m[1].trim()) pending.title += ' ' + m[1].trim();
      pending.credit = parseInt(m[2], 10);
      pending.grade = m[3] || null;
      return;
    }
  }
  pending.title += ' ' + text;
}

function gradeStatus(grade) {
  if (grade === null) return 'in-progress';
  if (['F', 'U', 'W', 'I'].includes(grade)) return 'failed';
  return 'passed';
}

function extractStudentInfo(lines) {
  const info = { name: null, studentId: null, program: null, admission: null };
  for (const line of lines) {
    let m;
    if ((m = line.match(/Name\s+(.+?)(?:\s{2,}|$)/)) && !info.name) {
      info.name = m[1].replace(/Student ID.*$/i, '').trim();
    }
    if ((m = line.match(/Student ID\s+(\d+)/)) && !info.studentId) {
      info.studentId = m[1];
    }
    if ((m = line.match(/Program\s+(.+)$/)) && !info.program) {
      info.program = m[1].trim();
    }
    if ((m = line.match(/Date of Admission\s+(\d{4})/)) && !info.admission) {
      info.admission = m[1];
    }
  }
  return info;
}

function extractPrintedEarned(lines) {
  for (const line of lines) {
    const m = line.match(/total number of credit earned\s*:?\s*(\d+)/i);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

window.parseTranscript = parseTranscript;
