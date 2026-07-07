# CE KMITL — Graduation Checker

A **static, client-side** website: upload your KMITL unofficial transcript PDF and see
what you still need to enroll in to graduate. It can also fill your Excel tracking checklist.

**Nothing is uploaded** — the PDF/Excel are parsed entirely in your browser.

**Live site:** https://bikinigordon.github.io/ce64-graduation-checker/

## How to run

**On the website (deployed):** just open the live link above.

**On your computer:**
```bash
cd /Users/gat/Documents/Project/CE64
python3 -m http.server 4173
# open http://localhost:4173
```
Must be served over HTTP, not opened as a `file://` — the app fetches `data/curriculum.json`.

## How it works

1. **Upload transcript PDF** → parsed with pdf.js.
2. **Review** the parsed courses (editable table — fix any mis-read row).
3. **Check graduation** → each passed course is assigned to a requirement category,
   showing per-category progress and what's still missing.
4. **Fill Excel (optional)** → upload your tracking template; completed courses get ticked,
   active placeholder rows get filled from your transcript, and struck-through rows are skipped.

## Note

This tool is a **reference for the Computer Engineering curriculum พ.ศ. 2564 (CE64) only** —
always double-check results against the official syllabus and your advisor.

## Editing the rules

All curriculum requirements (categories, credits, course codes, tracks, paths) live in
**`data/curriculum.json`** — it's config-driven, so you can tweak requirements or add
another major/year without touching any code.
