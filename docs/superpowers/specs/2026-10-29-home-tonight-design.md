# Home: "Tonight" (fork)

Status: approved direction, 2026-10-29. Mockup: concept "Tonight" on the canvas
https://claude.ai/artifact/HGvDhPkAkL5SKTK1Lcysc6 (artboard `Main.dc.html`).

## Why

Today's Home is a dock of four large tiles, a grid of the remaining apps, a giant app name and a clock. On Nicolai's TV that is
seven tiles on an otherwise empty 1920×1080 screen: it knows nothing about what he watches, and looks generic. The service already
knows a lot that Home could show: Trending from the curator (Danish titles, backdrops), what he has started in Films & Series, his
favourite and recent Live TV channels with the programme on each now, and which inputs have a device switched on.

Home should be a place to start watching, not a list of apps: the most likely thing to watch is large and one press away, and
the apps are still close.

## Goals

- Home opens on one title from Films & Series' Trending, shown large over its backdrop, with **Play** (or **Resume**), **More
  info** and **Add to My list**.
- The hero slides to the next Trending title after a while.
- Films & Series is reachable from Home as a whole screen, not only through the hero.
- Below the hero: **Continue watching** (OK resumes) and **On your channels now** (OK tunes that channel).
- A bottom strip with Live TV, Films & Series, the apps and the inputs (the old dock, extended), and **All apps** for the rest.
- It replaces today's Home. There is no switch back to the old layout.

## Non-goals

- No change to the Films & Series screen, the Live TV player or guide, or the manager app beyond what this page needs.
- No new data source: everything comes from the service's existing endpoints and the curator's existing rows.
- No playing video on Home (no trailer or live picture behind the hero). The hero is a still backdrop.
- Not for upstream: this is a fork-only change, like Films & Series.

## Anti-goals (a failure even if it works)

- The hero changes while the focus is on its buttons, so OK starts a different title than the one on screen.
- A blind OK on Home starts a stream nobody asked for (the provider allows few connections; this has happened once in Films &
  Series). Play and Resume must start exactly the title shown, and only on a real, single OK press (see "held OK" in `VOD.key`).
- Home is slower to appear than today, or stutters on scroll, because it waits for the curator or animates something other than
  transform and opacity.
- Home is blank or broken when the curator, Live TV or the guide is not available.
- Danish titles shown with English descriptions, or the other way round.

## Constraints (from AGENTS.md)

- The page is ES5 for Chromium 68 and up; only transform and opacity animate; no flex `gap` (space flex children with sibling
  margins). The canvas mockup uses `gap` because it is a mockup.
- Edit `app/src`, then `node tools/build-pages.js`. The built `app/index.html` is what the TV loads.
- A fix or feature needs tests in `tools/test/` where it can be tested without a TV; `sh tools/check.sh` must pass (Node 8.12 and
  current). `tools/test/api.test.js` compares API replies with recorded ones: a changed reply needs a reason.
- Documentation must match: `docs/launcher.md` (and its screenshot), `docs/themes.md`, `docs/vod.md` where Home is mentioned, and
  the README if it describes Home.
- No private data in the repository: no curator address, playlist, channel addresses or IPs in docs, tests or golden files.

## The screen (1920×1080)

From top to bottom, all left-aligned on a 96 px side margin:

