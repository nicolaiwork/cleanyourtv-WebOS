// fork: keep LG Channels from running in the background (the option stopLgChannels, on by default; docs/debloat.md#lg-channels).
// LG's preload manager (com.webos.service.preloadmanager) starts com.webos.app.lgchannels hidden about a minute after every boot and
// keeps it in memory, whether or not it is ever opened. Its policy has a switch per app (isEnabled); the service turns it off for
// LG Channels with permanent:false, so only the preload manager's memory changes, never LG's preferences file: the next boot, or
// switching the option off, gives LG its own policy back. A copy already started before the service got there, or one left in the
// background, is closed; one in front (opened on purpose) is left alone. Checked again every five minutes, since a restart of the
// preload manager forgets the change.
const PM = 'luna://com.webos.service.preloadmanager/',
  AM = 'luna://com.webos.applicationManager/';
const APP = 'com.webos.app.lgchannels',
  RETRY_MS = 5000, // while the preload manager is not up yet: early in the boot it preloads LG Channels within a minute
  RETRIES = 60, // then as rarely as the regular check: some webOS versions have no preload manager
  CHECK_MS = 300000;

function create(ctx) {
  const { config, luna } = ctx;
  let state = { state: 'off' },
    dirty = false, // switched off after it was on: the policy goes back to LG's
    failures = 0,
    running = Promise.resolve();
  function set(s, detail) {
    if (s === state.state && detail === state.detail) return;
    state = detail ? { state: s, detail } : { state: s };
    console.log('lgchannels: ' + s + (detail ? ' (' + detail + ')' : ''));
  }
  async function check() {
    const on = !!config.options().stopLgChannels;
    if (!on && !dirty) return set('off');
    const p = await luna(PM + 'getPreloadPolicy', {});
    if (p.returnValue !== true) {
      failures++;
      return set(on ? 'waiting' : 'off', on ? String(p.errorText || 'the preload manager did not answer') : '');
    }
    const app = (p.applications || []).filter(a => a && a.id === APP)[0];
    if (!app) {
      // early in the boot the policy can come before its list of apps: asked again soon, for a while
      failures++;
      dirty = false;
      return set(on ? 'absent' : 'off');
    }
    failures = 0;
    if (app.isEnabled !== !on) {
      const r = await luna(PM + 'setPreloadPolicy', { application: { id: APP, isEnabled: !on }, permanent: false });
      if (r.returnValue !== true) return set(on ? 'error' : 'off', on ? String(r.errorText || 'setPreloadPolicy failed') : '');
    }
    dirty = false;
    if (!on) return set('off');
    const list = await luna(AM + 'running', {});
    if ((list.running || []).some(a => a && a.id === APP)) {
      const fg = await luna(AM + 'getForegroundAppInfo', {});
      if (fg.returnValue === true && fg.appId !== APP) {
        await luna(AM + 'closeByAppId', { id: APP });
        console.log('lgchannels: closed the copy in the background');
      }
    }
    set('stopped');
  }
  // one check at a time; a failure is logged, never thrown
  function sync() {
    running = running.then(check).catch(e => set('error', String((e && e.message) || e)));
    return running;
  }
  // the first check, then one after another; resolves after the first (tests)
  const delay = () => ((state.state === 'waiting' || state.state === 'absent') && failures <= RETRIES ? RETRY_MS : CHECK_MS);
  function loop() {
    return sync().then(() => setTimeout(loop, delay()).unref());
  }
  return {
    name: 'lgchannels',
    start: loop,
    // after the option changed
    sync() {
      dirty = true;
      return sync();
    },
    status: () => Object.assign({ enabled: !!config.options().stopLgChannels }, state),
    delay, // until the next check (tests)
  };
}

module.exports = { create, APP, RETRY_MS, RETRIES, CHECK_MS };
