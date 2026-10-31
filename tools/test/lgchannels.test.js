// LG Channels kept out of the background (lgchannels.js): the preload manager's switch for the app, never saved by LG; a copy in the
// background closed and one in front left alone; switching off gives LG its policy back; TVs without the app or the preload manager.
// LG's stream service for it (lgchannelurl) gets the do-nothing program mounted over it, and back. Mounts are a file here.
const fs = require('fs'),
  path = require('path');
const { ok, req, run, tmp, memoryConfig } = require('./lib');
const BIN = path.join(tmp, 'lgchannelurl');
process.env.CYTV_LGCHANNELURL = BIN; // before paths.js is read
const MOUNTS = path.join(process.env.CYTV_PROC, 'mounts');
fs.writeFileSync(MOUNTS, '/dev/root / ext4 ro 0 0\n');
const stubbed = () => fs.readFileSync(MOUNTS, 'utf8').indexOf(' ' + BIN + ' ') >= 0;

const APP = 'com.webos.app.lgchannels';

// a stand-in for the TV's luna: the preload manager's policy, the running apps and the one in front
function tv(o) {
  const t = Object.assign({ pm: true, listed: true, enabled: true, running: true, front: 'com.webos.app.home', setFails: false }, o);
  t.calls = [];
  t.luna = async (uri, p) => {
    const m = uri.replace(/^luna:\/\//, '');
    t.calls.push({ m, p });
    if (m.indexOf('com.webos.service.preloadmanager/') === 0 && !t.pm)
      return { returnValue: false, errorText: 'Service does not exist: com.webos.service.preloadmanager.' };
    if (m === 'com.webos.service.preloadmanager/getPreloadPolicy')
      return {
        returnValue: true,
        applications: [{ id: 'youtube.leanback.v4', isEnabled: true }].concat(t.listed ? [{ id: APP, isEnabled: t.enabled }] : []),
      };
    if (m === 'com.webos.service.preloadmanager/setPreloadPolicy') {
      if (t.setFails) return { returnValue: false, errorText: 'Invalid parameter' };
      t.enabled = p.application.isEnabled;
      return { returnValue: true };
    }
    if (m === 'com.webos.applicationManager/running')
      return { returnValue: true, running: [{ id: 'com.webos.app.home' }].concat(t.running ? [{ id: APP }] : []) };
    if (m === 'com.webos.applicationManager/getForegroundAppInfo') return { returnValue: true, appId: t.front };
    if (m === 'com.webos.applicationManager/closeByAppId') {
      t.running = false;
      return { returnValue: true, appId: p.id };
    }
    return { returnValue: false, errorText: 'unknown ' + m };
  };
  // the shell: mount and umount change the mounts file
  t.scripts = [];
  t.sh = async script => {
    t.scripts.push(script);
    if (t.shFails) return { ok: false, code: 1, out: '', err: 'mount: permission denied\n', error: 'exit 1' };
    if (/mount --bind /.test(script)) fs.appendFileSync(MOUNTS, '/dev/x ' + BIN + ' ext4 ro 0 0\n');
    else if (/^umount /.test(script))
      fs.writeFileSync(
        MOUNTS,
        fs
          .readFileSync(MOUNTS, 'utf8')
          .split('\n')
          .filter(l => l.indexOf(' ' + BIN + ' ') < 0)
          .join('\n')
      );
    return { ok: true, code: 0, out: '', err: '', error: '' };
  };
  t.did = m => t.calls.filter(c => c.m === m);
  return t;
}
const opts = on => memoryConfig({ options: { stopLgChannels: on } });

run(async () => {
  const lgch = req('lgchannels');

  let t = tv();
  let l = lgch.create({ config: memoryConfig({}), luna: t.luna, sh: t.sh });
  await l.sync();
  const set = t.did('com.webos.service.preloadmanager/setPreloadPolicy');
  ok(l.status().enabled && l.status().state === 'stopped', 'on by default: stopped');
  ok(
    set.length === 1 && set[0].p.application.id === APP && set[0].p.application.isEnabled === false && set[0].p.permanent === false,
    'the preload is switched off for LG Channels only, and LG does not save it'
  );
  ok(!t.running && t.did('com.webos.applicationManager/closeByAppId').length === 1, 'the copy preloaded before is closed');

  t.calls = [];
  await l.sync();
  ok(
    !t.did('com.webos.service.preloadmanager/setPreloadPolicy').length && !t.did('com.webos.applicationManager/closeByAppId').length,
    'checked again: nothing to change'
  );

  t.enabled = true; // the preload manager restarted and forgot
  await l.sync();
  ok(t.enabled === false, 'a restarted preload manager gets it again');

  t = tv({ front: APP });
  l = lgch.create({ config: opts(true), luna: t.luna, sh: t.sh });
  await l.sync();
  ok(t.running && !t.did('com.webos.applicationManager/closeByAppId').length, 'LG Channels in front (opened on purpose) is left open');

  t = tv();
  const config = opts(true);
  l = lgch.create({ config, luna: t.luna, sh: t.sh });
  await l.sync();
  config.update('test', c => {
    c.options = { stopLgChannels: false };
  });
  await l.sync();
  const back = t.did('com.webos.service.preloadmanager/setPreloadPolicy').pop();
  ok(t.enabled === true && back.p.permanent === false && l.status().state === 'off', 'switched off: LG gets its policy back');
  t.calls = [];
  t.running = true;
  await l.start(); // the regular check
  ok(!t.calls.length, 'off: the regular check asks and closes nothing');

  t = tv();
  l = lgch.create({ config: opts(false), luna: t.luna, sh: t.sh });
  await l.start();
  ok(!t.calls.length && t.enabled && l.status().state === 'off', 'off from the start: LG’s policy is not touched');

  t = tv({ listed: false });
  l = lgch.create({ config: opts(true), luna: t.luna, sh: t.sh });
  await l.sync();
  ok(l.status().state === 'absent' && t.running, 'a TV whose preload manager does not list LG Channels: reported, nothing closed');
  ok(l.delay() === lgch.RETRY_MS, 'not listed (early in the boot the list can come late): asked again soon');
  t.listed = true;
  await l.sync();
  ok(l.status().state === 'stopped' && !t.enabled && l.delay() === lgch.CHECK_MS, 'listed a moment later: stopped, then the regular check');
  t.listed = false;
  for (let i = 0; i <= lgch.RETRIES; i++) await l.sync();
  ok(l.delay() === lgch.CHECK_MS, 'never listed: after a while only the regular check');

  t = tv({ pm: false });
  l = lgch.create({ config: opts(true), luna: t.luna, sh: t.sh });
  await l.sync();
  ok(l.status().state === 'waiting' && /does not exist/.test(l.status().detail), 'no preload manager (yet): waits for it');
  ok(l.delay() === lgch.RETRY_MS, 'and asks again soon');
  t.pm = true;
  await l.sync();
  ok(l.status().state === 'stopped' && t.enabled === false, 'the preload manager comes up: stopped');

  t = tv({ setFails: true });
  l = lgch.create({ config: opts(true), luna: t.luna, sh: t.sh });
  await l.sync();
  ok(l.status().state === 'error' && t.running, 'the policy cannot be changed: reported, the app is not closed');

  // lgchannelurl: none on this "TV" yet, so nothing was mounted above
  ok(!stubbed() && !t.scripts.length, 'no lgchannelurl on the TV: nothing is mounted');
  fs.writeFileSync(BIN, '#!/bin/sh\n');
  t = tv();
  const c2 = opts(true);
  l = lgch.create({ config: c2, luna: t.luna, sh: t.sh });
  await l.sync();
  const up = t.scripts[0] || '';
  ok(
    stubbed() && /stub-noop' '/.test(up) && up.indexOf("pkill -9 -f '^" + BIN + "'") >= 0,
    'on: the do-nothing program is mounted over lgchannelurl and the running one stopped'
  );
  await l.sync();
  ok(t.scripts.length === 1, 'already mounted: not mounted twice');
  c2.update('test', c => {
    c.options = { stopLgChannels: false };
  });
  await l.sync();
  ok(!stubbed() && /^umount /.test(t.scripts[1] || ''), 'switched off: unmounted');
  await l.start();
  ok(t.scripts.length === 2, 'off: left alone');
  t = tv({ shFails: true });
  l = lgch.create({ config: opts(true), luna: t.luna, sh: t.sh });
  await l.sync();
  ok(!stubbed() && l.status().state === 'stopped', 'the mount fails: logged, LG Channels is stopped all the same');
});
