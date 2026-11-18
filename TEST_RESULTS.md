# Lesson Plan BD — Test Results

Run: 2026-11-18 ~09:10 +06 (Asia/Dhaka), run #369 (09:00 slot).
Machine: factory VM, Node v24.22.1, headless_shell-1187 (cached Playwright build).

## Unit tests — 15/15 PASS

`node --test tests/test.js`

- Bengali digits: `toBengaliDigits('2026')` → `২০২৬`
- Date validity: `2026-02-30` invalid, `2026-02-29` invalid (not a leap year), `2024-02-29` valid
- Week math: `weekStartStr('2026-11-18')` → `2026-11-14` (Saturday); Friday `2026-11-20` stays in the week starting `2026-11-14`; `weekDates` returns 6 days Sat–Thu
- `minutesLabel`: 45 → `45m`, 60 → `1h`, 90 → `1h 30m`, 135 → `2h 15m`
- `validatePlan`: empty topic, topic > 120 chars, bad date, duration 5 / 181 / 40.5, unknown subject, class 0 / 13, bad status — each rejected with the right error key
- `weekStats`: 3 in-week plans (40m taught, 45m ready, 90m draft) + 1 next-week plan → total 3, taught 1, minutes 175, bySubject {Mathematics: 2, Science: 1}
- `filterPlans`: substring search (case-insensitive), subject / class / status filters, combined filters
- `parseImport`: valid list imports; bad JSON, non-array, bad subject, bad date, duplicate id, missing id, non-object, 501 plans — all rejected
- Data: 10 subjects, Classes 1–12, 4 activity ideas per subject (40 total); i18n EN/BN titles and subject names decode correctly

## Headless-Chrome smoke — 40/40 PASS

`node tests/smoke.mjs` (raw CDP over file://, 1280px + 390px)

- Load: title, `window.__app` / core / data / i18n present, 6 day columns, Friday note, stats 0, 6 empty states, 10 subjects, 12 classes, 4 idea chips
- Add plan: "Fractions — addition" (Mathematics, Class 6, 2026-11-16, 40 min, Ready) → "Plan saved.", total 1, card in week view
- Validation: empty topic → "Enter a topic."; duration 5 → "Duration must be 10–180 minutes."; still 1 plan
- Second plan (Science, "Photosynthesis", 2026-11-18, 45 min): total 2; search "photo" → 1 card; subject filter Mathematics → 1; status filter draft → 1; nonsense search → empty state
- Mark taught: status becomes "Taught", taught-this-week stat = 1; duplicate → 3 plans and opens edit mode; cancel edit restores "Save plan"
- Persistence: 3 plans survive a full page reload
- Activity idea: tapping a chip appends text to the Activities box
- Bengali toggle: title becomes "পাঠ পরিকল্পনা বিডি", total shows "৩"; toggles back to English
- Data: export fills the box with 3 plans; bad import rejected with data intact; erase needs exact `DELETE`; erase-all → 0 plans
- 390px mobile: no horizontal overflow, week grid collapses to 1 column
- 0 console errors/warnings, 0 page exceptions

## Repairs

1. Smoke harness `finally` referenced `pageWs` out of scope → moved the declaration outside the `try` (test-side fix).
2. Duplicate did not refresh the stats bar until a tab switch → `duplicatePlan` now calls `renderAll()` before opening the copy in edit mode (1 app fix).

## Screenshot

Verified by real pixel capture at 1280×900: header, 4 stat cards, tabs, week navigation ("14 Nov – Thursday, 19 Nov 2026"), 6 day columns Sat–Thu with today (Wed 18 Nov) highlighted, Friday note, disclaimer. File: `/tmp/lpbd-shot.png` (not shipped in the repo).

## Notes

- App sources are pure ASCII; Bengali is stored as `\uXXXX` escapes in `js/i18n.js`, `js/core.js` (digits) and `js/app.js` (month names). `README.md` and this file carry real Bengali.
- The app ships EMPTY (no sample plans) and makes zero network requests.
