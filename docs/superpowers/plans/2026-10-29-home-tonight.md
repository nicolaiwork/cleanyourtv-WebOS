# Home "Tonight" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the launcher's dock-and-grid Home with "Tonight": a rotating Trending hero with Play/Resume, Continue watching,
the channels on now, and a strip of entries and apps.

**Architecture:** The page keeps its focus model (`rows[r][c]` of focusable elements, `setFocus`, the key handler in `input.js`)
with four rows: top bar, hero buttons, the band (Continue watching cards then channel cards), the strip. The data rules live in
a new `app/src/js/homelib.js` (pure, tested in Node like `vodlib.js`); the drawing in a new `app/src/js/home.js`. Films & Series
and Live TV get small entry points so Home can open a title, play it, open Search and tune a channel. The service gets one
endpoint, `/api/live/home`.

**Tech Stack:** ES5 page (Chromium 68+), CSS with transform/opacity transitions only, Node 8.12-compatible service.

**Spec:** `docs/superpowers/specs/2026-10-29-home-tonight-design.md` (read the "Calls made after the builder check" section first)

## Global Constraints

- Page script ES5; no flex `gap` (sibling margins); only `transform` and `opacity` animate (AGENTS.md rule 3).
- Service code runs on Node 8.12: no `??`, `?.`, global `URL` (use `nc.URL`), etc.
- Edit `app/src`, then `node tools/build-pages.js`; `sh tools/check.sh` must pass (run with `env -u NODE_OPTIONS` and nothing on
  port 8765).
- No private data in repo files (no curator address, IPs, playlist addresses).
- Hero: films Trending row (`/vod/home/films.json`, row id `trending`), titles with a backdrop, up to 10, minus the titles in
  Home's Continue watching row; slides every 15 s; not while focus is on the hero buttons.
- Continue watching: `VL.continueFilms` + `VL.continueShows` merged newest first, first 3; card line `VL.continueSub`.
- Channels: `/api/live/home`, favourites first then recent, at most 8 from the service, 4 shown.
- Strip: Live TV, Films & Series (fixed, when available), up to 6 dock entries, the other pinned inputs, All apps.
- Top bar: Search (fixed, Films & Series only), saved top buttons, Customise (fixed).
- `config.json` keys unchanged (`dock`, `hidden`, `sort`, `topbar`, `clock`); theme schema unchanged.

## Review Focus

1. **A held or repeated OK on Play** must start one stream, not two (webOS repeats keydown while OK is held). The page's existing
   `downEnter`/`lastEnter` guard covers Home; Films & Series' `okAt` guard covers the details page it opens. Task 4 checks that the
   autoplay is triggered once per `VOD.open` call.
2. **The hero slides while OK is pressed**: the slide must not change what Play starts. Play reads the title from the hero's
   current index at the moment of the press; the slide timer is stopped while focus is in the hero row. Task 5 verifies in Chrome.
3. **Films & Series configured but the curator down** (fetch rejects or returns no rows): Home falls back to the last channel
   hero, no Continue row, no error toast loop. Task 2 tests `HL.heroMode`; Task 5 verifies with the curator unreachable.
4. **A channel without a guide** or with a guide entry already ended: card shows the name and "No guide"; progress never < 0 or
   > 1. Task 2 tests `HL.progress` and `HL.chanLine`.
5. **Focus lands on a row that disappears** after a refresh (Live TV switched off, no Continue items): focus moves to the nearest
   existing row, never to an empty one. Task 5 builds `rows` without empty rows and `setFocus` clamps.

---

### Task 1: `/api/live/home` in the service

**Files:**
- Modify: `helper/live.js` (the `handle` function, next to `/api/live/epg`)
- Test: `tools/test/live.test.js`, `tools/test/api.test.js` (+ `tools/test/golden/api.json` regenerated)
- Docs: `docs/api.md`

**Interfaces:**
- Produces: `GET /api/live/home` → `{ channels: [{ key, num, name, logo, id, fav, now, next }] }` where `now`/`next` are the guide
  entries as `/api/live/epg` gives them (`[start, end, title, desc]` or `null`). Favourites (state order) first, then recents
  (state order), keys the playlist still has, no duplicates, at most 8. No `url` in the reply.

- [ ] **Step 1:** In `live.test.js`, after the state tests: with a playlist of channels A, B, C (keys known), favourite C, recent B,
  A, C, unknown key `zz`: assert `channels.map(c => c.name)` equals `['C', 'B', 'A']`, `channels[0].fav === true`,
  `channels[1].fav === false`, and `JSON.stringify(reply).indexOf('http') < 0`.
