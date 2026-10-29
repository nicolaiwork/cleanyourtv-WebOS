# Films & Series (this fork only)

A streaming-service screen for the films and series of an iptv-curator server: the focused title's backdrop and details over rows
of posters (Trending now, Popular, genres…), a details page, search, and a player that remembers where you stopped. It is personal to this fork and not offered upstream. The curator is the only
thing that talks to the IPTV provider; the TV reads the curator's library (`docs/vod-api.md` in the curator's repository) and plays
a title through the curator's play address, which redirects to the provider.

## Setting it up

**Films & Series** shows on the home screen (in the strip, and with its Trending titles and Continue watching on top, see
[the launcher](launcher.md)) once the service knows the curator's address. When Live TV's playlist is the
curator's (`http://<curator>:8000/playlist.m3u`), that address is used. Otherwise, from a shell on the TV:

```sh
curl -X POST localhost:8765/api/vod/settings -d '{"base":"http://<curator>:8000"}'
```

## Keys

| Key          | Rows and search                                                                | Details                                                                        | Playing                                                                                                 |
| ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Left / Right | Scroll a row, switch tab                                                       | Buttons, seasons, More like this; Right on an episode reaches its watched mark | Skip 10 s back / forward; held: 30 s, then a minute (one jump when you let go)                          |
| Up / Down    | Rows; up from the first row to the tabs (to the sort first, when there is one) | Buttons, seasons, episodes, More like this                                     | Down hides **Next episode**                                                                             |
| OK           | Open the title; on the sort, the next order                                    | Play, resume, an episode, a button, the watched mark                           | Pause / play (the bar shows the time and when it ends); with **Next episode** showing, the next episode |
| 123          |                                                                                |                                                                                | Audio and subtitles (remembered with Live TV's choice)                                                  |
| Back         | To the tabs, then the home screen                                              | Back to the row, or to the title this one was opened from                      | Stop and save the position                                                                              |

The **Search** tab brings up the TV's keyboard; OK searches the names of every ticked film and series (the provider's, and TMDB's
Danish and original titles).

The screen opens on the tab it was left on (also after a reboot, kept in the launcher's own storage), at the top of its rows.

## Rows

Above the rows, the focused title's name, year, rating, length, genres and what it is about, over its backdrop (which fades in once
the focus rests). Names and overviews are TMDB's Danish ones where TMDB has them.

- **Continue watching**: half-watched films, and series with an episode played in the last 90 days. A card shows what is left
  (`S02E05 · 12 min left`) or the episode that comes next. A series whose last episode was watched leaves the row.
- **My list**: what you added with **+ My list** on a title's page, newest first. The **My list** tab (between Series and
  Search) shows all of it, films and series together, as a grid under the focused title's details.
- **Because you watched …**: titles like the one played last on that tab.
- The curator's rows, made with TMDB (when the curator has a TMDB token): **Trending now** (TMDB's week), **Popular**, **New
  releases** / **New series**, **Top rated**, **Danish**, **Nordic**, **Kids & family**, one row per genre, and **Recently added**
  (films) / **New episodes** (series). A row shows only with enough titles; while the curator is still fetching TMDB's details (the
  first time, about half an hour) the ticked categories show instead.
- Without TMDB on the curator: **Recently added**, then the ticked categories, with **Sort** (top right: newest, A–Z, year or
  rating; each tab keeps its own) when the curator offers it.

## A title's page

- **Play** / **Resume** / **Continue S01E03** / **Watch again from S01E01** (after the last episode), **+ My list**, **Trailer**
  (when TMDB knows one: YouTube's player over the title's page; OK pauses, Left / Right skips 10 s, Back or the end returns to
  the title; a video YouTube won't play outside its site opens in YouTube's app) and **More**:
  mark the film, the season or the whole series as watched or unwatched, and **Remove from Continue watching** (the position is
  kept; playing it again brings it back).
- An episode's own watched mark: Right on the episode, then OK. Unwatched forgets the episode's position.
- **More like this**: up to 20 titles: TMDB's recommendations that are on the TV first, then the closest titles from the same ticked
  categories (shared genres, then the year, then the rating). Opening one keeps the first title to go back to. It shows only when
  the curator offers it.

## What it remembers

Positions (every 10 seconds and on stop), watched marks, My list and what was taken off Continue watching are kept by the service in
`/media/developer/cleanyourtv/vod/state.json`, never on the curator. A title counts as watched with less than 5 minutes or 5 % left.

While a title starts, its backdrop and name show under the spinner. In the last minutes of an episode (once it counts as watched)
**Next episode** shows in the corner: OK plays it, Down hides it. At the end of an episode the next one starts after a 10 second
countdown.

## Being gentle with the provider

- A title's details are fetched only when you open it, never for a row. The rows, More like this and the sorts come from the
  curator's own lists and from TMDB; they never ask the provider.
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
