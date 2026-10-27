// Films & Series (vod.js): the curator's address, the curator's JSON passed through (only the library paths), and the resume and
// watched state kept on the TV.
const fs = require('fs'),
  path = require('path');
const { ok, call, serve, sleep, req, run } = require('./lib');

req('netcompat').mkdirp(process.env.CYTV_LIVE_DIR);
const liveSettings = path.join(process.env.CYTV_LIVE_DIR, 'settings.json');
fs.writeFileSync(liveSettings, JSON.stringify({ playlistUrl: 'http://10.0.0.5:8000/playlist.m3u' }));
const vod = req('vod');
const feature = vod.create({});

run(async () => {
  // the curator's address: from the Live TV playlist when it is the curator's, else a setting
  ok(vod.baseFrom({}, { playlistUrl: 'http://10.0.0.5:8000/playlist.m3u' }) === 'http://10.0.0.5:8000', 'base: from the curator playlist');
  ok(vod.baseFrom({}, { playlistUrl: 'http://x.example/get.php?username=a' }) === '', 'base: not from another playlist');
  ok(
    vod.baseFrom({ base: 'http://c.lan:8000' }, { playlistUrl: 'http://10.0.0.5:8000/playlist.m3u' }) === 'http://c.lan:8000',
    'base: the setting wins'
  );
  let st = (await call(feature, '/api/vod/status')).j;
  ok(st.configured === true && st.base === 'http://10.0.0.5:8000', 'status: configured from the Live TV playlist');
  ok((await call(feature, '/api/vod/settings', 'POST', { base: 'ftp://x' })).code === 400, 'settings: only http(s)');
  ok((await call(feature, '/api/vod/settings', 'POST', { base: 'http://x/path' })).code === 400, 'settings: an origin, no path');

  // a stand-in curator
  const seen = [];
  const cur = await serve((q, r) => {
    seen.push(q.url);
    if (q.url.indexOf('/vod/films/9.json') === 0) {
      r.writeHead(404, { 'content-type': 'application/json' });
      return r.end('{"detail":"not a ticked category"}');
    }
    r.writeHead(200, { 'content-type': 'application/json' });
    r.end(JSON.stringify({ path: q.url }));
  });
  ok((await call(feature, '/api/vod/settings', 'POST', { base: cur.url })).code === 200, 'settings: stored');
  st = (await call(feature, '/api/vod/status')).j;
  ok(st.base === cur.url, 'status: the stored address');

  let r = await call(feature, '/api/vod/get?path=' + encodeURIComponent('/vod/library.json'));
  ok(r.code === 200 && r.j.path === '/vod/library.json', 'get: the library is passed through');
  r = await call(feature, '/api/vod/get?path=' + encodeURIComponent('/vod/films/1.json') + '&offset=40&limit=40&evil=1');
  ok(r.code === 200 && r.j.path === '/vod/films/1.json?offset=40&limit=40', 'get: paging passed on, other keys dropped');
  r = await call(feature, '/api/vod/get?path=' + encodeURIComponent('/vod/search.json') + '&q=' + encodeURIComponent('olsen banden'));
  ok(r.code === 200 && /^\/vod\/search\.json\?q=olsen(\+|%20)banden$/.test(r.j.path), 'get: search');
  for (const p of ['/vod/films/recent.json', '/vod/series/12.json', '/vod/film/501.json', '/vod/show/601.json'])
    ok((await call(feature, '/api/vod/get?path=' + encodeURIComponent(p))).code === 200, 'get: allowed ' + p);
  const n = seen.length;
  for (const p of [
    '/vod/play/movie/1.mkv',
    '/vod.m3u',
    '/api/account',
    '/vod/img/abc',
    '/vod/film/../x.json',
    'http://evil/vod/library.json',
  ])
    ok((await call(feature, '/api/vod/get?path=' + encodeURIComponent(p))).code === 400, 'get: refused ' + p);
  ok(seen.length === n, 'get: a refused path never reaches the curator');
  r = await call(feature, '/api/vod/get?path=' + encodeURIComponent('/vod/films/9.json'));
  ok(r.code === 404 && r.j.detail === 'not a ticked category', "get: the curator's 404 comes back");
  cur.server.close();
  await call(feature, '/api/vod/settings', 'POST', { base: 'http://127.0.0.1:1' });
  r = await call(feature, '/api/vod/get?path=' + encodeURIComponent('/vod/library.json'));
  ok(r.code === 502 && typeof r.j.error === 'string', 'get: an unreachable curator is a 502');

  // state
  const pos = { op: 'pos', kind: 'film', id: 501, pos: 1200.5, dur: 7020, name: 'Druk', poster: '/vod/img/' + 'a'.repeat(32) };
  ok((await call(feature, '/api/vod/state', 'POST', pos)).code === 200, 'state: a position is stored');
  let s = (await call(feature, '/api/vod/state')).j;
  const it = s.items['film:501'];
  ok(it && it.pos === 1200.5 && it.dur === 7020 && it.name === 'Druk' && it.watched === false && it.at > 0, 'state: the item');
  const ep = {
    op: 'pos',
    kind: 'episode',
    id: 7000,
    pos: 60,
    dur: 2500,
    show: { id: 601, name: 'Borgen', poster: '' },
    season: 1,
    num: 1,
    name: 'Dekorum',
    poster: '',
  };
  ok((await call(feature, '/api/vod/state', 'POST', ep)).code === 200, 'state: an episode');
  ok((await call(feature, '/api/vod/state', 'POST', { op: 'watched', kind: 'film', id: 501, on: true })).code === 200, 'state: watched');
  s = (await call(feature, '/api/vod/state')).j;
  ok(s.items['film:501'].watched === true && s.items['episode:7000'].show.id === 601, 'state: watched and show kept');
  ok((await call(feature, '/api/vod/state', 'POST', { op: 'forget', kind: 'episode', id: 7000 })).code === 200, 'state: forget');
  ok(!(await call(feature, '/api/vod/state')).j.items['episode:7000'], 'state: forgotten');
  const bad = [
    Object.assign({}, pos, { kind: 'song' }),
    Object.assign({}, pos, { id: '../x' }),
    Object.assign({}, pos, { name: 'x'.repeat(201) }),
    Object.assign({}, pos, { poster: 'http://evil/x.jpg' }),
    Object.assign({}, pos, { pos: -1 }),
    Object.assign({}, pos, { pos: 'x' }),
    { op: 'nope', kind: 'film', id: 1 },
  ];
  for (const b of bad)
    ok((await call(feature, '/api/vod/state', 'POST', b)).code === 400, 'state: refused ' + JSON.stringify(b).slice(0, 60));

  // the curator's image paths carry its image version (?v=n): a position with one is kept
  const v = Object.assign({}, pos, { id: 503, poster: '/vod/img/' + 'b'.repeat(32) + '?v=2' });
  ok((await call(feature, '/api/vod/state', 'POST', v)).code === 200, 'state: a poster path with ?v= is accepted');
  ok(
    (await call(feature, '/api/vod/state', 'POST', Object.assign({}, v, { poster: '/vod/img/' + 'b'.repeat(32) + '?v=2&x=1' }))).code ===
      400,
    'state: nothing else after the poster path'
  );

  // capped: the newest 2000 stay
  const many = { items: {} };
  for (let i = 0; i < 2005; i++) vod.applyOp(many, { op: 'pos', kind: 'film', id: i, pos: 10, dur: 100, name: '', poster: '' }, 1000 + i);
  const keys = Object.keys(many.items);
  ok(keys.length === 2000 && !many.items['film:0'] && many.items['film:2004'], 'state: capped at the newest 2000');

  await sleep(1300);
  const file = path.join(process.env.CYTV_VOD_DIR, 'state.json');
  ok(
    fs.existsSync(file) && JSON.parse(fs.readFileSync(file, 'utf8')).items['film:501'].watched === true,
    'state: written to the VOD folder'
  );
});
