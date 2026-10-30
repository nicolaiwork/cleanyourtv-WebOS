// The remote's other buttons (Netflix, Prime Video, Disney+, Rakuten TV, LG Channels, Alexa, ...): learned in the manager (Remote
// buttons), each given an action that scripts/buttonkey.sh carries out. They are bound through the input hook like the Input, Guide
// and Home keys (inputhook.js); a bound button no longer starts LG's app. Stored in config.json as
// buttons: {"<code>": {name, action, app}}; an action of '' keeps LG's own.
const ACTIONS = ['', 'none', 'live', 'guide', 'vod', 'inputs', 'voice', 'app'];
const CODE = /^\d{1,5}$/,
  APP_ID = /^[\w.\-]{1,100}$/;

// what config.json holds, with anything unknown dropped (the file can be edited by hand)
function clean(all) {
  const out = {};
  for (const code of Object.keys(all || {})) {
    const b = all[code];
    if (!CODE.test(code) || !b || typeof b !== 'object') continue;
    const action = ACTIONS.indexOf(b.action) >= 0 ? b.action : '';
    out[code] = {
      name: typeof b.name === 'string' ? b.name.slice(0, 40) : '',
      action: action === 'app' && !APP_ID.test(b.app || '') ? '' : action,
      app: action === 'app' && APP_ID.test(b.app || '') ? b.app : '',
    };
  }
  return out;
}

// the command the hook runs for a button, or '' (LG's own). can(action): false while that action has nothing to open (Live TV off,
// LG's Home, voice not installed); the button then stays LG's, as the Guide key does
function command(b, dir, can) {
  if (!b || !b.action || !can(b.action)) return '';
  return 'sh ' + dir + '/buttonkey.sh ' + b.action + (b.action === 'app' ? ' ' + b.app : '');
}
// code -> command for every bound button
function binds(all, dir, can) {
  const out = {},
    c = clean(all);
  for (const code of Object.keys(c)) {
    const cmd = command(c[code], dir, can);
    if (cmd) out[code] = cmd;
  }
  return out;
}

// the button's name from LG's remote service (mrcu getButtonHistory, newest first: "[10/30(14:08:51)] (LGE MR25GA) KEY_NETFLIX Press")
const KNOWN = {
  NETFLIX: 'Netflix',
  AMAZON: 'Prime Video',
  PRIMEVIDEO: 'Prime Video',
  DISNEY: 'Disney+',
  RAKUTEN: 'Rakuten TV',
  LGCHANNELS: 'LG Channels',
  ALEXAVOICE: 'Alexa',
  ALEXA: 'Alexa',
  APPLETV: 'Apple TV',
  YOUTUBE: 'YouTube',
};
// the keys used to get there (Start is an OK press): never the button being learned
const NAV = ['OK', 'ENTER', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'BACK', 'PREVIOUS', 'EXIT'];
// since: only presses from then on (ms; the history has local time to the second and no year). LG's history can lag the hook by a
// moment, so a press it does not have yet gives '' rather than an older one
function nameFrom(history, since) {
  const now = new Date();
  for (const line of Array.isArray(history) ? history : []) {
    const m = /^\[(\d\d)\/(\d\d)\((\d\d):(\d\d):(\d\d)\)\].*\bKEY_([A-Z0-9_]+) Press\b/.exec(String(line));
    if (!m || NAV.indexOf(m[6]) >= 0) continue;
    const at = new Date(now.getFullYear(), +m[1] - 1, +m[2], +m[3], +m[4], +m[5]).getTime();
    if (since && at < Math.floor(since / 1000) * 1000) return '';
    if (KNOWN[m[6]]) return KNOWN[m[6]];
    return m[6]
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map(w => w[0].toUpperCase() + w.slice(1))
      .join(' ');
  }
  return '';
}

module.exports = { ACTIONS, APP_ID, clean, command, binds, nameFrom };
