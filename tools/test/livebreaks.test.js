// Live TV ad breaks on the page (app/src/js/livebreaks.js, run here as the page would): the break state from the service's
// /api/breaks/now replies, ending a break when the curator stops answering, the picture's mode, and the clock text. Then Live TV
// itself (live.js) on a stand-in page: dim and mute, OK, the partner channel and back, the viewer's own channel change, leaving.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const { root, ok, run } = require('./lib');

const js = f => fs.readFileSync(path.join(root, 'app', 'src', 'js', f), 'utf8');
const src = js('livebreaks.js');
function load() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.LB = LB;', ctx);
  return ctx.LB;
}

async function logic() {
  const LB = load();

  const st = LB.fresh();
  ok(st.on === false && st.id === null && st.skip === null && st.fails === 0, 'a fresh state is off');
  ok(LB.next(st, { status: 'works', break: true, id: 7, elapsed: 0 }) === 'start' && st.on && st.id === 7, 'start on a break');
  ok(LB.next(st, { status: 'works', break: true, id: 7, elapsed: 1 }) === 'none', 'once per break');
  ok(LB.next(st, { status: 'works', break: false, id: null }) === 'end' && !st.on, 'end when the logo is back');

  LB.next(st, { status: 'works', break: true, id: 8 });
  LB.cancel(st);
  ok(st.on === false && st.skip === 8, 'cancel clears the break and remembers its id');
  ok(LB.next(st, { status: 'works', break: true, id: 8 }) === 'none', 'cancel: the same break stays undimmed');
  ok(LB.next(st, { status: 'works', break: true, id: 9 }) === 'start', 'cancel: the next break dims again');

  ok(
    [null, null].map(r => LB.next(st, r)).join() === 'none,none' && LB.next(st, null) === 'end' && !st.on,
    'fails undim: three failed polls end it'
  );
  ok(LB.next(st, { status: 'works', break: true, id: 10 }) === 'start', 'after a failed break a new break dims');
  ok(LB.next(st, { status: 'unavailable' }) === 'none' && st.fails === 1, 'unavailable counts as a failed poll');
  ok(LB.next(st, { status: 'works', break: true, id: 10 }) === 'none' && st.fails === 0 && st.on, 'a good reply clears the count');
  ok(LB.next(st, null) === 'none' && LB.next(st, null) === 'none' && st.on, 'two failures do not end a break');
  ok(LB.next(st, { status: 'off' }) === 'end' && !st.on, 'a curator that is off ends the break');

  const off = LB.fresh();
  ok(
    LB.next(off, null) === 'none' && LB.next(off, null) === 'none' && LB.next(off, null) === 'none' && off.fails === 3 && !off.on,
    'failures without a break start nothing'
  );
  ok(LB.next(LB.fresh(), { status: 'works', break: true, id: undefined }) === 'start', 'a break without an id still starts');
  ok(LB.next(LB.fresh(), { status: 'off', break: true, id: 3 }) === 'none', 'a break reply that is not works does not start');

  LB.reset(st);
  ok(!st.on && st.id === null && st.skip === null && st.fails === 0, 'reset gives the fresh values');

  ok(LB.how('partner', 'a', 'b', true) === 'partner', 'partner mode uses a partner channel that differs');
  ok(LB.how('partner', 'a', 'a', true) === 'dim', 'partner mode dims when the partner is the same channel');
  ok(LB.how('partner', 'a', 'b', false) === 'dim', 'partner mode dims without a partner');
  ok(LB.how('dim', 'a', 'b', true) === 'dim', 'dim mode always dims');

  ok(LB.clock(72) === '1:12' && LB.clock(5) === '0:05' && LB.clock(0) === '0:00', 'the clock reads minutes and seconds');
  ok(LB.clock(3600) === '60:00', 'long breaks keep counting minutes');
  ok(LB.clock(null) === '' && LB.clock(undefined) === '' && LB.clock('12') === '' && LB.clock(NaN) === '', 'no number gives no clock');
  ok(LB.clock(-3) === '' && LB.clock(Infinity) === '', 'a negative or infinite number gives no clock');
}