1. **Top bar.** Left: the clock and the date (the clock setting, 24- or 12-hour, still applies). Right: small round buttons:
   Search (opens Films & Series' search), Inputs, Customise. Hold OK on a top button still removes it, as today.
2. **Hero.** The backdrop fills the top right (about 1600×900, cropped), faded into the page colour towards the left and the
   bottom so the text stays readable. Over it, on the left: "Trending in Films & Series", the title (large), year, runtime,
   genres and rating, two lines of the overview, then the buttons **Play / Resume**, **More info**, **+** (Add to My list; the
   icon shows when it is already on the list). Small markers at the right show which of the Trending titles is shown.
3. **Rows.** Side by side in one band:
   - **Continue watching:** up to three posters with a progress bar and the time left. OK resumes where it stopped.
   - **On your channels now:** up to four cards. Each has the channel name, the programme now, its start and end times, a
     progress bar and the next programme. The favourite comes first and is marked, then the recent channels. OK tunes that channel
     in Live TV. A channel without a guide shows its name and "No guide".
   OK on a row's title opens the screen behind it: Films & Series for Continue watching, the Live TV guide for the channels.
4. **Bottom strip.** Live TV, Films & Series, then the dock apps, then the pinned inputs with a dot for "a device is on" (dimmed
   when off), then **All apps**. All apps opens the full app list as a menu, sorted as set in Customise (most used or A to Z),
   without the hidden apps.

Focus starts on **Play**. Up and down move between the top bar, the hero buttons, the rows and the strip; left and right move
within them. Back on Home still opens the running apps.

## Behaviour

### The hero

- Source: the curator's films Trending row (`/vod/home/films.json`, the row with id `trending`), the first 10 titles that have
  a backdrop. Titles already in Continue watching are skipped. Whether to mix in Trending series is the builder's call; the
  mockup shows a film.
- **Play** starts the title in Films & Series' player. If the title is in Continue watching (started, not watched), the button is
  **Resume** and the line under it shows the time left; Resume continues from the saved position.
- **More info** opens that title's details page in Films & Series. Back from there returns to Home with the focus on More info.
- **+** adds or removes the title from My list, through the same state call Films & Series uses (`/api/vod/state`).
- **Sliding:** after about 15 seconds the hero moves to the next title (backdrop cross-fade with opacity, text replaced), and
  wraps around. It does not move while the focus is on the hero buttons. The timer starts again from zero when the focus leaves
  them and when Home is shown again (the Home key, `webOSRelaunch`, `visibilitychange`). It never moves while another layer
  (a menu, Live TV, Films & Series) is open.
- The next backdrop is loaded before it is shown, so a slide never shows a half-loaded picture.

### Getting to Films & Series

- The **Films & Series** entry in the bottom strip opens the Films & Series screen as today (`VOD.enter`).
- OK on the "Continue watching" title opens Films & Series.
- Search in the top bar opens Films & Series on its Search tab.

### Continue watching

- From the Films & Series state (`/api/vod/state` items): started, not watched, newest first, up to three. Posters come through
  the curator like in Films & Series. Time left = duration − position, written like "1 h 46 min left" / "55 min left".
- OK resumes that item in the player. An episode shows the series poster and "S1 E1" under it.

### On your channels now

- Channels: the favourites (`/api/live/state` `fav`), then the recent ones (`recent`), without duplicates and without channels
  the provider no longer lists, up to four. The guide for them comes from `/api/live/epg?ids=…` as the Live TV page asks it today.
- The cards update their progress bars and "now/next" when a programme ends (the page's existing 15-second tick is enough;
  no new timer per card).
- OK tunes the channel: Live TV opens with that channel playing, as if picked in the guide.

### Entry points the page needs

Films & Series and Live TV today only have `enter()`. Home needs, as small additions to `app/src/js/vod.js` and
`app/src/js/live.js` (names are the builder's call):

- Films & Series: open a title's details by kind and id; play or resume an item by kind and id; open the Search tab. Each one
  enters the screen as `enter()` does and then goes straight to that place, and Back returns to Home.
- Live TV: enter with a given channel playing.
- Read access to what Home shows: the Trending row (or the home rows), the Films & Series state, and Live TV's favourites,
  recents and guide, without opening those screens.

## When something is missing

- **Films & Series not configured or the curator unreachable,** or Trending is empty: the hero shows the channel watched last,
  with its current programme and a **Watch** button (tunes it). The Continue watching row is not shown.
- **Live TV switched off** (manager > Live TV): no channel cards, no Live TV entry in the strip, and Continue watching takes the
  whole band. If Films & Series is also unavailable, there is no hero: the strip moves up under the top bar and the page still
  works.
- **The guide has nothing for a channel:** the card shows the channel and "No guide".
- **Home must not wait** for any of these: it draws the top bar and the strip from the cached app list at once (as today), and
  fills the hero and rows when their data arrives. Until then the hero area is the page colour, with no spinner.

## Themes, customising and settings

- **Themes** keep their colours (`colors.*`, accent, focus), the font, the speed setting and the wallpaper. The wallpaper only
  shows where there is no backdrop (the fallback states above). Theme settings that place or size the old layout (the dock, the
  grid, the shelf, the clock and bar positions) no longer apply. `docs/themes.md` (generated from `helper/themeschema.js` by
  `tools/theme-docs.js`) says which settings Home uses. Whether to remove the unused settings from the schema or mark them as
  unused is the builder's call; existing theme files must keep loading.
- **Customise** keeps: the top buttons, hidden apps, app order (most used or A to Z), reset. The dock becomes the app part of
  the bottom strip: hold OK on an app (in the strip or in All apps) for Move left, Move right, Remove from Home, Hide app, as today.
- **Pinned inputs** appear in the strip after the apps, as they appear on Home today.
- The `config.json` keys stay the same (`dock`, `hidden`, `sort`, `topbar`, `clock`), so a TV keeps its setup across the update.

## Decided by Nicolai

- Concept "Tonight" over the other four (playing Live TV behind Home, the dial, Tekst-TV, the night clock).
- Home must offer a way into the whole Films & Series screen, and Play/Resume of the hero title.
- The hero slides to a new suggestion after a while.
- It replaces today's Home; no option to switch back to the old layout.
- The themes, top-button and fallback behaviour above was played back to him and confirmed ("looks right").

## Calls made after the builder check (Claude's, Nicolai was away)

These answer the reviewer's questions; they override anything above that reads differently.

1. **Continue watching is the same list as Films & Series' row**: `VL.continueFilms` and `VL.continueShows` (one card per
   series, removed titles left out), merged newest first, the first three. The line under a card is `VL.continueSub` ("1 h 46
   min left", "S01E02 · 20 min left", "Next: S01E04"). OK on a card plays what the first button of that title's page plays:
   Resume for a film, Continue/Play of `VL.nextEpisode` for a series. Home opens the title's page and presses that button, so
   the stream is exactly the one the page would start; Back from the player returns to the title's page, Back again to Home.
2. **The hero skips only the titles shown in Home's Continue watching row.** Another started film in Trending shows **Resume**
   with the time left.
3. **The bottom strip:** Live TV (when on) and Films & Series (when configured) come first and are fixed. Then the saved dock
   (`cfg.dock` without `__live` and `__vod`), up to six entries, apps or pinned inputs. Then the pinned inputs not in the dock.
   Then **All apps**. Hold OK on a dock entry: Move left, Move right, Remove from Home, Hide app (an input: Remove from Home).
   Hold OK on an app in All apps: Add to Home (with "Replace which app?" when the six are taken), Hide app. The theme's dock
   count no longer applies.
4. **The top bar:** a fixed **Search** (only while Films & Series is configured), then the saved top buttons as today (pills
   with icon and label, hold OK removes), then the fixed **Customise**. On Nicolai's TV: Search, Inputs, Live TV, Customise.
5. **The old layout code goes:** the dock/grid/overlay/push modes, the shelf and the glow are removed from the page. The theme
   schema is not changed, so every theme still loads; `docs/themes.md` says which settings the fork's Home uses.
6. **One service addition:** `GET /api/live/home` returns the channels Home shows (favourites, then recent ones, only those the
   playlist still has, at most eight) with number, name, logo, guide id, whether it is a favourite, and the programme now and
   next. Home never asks for the whole playlist. It is recorded in `tools/test/api.test.js`.
7. **Row titles are not focusable.** Films & Series is reached from the strip, Search and More info; the guide from the strip's
   Live TV and the Guide key. This keeps one simple focus model (rows of focusable items).

## Left to the builder

- Exact sizes, spacing, type scale and how the theme's font is used. The mockup uses Barlow and Barlow Condensed; the TV build
  uses the theme's font unless a font is bundled with the page.
- How many Trending titles to rotate (about 10) and the exact interval (about 15 seconds).
- Whether Trending series join the hero.
- The new function names in `vod.js` and `live.js`, and how Home's code is split across `app/src` files (a new
  `app/src/js/home.js` and `app/src/css/home.css` rewrite are expected).
- How the old layout code (`layout.js`, the theme's dock/grid/push/overlay modes in `setFocus`) is removed or simplified.
- Tests: what in Home's data handling (picking the hero titles, Continue watching, the channel list and its guide, the
  fallbacks, time-left text) is split into plain functions and tested in `tools/test/`.

## Checked on a real TV

Nothing yet. The mockup was drawn from the TV's real data on 2026-10-29 (read-only: config, apps, Live TV state and guide,
Films & Series state and rows, input status).
