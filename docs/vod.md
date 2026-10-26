# Films & Series (this fork only)

A Plex-style screen for the films and series of an iptv-curator server: rows of posters, a details page,
search, and a player that remembers where you stopped. It is personal to this fork and not offered upstream. The curator is the only
thing that talks to the IPTV provider; the TV reads the curator's library (`docs/vod-api.md` in the curator's repository) and plays
a title through the curator's play address, which redirects to the provider.

## Setting it up

The **Films & Series** tile shows on the home screen once the service knows the curator's address. When Live TV's playlist is the
curator's (`http://<curator>:8000/playlist.m3u`), that address is used. Otherwise, from a shell on the TV:

```sh
curl -X POST localhost:8765/api/vod/settings -d '{"base":"http://<curator>:8000"}'
```

## Keys

| Key | Rows and search | Details | Playing |
|---|---|---|---|
| Left / Right | Scroll a row, switch tab | Buttons, seasons | Skip 10 s back / forward; held: 30 s, then a minute (one jump when you let go) |
| Up / Down | Rows; up from the first row to the tabs | Buttons, seasons, episodes | |
| OK | Open the title | Play, resume, an episode | Pause / play (the bar shows the time and when it ends) |
| 123 | | | Audio and subtitles (remembered with Live TV's choice) |
| Back | To the tabs, then the home screen | Back to the row | Stop and save the position |

The **Search** tab brings up the TV's keyboard; OK searches the names of every ticked film and series.

## What it remembers

Positions (every 10 seconds and on stop) and watched marks are kept by the service in `/media/developer/cleanyourtv/vod/state.json`,
never on the curator. A title counts as watched with less than 5 minutes or 5 % left. **Continue watching** lists half-watched
films and series played in the last 90 days. At the end of an episode the next one starts after a 10 second countdown.

## Being gentle with the provider

- A title's details are fetched only when you open it, never for a row.
- Rows load 40 titles at a time. Posters come from the curator, which fetches every ticked title's poster ahead (slowly, one at a
  time) and stores it at card size; the screen loads them once the focus rests, for what is on screen and the next screenful.
  Both tabs keep their rows while the screen is open, so switching tabs shows them as they were.
- One stream at a time: leaving the player stops the video and lets go of the connection.

## Trying it without a TV

```sh
node tools/vod-dev.js --base http://<curator>:8000 [--fake-play http://127.0.0.1:8899/test.mp4]
```

Open `http://127.0.0.1:8765/` at 1920×1080: arrow keys, Enter = OK, Escape = Back, F2 = 123. `--fake-play` plays a local video
instead of every title, so the player can be tried without asking the provider for anything. Stop it before `tools/check.sh`
(both use port 8765).
