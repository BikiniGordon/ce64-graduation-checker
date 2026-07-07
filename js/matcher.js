// matcher.js
// Greedy, priority-ordered assignment of transcript courses to curriculum
// categories. Each passed course is consumed at most once. Returns per-category
// results plus overall totals, in-progress / failed / unmatched lists.
//
// The returned `assignment` map (courseKey -> categoryId) is reused by
// excelFiller.js so the Excel output stays consistent with the dashboard.

function runMatcher(courses, curriculum) {
  const aliases = curriculum.codeAliases || {};
  const passed = [];
  const inProgress = [];
  const failed = [];
  courses.forEach((c, idx) => {
    // Normalize transcript codes to the curriculum's canonical codes so that
    // registrar renumberings (e.g. 01076001 -> 01076101) still match.
    const code = aliases[c.code] || c.code;
    const entry = { ...c, code, rawCode: c.code, _i: idx };
    if (c.status === 'in-progress') inProgress.push(entry);
    else if (c.status === 'failed') failed.push(entry);
    else passed.push(entry);
  });

  const consumed = new Set();
  const assignment = {}; // `${_i}` -> categoryId
  const take = (course, catId) => {
    consumed.add(course._i);
    assignment[course._i] = catId;
  };
  const avail = (code) => passed.find((c) => c.code === code && !consumed.has(c._i));
  const unconsumed = () => passed.filter((c) => !consumed.has(c._i));

  const cats = curriculum.categories;
  const results = {};

  // ---- Stage 1: explicit required lists (all-of) ----
  for (const cat of cats.filter((c) => c.mode === 'all-of')) {
    const assigned = [];
    const missing = [];
    for (const code of cat.courses) {
      const got = avail(code);
      if (got) { take(got, cat.id); assigned.push(got); }
      else missing.push(code);
    }
    results[cat.id] = baseResult(cat, assigned, { missingCourses: missing });
  }

  // ---- Stage 1b: reserve mandatory codes for prefix-pool categories ----
  const reserved = {};
  for (const cat of cats.filter((c) => c.mode === 'prefix-pool' && c.mandatoryCourses)) {
    reserved[cat.id] = [];
    for (const code of cat.mandatoryCourses) {
      const got = avail(code);
      if (got) { take(got, cat.id); reserved[cat.id].push(got); }
    }
  }

  // ---- Stage 2: compulsory-elective tracks ----
  for (const cat of cats.filter((c) => c.mode === 'tracks')) {
    results[cat.id] = matchTracks(cat, avail, take);
  }

  // ---- Stage 3: alternative-study paths ----
  for (const cat of cats.filter((c) => c.mode === 'one-of-paths')) {
    results[cat.id] = matchPaths(cat, avail, take);
  }

  // ---- Stage 4: major-elective pool (+ spill from compulsory leftovers) ----
  for (const cat of cats.filter((c) => c.mode === 'pool')) {
    results[cat.id] = matchPool(cat, curriculum, unconsumed, take);
  }

  // ---- Stage 5: prefix pools (GenEd foundation/language/elective) ----
  for (const cat of cats.filter((c) => c.mode === 'prefix-pool')) {
    results[cat.id] = matchPrefixPool(cat, reserved[cat.id] || [], unconsumed, take);
  }

  // ---- Stage 6: free elective (anything left) ----
  for (const cat of cats.filter((c) => c.mode === 'any')) {
    results[cat.id] = matchAny(cat, unconsumed, take);
  }

  // Order results by the curriculum's category order for display.
  const orderedResults = cats.map((c) => results[c.id]);

  // ---- Totals ----
  const earnedAllPassed = passed.reduce((s, c) => s + c.credit, 0);
  const progressCredits = orderedResults.reduce(
    (s, r) => s + Math.min(r.earnedCredits, r.requiredCredits), 0);
  const totalRequired = curriculum.meta.totalCredits;
  const unmatched = unconsumed();

  return {
    results: orderedResults,
    assignment,
    totals: {
      totalRequired,
      earnedAllPassed,
      progressCredits,
      remainingToGraduate: Math.max(0, totalRequired - progressCredits),
      complete: progressCredits >= totalRequired &&
        orderedResults.every((r) => r.complete),
    },
    inProgress,
    failed,
    unmatched,
    passed,
  };
}

