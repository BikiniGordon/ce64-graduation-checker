# CE KMITL — Graduation Checker

A **static, client-side** website: upload your KMITL unofficial transcript PDF and see
what you still need to enroll in to graduate (Computer Engineering, curriculum พ.ศ. 2564,
136 credits). It can also fill your Excel tracking checklist.

**Nothing is uploaded** — the PDF/Excel are parsed entirely in your browser.

## Run it

```bash
cd /Users/gat/Documents/Project/CE64
python3 -m http.server 4173
# open http://localhost:4173
```

(Must be served over HTTP, not opened as a `file://` — the app fetches `data/curriculum.json`.)

## How it works

1. **Upload transcript PDF** → parsed with pdf.js (`js/pdfParser.js`, `js/transcriptParser.js`).
2. **Review** the parsed courses (editable table — fix any mis-read row).
3. **Check graduation** → `js/matcher.js` assigns each passed course to a requirement
   category and reports per-category progress + what's missing.
4. **Fill Excel (optional)** → upload your template; `js/excelFiller.js` ticks completed
   courses, fills active placeholder rows from your transcript, and skips struck-through rows.

Curriculum rules live in **`data/curriculum.json`** (config-driven — editable, no code changes
needed to tweak requirements or add another major/year).

## Verified against `doc.pdf`

- Parses all 47 courses; computed **earned credits = 93**, matching the transcript's printed total.
- In-progress courses (blank grade) excluded; every passed course applied (0 unmatched).

## Known data caveats (course-code drift)

Registrar course codes have changed between catalog versions, so a transcript may use a
different code than the syllabus/template for the same course. Handled via
**`codeAliases`** in `curriculum.json`:

- `01076001` (Intro to Computer Engineering on the transcript) → `01076101` (syllabus/template code). ✔ aliased.
- `90642999` (Charm School on the transcript) → `90641001` (template code). ✔ aliased.

Add more `transcriptCode: templateCode` entries if a future transcript surfaces another
renamed course.

## Excel template layout notes (verified against the real template)

- **Placeholder rows come in three styles**, all handled: a literal `-` (major-elective rows),
  a pattern code like `9064xxxx`/`90644xxx` (GenEd elective/language rows), and a blank code
  paired with a bare type tag like `เลือกเสรี` (Free Elective rows).
- **Section-header labels are merged cells** (e.g. `A8:E8`). ExcelJS returns the merged
  master's value for every cell in the range, so the "Course No." column of a header row
  reads as non-empty unless corrected — handled via the `ownValue()` helper in `excelFiller.js`.
- **Cross-category double-counting**: the abstract matcher may assign a course (e.g. Charm
  School) to a different category than the one the template hardcodes it under. Fixed by
  removing a course from *every* category's pool (not just the current one) the moment any
  explicit template row ticks it — so a course already given a dedicated slot can't also
  fill a placeholder elsewhere.
- ExcelJS parsing this ~1000-row template took several seconds in a sandboxed test
  environment — expect a brief pause on "Fill & download," not an error.
