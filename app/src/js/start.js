/* first paint straight from the last known layout and Home's last data, then refresh from the helper */
homeRestore();
LIVE.onExit = VOD.onExit = function () {
  homeData();
  slideLater();
};
try {
  var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
  if (cached && cached.apps && cached.apps.length) {
    apps = cached.apps;
    cfg = cached.cfg || {};
    applyTheme(cfg.theme);
    usage = cached.usage || {};
    rebuild();
    drawHome();
    perfMark('launcher cached ' + Math.round(performance.now()));
  }
} catch (e) {}
load();
wantInputs();
api('/api/frontend-ok', { version: VERSION }).catch(function () {}); // lets the manager know an updated launcher started
