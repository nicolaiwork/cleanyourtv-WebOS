// Ad breaks in Live TV (fork only): the mode (off, dim or partner channel) kept on the TV, and the break state of the channel being
// watched, passed through from the iptv-curator that watches the stream. Only the numeric stream id goes to the curator, never the
// stream address (it holds the provider's credentials). Each ask keeps the curator's watcher alive, so with the mode off it is never asked.
const fs = require('fs');
const nc = require('./netcompat');
const P = require('./paths'),
  fetch = require('./fetch'),
  web = require('./web'),
  vod = require('./vod'),
  live = require('./live');
const FILE = P.LIVE + '/breaks.json',
  LIVE_SETTINGS = P.LIVE + '/settings.json';
const MODES = ['off', 'dim', 'partner'];
const validKey = k => typeof k === 'string' && /^[0-9a-f]{10}(-\d+)?$/.test(k);
try {
  nc.mkdirp(P.LIVE);
} catch (_) {}

const readJson = (f, d) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (_) {
    return d;
  }
};
const clean = o => ({
  mode: o && MODES.indexOf(o.mode) >= 0 ? o.mode : 'off',
  partner: o && validKey(o.partner) ? o.partner : '',
});
let settings = clean(readJson(FILE, null));
// only a Live TV playlist that is the curator's own /playlist.m3u gives its address: the stream ids are that playlist's, so a Films &
// Series address alone (with someone else's playlist in Live TV) is never asked
const base = () => vod.baseFrom({}, readJson(LIVE_SETTINGS, {}));

async function now(key) {
  if (settings.mode === 'off') return { status: 'off' };
  const b = base(),
    m = /\/(\d+)(\.(ts|m3u8))?$/.exec(live.streamOf(key));
  if (!b || !m) return { status: 'unavailable' };
  try {
    const r = await fetch.read(b + '/breaks/' + m[1] + '.json', {
      maxBytes: 1e4,
      totalMs: 2000,
      idleMs: 2000, // a curator that takes the connection but never answers: the socket goes with the 2 s cut-off, not 20 s later
      anyStatus: true,
      headers: { accept: 'application/json' },
    });
    if (r.status !== 200) return { status: 'unavailable' };
    const j = JSON.parse(r.body.toString('utf8'));
    return {
      status: String(j.status),
      break: j.break === true,
      id: j.id === undefined ? null : j.id,
      elapsed: j.elapsed === undefined ? null : j.elapsed,
    };
  } catch (_) {
    return { status: 'unavailable' };
  }
}

async function handle(req, res, u, body) {
  const json = (o, c) => web.json(res, o, c);
  if (u === '/api/breaks/settings' && req.method === 'GET')
    return json({ mode: settings.mode, partner: settings.partner, available: !!base() });
  if (u === '/api/breaks/settings' && req.method === 'POST') {
    const b = await body(req);
    if (!b || MODES.indexOf(b.mode) < 0 || (b.partner !== '' && !validKey(b.partner))) return json({ error: 'bad request' }, 400);
    settings = { mode: b.mode, partner: b.partner };
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(settings));
    fs.renameSync(FILE + '.tmp', FILE);
    return json({ returnValue: true });
  }
  if (u === '/api/breaks/now' && req.method === 'GET') {
    const key = new nc.URL(req.url, 'http://x').searchParams.get('key');
    return json(await now(key));
  }
  web.notFound(res);
}

const create = (/** @type {any} */ _ctx) => ({ name: 'breaks', prefix: '/api/breaks/', handle });
module.exports = { create };
