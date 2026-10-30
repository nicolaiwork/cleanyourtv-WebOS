# Ad breaks in Live TV: dim and mute, or a partner channel

Date: 2026-10-30. Status: approved by Nicolai 2026-10-30. Personal to this fork (needs the iptv-curator), like Films & Series; not offered
upstream.

## Why

Nicolai has started watching Live TV again. Danish commercial channels run ad blocks of about five minutes. When a block starts, the
TV should get out of the way on its own and come back when the programme does. Pausing first so that breaks can be skipped later was
considered and rejected: it has to work from the moment you tune in, at live time.

## What it does

A setting, **Ad breaks**: **Off** (the default), **Dim**, or **Partner channel** (one partner channel for all channels).

- **Dim:** when a break starts, the picture fades to 20 % and is muted. The channel banner (the existing `#lv-osd` look) stays up
  while the break lasts, showing "Reklamer · <channel>", now and next from the guide with the progress bar, and a counter of how
  long the break has run (m:ss). OK on the remote ("Se reklamerne") brings picture and sound back for the rest of this break. When the
  programme returns, the banner goes away and the picture fades back in with sound.
  Mockup chosen: option A in `.superpowers/brainstorm/51482-1793395709/content/break-screen.html` (not committed).
- **Partner channel:** when a break starts, the TV switches to the partner channel, which plays normally. A small pill top right
  says "Reklamer på <channel> · m:ss" and "<programme> fortsætter · skifter tilbage selv". When the programme returns, the TV switches
  back. If you change channel yourself in the meantime, nothing switches back and the pill goes.
- On a channel where detection does not work (no stable logo, or the logo stays on during ads), nothing happens. The feature never
  guesses.

## Goals, non-goals, anti-goals

Goals
- Breaks are caught on channels that hide their logo during ads, with no setup per channel.
- Normal Live TV is unchanged when the feature is off or the curator is unreachable.

Non-goals
- Skipping ads, timeshift, pause or rewind of live TV.
- Frame-exact edges: being 1–3 s off at each end is accepted.
- Playlists other than the curator's; other providers; upstream CleanYourTV.

Anti-goals (would make it a failure even if it works)
- **The programme dimmed by mistake.** Nicolai: dimmed by mistake is worse than a break caught 10–15 s late. Tune for no false starts.
- **Hammering the provider.** A loop of stream probes most likely got the IP banned on 2026-10-25 (curator `CLAUDE.md`).
- Slower channel changes, or Live TV breaking when the curator is down.

## What was measured (2026-10-30, National Geographic DK, one connection from the Mac)

- The provider re-muxes every stream (`service_name=aprov`): PAT, SDT, PMT, H.264 1080p50, AC-3 5.1 + AAC stereo (Danish), DVB
  subtitles. **No SCTE-35, no EIT.** Breaks can only be found in the picture.
- Keyframes every 3.84 s. Decoding only keyframes: 0.78 s CPU for 184 s of video. Decoding every frame: ~13 % of one Mac core.
  The Proxmox node averages 7.5 % of 12 cores, so CPU is not a constraint; the LXC can be given more.
- Logo check: a mask of the logo's pixels (yellow frame, 1080p box x 112..176, y 48..128), score = share of mask pixels lit, 2 samples/s.
  - Programme: 0.92–1.00 in every sample over ~20 min, bright scenes included; also the bigger "NATIONAL GEOGRAPHIC" logo at the
    start of an episode (0.95).
  - Between episodes (45 s): credits squeezed into a box with "om lidt" (logo gone **8 s**), credits, then two sponsor clips
    ("Programmet præsenteres af Legekæden / Betano"): 0.00. No real ads.
  - Mid-episode block: **4 min 56 s**, hard cut in (no black frame, no fade), Betano sponsor clip, ads (casino, Trivago, …), the
    channel's own promos (they carry a different logo: ~0.09), Legekæden sponsor clip, programme back with the big logo. 0.00 throughout
    except **single-sample spikes** (one at 1.00 from a casino sign, others 0.2–0.7), none longer than one sample.
  - Black frames and silence: none at the edges (one 0.2 s silence inside a sponsor clip). Useless as signals.
- Samples, labels and score series: `~/Projects/iptv-ad-samples/` (not a repository; `README.md` there has the labelled times).
  `natgeo-2026-10-30-scores.json` (logo score per 0.5 s per file) contains no private data and is meant as a test fixture for the
  break rule; the `.ts` recordings (820 MB) must never be committed.

## How it works

### Detection (curator)

