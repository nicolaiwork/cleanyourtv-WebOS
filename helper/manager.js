// The manager app's API (/api/manager/*): status, updates (updates.js), options, learning remote buttons and what the remote's other
// buttons do (buttons.js), the update channel, LG's Home or ours, and uninstalling. Also POST /api/frontend-ok (a new launcher reports
// that it started) and POST /api/undo (the launcher's "LG's Home" button).
const fs = require('fs');
const P = require('./paths'),
  web = require('./web'),
  exec = require('./exec'),
  debloat = require('./debloat'),
  buttons = require('./buttons'),
  { language } = require('./config');

// the TV comes back to its last app after a restart; that must not be one of ours
function fixLastApp() {
  try {
    if (fs.readFileSync(P.LASTAPP, 'utf8').includes('cleanyourtv')) fs.writeFileSync(P.LASTAPP, '{"lastAppId":"com.webos.app.home"}');
  } catch (_) {}
}
// Switching between LG's Home and ours needs a restart: LG's Home does not come back reliably while the system is running.
function setHome(enabled) {
  if (enabled) {
    try {
      fs.unlinkSync(P.DISABLE);
    } catch (_) {}
  } else {
    fs.writeFileSync(P.DISABLE, '');
    fixLastApp();
  }
  exec.detached('sleep 3; reboot');
}
const KEY_NAMES = ['home', 'voice', 'guide'];
const PICKER_MODES = ['overlay', 'ondemand', 'launcher'];
const MANAGER_APP = 'com.cleanyourtv.manager';