// Live TV on a stand-in page: elements by id, timers run by hand, the service's API answered here
function livePage(opts) {
  const els = {},
    timers = [],
    calls = [];
  let nextId = 1;
  function el(id) {
    const cls = {},
      on = {};
    return {
      id: id,
      textContent: '',
      innerHTML: '',
      style: { setProperty: () => {} },
      muted: false,
      firstChild: null,
      parentNode: null,
      value: '',
      classList: {
        toggle: (c, v) => (v ? (cls[c] = 1) : delete cls[c]),
        add: c => (cls[c] = 1),
        remove: c => delete cls[c],
        contains: c => !!cls[c],
      },
      has: c => !!cls[c],
      on: on,
      addEventListener: (ev, fn) => (on[ev] = fn),
      appendChild(c) {
        c.parentNode = this;
      },
      removeChild(c) {
        c.parentNode = null;
      },
      removeAttribute: () => {},
      focus: () => {},
      blur: () => {},
      pause: () => {},
      load: () => {},
    };
  }
  const $ = id => els[id] || (els[id] = el(id));
  const reply = (p, body) => {
    calls.push({ p: p, body: body });
    if (p === '/api/live/status') return { configured: true };
    if (p === '/api/live/channels')
      return {
        groups: [],
        channels: [
          [1, 'a.dk', 'Kanal A', '', '', 'http://h/live/u/p/1.ts', 'aaaaaaaaaa'],
          [2, 'b.dk', 'Kanal B', '', '', 'http://h/live/u/p/2.ts', 'bbbbbbbbbb'],
          [3, 'c.dk', 'Kanal C', '', '', 'http://h/live/u/p/3.ts', 'cccccccccc'],
        ],
      };
    if (p === '/api/breaks/settings' && !body) return page.settings;
    if (p.indexOf('/api/breaks/now') === 0) return page.now(p);
    return {};
  };
  const ctx = {
    window: { Intl: Intl },
    document: { createElement: () => el('video') },
    localStorage: { getItem: () => null, setItem: () => {} },
    LOC: 'da-DK',
    $: $,
    setHtml: (e, h) => (e.innerHTML = h),
    t: k => k,
    api: (p, body) => {
      const r = reply(p, body);
      return r && typeof r.then === 'function' ? r : r instanceof Error ? Promise.reject(r) : Promise.resolve(r);
    },
    perfMark: () => {},
    clockOpts: () => ({}),
    hsl2rgb: () => [0, 0, 0],
    hashHue: () => 0,
    setTimeout: (fn, ms) => (timers.push({ id: nextId, fn: fn, ms: ms, rep: false }), nextId++),
    setInterval: (fn, ms) => (timers.push({ id: nextId, fn: fn, ms: ms, rep: true }), nextId++),
    clearTimeout: id => {
      for (let i = 0; i < timers.length; i++) if (timers[i].id === id) timers.splice(i, 1);
    },
  };
  ctx.clearInterval = ctx.clearTimeout;
  vm.createContext(ctx);
  vm.runInContext(js('livetracks.js') + js('livebreaks.js') + js('live.js') + '\nthis.LIVE = LIVE;', ctx);
  const page = {
    LIVE: ctx.LIVE,
    $: $,
    calls: calls,
    settings: opts.settings,
    now: () => ({ status: 'works', break: false, id: null, elapsed: null }),
    /* the break poll's interval (1000 ms, repeating), if one runs */
    polls: () => timers.filter(x => x.rep && x.ms === 1000),
    fire: ms =>
      timers
        .filter(x => !x.rep && x.ms === ms)
        .forEach(x => {
          ctx.clearTimeout(x.id);
          x.fn();
        }),
    key: k => ctx.LIVE.key({ keyCode: k, preventDefault: () => {} }),
    video: () => $('lv-stage').video,
    nowAsks: () => calls.filter(c => c.p.indexOf('/api/breaks/now') === 0).map(c => c.p.split('key=')[1]),
  };
  /* the <video> the page creates, found by its 'playing' listener */
  ctx.document.createElement = () => {
    const v = el('video');
    els['lv-stage'] = els['lv-stage'] || el('lv-stage');
    els['lv-stage'].video = v;
    return v;
  };
  return page;
}
const flush = async () => {
  for (let i = 0; i < 10; i++) await new Promise(r => setImmediate(r));
};
async function poll(pg, reply) {
  pg.now = () => reply;
  pg.polls().forEach(x => x.fn());
  await flush();
}
const playing = async pg => {
  pg.video().on.playing();
  await flush();
};
const brk = (id, elapsed) => ({ status: 'works', break: true, id: id, elapsed: elapsed });
const nobrk = { status: 'works', break: false, id: null, elapsed: null };

