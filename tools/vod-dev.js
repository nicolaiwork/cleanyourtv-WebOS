// Fork only: the Films & Series screen in a desktop browser, without a TV. Serves the launcher page (app/index.html) and the service's
// /api/vod/* (helper/vod.js) on 127.0.0.1:8765, and answers the rest of the launcher's API with stand-ins (no apps, Live TV off).
//   node tools/vod-dev.js --base http://<curator>:8000 [--fake-play http://127.0.0.1:8899/test.mp4]
// then open http://127.0.0.1:8765/ at 1920x1080. Arrow keys, Enter = OK, Escape = Back, F2 = the 123 key.
// --fake-play: every film and episode plays this address instead of the curator's (to try the player without the provider).
// Reading the library costs the provider nothing; opening a title whose details the curator hasn't cached is one provider call.
'use strict';
const fs = require('fs'),
  os = require('os'),
  path = require('path'),
  http = require('http');

const arg = n => {
  const i = process.argv.indexOf(n);
  return i > 0 ? process.argv[i + 1] : '';
};
const base = arg('--base'),
  fakePlay = arg('--fake-play');
if (!/^https?:\/\/[^/]+$/.test(base)) {
  console.log('usage: node tools/vod-dev.js --base http://<curator>:8000 [--fake-play <video url>]');
  process.exit(1);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cytv-vod-dev-'));
process.env.CYTV_DIR = tmp;
process.env.CYTV_LIVE_DIR = path.join(tmp, 'live');
process.env.CYTV_VOD_DIR = path.join(tmp, 'vod');
fs.mkdirSync(process.env.CYTV_VOD_DIR);
fs.writeFileSync(path.join(process.env.CYTV_VOD_DIR, 'settings.json'), JSON.stringify({ base }));
const root = path.join(__dirname, '..');
const vod = require(path.join(root, 'helper', 'vod.js')).create({});
const web = require(path.join(root, 'helper', 'web.js'));

// --fake-play: the details answer is rewritten so its play paths point at the test video
function rewrite(res) {
  const end = res.end.bind(res);
  res.end = s => {
    try {
      const j = JSON.parse(s);
      if (j && j.play) j.play = fakePlay;
      (j && j.seasons ? j.seasons : []).forEach(se => se.episodes.forEach(ep => (ep.play = fakePlay)));
      s = JSON.stringify(j);
    } catch (_) {}
    end(s);
  };
}

http
  .createServer(async (req, res) => {
    const u = req.url.split('?')[0];
    console.log(req.method + ' ' + req.url.slice(0, 120));
    if (u === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(root, 'app', 'index.html')));
    }
    if (u.indexOf('/api/vod/') === 0) {
      if (fakePlay && /path=%2Fvod%2F(film|show)%2F/.test(req.url)) rewrite(res);
      return vod.handle(req, res, u, web.body);
    }
    if (u === '/api/apps') return web.json(res, { apps: [], config: { options: { liveTv: false } }, usage: {}, version: '1.6.6' });
    if (u.indexOf('/icon/') === 0) return web.notFound(res);
    web.json(res, {});
  })
  .listen(8765, '127.0.0.1', () => console.log('open http://127.0.0.1:8765/  (curator ' + base + ')'));