// ---------- per-mode matchers ----------

function baseResult(cat, assigned, extra = {}) {
  const earnedCredits = assigned.reduce((s, c) => s + c.credit, 0);
  return {
    id: cat.id,
    name: cat.name,
    group: cat.group,
    mode: cat.mode,
    note: cat.note || null,
    noteTh: cat.noteTh || null,
    requiredCredits: cat.requiredCredits,
    earnedCredits,
    remainingCredits: Math.max(0, cat.requiredCredits - earnedCredits),
    assigned,
    complete: earnedCredits >= cat.requiredCredits &&
      (!extra.missingCourses || extra.missingCourses.length === 0),
    ...extra,
  };
}

function matchTracks(cat, avail, take) {
  const assigned = [];
  let chosenFull = null;

  // Prefer completing one full track first.
  for (const [name, codes] of Object.entries(cat.tracks)) {
    if (codes.every((code) => avail(code))) { chosenFull = name; break; }
  }
  if (chosenFull) {
    for (const code of cat.tracks[chosenFull]) {
      const c = avail(code);
      take(c, cat.id); assigned.push(c);
    }
  }
  // Fill up to requiredCredits from any remaining track courses.
  let earned = assigned.reduce((s, c) => s + c.credit, 0);
  for (const code of Object.values(cat.tracks).flat()) {
    if (earned >= cat.requiredCredits) break;
    const c = avail(code);
    if (c) { take(c, cat.id); assigned.push(c); earned += c.credit; }
  }

  const res = baseResult(cat, assigned);
  res.fullTrack = chosenFull;
  res.complete = !!chosenFull && earned >= cat.requiredCredits;
  if (res.complete) {
    res.reasonKey = null;
  } else if (!chosenFull) {
    res.reasonKey = 'needFullTrack';
  } else {
    res.reasonKey = 'needMoreTrackCredits';
    res.reasonParams = { n: cat.requiredCredits - earned };
  }
  return res;
}

function matchPaths(cat, avail, take) {
  for (const [name, codes] of Object.entries(cat.paths)) {
    if (codes.every((code) => avail(code))) {
      const assigned = codes.map((code) => { const c = avail(code); take(c, cat.id); return c; });
      const res = baseResult(cat, assigned);
      res.path = name;
      res.complete = res.earnedCredits >= cat.requiredCredits;
      return res;
    }
  }
  const res = baseResult(cat, []);
  res.path = null;
  res.reasonKey = 'choosePath';
  res.pathOptions = Object.keys(cat.paths);
  return res;
}

function matchPool(cat, curriculum, unconsumed, take) {
  const eligible = new Set(cat.courses);
  const spill = new Set();
  if (cat.allowSpillFrom) {
    for (const srcId of cat.allowSpillFrom) {
      const src = curriculum.categories.find((c) => c.id === srcId);
      if (src && src.tracks) Object.values(src.tracks).flat().forEach((code) => spill.add(code));
    }
  }
  const assigned = [];
  let earned = 0;
  for (const c of unconsumed()) {
    if (earned >= cat.requiredCredits) break;
    if (eligible.has(c.code) || spill.has(c.code)) { take(c, cat.id); assigned.push(c); earned += c.credit; }
  }
  return baseResult(cat, assigned);
}

function matchPrefixPool(cat, reservedCourses, unconsumed, take) {
  const assigned = [...reservedCourses];
  let earned = assigned.reduce((s, c) => s + c.credit, 0);
  for (const c of unconsumed()) {
    if (earned >= cat.requiredCredits) break;
    if (c.code.startsWith(cat.prefix)) { take(c, cat.id); assigned.push(c); earned += c.credit; }
  }
  const res = baseResult(cat, assigned);
  if (cat.mandatoryCourses) {
    res.missingMandatory = cat.mandatoryCourses.filter(
      (code) => !assigned.some((c) => c.code === code));
    if (res.missingMandatory.length) res.complete = false;
  }
  return res;
}

function matchAny(cat, unconsumed, take) {
  const assigned = [];
  let earned = 0;
  for (const c of unconsumed()) {
    if (earned >= cat.requiredCredits) break;
    take(c, cat.id); assigned.push(c); earned += c.credit;
  }
  return baseResult(cat, assigned);
}

window.runMatcher = runMatcher;