run(async () => {
  await logic();
  // dim: muted, the dark layer, the banner kept up with the counter; OK brings both back for this break only
  {
    const pg = livePage({ settings: { mode: 'dim', partner: '', available: true } });
    pg.LIVE.enter(false, 'aaaaaaaaaa');
    await flush();
    await playing(pg);
    ok(pg.polls().length === 1, 'live: the break poll runs while a channel plays and the mode is on');
    await poll(pg, nobrk);
    ok(pg.nowAsks().join() === 'aaaaaaaaaa', 'live: the poll asks for the channel being watched');
    const v = pg.video();
    await poll(pg, brk(1, 72));
    const osd = pg.$('lv-osd');
    ok(
      v.muted && pg.$('lv-dim').has('on') && osd.has('on') && osd.has('brk') && pg.$('lv-oname').textContent === 'Ads · Kanal A',
      'live: a break mutes, dims and keeps the banner up as "Ads · <channel>"'
    );
    ok(pg.$('lv-oclock').textContent === '1:12' && pg.$('lv-ohint').textContent === 'Watch the ads', 'live: the counter and the OK hint');
    pg.fire(5500);
    ok(osd.has('on'), 'live: the banner does not hide by itself during the break');
    await poll(pg, brk(1, 73));
    ok(pg.$('lv-oclock').textContent === '1:13', 'live: the counter follows each reply');
    pg.key(13);
    ok(
      !v.muted && !pg.$('lv-dim').has('on') && !osd.has('brk') && pg.$('lv-oname').textContent === 'Kanal A' && !pg.$('lv-guide').has('on'),
      'live: OK during a break brings picture and sound back and does not open the guide'
    );
    await poll(pg, brk(1, 74));
    ok(!v.muted && !pg.$('lv-dim').has('on'), 'live: after OK the same break stays undimmed');
    await poll(pg, brk(2, 0));
    ok(v.muted && pg.$('lv-dim').has('on'), 'live: the next break dims again');
    await poll(pg, null);
    await poll(pg, null);
    ok(v.muted, 'live: two failed polls keep the break');
    await poll(pg, null);
    ok(!v.muted && !pg.$('lv-dim').has('on'), 'live: three failed polls undim (the curator stopped answering)');
    await poll(pg, brk(3, 0));
    await poll(pg, nobrk);
    ok(!v.muted && !pg.$('lv-dim').has('on') && !osd.has('brk'), 'live: the end of the break undims');

    // one request at a time
    let n = 0;
    pg.now = () => (n++, new Promise(() => {}));
    pg.polls().forEach(x => x.fn());
    pg.polls().forEach(x => x.fn());
    ok(n === 1, 'live: one break request at a time');

    // the viewer changes channel during a break: picture and sound back at once
    const pg2 = livePage({ settings: { mode: 'dim', partner: '', available: true } });
    pg2.LIVE.enter(false, 'aaaaaaaaaa');
    await flush();
    await playing(pg2);
    await poll(pg2, brk(4, 10));
    const v2 = pg2.video();
    pg2.key(38);
    ok(!v2.muted && !pg2.$('lv-dim').has('on') && !pg2.$('lv-osd').has('brk'), 'live: changing channel during a break undims');
    const asked = pg2.nowAsks().length;
    await poll(pg2, brk(4, 11));
    ok(pg2.nowAsks().length === asked, 'live: nothing is asked while zapping');
    pg2.fire(180);
    await playing(pg2);
    await poll(pg2, nobrk);
    ok(pg2.nowAsks().slice(-1)[0] === 'bbbbbbbbbb', 'live: then the new channel is asked for');

    // leaving Live TV during a break
    pg.now = () => brk(9, 1);
    const pg3 = livePage({ settings: { mode: 'dim', partner: '', available: true } });
    pg3.LIVE.enter(false, 'aaaaaaaaaa');
    await flush();
    await playing(pg3);
    const v3 = pg3.video();
    await poll(pg3, brk(5, 1));
    pg3.LIVE.exit();
    ok(!v3.muted && !pg3.$('lv-dim').has('on') && pg3.polls().length === 0, 'live: leaving during a break unmutes and stops the poll');
  }

  // partner channel: shown during the break with the pill, back when it ends; the viewer's own change means no way back
  {
    const pg = livePage({ settings: { mode: 'partner', partner: 'bbbbbbbbbb', available: true } });
    pg.LIVE.enter(false, 'aaaaaaaaaa');
    await flush();
    await playing(pg);
    await poll(pg, brk(1, 5));
    ok(
      pg.$('lv-onum').textContent === 2 && pg.$('lv-pill').has('on') && /Ads on Kanal A · 0:05/.test(pg.$('lv-pill').innerHTML),
      'live: a break shows the partner channel with the pill'
    );
    ok(
      /Kanal A continues · switching back by itself/.test(pg.$('lv-pill').innerHTML),
      'live: the pill names the programme (or the channel)'
    );
    ok(!pg.video().muted && !pg.$('lv-dim').has('on'), 'live: the partner channel plays normally');
    await poll(pg, brk(1, 6));
    ok(pg.nowAsks().slice(-1)[0] === 'aaaaaaaaaa', 'live: on the partner the channel in the break is asked for');
    await poll(pg, nobrk);
    ok(pg.$('lv-onum').textContent === 1 && !pg.$('lv-pill').has('on'), 'live: the end of the break switches back');
    await playing(pg);

    await poll(pg, brk(2, 0));
    ok(pg.$('lv-onum').textContent === 2, 'live: the next break switches again');
    pg.key(38);
    pg.fire(180);
    await playing(pg);
    ok(pg.$('lv-onum').textContent === 3 && !pg.$('lv-pill').has('on'), 'live: the viewer changes channel on the partner: the pill goes');
    await poll(pg, nobrk);
    ok(pg.$('lv-onum').textContent === 3, 'live: then nothing switches back');

    // back to the channel in the break by the viewer: it does not switch straight to the partner again
    pg.key(49);
    pg.fire(1800);
    await playing(pg);
    await poll(pg, brk(3, 0));
    ok(pg.$('lv-onum').textContent === 2, 'live: a break on channel 1 again shows the partner');
    pg.key(49);
    pg.fire(1800);
    await playing(pg);
    await poll(pg, brk(3, 2));
    ok(pg.$('lv-onum').textContent === 1 && !pg.$('lv-dim').has('on'), 'live: back on channel 1 by hand, this break is watched');

    // the partner being the channel watched: dim instead
    await poll(pg, nobrk);
    const pgd = livePage({ settings: { mode: 'partner', partner: 'aaaaaaaaaa', available: true } });
    pgd.LIVE.enter(false, 'aaaaaaaaaa');
    await flush();
    await playing(pgd);
    await poll(pgd, brk(1, 0));
    ok(pgd.$('lv-onum').textContent === 1 && pgd.$('lv-dim').has('on'), 'live: a break on the partner channel itself dims');
  }

  // off: no poll, no request; the menu rows only when the curator is set up
  {
    const pg = livePage({ settings: { mode: 'off', partner: '', available: true } });
    pg.LIVE.enter(false, 'aaaaaaaaaa');
    await flush();
    await playing(pg);
    ok(pg.polls().length === 0 && pg.nowAsks().length === 0, 'live: with the mode off the service is never asked');
    pg.key(405);
    const m = pg.$('lv-menu').innerHTML;
    ok(/Ad breaks/.test(m) && /Partner channel/.test(m) && /Use this channel as partner/.test(m), 'live: the menu has the ad break rows');
    // Down to "Ad breaks" (Favourite, Ad breaks, Partner channel, Statistics, Close) and OK: dim
    pg.key(40);
    pg.key(13);
    await flush();
    const post = pg.calls.filter(c => c.p === '/api/breaks/settings' && c.body).slice(-1)[0];
    ok(
      post && post.body.mode === 'dim' && post.body.partner === '' && pg.polls().length === 1,
      'live: OK on Ad breaks sets Dim and starts the poll'
    );
    pg.key(40);
    pg.key(13);
    await flush();
    const post2 = pg.calls.filter(c => c.p === '/api/breaks/settings' && c.body).slice(-1)[0];
    ok(
      post2.body.mode === 'dim' && post2.body.partner === 'aaaaaaaaaa' && /Kanal A/.test(pg.$('lv-menu').innerHTML),
      'live: OK on Partner channel makes the channel being watched the partner'
    );
    const pn = livePage({ settings: { mode: 'off', partner: '', available: false } });
    pn.LIVE.enter(false, 'aaaaaaaaaa');
    await flush();
    pn.key(405);
    ok(!/Ad breaks/.test(pn.$('lv-menu').innerHTML), 'live: no ad break rows without the curator');
  }
});