- The curator watches the channel the TV is on, with its own connection to the provider (the account allows 3; TV + curator = 2,
  also in partner mode, where the TV plays the partner and the curator keeps watching the original).
- The account is shared with a friend. Nicolai's decision: **relaxed**, the watcher may take the last free connection (no check of
  free connections before watching, no new provider call for it). If the provider refuses the connection, the channel simply gets no
  detection this time (the reconnect rule below still applies).
- It decodes the stream with ffmpeg (a subprocess; full decode at a low output rate is fine) and looks only at the four corners.
- **Learning:** the logo is learned per channel, automatically: the patch in a corner that stays the same while the rest of the picture
  changes. Match on shape/edges, not on one colour (many logos are semi-transparent white); require the dark inside of a frame-like logo
  where present, so a yellow object cannot fake it. A learned logo is stored per channel and reused; it is re-learned when it stops
  matching during what is clearly programme. The method is the builder's; it must be written from scratch (Comskip and similar are GPL:
  describe behaviour, do not copy code).
- **A channel's status:** learning / works / doesn't work here (no stable logo found, or the logo did not disappear in breaks).
  Shown on the curator's web page with the learned logo, so Nicolai can see which channels it works on.
- **Observe before acting (Claude's call):** only one channel has been measured, and recording more channels just to tune is not
  wanted (gentle on the provider). So a channel acts on breaks only once the curator has, while Nicolai watched it, learned a stable
  logo and seen it disappear and come back at least once in a way that fits the rule. Until then it is "learning" and the TV does
  nothing; the first break on a new channel may be missed. National Geographic DK can start as "works" from the samples.
- **The rule** (from the measurements and the anti-goal):
  - break starts when the logo has been gone for **about 15 s**, confirmed (no flicker back); this ignores the 8 s credits squeeze;
  - programme is back when the logo has been present for **2 s**; single-sample spikes never end a break.
- **Gentle on the provider:** the curator opens the stream only while a TV reports watching it (a lease, renewed by the TV's polling)
  and closes it within about 30 s of the TV leaving the channel or Live TV. No reconnect loops: after a dropped connection at most one
  reconnect per minute, and give up after a few failures until the TV changes channel. Never probes other channels.

### The TV (fork)

- The page tells the service which channel it is on and asks for the break state about once a second; the service asks the curator,
  as Films & Series already does (`helper/vod.js` reads the curator address from the Live TV playlist). The page never talks to the
  curator directly.
- The curator is identified by the stream id in the channel's address; credentials never travel in the TV↔curator calls.
- The feature only appears when the playlist is the curator's.
- Dim: an overlay over the video plane, opacity animated (Chromium 68 rule: only transform and opacity animate), the video element
  muted. **Checked on the TV 2026-10-30:** `video.muted = true` on the Live TV player silenced the Sonos (eARC, AC-3 5.1 channel)
  and `false` brought it back; the TV's own mute and volume are not needed and must not be touched. Partner: the existing `play()` path; while on the partner the page keeps reporting the original channel to the curator.
- Settings in the Live TV player menu (Yellow / 123): **Ad breaks: Off / Dim / Partner channel**, and the partner channel, chosen from
  the channel list. Stored with the other Live TV settings via the service.
- Texts through `t()` with Danish translations.

### Constraints

- Service code: Node.js 8.12 rules (`AGENTS.md` rule 3). Pages: ES5, Chromium 68.
- Curator: Python 3.13 on Debian 13; LXC 165 has 1 core / 512 MB and the service `MemoryMax=300M`, `ProtectSystem=strict`, writes only
  `/data`. ffmpeg is not installed there. More cores and memory are available on the node; changing the LXC or the unit needs
  Nicolai's yes at the time (homelab repo).
- Tests: curator `pytest`; fork `sh tools/check.sh` (a new API reply needs a recorded reply in `tools/test/api.test.js`).
- Docs: `docs/live-tv.md` in the fork, the curator's `docs/` and `CLAUDE.md`.

## Left to the builder

- The logo-learning method, sample rate, thresholds beyond the two above, and how "confirmed" is judged.
- The curator ↔ service API shape, the lease length, and whether detection runs in the curator process or a sibling unit.
- How the TV's 1-second poll is done (poll, long-poll), as long as a channel change is not slowed down.
- Wording of texts beyond the ones above.

## Decided by Claude (Nicolai can override)

- Off by default (it uses a provider connection).
- Settings in the Live TV player menu only; per-channel status on the curator's page, not in the manager app.
- On a channel where detection doesn't work, the feature does nothing and says nothing on the TV.
