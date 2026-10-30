// Home's rules (app/src/js/homelib.js, run here as the page would, after vodlib.js): which titles the hero shows, the Continue
// watching cards, Play or Resume, what the hero shows when something is missing, the bottom strip, and the channel cards.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const { root, ok, run } = require('./lib');

const js = f => fs.readFileSync(path.join(root, 'app', 'src', 'js', f), 'utf8');
const ctx = { Date, Math, isFinite };
vm.createContext(ctx);
vm.runInContext(js('vodlib.js') + '\n' + js('homelib.js') + '\nthis.HL = HL;', ctx);
const HL = ctx.HL;

run(async () => {
  // the hero: the films Trending row, titles with a backdrop, without those in Home's Continue watching row
  const rows = [
    { id: 'popular', items: [{ id: 9, backdrop: '/b9' }] },
    {
      id: 'trending',
      items: [{ id: 1, backdrop: '/b1' }, { id: 2 }, { id: 3, backdrop: '/b3' }, { id: 4, backdrop: '/b4' }, { id: 5, backdrop: '/b5' }],
    },
  ];
  ok(
    HL.heroPicks(rows, [3], 10)
      .map(x => x.id)
      .join() === '1,4,5',
    'hero: Trending titles with a backdrop, the ones in Continue watching left out'
  );
  ok(HL.heroPicks(rows, [], 2).length === 2, 'hero: at most the asked number');
  ok(
    HL.heroPicks(null, [], 10).length === 0 && HL.heroPicks([{ id: 'popular', items: [] }], [], 10).length === 0,
    'hero: none without Trending'
  );

  // Continue watching: the same lists as Films & Series, newest first, three
  const now = 2000;
  const st = {
    items: {
      'film:1': { kind: 'film', id: 1, name: 'Zootropolis', poster: '/p1', pos: 158, dur: 6512, watched: false, at: 500 },
      'film:2': { kind: 'film', id: 2, name: 'Seen', pos: 6500, dur: 6512, watched: true, at: 1500 },
      'film:3': { kind: 'film', id: 3, name: 'Old', pos: 100, dur: 6000, watched: false, at: 100 },
      'film:4': { kind: 'film', id: 4, name: 'Removed', pos: 100, dur: 6000, watched: false, at: 300 },
      'episode:70': {
        kind: 'episode',
        id: 70,
        show: { id: 601, name: 'Fars lille pige', poster: '/s601' },
        season: 1,
        num: 1,
        pos: 1310,
        dur: 2531,
        watched: false,
        at: 900,
      },
    },
    hidden: { 'film:4': 400 },
    list: {},
  };
  const cards = HL.continueCards(st, now);
  ok(
    cards.map(c => c.kind + ':' + c.id).join() === 'series:601,films:1,films:3',
    'continue: series and films merged newest first, watched and removed titles left out, three at most'
  );
  ok(
    cards[0].label === 'Fars lille pige' && cards[0].poster === '/s601' && cards[0].sub === 'S01E01  ·  20 min left',
    'continue: a series card shows the show and the episode'
  );
  ok(cards[1].sub === '1 h 46 min left' && cards[1].prog > 0.02 && cards[1].prog < 0.03, 'continue: a film card shows the time left');
  ok(HL.continueCards({ items: {}, hidden: {}, list: {} }, now).length === 0, 'continue: none without state');
  const st4 = {
    items: Object.assign({ 'film:5': { kind: 'film', id: 5, name: 'Five', pos: 50, dur: 6000, watched: false, at: 50 } }, st.items),
    hidden: st.hidden,
    list: {},
  };
  ok(
    HL.continueCards(st4, now).length === 3 && HL.continueCards(st4, now, 8).length === 4,
    'continue: three, or more when the band has room (no channels)'
  );
  // the poster saved when a title was played can be gone from the curator's image cache (404): the curator's card for the title, as
  // Films & Series uses, wins, and its (Danish) title with it; a title the curator does not know keeps what was saved
  const fresh = HL.continueCards(st, now, 3, {
    films: { 1: { id: 1, label: 'Zootropolis', poster: '/new1' }, 3: { id: 3, none: true } },
    series: { 601: { id: 601, poster: '/s601new' } },
  });
  ok(
    fresh[1].poster === '/new1' &&
      fresh[1].label === 'Zootropolis' &&
      fresh[0].poster === '/s601new' &&
      fresh[0].label === 'Fars lille pige',
    "continue: the curator's card gives the poster and title"
  );
  ok(
    fresh[2].poster === (st.items['film:3'].poster || '') && fresh[2].label === st.items['film:3'].name,
    'continue: without a card, what was saved'
  );

  // Play or Resume
  const r = HL.heroPlay({ id: 1 }, st.items);
  ok(r.label === 'Resume' && r.left === '1 h 46 min left', 'hero: Resume with the time left for a started film');
  ok(HL.heroPlay({ id: 77 }, st.items).label === 'Play' && HL.heroPlay({ id: 2 }, st.items).label === 'Play', 'hero: Play otherwise');

  // what the hero shows
  ok(HL.heroMode([{ id: 1 }], [{ key: 'a' }]) === 'film', 'hero mode: a film when there is one');
  ok(HL.heroMode([], [{ key: 'a' }]) === 'channel', 'hero mode: the last channel without films');
  ok(HL.heroMode([], []) === 'none', 'hero mode: nothing');

  // the strip
  const have = id => id !== 'gone';
  const dock = ['__live', '__vod', 'youtube.leanback.v4', 'com.beb.plxnative'];
  ok(
    HL.stripIds({ dock, live: true, vod: true, pinned: ['com.webos.app.hdmi1'], has: have, max: 6 }).join() ===
      '__live,__vod,youtube.leanback.v4,com.beb.plxnative,com.webos.app.hdmi1',
    'strip: Live TV and Films & Series first, the dock, then the pinned inputs'
  );
  ok(
    HL.stripIds({ dock: ['a', 'gone', '__live', 'b'], live: false, vod: true, pinned: ['b'], has: have, max: 6 }).join() === '__vod,a,b',
    'strip: Live TV off, unknown apps left out, a pinned input already in the dock once'
  );
  ok(
    HL.stripIds({ dock: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], live: false, vod: false, pinned: [], has: have, max: 6 }).length === 6,
    'strip: at most six dock entries'
  );

  // the channel cards
  ok(
    HL.progress(1000, [900, 1100]) === 0.5 && HL.progress(800, [900, 1100]) === 0 && HL.progress(1200, [900, 1100]) === 1,
    'progress: clamped'
  );
  ok(HL.progress(1000, null) === 0, 'progress: none without a programme');
  const d = new Date(2026, 9, 29, 21, 25).getTime() / 1000;
  ok(HL.hm(d) === '21:25', 'hm: hours and minutes');
  const line = HL.chanLine({ now: [d, d + 3300, 'Sommerdahl'], next: [d + 3300, d + 4000, 'Så kører bussen'] }, d + 2340);
  ok(
    line.title === 'Sommerdahl' &&
      line.times === '21:25 to 22:20' &&
      line.next === 'Then Så kører bussen' &&
      Math.abs(line.prog - 0.709) < 0.01,
    'channel card: programme, times, next and progress'
  );
  // between two programmes the service has no programme now but the next one
  const gap = HL.chanLine({ now: null, next: [d + 600, d + 1800, 'Debatten'] }, d);
  ok(
    gap.title === 'Debatten' && gap.times === 'From 21:35' && gap.next === '' && gap.prog === 0,
    'channel card: in a gap, the next programme'
  );
  ok(HL.stale({ now: [d - 60, d + 60] }, d + 61) && !HL.stale({ now: [d - 60, d + 60] }, d + 59), 'stale: the programme on now ended');
  ok(HL.stale({ now: null, next: [d + 10, d + 70] }, d + 11) && !HL.stale({ now: null, next: null }, d), 'stale: the next programme began');
  // the hero slides on its own while nobody uses the remote, also with the focus resting on Play; never just after a key
  ok(HL.maySlide({ inHero: true, moved: false, sinceKey: 60000 }), 'slide: Home untouched, the focus resting on Play');
  ok(!HL.maySlide({ inHero: true, moved: true, sinceKey: 60000 }), 'slide: not while the viewer is on the hero buttons');
  ok(!HL.maySlide({ inHero: false, moved: true, sinceKey: 2000 }), 'slide: not just after a key');
  ok(HL.maySlide({ inHero: false, moved: true, sinceKey: 5000 }), 'slide: the focus elsewhere');
  const none = HL.chanLine({ now: null, next: null }, d);
  ok(none.title === 'No guide' && none.times === '' && none.next === '' && none.prog === -1, 'channel card: no guide');
});
