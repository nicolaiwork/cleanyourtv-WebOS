// Films & Series backend for the launcher (fork only): passes the library JSON of an iptv-curator server through to the page, so the
// page only talks to this service, and keeps what the viewer watched (resume positions, watched marks) on the TV.
// The curator is the only thing that talks to the IPTV provider; this module never asks for a film or episode file.
const fs = require('fs');
const nc = require('./netcompat'),
  { URL } = nc;
const P = require('./paths'),
  fetch = require('./fetch'),
  web = require('./web');
const DIR = P.VOD;
const SETTINGS = DIR + '/settings.json',
  STATE = DIR + '/state.json',
  LIVE_SETTINGS = P.LIVE + '/settings.json';
const MAX_ITEMS = 2000;
try {
  nc.mkdirp(DIR);
} catch (_) {}

const readJson = (f, d) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (_) {
    return d;
  }
};
const writeJson = (f, o) => {
  fs.writeFileSync(f + '.tmp', JSON.stringify(o));
  fs.renameSync(f + '.tmp', f);
};

// ---- the curator's address: a setting, else the origin of Live TV's playlist when that is the curator's /playlist.m3u ----
const ORIGIN = /^https?:\/\/[^/?#\s]+$/i;
function baseFrom(settings, live) {
  if (settings && typeof settings.base === 'string' && ORIGIN.test(settings.base)) return settings.base;
  const m = /^(https?:\/\/[^/?#\s]+)\/playlist\.m3u$/i.exec((live && live.playlistUrl) || '');
  return m ? m[1] : '';
}
let settings = readJson(SETTINGS, {});
const base = () => baseFrom(settings, readJson(LIVE_SETTINGS, {}));

// ---- the library: only these curator paths, only these query keys ----
const ALLOWED = /^\/vod\/(library\.json|(films|series)\/[0-9A-Za-z_-]{1,40}\.json|(film|show)\/\d{1,12}\.json|search\.json)$/;
const KEYS = ['offset', 'limit', 'q'];
async function get(q, json) {
  const p = q.get('path') || '';
  if (!ALLOWED.test(p)) return json({ error: 'not a library path' }, 400);
  const b = base();
  if (!b) return json({ error: 'no curator address' }, 503);
  const u = new URL(b + p);
  for (const k of KEYS) if (q.get(k) !== null) u.searchParams.set(k, q.get(k));
  try {
    const r = await fetch.read(u.toString(), { maxBytes: 4e6, totalMs: 20000, anyStatus: true, headers: { accept: 'application/json' } });
    let body;
    try {
      body = JSON.parse(r.body.toString('utf8'));
    } catch (_) {
      return json({ error: 'the curator answered with something that is not JSON' }, 502);
    }
    return json(body, r.status);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 502);
  }
}

// ---- what the viewer watched: {items: {"film:501": {kind, id, name, poster, pos, dur, watched, at, show?, season?, num?}}} ----
let state = (o => ({ items: o && o.items && typeof o.items === 'object' ? o.items : {} }))(readJson(STATE, {}));
/** @type {any} */
let stateT = 0;
const saveState = () => {
  clearTimeout(stateT);
  stateT = setTimeout(() => {
    try {
      writeJson(STATE, state);
    } catch (_) {}
  }, 1000);
};
const KINDS = ['film', 'episode'];
const isId = v => typeof v === 'number' && v >= 0 && v % 1 === 0 && v < 1e12;
const isText = v => typeof v === 'string' && v.length <= 200;
const isPoster = v => v === '' || (typeof v === 'string' && /^\/vod\/img\/[0-9a-f]{32}$/.test(v));
const isTime = v => typeof v === 'number' && isFinite(v) && v >= 0 && v < 1e6;
function applyOp(st, b, now) {
  if (!b || typeof b !== 'object' || KINDS.indexOf(b.kind) < 0 || !isId(b.id)) return false;
  const key = b.kind + ':' + b.id;
  if (b.op === 'forget') {
    delete st.items[key];
    return true;
  }
  if (b.op === 'watched') {
    const it = st.items[key];
    if (!it) return false;
    it.watched = !!b.on;
    it.at = now;
    return true;
  }
  if (b.op !== 'pos' || !isTime(b.pos) || !isTime(b.dur) || !isText(b.name) || !isPoster(b.poster)) return false;
  const it = { kind: b.kind, id: b.id, name: b.name, poster: b.poster, pos: b.pos, dur: b.dur, watched: false, at: now };
  if (b.kind === 'episode') {
    const s = b.show;
    if (!s || !isId(s.id) || !isText(s.name) || !isPoster(s.poster) || !isId(b.season) || !isId(b.num)) return false;
    it.show = { id: s.id, name: s.name, poster: s.poster };
    it.season = b.season;
    it.num = b.num;
  }
  const old = st.items[key];
  if (old && old.watched && b.pos === 0) it.watched = true; // reopening a watched title doesn't unwatch it until it plays
  st.items[key] = it;
  const keys = Object.keys(st.items);
  if (keys.length > MAX_ITEMS) {
    keys.sort((a, c) => st.items[c].at - st.items[a].at);
    for (const k of keys.slice(MAX_ITEMS)) delete st.items[k];
  }
  return true;
}

// ---- HTTP API (mounted under /api/vod by the helper) ----
async function handle(req, res, u, body) {
  const json = (o, c) => web.json(res, o, c);
  const q = new URL(req.url, 'http://x').searchParams;
  if (u === '/api/vod/status') {
    const b = base();
    return json({ configured: !!b, base: b });
  }
  if (u === '/api/vod/settings' && req.method === 'POST') {
    const b = await body(req);
    if (typeof b.base !== 'string' || !ORIGIN.test(b.base)) return json({ error: 'the address must be http(s)://host[:port]' }, 400);
    settings = { base: b.base };
    writeJson(SETTINGS, settings);
    return json({ returnValue: true });
  }
  if (u === '/api/vod/get') return get(q, json);
  if (u === '/api/vod/state' && req.method === 'GET') return json(state);
  if (u === '/api/vod/state' && req.method === 'POST') {
    const b = await body(req);
    if (!applyOp(state, b, Date.now())) return json({ error: 'bad request' }, 400);
    saveState();
    return json({ returnValue: true });
  }
  web.notFound(res);
}

const create = (/** @type {any} */ _ctx) => ({ name: 'vod', prefix: '/api/vod/', handle, start() {} });
module.exports = { create, applyOp, baseFrom };
