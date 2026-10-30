/* ---------- loading: the apps and settings from the service, then what Home shows (home.js) ---------- */
function load() {
  api('/api/apps')
    .then(function (x) {
      VOD.check(); /* fork */
      if (x.version && oldSvc(x.version) && !warned) {
        warned = true;
        toast(t('The service (%s) is older than this launcher needs: update it in the CleanYourTV manager').replace('%s', x.version));
      }
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
      if (sig === lastSig) return homeData(); /* the hero, Continue watching and the channels change while the apps do not */
      lastSig = sig;
      apps = x.apps.map(function (a) {
        return a.input ? { id: a.id, title: a.title, input: a.input, off: !!a.off } : { id: a.id, title: a.title };
      });
      cfg = x.config || {};
      if (locFor(cfg.language) !== LOC) {
        /* a language chosen in Settings (here or before a boot): the page again, drawn in it */
        store();
        if (cachedLang() === (cfg.language || '')) return void location.reload();
        LOC = locFor(cfg.language); /* no cache to read it from: the texts drawn from now on */
        LANG = LOC.slice(0, 2);
      }
      applyTheme(cfg.theme);
      if (liveOn()) apps.push({ id: '__live', title: t('Live TV') });
      if (VOD.ready) apps.push({ id: '__vod', title: t('Films & Series') }); /* fork */
      store();
      rebuild();
      homeData(); /* after the settings: Live TV may have been switched on or off */
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