function create(ctx) {
  const { config } = ctx;
  const updates = require('./updates').create(ctx);
  const inputhook = ctx.inputhook || require('./inputhook');
  // the Input key part may be missing (failed to load): fall back to plain rules
  const inputkey = () =>
    ctx.feature('inputkey') || {
      mode: () => 'overlay',
      on: () => config.options().inputKey,
      syncMode() {},
      pickerShownAt: () => 0,
    };
  const keys = () => {
    const k = config.keys();
    return Object.assign(k, { inputIsDefault: !k.input, input: k.input || '241' });
  };
  const ensureHook = code => inputhook.ensure(inputkey().on(), code || keys().input);
  // the remote's other buttons (buttons.js) for the manager; bound: the hook runs our action for it now (else LG's own happens)
  function buttonList() {
    const all = config.buttons(),
      k = keys(),
      bb = inputkey().buttonBinds ? inputkey().buttonBinds() : {},
      special = [k.input, k.home, k.voice, k.guide].filter(Boolean);
    return Object.keys(all).map(code => Object.assign({ code }, all[code], { bound: !!bb[code] && special.indexOf(code) < 0 }));
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // LG's name for the button pressed since the learning started; asked a few times, as LG's history can lag the hook
  async function buttonName(since) {
    for (let i = 0; i < 5; i++) {
      try {
        const r = await ctx.luna('luna://com.webos.service.mrcu/getButtonHistory', {});
        const n = buttons.nameFrom(r && r.historyArray, since);
        if (n) return n;
      } catch (_) {}
      await wait(400);
    }
    return '';
  }
  // the press that was learned also did what LG made it do, usually open its app over the manager: close that app and show the
  // manager again, so the action can be chosen. Only an app that came to the front in the seconds after the press
  async function bringBack(code) {
    for (let i = 0; i < 10; i++) {
      await wait(500);
      const f = await ctx.luna('luna://com.webos.applicationManager/getForegroundAppInfo', {});
      const id = (f && f.appId) || '';
      if (!id || id === MANAGER_APP) continue;
      if (/^com\.cleanyourtv\./.test(id) || id === 'com.webos.app.home') return;
      console.log('manager: closing ' + id + ', opened by the button being learned');
      await ctx.luna('luna://com.webos.applicationManager/closeByAppId', { id });
      await ctx.luna('luna://com.webos.applicationManager/launch', { id: MANAGER_APP, params: { button: code } });
      return;
    }
  }
  function setButton(b) {
    const code = String(b.code || '');
    if (!(code in config.buttons())) return 'not a learned button';
    if (b.forget) {
      config.update('manager', c => {
        c.buttons = buttons.clean(c.buttons);
        delete c.buttons[code];
      });
    } else {
      const action = String(b.action || '');
      if (buttons.ACTIONS.indexOf(action) < 0) return 'unknown action';
      if (action === 'app' && !buttons.APP_ID.test(String(b.app || ''))) return 'bad app';
      config.update('manager', c => {
        c.buttons = buttons.clean(c.buttons);
        c.buttons[code] = { name: c.buttons[code].name, action, app: action === 'app' ? String(b.app) : '' };
      });
    }
    ensureHook();
    return '';
  }

  function status() {
    const opts = config.options(),
      voice = ctx.feature('voice'),
      napi = ctx.feature('notifyapi');
    let ours = false;
    try {
      const mounts = fs.readFileSync(P.PROC + '/mounts', 'utf8');
      // the launcher's folder over LG's Home app, or the stand-in over LG's native Home program (scripts/home-standin.sh)
      const standin = fs.existsSync(P.STANDIN) ? fs.readFileSync(P.STANDIN, 'utf8').trim() : '';
      ours = mounts.includes(' ' + P.HOME_APP + ' ') || (!!standin && mounts.includes(' ' + standin + ' '));
    } catch (_) {}
    return Object.assign(updates.status(), {
      options: opts,
      picker: Object.assign({}, config.get().picker || {}, { mode: inputkey().mode(), released: !!opts.inputKey && !inputkey().on() }),
      voice: voice ? (v => ({ installed: v.installed, enabled: v.enabled }))(voice.status()) : null,
      notifyApi: napi ? { enabled: napi.info().enabled, port: napi.info().port } : { enabled: false },
      home: { enabled: !fs.existsSync(P.DISABLE), fullhome: fs.existsSync(P.FULLHOME_APP), ours },
      inputhook: inputhook.status(keys().input),
      pointer: (p => (p ? p.status() : null))(ctx.feature('pointer')),
      lgChannels: (l => (l ? l.status() : null))(ctx.feature('lgchannels')),
      keys: keys(),
      buttons: buttonList(),
      job: updates.job(),
      repo: updates.repo(),
      language: language(config.get()) || 'auto',
    });
  }

  async function setOptions(o) {
    const cur = config.options();
    const next = Object.assign({}, cur);
    for (const k of ['debloat', 'inputKey', 'liveTv', 'hidePointer', 'stopLgChannels']) if (typeof o[k] === 'boolean') next[k] = o[k];
    config.update('manager', c => {
      if (typeof o.pickerPrewarm === 'boolean')
        c.picker = Object.assign(
          {},
          c.picker,
          o.pickerPrewarm ? { prewarm: true } : { prewarm: false, reason: 'switched off in the manager', at: Date.now() }
        );
      if (PICKER_MODES.indexOf(o.pickerMode) >= 0)
        c.picker = Object.assign({}, c.picker, {
          mode: o.pickerMode,
          prewarm: o.pickerMode === 'overlay' ? true : (c.picker || {}).prewarm,
          reason: 'chosen in the manager',
          at: Date.now(),
        });
      c.options = next;
    });
    inputkey().syncMode();
    if (next.debloat !== cur.debloat) await debloat.apply(next.debloat);
    const pointer = ctx.feature('pointer');
    if (pointer && next.hidePointer !== cur.hidePointer) pointer.sync();
    const lgch = ctx.feature('lgchannels');
    if (lgch && next.stopLgChannels !== cur.stopLgChannels) lgch.sync();
    ensureHook();
    return next;
  }

  // the code of the key just pressed while learning; saved here once it arrives ('learned' is set when the Input flow ends: keys-done).
  // A button for Remote buttons is saved with LG's name for it and no action yet (it stays LG's until one is chosen). Its name takes
  // a moment: a second ask meanwhile gets the same answer once it is saved
  let saving = null,
    savedButton = null,
    learnAt = 0;
  async function learnState() {
    if (saving) return saving;
    const l = inputhook.learnState();
    if (l.state === 'got' && !l.saved) {
      if (inputhook.markSaved) inputhook.markSaved();
      if (l.name === 'button') {
        saving = buttonName(learnAt).then(name => {
          config.update('manager', c => {
            c.buttons = buttons.clean(c.buttons);
            c.buttons[l.code] = Object.assign({ action: '', app: '' }, c.buttons[l.code], {
              name: name || (c.buttons[l.code] || {}).name || '',
            });
          });
          savedButton = Object.assign({}, l, { label: name });
          saving = null;
          bringBack(l.code).catch(() => {});
          return savedButton;
        });
        return saving;
      }
      config.update('manager', c => {
        c.keys = Object.assign({ input: '241', home: '', voice: '' }, c.keys || {});
        c.keys[l.name] = l.code;
      });
      if (l.name === 'input') ensureHook(l.code);
      else ensureHook();
    }
    if (l.state === 'got' && l.name === 'button' && savedButton && savedButton.code === l.code) return savedButton;
    return l;
  }
  // a button is learned while the manager may be behind the app the press opened (and asks nothing then): the service watches
  let watching = null;
  function watchLearn() {
    clearInterval(watching);
    const until = Date.now() + 46000;
    watching = setInterval(() => {
      learnState().then(
        l => {
          if (l.state !== 'waiting' || Date.now() > until) clearInterval(watching);
        },
        () => {}
      );
    }, 500);
  }
  // forget a learned code: Input goes back to the default, the others to none
  function clearKey(name) {
    config.update('manager', c => {
      c.keys = Object.assign({ input: '', home: '', voice: '', guide: '' }, c.keys || {});
      c.keys[name] = '';
      if (name === 'input') c.keys.learned = false;
    });
    ensureHook();
  }

  async function handle(req, res, u, body) {
    const json = (o, c) => web.json(res, o, c);
    if (u === '/api/frontend-ok' && req.method === 'POST') {
      const b = await body(req);
      updates.frontendLoaded(String(b.version || ''));
      return json({ returnValue: true });
    }
    if (u === '/api/undo' && req.method === 'POST') {
      // LG's Home, kept until switched back on in the manager; restarts the TV
      setHome(false);
      return json({ returnValue: true });
    }
    const act = u.replace('/api/manager/', '');
    const napi = ctx.feature('notifyapi');
    if (act === 'status') {
      if (updates.stale()) updates.check();
      return json(status());
    }
    if (act === 'learn-state') return json(await learnState());
    if (act === 'notify-api' && req.method === 'GET') return json(napi ? napi.info() : { enabled: false });
    if (act === 'test-key') return json({ pickerShownAt: inputkey().pickerShownAt(), now: Date.now() });
    if (act === 'tests') return json(await updates.tests());
    if (req.method !== 'POST') return json({ error: 'POST expected' }, 405);
    const b = await body(req);
    if (act === 'check') {
      await updates.check();
      return json(status());
    }
    if (act === 'channel') {
      const err = await updates.setChannel(b.tag);
      if (err) return json({ error: err }, err === 'not a test build' ? 400 : 409);
      return json(status());
    }
    if (act === 'notify-api') return json(napi ? napi.set(b) : { enabled: false });
    if (act === 'learn-key') {
      inputhook.startLearn(KEY_NAMES.includes(b.name) || b.name === 'button' ? b.name : 'input');
      learnAt = Date.now();
      savedButton = null;
      if (b.name === 'button') watchLearn();
      return json({ returnValue: true });
    }
    if (act === 'clear-key') {
      clearKey(KEY_NAMES.includes(b.name) ? b.name : 'input');
      return json({ returnValue: true });
    }
    if (act === 'button') {
      const err = setButton(b);
      return err ? json({ error: err }, 400) : json(status());
    }
    if (act === 'keys-done') {
      config.update('manager', c => {
        c.keys = Object.assign({ input: '241', home: '' }, c.keys || {}, { learned: true });
      });
      return json({ returnValue: true });
    }
    if (act === 'options') {
      await setOptions(b);
      return json(status());
    }
    if (act === 'home') {
      setHome(b.enabled !== false);
      return json({ returnValue: true });
    }
    if (act === 'restore') {
      setHome(false);
      return json({ returnValue: true });
    }
    if (act === 'uninstall') {
      exec.detached('sleep 1; sh ' + P.D + '/uninstall.sh');
      return json({ returnValue: true });
    }
    if (['update-frontend', 'rollback-frontend', 'update-service'].includes(act)) {
      if (updates.busy()) return json({ error: 'busy', job: updates.job() }, 409);
      const ver = String(b.version || '').replace(/[^0-9.]/g, '');
      if (act === 'update-frontend') updates.updateFrontend(ver);
      else if (act === 'update-service') updates.updateService(ver);
      else updates.rollbackFrontend();
      return json({ returnValue: true, job: updates.job() });
    }
    return json({ error: 'unknown action' }, 404);
  }

  return {
    name: 'manager',
    prefix: '/api/manager/',
    paths: ['/api/frontend-ok', '/api/undo'],
    handle,
    check: updates.check,
    status,
    frontendLoaded: updates.frontendLoaded,
    useLgHome: () => setHome(false),
  };
}

module.exports = { create };
