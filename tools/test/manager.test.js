// The manager's options and keys (manager.js, inputkey.js, config.js): what is stored, what is logged, and how the Input key follows.
const fs = require('fs'),
  path = require('path');
const { ok, call, req, run } = require('./lib');
const config = req('config');

run(async () => {
  const lines = [];
  const conf = config.memory({}, l => lines.push(l));
  let ensured = 0,
    keyOn = null,
    mode = 'overlay',
    synced = 0;
  const inputkey = {
    mode: () => (conf.get().picker || {}).mode || mode,
    on: () => conf.options().inputKey && mode !== 'released',
    syncMode: () => synced++,
    pickerShownAt: () => 0,
  };
  const features = { inputkey };
  const m = req('manager').create({
    version: '1.6.0',
    config: conf,
    luna: async () => ({}),
    feature: n => features[n] || null,
    inputhook: {
      status: () => ({}),
      ensure(on) {
        ensured++;
        keyOn = on;
      },
      learnState: () => ({ state: 'got', name: 'guide', code: '362' }),
      markSaved() {},
      startLearn() {},
    },
  });
  const ask = (act, method, body) => call(m, '/api/manager/' + act, method, body);

  let r = await ask('status', 'GET');
  ok(
    r.j.options.liveTv === true && r.j.options.inputKey === true && r.j.options.debloat === true && r.j.keys.guide === '',
    'options are on by default and no Guide key is learned'
  );
  ok(r.j.language === 'auto', 'the language follows the TV until one is chosen');
  conf.update('launcher', c => {
    c.language = 'da';
  });
  r = await ask('status', 'GET');
  ok(
    r.j.language === 'da' && lines.some(l => /launcher\.language "auto" -> "da" \(launcher\)/.test(l)),
    'a language chosen in the launcher reaches the manager, and the change is logged'
  );
  conf.update('test', c => {
    delete c.language;
  });
  lines.length = 0;
  r = await ask('options', 'POST', { liveTv: false });
  ok(
    r.j.options.liveTv === false && conf.get().options.liveTv === false && ensured > 0,
    'switching Live TV off is stored and refreshes the key binds'
  );
  ok(
    lines.some(l => /options\.liveTv true -> false \(manager\)/.test(l)),
    'the change is logged with its source: ' + lines.join(' | ')
  );
  r = await ask('options', 'POST', { liveTv: 'no' });
  ok(r.j.options.liveTv === false, 'only a boolean changes an option');
  r = await ask('options', 'POST', { inputKey: false });
  ok(r.j.options.inputKey === false && r.j.options.liveTv === false, 'one option does not reset another');

  r = await ask('options', 'POST', { pickerMode: 'overlay' });
  ok(
    r.j.picker.mode === 'overlay' && conf.get().picker.prewarm === true && synced > 0,
    'choosing the overlay is saved and the Input key script is told'
  );
  r = await ask('options', 'POST', { pickerMode: 'ondemand' });
  ok(r.j.picker.mode === 'ondemand', 'choosing the on-demand picker');
  r = await ask('options', 'POST', { pickerMode: 'launcher' });
  ok(r.j.picker.mode === 'launcher', "choosing the launcher's list");
  r = await ask('options', 'POST', { pickerMode: 'sideways' });
  ok(r.j.picker.mode === 'launcher', 'an unknown mode is ignored');
  r = await ask('options', 'POST', { inputKey: true });
  mode = 'released';
  r = await ask('options', 'POST', { liveTv: true });
  ok(
    keyOn === false && r.j.picker.released === true,
    "the Input key is released to LG when its target needs CleanYourTV as Home and LG's Home is selected"
  );

  r = await ask('learn-state', 'GET');
  ok(conf.keys().guide === '362' && conf.keys().input === '241', 'a learned key is saved with the default Input key');
  r = await ask('clear-key', 'POST', { name: 'guide' });
  ok(conf.keys().guide === '', 'a learned key can be cleared');
  r = await ask('keys-done', 'POST');
  ok(conf.keys().learned === true, 'the end of the Input key steps is saved');
  ok(
    lines.some(l => /keys\.guide "" -> "362"|keys\.guide undefined -> "362"/.test(l)),
    'learned keys are logged too'
  );
  r = await ask('nope', 'POST');
  ok(r.code === 404, 'an unknown action');
  r = await ask('options', 'GET');
  ok(r.code === 405, 'a change needs POST');

  // the settings file: one read-modify-write at a time, written atomically, the launcher's part replaced without touching the rest
  const file = path.join(process.env.CYTV_DIR, 'config.json');
  const c = config.create(file, { log: () => {} });
  c.update('setup', x => {
    x.options = { inputKey: false };
    x.dock = ['a'];
  });
  c.update('launcher', x => {
    delete x.dock;
    x.dock = ['b'];
  });
  const back = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok(
    back.options.inputKey === false && back.dock.join() === 'b' && (fs.statSync(file).mode & 0o777) === 0o600,
    'config.json keeps every section, is replaced atomically and readable by root only'
  );
  fs.writeFileSync(file, '[1,2]');
  ok(JSON.stringify(c.get()) === '{}' && c.options().inputKey === true, 'a broken config.json reads as empty, with the defaults');

  // the manager app follows the TV's language: every text it shows has a Danish translation (manager/src/js/lang.js)
  const vm = require('vm'),
    js = path.join(__dirname, '..', '..', 'manager', 'src', 'js'),
    msrc = n => fs.readFileSync(path.join(js, n), 'utf8'),
    files = fs.readdirSync(js).filter(f => /\.js$/.test(f));
  const da = (lang, extra) => {
    const sb = { window: {}, navigator: { language: lang }, offline: false, st: { home: {} } };
    vm.runInNewContext(msrc('lang.js') + '\n' + (extra || '') + '\nthis.TX = TX; this.t = t; this.tm = tm;', sb);
    return sb;
  };
  const dk = da('da-DK', msrc('help.js') + '\nthis.INFO = INFO; this.infoFor = infoFor;'),
    used = {},
    re = /\bt\(\s*'((?:[^'\\\n]|\\.)*)'\s*\)/g;
  files.forEach(f => {
    const s = msrc(f);
    let m;
    while ((m = re.exec(s))) used[vm.runInNewContext("'" + m[1] + "'")] = f;
  });
  const keys = Object.keys(used),
    missing = keys.filter(k => !Object.prototype.hasOwnProperty.call(dk.TX.da, k));
  ok(keys.length > 250, 'the manager texts are found (' + keys.length + ')');
  ok(
    !missing.length,
    'every manager text has a Danish translation' +
      (missing.length ? ': ' + missing.map(k => used[k] + ' ' + JSON.stringify(k)).join(', ') : '')
  );
  const holes = Object.keys(dk.TX.da).filter(k => (k.match(/%s/g) || []).length !== (dk.TX.da[k].match(/%s/g) || []).length);
  ok(!holes.length, 'a Danish text has as many %s as its English one' + (holes.length ? ': ' + holes.join(', ') : ''));
  // the help on the left is found from the row's label in either language
  const infoKeys = Object.keys(dk.INFO),
    noInfo = infoKeys.filter(k => !dk.TX.da[k]),
    shown = infoKeys.map(k => dk.t(k));
  ok(!noInfo.length, 'every help title has a Danish translation' + (noInfo.length ? ': ' + noInfo.join(', ') : ''));
  ok(shown.length === new Set(shown).size, 'no two help rows share a Danish label, so the help is found from the label');
  const th = dk.infoFor({ label: dk.t('Theme') }),
    up = dk.infoFor({ k: 'Launcher', label: dk.t('Launcher') + ' 1.6.0' });
  ok(th && th.t === 'Tema' && /^Vælg, hvordan startskærmen/.test(th.d), 'a Danish row finds its Danish help: ' + JSON.stringify(th));
  ok(up && up.t === 'Startskærm' && /startskærm/.test(up.d), 'a row with a version finds its help by its key');
  ok(
    dk.tm('Installing launcher 1.7.0-test-x.2') === 'Installerer startskærm 1.7.0-test-x.2' &&
      dk.tm('Downloading the speech model (2 of 3)') === 'Henter talemodellen (2 af 3)' &&
      dk.tm('updated to 1.7.0. Close CleanYourTV and open it again.') === 'opdateret til 1.7.0. Luk CleanYourTV, og åbn den igen.' &&
      dk.tm('ENOSPC: no space left on device') === 'ENOSPC: no space left on device',
    "the service's fixed messages are shown in Danish, with their versions; an unknown one stays as it came"
  );
  const en = da('en-GB');
  ok(
    en.t('Check for updates') === 'Check for updates' && en.tm('Installing launcher 1.7.0') === 'Installing launcher 1.7.0',
    'English stays English'
  );
  // a new text written without t() would show in English on a Danish TV
  const bare = [];
  files.forEach(f =>
    msrc(f)
      .split('\n')
      .forEach((l, i) => {
        if (/\b(label|sub): '[^']|banner\('[^']|textContent = '[^']|kShow\('/.test(l)) bare.push(f + ':' + (i + 1) + ' ' + l.trim());
      })
  );
  ok(!bare.length, 'the manager shows no English literal without t()' + (bare.length ? ':\n  ' + bare.join('\n  ') : ''));

  // the language chosen in the launcher's Settings (status "language"): kept for the next start, and the page drawn again in it once
  const store = {},
    reloads = [];
  const sbl = (lang, saved) => {
    if (saved) store['cytv.manager.lang'] = saved;
    else delete store['cytv.manager.lang'];
    const sb = {
      window: {},
      navigator: { language: lang },
      localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)) },
      location: { reload: () => reloads.push(lang) },
    };
    vm.runInNewContext(msrc('lang.js') + '\nthis.LANG = LANG; this.followLang = followLang; this.t = t;', sb);
    return sb;
  };
  let l = sbl('en-GB');
  l.followLang('auto');
  ok(l.LANG === 'en' && !reloads.length, 'the manager follows the TV while no language is chosen');
  l.followLang('da');
  ok(reloads.length === 1 && store['cytv.manager.lang'] === 'da', 'a language chosen in the launcher: kept, and the page drawn again');
  l = sbl('en-GB', 'da');
  l.followLang('da');
  ok(l.LANG === 'da' && l.t('Close') === 'Luk' && reloads.length === 1, 'the next start is in the chosen language, without another reload');
});
