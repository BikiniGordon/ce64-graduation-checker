// i18n.js — translation dictionary + tiny helper. No framework, no build step.

const I18N = {
  en: {
    headerTitle: 'CE KMITL — Graduation Checker ({year} Syllabus version)',
    subBase: 'Upload your unofficial transcript PDF to see what you still need to graduate.',
    subExcelNote: 'You can also auto-fill your Excel tracking checklist.',
    subPrivacy: 'Everything runs in your browser — nothing is uploaded.',
    disclaimer: '⚠ Unofficial tool for <strong>{ver} (พ.ศ. {year}) only</strong> — data was hand-transcribed and may contain mistakes. Verify with the official syllabus and your advisor.',
    newCurriculumNote: 'NEW <strong>{ver} (พ.ศ. {year}) is the newest revision and has only just come into effect.</strong> It hasn\'t been battle-tested against real transcripts yet, so course codes, credit splits, and category rules are especially likely to need correction — please double- and triple-check everything against the official syllabus before relying on it.',
    curriculumVersionLabel: 'Syllabus:',

    step1Title: '1 · Upload transcript (PDF)',
    dropZoneText: 'Drag &amp; drop your transcript PDF here, or <button type="button" id="pdfBtn" class="link-btn">browse</button>',
    transcriptHelpSummary: 'Where do I get the PDF?',
    transcriptHelp: 'Get your <strong>unofficial transcript</strong> from <a href="https://www.reg.kmitl.ac.th/u_student/report_transcript_show2.php" target="_blank" rel="noopener noreferrer">the KMITL registration system</a> — log in with your student ID, open the transcript page, and download it as PDF.',

    step2Title: '2 · Review parsed courses',
    reviewHint: 'Fix any mis-read row before checking. Grade blank = in-progress.',
    hideTitleColumn: 'Hide title column',
    showTitleColumn: 'Show title column',
    thCode: 'Code', thTitle: 'Title', thCredit: 'Credit', thGrade: 'Grade',
    addRowBtn: '+ Add row',
    checkBtn: 'Check graduation ▸',
    removeRowTitle: 'Remove',

    step3Title: '3 · Graduation status',
    resultHint: 'Reference for {ver} (พ.ศ. {year}) only — verify against the official syllabus before relying on this.',

    step4Title: '4 · Auto-fill your Excel checklist (optional)',
    excelHint: 'Upload your tracking template — we\'ll <strong>auto-fill it from your transcript</strong>. No template? <a href="https://docs.google.com/spreadsheets/d/1R8q71tQRTK_kbs3xTkeHaSPa9aVjujJjepePnJegGrw/edit?usp=sharing" target="_blank" rel="noopener noreferrer">Get a copy here</a> (credit to its original author).',
    fillBtn: 'Fill &amp; download ▾',

    footer: 'Computer Engineering, KMITL — พ.ศ. {year} ({ver}) · Unofficial tool — confirm results with the official syllabus / your advisor.',

    failedToLoadCurriculum: 'Failed to load curriculum rules: {msg}',
    readingFile: 'Reading {name} …',
    noCoursesDetected: 'No courses detected — is this a KMITL transcript PDF?',
    parsedCourses: 'Parsed {n} courses. Review below, then check.',
    errorPrefix: 'Error: {msg}',
    idLabel: 'ID {id}',
    transcriptStatesCredits: 'Transcript states {n} credits earned',
    unknownSemester: 'Unspecified semester',
    semesterPos: 'Semester {n} of {total}',
    semesterCreditsTotal: '{n} credit(s) this semester',
    semGpaLabel: 'Semester GPA',
    semCumulativeGpaLabel: 'Cumulative GPA (through this semester)',
    semCumulativeDelta: '{sign}{delta} vs. previous cumulative GPA',

    overallProgress: '{earned} / {total} credits toward graduation',
    toGo: '{n} to go',
    allSatisfied: '[✓] All categories satisfied — you meet the graduation requirements!',
    sanityOk: 'Sanity check [✓] — computed {a} earned credits matches the transcript\'s printed total ({b}).',
    sanityWarn: 'Sanity check ⚠ — computed {a} earned credits vs transcript\'s printed {b}. Some rows may be mis-parsed; review the table above.',

    groupGenEd: 'General Education ({n})',
    groupMajor: 'Major — วิชาเฉพาะ ({n})',
    groupFree: 'Free Elective ({n})',

    pillDone: 'DONE',
    pillTodo: 'TODO',
    pathLabel: 'Path: {path}',
    fullTrackLabel: 'Full track: {track}',
    missingMandatory: 'Missing mandatory: {list}',
    stillRequired: 'Still required ({n}):',
    needMoreCredits: 'Need {n} more credit(s).',
    chooseYourPath: 'Choose your path:',
    pathProgressLabel: '{earned} / {required} cr in this path',

    notTaken: 'not taken',
    inProgressNote: 'in progress',
    passedFallback: 'passed',

    inProgressHeader: '→ In progress (no grade yet — not counted)',
    failedHeader: '[✗] Failed / withdrawn',
    unmatchedHeader: '[?] Passed but not applied to any requirement',

    templateLoaded: 'Template loaded: {name}',
    filling: 'Filling…',
    doneDownloaded: 'Done — downloaded checklist_filled.xlsx',
    errorFillingTemplate: 'Error filling template: {msg}',

    needFullTrack: 'Complete at least one full professional track.',
    needMoreTrackCredits: 'Need {n} more credit(s) from the tracks.',
    choosePath: 'Choose one path: Project 1+2, Co-operative Education, or Overseas Training.',

    altPathProject: 'Project 1 + 2',
    altPathCooperative: 'Co-operative Education',
    altPathOverseas: 'Overseas Training',
    altPathAcademic: 'Academic (extra Specialized Elective)',
    altPathPoolNote: 'Take 2 more courses (6 credits) from the {poolName} pool — on top of that category\'s own requirement.',
    altPathPoolProgress: '{earned} / {required} cr total from this pool (covers both requirements)',

    gradePlannerBtn: 'Grade Planner ▸',

    gpPageTitle: 'Grade Planner',
    gpBackLink: '← Back to Graduation Checker',
    gpSub: 'Simulate grades for your ungraded courses and preview your GPA (rounded to 3 decimals).',
    gpEmptyTitle: 'No transcript data found',
    gpEmptyText: 'Go back to the Graduation Checker, upload your transcript, and click "Grade Planner ▸" from the review step.',
    gpEmptyLink: '← Go upload your transcript',

    gpPriorTitle: 'Your GPA so far',
    gpPriorStat: '{gpa} GPA · {credits} graded credit(s)',
    gpPriorNone: 'No graded courses found yet — projections below will be based on this semester alone.',
    gpExcludedNote: '{n} course(s) with non-GPA grades (S/U/W/I) were excluded from all calculations below.',

    gpSimTitle: 'This semester — simulate your grades',
    gpSimHint: 'Courses with no grade posted yet — pick a grade for each.',
    thGradeSim: 'Simulated grade',
    gpAddRowBtn: '+ Add course',
    gpGradeUnset: '— unset —',

    gpResultsTitle: 'Projected results',
    gpFilledCount: '{filled} of {total} course(s) set',
    gpSemesterGpa: 'This semester GPA',
    gpCumulativeGpa: 'Projected cumulative GPA',
    gpNoDataYet: '—',

    gpTargetTitle: 'Or work backwards: set a target cumulative GPA',
    gpTargetHint: 'Enter your goal — we\'ll compute the semester GPA you need to get there.',
    gpTargetLabel: 'Target cumulative GPA',
    gpTargetNeedCourses: 'Add your in-progress courses first.',
    gpRequiredGpa: 'You need at least a {gpa} GPA this semester.',
    gpRequiredHint: '≈ {letter} average or better',
    gpNotAchievable: 'Not achievable this semester — even straight A\'s only get you to a {maxGpa} cumulative GPA.',
    gpAlreadySecured: 'Already secured — any passing grade(s) this semester will keep you at or above this target.',
  },
  th: {
    headerTitle: 'CE KMITL — เครื่องมือตรวจสอบการจบการศึกษา (ฉบับหลักสูตร {year})',
    subBase: 'อัปโหลดใบแสดงผลการเรียน (unofficial transcript) ของคุณ เพื่อดูว่ายังต้องลงทะเบียนอะไรอีกจึงจะจบการศึกษา',
    subExcelNote: 'พร้อมกรอกเช็คลิสต์ Excel ให้อัตโนมัติได้ด้วย (ไม่บังคับ)',
    subPrivacy: 'ทุกอย่างประมวลผลในเบราว์เซอร์ของคุณ — ไม่มีการอัปโหลดข้อมูลไปที่ใด',
    disclaimer: '⚠ เครื่องมือไม่เป็นทางการ สำหรับ <strong>{ver} (พ.ศ. {year}) เท่านั้น</strong> — ข้อมูลคัดลอกด้วยมือและอาจมีข้อผิดพลาด โปรดตรวจสอบกับหลักสูตรฉบับทางการและอาจารย์ที่ปรึกษา',
    newCurriculumNote: 'NEW <strong>{ver} (พ.ศ. {year}) เป็นหลักสูตรฉบับล่าสุดที่เพิ่งเริ่มใช้</strong> ยังไม่เคยผ่านการตรวจสอบกับใบแสดงผลการเรียนจริง จึงมีโอกาสสูงที่รหัสวิชา การแบ่งหน่วยกิต และกฎเกณฑ์ต่าง ๆ จะต้องมีการแก้ไข — โปรดตรวจสอบทุกอย่างซ้ำกับหลักสูตรฉบับทางการก่อนนำไปใช้จริง',
    curriculumVersionLabel: 'หลักสูตร:',

    step1Title: '1 · อัปโหลดใบแสดงผลการเรียน (PDF)',
    dropZoneText: 'ลากไฟล์ PDF ใบแสดงผลการเรียนมาวางที่นี่ หรือ <button type="button" id="pdfBtn" class="link-btn">เลือกไฟล์</button>',
    transcriptHelpSummary: 'จะเอาไฟล์ PDF มาจากไหน?',
    transcriptHelp: 'ดาวน์โหลด<strong>ใบแสดงผลการเรียนแบบไม่เป็นทางการ</strong>ได้จาก<a href="https://www.reg.kmitl.ac.th/u_student/report_transcript_show2.php" target="_blank" rel="noopener noreferrer">ระบบทะเบียนของ สจล.</a> — เข้าสู่ระบบด้วยรหัสนักศึกษา เปิดหน้าใบแสดงผลการเรียน แล้วดาวน์โหลดเป็น PDF',

    step2Title: '2 · ตรวจสอบรายวิชาที่อ่านได้',
    reviewHint: 'แก้ไขแถวที่อ่านผิดก่อนตรวจสอบ ช่องเกรดว่าง = กำลังเรียนอยู่',
    hideTitleColumn: 'ซ่อนคอลัมน์ชื่อวิชา',
    showTitleColumn: 'แสดงคอลัมน์ชื่อวิชา',
    thCode: 'รหัสวิชา', thTitle: 'ชื่อวิชา', thCredit: 'หน่วยกิต', thGrade: 'เกรด',
    addRowBtn: '+ เพิ่มแถว',
    checkBtn: 'ตรวจสอบการจบการศึกษา ▸',
    removeRowTitle: 'ลบ',

    step3Title: '3 · สถานะการจบการศึกษา',
    resultHint: 'อ้างอิงสำหรับ {ver} (พ.ศ. {year}) เท่านั้น — โปรดตรวจสอบกับหลักสูตรฉบับทางการก่อนนำไปใช้จริง',

    step4Title: '4 · กรอกเช็คลิสต์ Excel ให้อัตโนมัติ (ไม่บังคับ)',
    excelHint: 'อัปโหลดเทมเพลตติดตามผลของคุณ แล้วระบบจะ<strong>กรอกให้อัตโนมัติจากใบแสดงผลการเรียน</strong> ยังไม่มีเทมเพลต? <a href="https://docs.google.com/spreadsheets/d/1R8q71tQRTK_kbs3xTkeHaSPa9aVjujJjepePnJegGrw/edit?usp=sharing" target="_blank" rel="noopener noreferrer">ขอสำเนาได้ที่นี่</a> (เครดิตแก่ผู้สร้างต้นฉบับ)',
    fillBtn: 'กรอกและดาวน์โหลด ▾',

    footer: 'วิศวกรรมคอมพิวเตอร์ สจล. — พ.ศ. {year} ({ver}) · เครื่องมือไม่เป็นทางการ — โปรดยืนยันผลลัพธ์กับหลักสูตรฉบับทางการ / อาจารย์ที่ปรึกษา',

    failedToLoadCurriculum: 'โหลดกฎเกณฑ์หลักสูตรไม่สำเร็จ: {msg}',
    readingFile: 'กำลังอ่าน {name} …',
    noCoursesDetected: 'ไม่พบรายวิชา — ไฟล์นี้เป็นใบแสดงผลการเรียนของ สจล. หรือไม่?',
    parsedCourses: 'อ่านได้ {n} รายวิชา ตรวจสอบด้านล่างแล้วกดตรวจสอบ',
    errorPrefix: 'ข้อผิดพลาด: {msg}',
    idLabel: 'รหัสนักศึกษา {id}',
    transcriptStatesCredits: 'ใบแสดงผลการเรียนระบุหน่วยกิตสะสม {n} หน่วยกิต',
    unknownSemester: 'ภาคเรียนที่ไม่ระบุ',
    semesterPos: 'ภาคเรียนที่ {n} จาก {total}',
    semesterCreditsTotal: '{n} หน่วยกิตในภาคเรียนนี้',
    semGpaLabel: 'เกรดเฉลี่ยภาคเรียนนี้',
    semCumulativeGpaLabel: 'เกรดเฉลี่ยสะสม (ถึงภาคเรียนนี้)',
    semCumulativeDelta: '{sign}{delta} เทียบกับเกรดเฉลี่ยสะสมก่อนหน้า',

    overallProgress: '{earned} / {total} หน่วยกิต สู่การจบการศึกษา',
    toGo: 'เหลืออีก {n}',
    allSatisfied: '[✓] ครบทุกหมวดแล้ว — คุณผ่านเกณฑ์การจบการศึกษา!',
    sanityOk: 'ตรวจสอบความถูกต้อง [✓] — หน่วยกิตที่คำนวณได้ {a} ตรงกับยอดรวมในใบแสดงผลการเรียน ({b})',
    sanityWarn: 'ตรวจสอบความถูกต้อง ⚠ — หน่วยกิตที่คำนวณได้ {a} ไม่ตรงกับยอดในใบแสดงผลการเรียน {b} บางแถวอาจอ่านผิด โปรดตรวจสอบตารางด้านบน',

    groupGenEd: 'หมวดวิชาศึกษาทั่วไป ({n})',
    groupMajor: 'หมวดวิชาเฉพาะ ({n})',
    groupFree: 'หมวดวิชาเลือกเสรี ({n})',

    pillDone: 'ครบแล้ว',
    pillTodo: 'ยังไม่ครบ',
    pathLabel: 'แนวทาง: {path}',
    fullTrackLabel: 'แขนงวิชาที่ครบ: {track}',
    missingMandatory: 'ยังขาดวิชาบังคับ: {list}',
    stillRequired: 'ยังต้องลงอีก ({n}):',
    needMoreCredits: 'ต้องการอีก <strong>{n}</strong> หน่วยกิต',
    chooseYourPath: 'เลือกแนวทางของคุณ:',
    pathProgressLabel: '{earned} / {required} หน่วยกิต ในแนวทางนี้',

    notTaken: 'ยังไม่ได้ลง',
    inProgressNote: 'กำลังเรียนอยู่',
    passedFallback: 'ผ่านแล้ว',

    inProgressHeader: '→ กำลังเรียนอยู่ (ยังไม่มีเกรด — ยังไม่นับ)',
    failedHeader: '[✗] ตก / ถอน',
    unmatchedHeader: '[?] ผ่านแล้วแต่ยังไม่ถูกนับในหมวดใด',

    templateLoaded: 'โหลดเทมเพลตแล้ว: {name}',
    filling: 'กำลังกรอกข้อมูล…',
    doneDownloaded: 'เสร็จแล้ว — ดาวน์โหลด checklist_filled.xlsx',
    errorFillingTemplate: 'เกิดข้อผิดพลาดขณะกรอกเทมเพลต: {msg}',

    needFullTrack: 'ต้องเรียนให้ครบอย่างน้อย 1 แขนงวิชาชีพ',
    needMoreTrackCredits: 'ต้องการอีก {n} หน่วยกิตจากแขนงวิชาชีพ',
    choosePath: 'เลือกแนวทางใดแนวทางหนึ่ง: โครงงาน 1+2, สหกิจศึกษา หรือ ฝึกงานต่างประเทศ',

    altPathProject: 'โครงงาน 1 + 2',
    altPathCooperative: 'สหกิจศึกษา',
    altPathOverseas: 'ฝึกงานต่างประเทศ',
    altPathAcademic: 'การศึกษาเชิงวิชาการ (วิชาเลือกเฉพาะสาขาเพิ่มเติม)',
    altPathPoolNote: 'เลือกเรียนอีก 2 วิชา (6 หน่วยกิต) จากกลุ่ม {poolName} — เพิ่มเติมจากที่ใช้ในหมวดนั้นเอง',
    altPathPoolProgress: '{earned} / {required} หน่วยกิต รวมจากกลุ่มนี้ (ครอบคลุมทั้งสองหมวด)',

    gradePlannerBtn: 'วางแผนเกรด ▸',

    gpPageTitle: 'ตัววางแผนเกรด',
    gpBackLink: '← กลับไปหน้าตรวจสอบการจบการศึกษา',
    gpSub: 'จำลองเกรดวิชาที่ยังไม่มีเกรด แล้วดูเกรดเฉลี่ยที่คาดการณ์ (ปัดเศษทศนิยม 3 ตำแหน่ง)',
    gpEmptyTitle: 'ไม่พบข้อมูลใบแสดงผลการเรียน',
    gpEmptyText: 'กลับไปที่หน้าตรวจสอบการจบการศึกษา อัปโหลดใบแสดงผลการเรียน แล้วกด "วางแผนเกรด ▸" จากขั้นตอนตรวจสอบรายวิชา',
    gpEmptyLink: '← ไปอัปโหลดใบแสดงผลการเรียน',

    gpPriorTitle: 'เกรดเฉลี่ยของคุณจนถึงตอนนี้',
    gpPriorStat: 'เกรดเฉลี่ย {gpa} · {credits} หน่วยกิตที่มีเกรดแล้ว',
    gpPriorNone: 'ยังไม่พบวิชาที่มีเกรด — การคาดการณ์ด้านล่างจะอิงจากภาคเรียนนี้เพียงอย่างเดียว',
    gpExcludedNote: 'มี {n} วิชาที่มีเกรดแบบไม่นับเกรดเฉลี่ย (S/U/W/I) ถูกตัดออกจากการคำนวณทั้งหมดด้านล่าง',

    gpSimTitle: 'ภาคเรียนนี้ — จำลองเกรดของคุณ',
    gpSimHint: 'วิชาที่ยังไม่มีเกรด — เลือกเกรดสำหรับแต่ละวิชา',
    thGradeSim: 'เกรดจำลอง',
    gpAddRowBtn: '+ เพิ่มวิชา',
    gpGradeUnset: '— ยังไม่เลือก —',

    gpResultsTitle: 'ผลลัพธ์ที่คาดการณ์',
    gpFilledCount: 'เลือกแล้ว {filled} จาก {total} วิชา',
    gpSemesterGpa: 'เกรดเฉลี่ยภาคเรียนนี้',
    gpCumulativeGpa: 'เกรดเฉลี่ยสะสมที่คาดการณ์',
    gpNoDataYet: '—',

    gpTargetTitle: 'หรือคำนวณย้อนกลับ: ตั้งเป้าเกรดเฉลี่ยสะสม',
    gpTargetHint: 'ใส่เป้าหมายของคุณ — เราจะคำนวณเกรดเฉลี่ยที่ต้องได้ในภาคเรียนนี้',
    gpTargetLabel: 'เป้าหมายเกรดเฉลี่ยสะสม',
    gpTargetNeedCourses: 'เพิ่มวิชาที่กำลังเรียนอยู่ก่อน',
    gpRequiredGpa: 'คุณต้องได้เกรดเฉลี่ยอย่างน้อย {gpa} ในภาคเรียนนี้',
    gpRequiredHint: '≈ เฉลี่ยระดับ {letter} ขึ้นไป',
    gpNotAchievable: 'ไม่สามารถทำได้ในภาคเรียนนี้ — แม้ได้ A ทุกวิชาก็ได้เกรดเฉลี่ยสะสมสูงสุดเพียง {maxGpa}',
    gpAlreadySecured: 'มั่นใจได้แล้ว — ไม่ว่าจะได้เกรดผ่านใดในภาคเรียนนี้ ก็ยังถึงเป้าหมายนี้',
  },
};

let LANG = (typeof localStorage !== 'undefined' && localStorage.getItem('ce64_lang')) || 'en';

function t(key, vars) {
  let str = (I18N[LANG] && I18N[LANG][key]) ?? I18N.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) str = str.replace(`{${k}}`, v);
  }
  return str;
}

function applyStaticI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18n);
  });
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === LANG);
  });
}

function setLang(lang) {
  if (!I18N[lang]) return;
  LANG = lang;
  if (typeof localStorage !== 'undefined') localStorage.setItem('ce64_lang', lang);
  applyStaticI18n();
  if (typeof onLangChange === 'function') onLangChange();
}

// Theme toggle — initial theme is set pre-paint by an inline <head> script.
document.querySelectorAll('.theme-btn').forEach((btn) =>
  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('ce64_theme', next);
  })
);