- [ ] **Step 2:** Run `node tools/test.js live`; expect FAIL (404 or undefined).
- [ ] **Step 3:** Implement in `helper/live.js` with `pruneState()`, `playlist.channels`, `guideId(c)` and the epg lookup factored
  out of `/api/live/epg` into `nowNext(id, now)`.
- [ ] **Step 4:** Add `['live home', 'GET', '/api/live/home']` to `CALLS` in `api.test.js`, regenerate the golden reply the way
  the file's header says, run `node tools/test.js live api`; expect PASS.
- [ ] **Step 5:** Document the endpoint in `docs/api.md`; commit.

### Task 2: `homelib.js`, Home's rules without the page

**Files:**
- Create: `app/src/js/homelib.js` (global `HL`, ES5, uses `VL`)
- Test: `tools/test/homelib.test.js` (loads `vodlib.js` then `homelib.js` in a `vm` context like `vodlib.test.js`)

**Interfaces:**
- `HL.heroPicks(rows, skipIds, max)` → the `trending` row's items with a `backdrop`, minus `skipIds`, first `max`; `[]` when
  `rows` is null or has no `trending` row.
- `HL.continueCards(st, now)` → up to 3 of `{kind: 'films'|'series', id, label, poster, sub, prog, at}` from `VL.continueFilms`
  (kind films) and `VL.continueShows` (kind series) merged by `at` descending.
- `HL.heroPlay(item, items)` → `{label: 'Resume'|'Play', left: '1 h 46 min left'|''}`: Resume when `VL.resumeAt(items['film:'+id]) > 0`.
- `HL.heroMode(picks, chans)` → `'film'` when picks exist, `'channel'` when only channels, `'none'`.
- `HL.stripIds(o)` with `o = {dock, live, vod, pinned, has, max}` → ids: `__live` if `live`, `__vod` if `vod`, then `dock` minus
  those two, filtered by `has(id)`, first `max` (6), then `pinned` not already listed.
- `HL.progress(nowSec, entry)` → 0..1 clamped, 0 for no entry. `HL.hm(sec)` → `'HH:MM'`.
- `HL.chanLine(ch, nowSec)` → `{title, times, next, prog}`; without `now`: `{title: 'No guide', times: '', next: '', prog: -1}`.

- [ ] **Step 1:** Write `homelib.test.js` with one `ok()` per interface above: picks skip the given ids and backdrop-less items and
  cap at max; continue cards merge a film at=500 and a show at=900 as [show, film] and cap at 3; heroPlay gives Resume with
  "1 h 46 min left" for pos 158 / dur 6512 and Play for an unknown id; heroMode for the three cases; stripIds for Nicolai's
  dock `['__live','__vod','youtube.leanback.v4','com.beb.plxnative']` with live and vod on gives exactly that order plus
  pinned `['com.webos.app.hdmi1']` at the end, and with `live: false` drops `__live`; progress clamps (-5 → 0, past end → 1);
  chanLine without a guide.
- [ ] **Step 2:** `node tools/test.js homelib`; expect FAIL (file missing).
- [ ] **Step 3:** Implement `homelib.js`; add `@include js/homelib.js` after `vodlib.js` in `app/src/index.html`.
- [ ] **Step 4:** `node tools/test.js homelib vodlib`; expect PASS. Commit.

### Task 3: entry points in Films & Series and Live TV

**Files:**
- Modify: `app/src/js/vod.js` (`openDetails`, `backFromDetails`, `o.exit`, new `o.home`, `o.open`, `o.search`)
- Modify: `app/src/js/live.js` (`o.enter`, `boot`)

**Interfaces:**
- `VOD.home()` → Promise of `{base, st: {items, hidden, list}, rows}` (`rows` = films home rows or null). Caches the rows for
  30 minutes; state is asked each time. Never rejects (missing parts are null/empty).
- `VOD.img(path)` → absolute image URL (the existing `img`).
- `VOD.open(kind, card, play)`: enters the screen without drawing the rows, opens the details of `card` (`{id, label, poster}`)
  with `from: 'home'`; when `play` is true, presses the first button with a `play` spec once the details have loaded (once).
  Back from those details calls `o.exit()`.
- `VOD.toggleList(kind, card)` → Promise; adds/removes My list through `/api/vod/state` as `toggleList` does.
- `VOD.search()`: `enter()` then the Search tab with the input focused.
- `LIVE.enter(guide, key)`: like today; with `key`, plays `byKey[key]` instead of `live.last` (after loading channels if needed).

