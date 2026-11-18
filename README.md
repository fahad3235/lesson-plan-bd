# Lesson Plan BD

Offline bilingual (English / বাংলা) weekly lesson planner for Bangladeshi school teachers — plan lessons, teach, and track what was actually taught.

## Problem

Teachers in Bangladesh usually plan lessons in paper diaries or scattered notebooks: no easy way to see the whole teaching week at a glance, reuse good activities, or know how many minutes were actually taught. Lesson Plan BD is a free, offline, single-page planner built around the Bangladesh school week (Saturday–Thursday, Friday off).

## Features

1. **Week view** — six day-columns (Saturday–Thursday) for the current week, with today highlighted, week navigation (prev / next / this week), and a Friday-holiday note.
2. **Lesson plans (full CRUD)** — subject (10 curriculum subjects), class (1–12), topic, date, duration (10–180 min), objectives, materials, activities, homework, and status (Draft / Ready / Taught). Edit, duplicate, mark-taught / reopen, delete (with confirm).
3. **Activity ideas bank** — 4 reusable teaching moves per subject (40 total); tap one to insert it into the Activities box.
4. **Search & filters** — live topic search plus subject / class / status filters on the All Plans tab.
5. **Dashboard stats** — total plans, plans this week, taught this week, minutes this week.
6. **Data tools** — JSON export, strict import (invalid files rejected, data kept intact), and typed-`DELETE` erase-all.
7. **Bilingual + offline** — EN/বাংলা toggle persisted, Bengali digits in BN mode, everything stored in `localStorage`, zero network requests, print stylesheet for the week view.

## Stack

- Plain HTML + CSS + vanilla JavaScript (no build step, no dependencies)
- Node.js (`node:test`) unit tests + raw-CDP headless-Chrome smoke tests

## Prerequisites

- Any modern browser (for the app)
- Node.js 18+ (only to run the tests)

## Run

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8000
```

No install step — there are no dependencies.

## Testing

```bash
node --test tests/test.js   # 15 unit tests (pure logic)
node tests/smoke.mjs        # 40 headless-Chrome smoke checks (needs the cached headless_shell)
```

See [TEST_RESULTS.md](TEST_RESULTS.md) for the latest real results.

## Project structure

```
index.html          App shell (tabs: Week / All Plans / New Plan / Data)
css/styles.css      Navy + teal theme, responsive (390px mobile), print styles
js/core.js          Pure logic: dates, Saturday-week, validation, stats, import
js/data.js          10 subjects, Classes 1–12, 40 activity ideas
js/i18n.js          EN + বাংলা strings (Bengali stored as \uXXXX escapes)
js/app.js           DOM wiring + localStorage persistence
tests/test.js        Unit tests
tests/smoke.mjs      Headless-Chrome smoke tests (raw CDP)
```

## Limitations

- Plans live only in one browser's `localStorage` — export JSON regularly to back up or move devices.
- No accounts, sharing, or sync; one teacher, one browser.
- The Saturday–Thursday week and Friday holiday follow the usual Bangladesh school pattern; schools with a different calendar should check their own dates.
- Activity ideas are generic teaching moves, not subject content.

## Status

Working MVP. Ships empty (no sample plans) — add your first lesson plan from the New Plan tab.
