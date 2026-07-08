# CE KMITL — Graduation Checker

A **static, client-side** website: upload your KMITL unofficial transcript PDF and see
what you still need to enroll in to graduate. Supports both the **CE64 (พ.ศ. 2564)** and
**CE69 (พ.ศ. 2569)** curricula via a syllabus dropdown (CE64 is the default). CE64 can also
fill your Excel tracking checklist; CE69 has no template yet, so that step is hidden for it.

**Nothing is uploaded** — the PDF/Excel are parsed entirely in your browser.

**Live site:** https://bikinigordon.github.io/ce64-graduation-checker/

## How to run

**On the website (deployed):** just open the live link above.

**On your computer:**
```bash
# at the root folder
python3 -m http.server 4173
# open http://localhost:4173
```
Must be served over HTTP, not opened as a `file://` — the app fetches `data/curriculum_*.json`.

## How it works

1. **Pick a syllabus version** (CE64 or CE69) from the dropdown in the header.
2. **Upload transcript PDF** → parsed with pdf.js.
3. **Review** the parsed courses (editable table — fix any mis-read row).
4. **Check graduation** → each passed course is assigned to a requirement category,
   showing per-category progress and what's still missing.
5. **Fill Excel (optional, CE64 only)** → upload your tracking template; completed courses get
   ticked, active placeholder rows get filled from your transcript, and struck-through rows
   are skipped.
6. **Grade Planner (optional)** → from the review step, click "Grade Planner ▸" to open a
   separate page ([grade-planner.html](grade-planner.html)) that pulls in your still-ungraded
   courses, lets you simulate a grade for each one, and shows your projected semester and
   cumulative GPA live (all figures to 3 decimal places). You can also enter a target cumulative
   GPA and it'll back-calculate the average grade you'd need this semester to reach it.

## Note

This tool is an **unofficial reference** for the Computer Engineering curriculum, CE64 (พ.ศ. 2564)
and CE69 (พ.ศ. 2569) only — always double-check results against the official syllabus and your advisor.

## Editing the rules

All curriculum requirements (categories, credits, course codes, tracks, paths) live in
**`data/curriculum_2564.json`** and **`data/curriculum_2569.json`** — config-driven, so you can
tweak requirements or add another major/year by adding a new `data/curriculum_<year>.json` and
an option in the syllabus dropdown ([index.html](index.html)).