- [ ] **Step 1:** Implement the VOD entry points; `o.enter` keeps its behaviour for the strip entry.
- [ ] **Step 2:** Implement `LIVE.enter(guide, key)`.
- [ ] **Step 3:** `node tools/build-pages.js && node tools/test.js pages vodlib`; expect PASS (ES5, no new syntax). Commit.

### Task 4: the Home page

**Files:**
- Create: `app/src/js/home.js` (draws Home; replaces `layout.js`'s `rebuild`)
- Rewrite: `app/src/css/home.css` (theme variables kept where Home uses them: colours, font, `--spd`, `--wall`)
- Modify: `app/src/index.html` (markup), `app/src/js/layout.js` (`load` only; `rebuild` moves to home.js), `app/src/js/tiles.js`
  (remove or reduce to what the strip and All apps need), `app/src/js/theme.js` (`TH` reduced), `app/src/js/config.js`
  (`dockIds` → `HL.stripIds`, `setDock` cap 6), `app/src/js/menus.js` (`appMenu` for strip/All apps, `allAppsMenu`),
  `app/src/js/input.js` (`setFocus` without layout modes, Back no longer closes a grid), `app/src/js/clock.js` (new strings)

**Interfaces:**
- Consumes: Task 1 endpoint; `HL.*` (Task 2); `VOD.home/open/search/toggleList/img`, `LIVE.enter(guide, key)` (Task 3).
- `rebuild()` (called by `load` and the start-up cache, as today) builds rows: `[topbar, heroButtons, band, strip]` without
  empty rows; each element has `_a` (app), `_o` (top button) or `_run` (function); `act(e)` calls `e._run()` when present.
- `homeData()` refreshes hero/band data on `load()` (Home shown, relaunch) without blocking the first paint.

- [ ] **Step 1:** Markup and CSS for top bar, hero (two backdrop `<img>` layers cross-faded with opacity, a left and a bottom
  fade, the text block, the buttons, slide markers), band, strip, matching the mockup's proportions at 1920×1080.
- [ ] **Step 2:** `home.js`: draw from `HL` results; hero slide every 15 s (timer stopped while `r` is the hero row or a layer is
  open; reset on relaunch/visibility); Play/Resume → `VOD.open('films', item, true)`; More info → `VOD.open('films', item,
  false)`; + → `VOD.toggleList`; continue card → `VOD.open(kind, card, true)`; channel card → `LIVE.enter(false, key)`;
  channel hero Watch → same; All apps → `allAppsMenu()`.
- [ ] **Step 3:** Menus: strip entries get Move left/right, Remove from Home, Hide app; All apps rows hold OK → Add to Home /
  Hide app; Customise "Dock" row text becomes "Home strip".
- [ ] **Step 4:** Update `tools/test/pages.test.js` checks that named `.tile.f` (the focus ring as a pseudo-element with a radius,
  never an outline) to the new focusable classes; `node tools/build-pages.js && node tools/test.js pages`; expect PASS.
- [ ] **Step 5:** Commit.

### Task 5: verify in Chrome with the TV's data, docs, full check

**Files:**
- Docs: `docs/launcher.md` (screen, keys, screenshot `docs/screenshots/home.jpg`), `docs/themes.md` (which settings the fork's
  Home uses, outside the generated table), `docs/vod.md` and `docs/live-tv.md` where they mention Home, `README.md` if it describes
  Home.

- [ ] **Step 1:** Run the page against a local stand-in service (scratchpad, not committed) serving the recorded apps, config,
  Live TV home reply and Films & Series state/rows; load at 1920×1080 in Chrome; walk the keys: focus starts on Play; Up/Down
  between rows; the hero slides after 15 s only when focus is off the hero; Play opens the title and starts the player once;
  Back returns to the title page, Back again to Home; strip Films & Series opens the screen; All apps lists Twitch, CleanYourTV,
  Homebrew Channel.
- [ ] **Step 2:** The fallbacks: curator unreachable → channel hero; Live TV off → no channel cards, no Live TV entry; both →
  no hero, strip under the top bar.
- [ ] **Step 3:** Screenshot for `docs/screenshots/home.jpg`; update the docs.
- [ ] **Step 4:** `env -u NODE_OPTIONS sh tools/check.sh`; expect "all checks passed". Commit.
- [ ] **Step 5:** Whole-branch review by a fresh reviewer; fix what it finds; check again; commit.
