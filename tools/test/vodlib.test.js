// Films & Series page helpers (app/src/js/vodlib.js, run here as the page would): when a title counts as watched, where it resumes,
// the Continue watching rows, the next episode, skipping, time labels and the poster window of a long row.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const { root, ok, run } = require('./lib');

const src = fs.readFileSync(path.join(root, 'app', 'src', 'js', 'vodlib.js'), 'utf8');
const ctx = { Date, Math, isFinite };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.VL = VL;', ctx);
const VL = ctx.VL;
const DAY = 24 * 3600 * 1000;

run(async () => {
  ok(VL.watched(6900, 7020) && VL.watched(95, 100), 'watched: less than 5 minutes or 5 % left');
  ok(!VL.watched(3000, 7020) && !VL.watched(10, 0) && !VL.watched(0, 0), 'watched: not before that, nor without a length');
  ok(VL.shouldSave(50, 100) && !VL.shouldSave(3, 100) && !VL.shouldSave(50, Infinity) && !VL.shouldSave(50, 0), 'shouldSave');
  ok(VL.resumeAt({ pos: 1200.7, watched: false }) === 1200, 'resume: where it stopped');
  ok(VL.resumeAt({ pos: 1200, watched: true }) === 0 && VL.resumeAt({ pos: 3 }) === 0 && VL.resumeAt(null) === 0, 'resume: from the start');

  const items = {
    'film:1': { kind: 'film', id: 1, pos: 600, dur: 7000, watched: false, at: 300 },
    'film:2': { kind: 'film', id: 2, pos: 6990, dur: 7000, watched: true, at: 500 },
    'film:3': { kind: 'film', id: 3, pos: 100, dur: 7000, watched: false, at: 400 },
    'episode:70': { kind: 'episode', id: 70, show: { id: 601, name: 'Borgen' }, pos: 10, at: 200 },
    'episode:71': { kind: 'episode', id: 71, show: { id: 601, name: 'Borgen' }, pos: 10, at: 900 },
    'episode:80': { kind: 'episode', id: 80, show: { id: 602, name: 'Matador' }, pos: 10, at: 100 },
    'episode:90': { kind: 'episode', id: 90, show: { id: 603, name: 'Old' }, pos: 10, at: 1000 - 91 * DAY },
  };
  ok(
    VL.continueFilms(items)
      .map(x => x.id)
      .join() === '3,1',
    'continue films: half-watched only, newest first'
  );
  const shows = VL.continueShows(items, 1000);
  ok(
    shows.map(x => x.id).join() === '601,602' && shows[0].name === 'Borgen' && shows[0].at === 900,
    'continue shows: one per show, 90 days'
  );

  // finished and hidden shows, hidden films
  const fin = {
    'episode:70': { kind: 'episode', id: 70, show: { id: 601, name: 'Borgen' }, pos: 2400, dur: 2500, watched: true, next: null, at: 900 },
    'episode:80': { kind: 'episode', id: 80, show: { id: 602, name: 'Matador' }, pos: 10, dur: 2500, at: 800 },
    'episode:81': { kind: 'episode', id: 81, show: { id: 603, name: 'Huset' }, pos: 2400, dur: 2500, watched: true, at: 700 },
    'film:1': { kind: 'film', id: 1, pos: 600, dur: 7000, watched: false, at: 300 },
    'film:3': { kind: 'film', id: 3, pos: 100, dur: 7000, watched: false, at: 400 },
  };
  ok(
    VL.continueShows(fin, 1000)
      .map(x => x.id)
      .join() === '602,603',
    'continue shows: a finished show is left out'
  );
  ok(
    VL.continueShows(fin, 1000, { 'show:602': 850 })
      .map(x => x.id)
      .join() === '603',
    'continue shows: a hidden show is left out'
  );
  ok(
    VL.continueShows(fin, 1000, { 'show:602': 799 })
      .map(x => x.id)
      .join() === '602,603',
    'continue shows: back once played after hiding'
  );
  ok(
    VL.continueFilms(fin, { 'film:3': 400 })
      .map(x => x.id)
      .join() === '1',
    'continue films: a hidden film is left out'
  );
  const cs = VL.continueShows(fin, 1000);
  ok(cs[0].ep.id === 80, 'continue shows: with the episode');
  ok(VL.continueSub({ ep: { season: 1, num: 3, pos: 600, dur: 2520 } }) === 'S01E03  ·  32 min left', 'sub: an episode under way');
  ok(VL.continueSub({ ep: { season: 1, num: 3, watched: true, next: { season: 2, num: 1 } } }) === 'Next: S02E01', 'sub: the next');
  ok(VL.continueSub({ ep: { season: 1, num: 3, watched: true } }) === 'After S01E03', 'sub: next unknown');
  ok(VL.continueSub({ pos: 600, dur: 7020 }) === '1 h 47 min left' && VL.continueSub({ pos: 6, dur: 0 }) === '', 'sub: a film');
  ok(VL.fmtLeft(20) === '1 min left' && VL.fmtLeft(3600) === '1 h 0 min left', 'left');
  ok(
    VL.continueProgress({ pos: 500, dur: 1000 }) === 0.5 && VL.continueProgress({ ep: { watched: true, pos: 9, dur: 10 } }) === -1,
    'progress'
  );

  // My list
  const list = {
    'film:1': { kind: 'film', id: 1, at: 5 },
    'film:2': { kind: 'film', id: 2, at: 9 },
    'show:3': { kind: 'show', id: 3, at: 7 },
  };
  ok(
    VL.myList(list, 'film')
      .map(x => x.id)
      .join() === '2,1' &&
      VL.myList(list, 'show').length === 1 &&
      VL.myList(undefined, 'film').length === 0,
    'my list: one kind, newest first'
  );

  // where the rows were left
  const rws = [
    { src: 'continue', fi: 3 },
    { src: 'recent', fi: 0 },
    { src: 'cat', cid: '100', fi: 57 },
  ];
  const mem = VL.remember(rws, 2);
  ok(mem.row === 'cat:100' && mem.fi['cat:100'] === 57 && !mem.fi['continue:'], 'remember: the row and the position, not in Continue');
  const back = [{ src: 'recent' }, { src: 'cat', cid: '101' }, { src: 'cat', cid: '100' }];
  ok(VL.recall(mem, back) === 2 && back[2].want === 57 && back[0].want === 0, 'recall: the same row, though a row went');
  ok(VL.recall(null, back) === 0 && VL.recall({ row: 'cat:9', fi: {} }, back) === 0, 'recall: the first row otherwise');

  // sorting
  const all = ['added', 'name', 'year', 'rating'];
  ok(VL.nextSort('added', all) === 'name' && VL.nextSort('rating', all) === 'added' && VL.nextSort('', all) === 'added', 'sort: steps');
  ok(VL.nextSort('added', []) === '' && VL.nextSort('added', undefined) === '', 'sort: none offered');
  ok(VL.sortLabel('name', all) === 'A–Z' && VL.sortLabel('x', ['year']) === 'Year', 'sort: labels');

  const seasons = [
    {
      season: 1,
      episodes: [
        { id: 70, num: 1 },
        { id: 71, num: 2 },
      ],
    },
    { season: 2, episodes: [{ id: 72, num: 1 }] },
  ];
  const st = o => ({ items: o });
  let n = VL.nextEpisode(seasons, st({}).items);
  ok(n && n.ep.id === 70 && n.season === 1 && n.resume === 0, 'next: the first episode of a new show');
  n = VL.nextEpisode(seasons, { 'episode:70': { pos: 2400, dur: 2500, watched: true, at: 5 } });
  ok(n.ep.id === 71 && n.resume === 0, 'next: after the last watched');
  n = VL.nextEpisode(seasons, {
    'episode:70': { pos: 2400, dur: 2500, watched: true, at: 5 },
    'episode:71': { pos: 600, dur: 2500, watched: false, at: 6 },
  });
  ok(n.ep.id === 71 && n.resume === 600, 'next: the half-watched one, resumed');
  n = VL.nextEpisode(seasons, { 'episode:71': { pos: 2400, dur: 2500, watched: true, at: 9 } });
  ok(n.ep.id === 72 && n.season === 2, 'next: into the next season');
  n = VL.nextEpisode(seasons, { 'episode:72': { pos: 2400, dur: 2500, watched: true, at: 9 } });
  ok(n.ep.id === 70 && n.resume === 0 && n.again === true, 'next: after the last episode, the first again, marked as again');
  n = VL.nextEpisode(seasons, { 'episode:71': { pos: 2400, dur: 2500, watched: true, at: 9 } });
  ok(!n.again, 'next: not again in the middle of a show');
  n = VL.nextEpisode(seasons, { 'episode:72': { pos: 600, dur: 2500, watched: false, at: 9 } });
  ok(n.ep.id === 72 && n.resume === 600 && !n.again, 'next: the last episode half-watched is resumed');
  ok(VL.nextOf(seasons, 70).num === 2 && VL.nextOf(seasons, 71).season === 2 && VL.nextOf(seasons, 72) === null, 'nextOf');
  ok(VL.nextEpisode([], {}) === null && VL.nextEpisode([{ season: 1, episodes: [] }], {}) === null, 'next: no episodes');
  ok(VL.after(seasons, 71).id === 72 && VL.after(seasons, 72) === null, 'after: the following episode');

  ok(VL.skipStep(1) === 10 && VL.skipStep(3) === 10 && VL.skipStep(4) === 30 && VL.skipStep(8) === 30, 'skip: 10 s, then 30 s');
  ok(VL.skipStep(9) === 60 && VL.skipStep(40) === 60, 'skip: then a minute');
  ok(VL.clock(3723) === '1:02:03' && VL.clock(2530) === '42:10' && VL.clock(5) === '0:05' && VL.clock(NaN) === '0:00', 'clock');
  ok(
    VL.fmtLength(7020) === '1 h 57 min' && VL.fmtLength(2520) === '42 min' && VL.fmtLength(0) === '' && VL.fmtLength(NaN) === '',
    'length'
  );
  ok(VL.endsAt(new Date(2026, 9, 26, 21, 0).getTime(), 5520) === '22:32', 'ends at');
  ok(VL.windowOf(0, 3, 12, 16).join() === '0,3' && VL.windowOf(100, 2489, 12, 16).join() === '88,116', 'window');
  ok(VL.windowOf(2488, 2489, 12, 16).join() === '2476,2489' && VL.windowOf(0, 0, 12, 16).join() === '0,0', 'window: clamped');
  ok(VL.epCode(1, 3) === 'S01E03' && VL.epCode(12, 104) === 'S12E104', 'episode code');
});
