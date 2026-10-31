// Ad breaks in Live TV (breaks.js): the mode and partner setting, and the curator's break state passed through for the channel
// being watched. Off means the curator is never asked (each ask keeps its watcher alive).
const fs = require('fs'),
  path = require('path');
const { ok, call, serve, req, run } = require('./lib');

req('netcompat').mkdirp(process.env.CYTV_LIVE_DIR);
const KEY = 'abcdef0123';
fs.writeFileSync(
  path.join(process.env.CYTV_LIVE_DIR, 'playlist.json'),
  JSON.stringify({
    v: 2,
    channels: [
      { key: KEY, url: 'http://prov.example/u/p/101', alt: [] },
      { key: 'abcdef0124', url: 'http://prov.example/u/p/live.m3u8', alt: [] },
      { key: 'abcdef0125', url: 'http://prov.example/u/p/202.ts', alt: [] },
    ],
  })
);
fs.writeFileSync(
  path.join(process.env.CYTV_LIVE_DIR, 'settings.json'),
  JSON.stringify({ playlistUrl: 'http://10.0.0.5:8000/playlist.m3u' })
);
const live = req('live');
const feature = req('breaks').create({});
const now = k => call(feature, '/api/breaks/now?key=' + k);
const set = b => call(feature, '/api/breaks/settings', 'POST', b);

run(async () => {
  ok(live.streamOf(KEY) === 'http://prov.example/u/p/101' && live.streamOf('ffffffffff') === '' && live.streamOf('x') === '', 'streamOf');
  let r = await call(feature, '/api/breaks/settings');
  ok(r.j.mode === 'off' && r.j.partner === '' && r.j.available === true, 'settings: off by default, curator known from the playlist');
  // a Films & Series address alone does not make breaks available: the Live TV playlist must be the curator's
  const liveSettings = path.join(process.env.CYTV_LIVE_DIR, 'settings.json');
  fs.writeFileSync(path.join(process.env.CYTV_VOD_DIR, 'settings.json'), JSON.stringify({ base: 'http://10.0.0.9:8000' }));
  fs.writeFileSync(liveSettings, JSON.stringify({ playlistUrl: 'http://other.example/get.php?type=m3u' }));
  r = await call(feature, '/api/breaks/settings');
  ok(r.j.available === false, "settings: not available with a Films & Series address and someone else's playlist");
  ok((await set({ mode: 'loud', partner: '' })).code === 400, 'settings: only the three modes');
  ok((await set({ mode: 'partner', partner: 'nope' })).code === 400, 'settings: the partner is a channel key');
  ok((await set({ mode: 'partner', partner: '../x' })).code === 400, 'settings: no path as partner');

  const seen = [];
  let delay = 0,
    socketClosed = 0;
  const cur = await serve((q, s) => {
    seen.push(q.url);
    if (delay) q.socket.once('close', () => (socketClosed = Date.now())); // the slow request's own connection
    const reply = () => {
      if (q.url !== '/breaks/101.json' && q.url !== '/breaks/202.json') {
        s.writeHead(404);
        return s.end('{}');
      }
      s.writeHead(200, { 'content-type': 'application/json' });
      s.end(JSON.stringify({ status: 'works', break: true, id: 7, elapsed: 12, extra: 'x' }));
    };
    delay ? setTimeout(reply, delay) : reply();
  });
  // the curator's address as a setting, so only the mode decides
  fs.writeFileSync(path.join(process.env.CYTV_LIVE_DIR, 'settings.json'), JSON.stringify({ playlistUrl: cur.url + '/playlist.m3u' }));
  r = await now(KEY);
  ok(r.j.status === 'off' && seen.length === 0, 'now: off asks nobody');

  ok((await set({ mode: 'dim', partner: '' })).code === 200, 'settings: stored');
  ok((await call(feature, '/api/breaks/settings')).j.mode === 'dim', 'settings: read back');
  r = await now(KEY);
  ok(
    seen[0] === '/breaks/101.json' &&
      r.j.status === 'works' &&
      r.j.break === true &&
      r.j.elapsed === 12 &&
      r.j.id === 7 &&
      !('extra' in r.j),
    'now: the curator reply for stream 101, known fields only'
  );
  r = await now('abcdef0125');
  ok(seen[1] === '/breaks/202.json' && r.j.break === true, 'now: a .ts address');
  const n = seen.length;
  ok((await now('ffffffffff')).j.status === 'unavailable', 'now: unknown channel');
  ok((await now('abcdef0124')).j.status === 'unavailable', 'now: no numeric stream id');
  ok((await now('bad')).j.status === 'unavailable' && seen.length === n, 'now: those never reach the curator');
  // the curator known only as the Films & Series address, the Live TV playlist someone else's: not asked
  fs.writeFileSync(path.join(process.env.CYTV_VOD_DIR, 'settings.json'), JSON.stringify({ base: cur.url }));
  fs.writeFileSync(liveSettings, JSON.stringify({ playlistUrl: 'http://other.example/get.php?type=m3u' }));
  ok((await now(KEY)).j.status === 'unavailable' && seen.length === n, 'now: the Films & Series address alone is never asked');
  fs.writeFileSync(liveSettings, JSON.stringify({ playlistUrl: cur.url + '/playlist.m3u' }));

  delay = 3000;
  const t = Date.now();
  r = await now(KEY);
  const ms = Date.now() - t;
  ok(r.j.status === 'unavailable' && ms < 2600, 'now: a slow curator gives up within 2 s');
  // the connection goes with the cut-off (not at the 20 s idle limit), so slow answers never pile up sockets
  await new Promise(res => setTimeout(res, 700));
  ok(socketClosed > 0 && socketClosed - t < 2700, 'now: a curator that never answers has its connection closed at the cut-off');
  delay = 0;
  cur.server.close();
  r = await now(KEY);
  ok(r.j.status === 'unavailable', 'now: curator down');
  ok(JSON.stringify(r.j).indexOf('prov.example') < 0, 'now: no stream address in any reply');
});
