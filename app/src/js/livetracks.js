/* ---------- Live TV: audio languages and subtitles of the playing stream ---------- */
/* The TV's player reports languages as two-letter codes (da, sv); playlists and probes often use three (dan, swe). Both are
   compared through lang(), and the viewer's choice is remembered by language so it carries over to the next channel. */
var LT = (function () {
  var THREE = {
    ara: 'ar',
    bul: 'bg',
    ces: 'cs',
    cze: 'cs',
    dan: 'da',
    deu: 'de',
    ger: 'de',
    ell: 'el',
    gre: 'el',
    eng: 'en',
    spa: 'es',
    est: 'et',
    fin: 'fi',
    fra: 'fr',
    fre: 'fr',
    hrv: 'hr',
    hun: 'hu',
    isl: 'is',
    ice: 'is',
    ita: 'it',
    lit: 'lt',
    lav: 'lv',
    nld: 'nl',
    dut: 'nl',
    nor: 'no',
    nob: 'no',
    nno: 'no',
    nb: 'no',
    nn: 'no',
    pol: 'pl',
    por: 'pt',
    ron: 'ro',
    rum: 'ro',
    rus: 'ru',
    slk: 'sk',
    slo: 'sk',
    slv: 'sl',
    srp: 'sr',
    swe: 'sv',
    tur: 'tr',
    ukr: 'uk',
  };
  /* each language in its own name, as TV menus show them */
  var NAMES = {
    ar: 'العربية',
    bg: 'Български',
    cs: 'Čeština',
    da: 'Dansk',
    de: 'Deutsch',
    el: 'Ελληνικά',
    en: 'English',
    es: 'Español',
    et: 'Eesti',
    fi: 'Suomi',
    fr: 'Français',
    hr: 'Hrvatski',
    hu: 'Magyar',
    is: 'Íslenska',
    it: 'Italiano',
    lt: 'Lietuvių',
    lv: 'Latviešu',
    nl: 'Nederlands',
    no: 'Norsk',
    pl: 'Polski',
    pt: 'Português',
    ro: 'Română',
    ru: 'Русский',
    sk: 'Slovenčina',
    sl: 'Slovenščina',
    sr: 'Srpski',
    sv: 'Svenska',
    tr: 'Türkçe',
    uk: 'Українська',
  };
  function lang(code) {
    var c = String(code || '')
      .toLowerCase()
      .split(/[-_]/)[0];
    return THREE[c] || c;
  }
  function name(code) {
    var c = lang(code);
    return NAMES[c] || (c ? c.toUpperCase() : '');
  }
  /* the first index whose language is want, or -1 */
  function pick(langs, want) {
    var w = lang(want);
    if (!w) return -1;
    for (var i = 0; i < langs.length; i++) if (lang(langs[i]) === w) return i;
    return -1;
  }
  /* menu labels: the language's name, numbered when a language comes twice (Dansk, Dansk 2) */
  function labels(langs, unknown) {
    var seen = {};
    return langs.map(function (l) {
      var n = name(l) || unknown,
        k = lang(l);
      seen[k] = (seen[k] || 0) + 1;
      return seen[k] > 1 ? n + ' ' + seen[k] : n;
    });
  }
  /* the subtitle tracks in a com.webos.media/getPipelineState reply (its data is a JSON string): [{index, lang, type}] */
  function subs(reply) {
    var out = [];
    try {
      var r = typeof reply === 'string' ? JSON.parse(reply) : reply,
        d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
        p = d && d.sourceInfo && d.sourceInfo.programInfo,
        list = p && p[0] && p[0].subtitleTrackInfo;
      if (list && list.length)
        for (var i = 0; i < list.length; i++)
          out.push({
            index: typeof list[i].trackNum === 'number' ? list[i].trackNum : i,
            lang: list[i].language || '',
            type: list[i].type || '',
          });
    } catch (e) {}
    return out;
  }
  /* whether a getPipelineState reply already describes the stream (its tracks are known) */
  function known(reply) {
    try {
      var r = typeof reply === 'string' ? JSON.parse(reply) : reply,
        d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      return !!(d && d.sourceInfo && d.sourceInfo.programInfo && d.sourceInfo.programInfo.length);
    } catch (e) {
      return false;
    }
  }
  /* one luna call from the page (the launcher runs as LG's Home, which may call the TV's media service); cb(reply) or cb(null) */
  var calls = [];
  function luna(uri, params, cb) {
    if (typeof PalmServiceBridge === 'undefined') {
      if (cb) cb(null);
      return;
    }
    var b = new PalmServiceBridge(),
      done = false;
    calls.push(b); /* keep the bridge alive until it answers */
    function end(m) {
      if (done) return;
      done = true;
      calls.splice(calls.indexOf(b), 1);
      try {
        b.cancel();
      } catch (e) {}
      if (cb) cb(m);
    }
    b.onservicecallback = end;
    setTimeout(function () {
      end(null);
    }, 5000);
    b.call(uri, JSON.stringify(params || {}));
  }
  return { lang: lang, name: name, pick: pick, labels: labels, subs: subs, known: known, luna: luna };
})();
