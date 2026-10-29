/* ---------- loading: the apps and settings from the service, then what Home shows (home.js) ---------- */
function load() {
  api('/api/apps')
    .then(function (x) {
      VOD.check(); /* fork */
      if (x.version && oldSvc(x.version) && !warned) {
        warned = true;
        toast('The service (' + x.version + ') is older than this launcher needs: update it in the CleanYourTV manager');
      }
      homeData(); /* the hero, Continue watching and the channels change while the apps do not */
      slideLater();
      usage = x.usage || {};
      var rank = Object.keys(usage).sort(function (a, b) {
        return usage[b] - usage[a];
      });
      var sig = JSON.stringify([
        x.apps.map(function (a) {
          return a.input ? [a.id, a.title, a.off] : a.id;
        }),
        x.config,
        rank,
        VOD.ready,
      ]);
      if (sig === lastSig) return;
      lastSig = sig;
      apps = x.apps.map(function (a) {
        return a.input ? { id: a.id, title: a.title, input: a.input, off: !!a.off } : { id: a.id, title: a.title };
      });
      cfg = x.config || {};
      applyTheme(cfg.theme);
      if (liveOn()) apps.push({ id: '__live', title: t('Live TV') });
      if (VOD.ready) apps.push({ id: '__vod', title: 'Films & Series' }); /* fork */
      store();
      rebuild();
      if (!perfReady) {
        perfReady = true;
        perfMark('launcher ready ' + Math.round(performance.now()));
      }
    })
    .catch(function () {
      toast(t('Helper not reachable, retrying...'));
      setTimeout(load, 3000);
    });
}
