/* setting up again (after an update by script, or when the service stopped) starts from the choices already saved, not from the defaults
   (issues 6 and 7: the Input key came back on) */
function setupDefaults() {
  rootExec('cat /media/developer/cleanyourtv/config.json 2>/dev/null').then(function (m) {
    var o = null;
    try {
      o = JSON.parse(execOut(m).out).options;
    } catch (x) {}
    if (!o) return;
    if (o.debloat === false) setup.debloat = false;
    if (o.inputKey === false) setup.inputKey = false;
    if (offline) {
      build();
      draw();
    }
  });
}
/* before the setup (or when it failed) the service is not running: update the package through the root service instead */
function execOut(m) {
  var o = {};
  try {
    o = JSON.parse(m);
  } catch (e) {}
  return { ok: o.returnValue !== false, out: String(o.stdoutString || ''), err: String(o.stderrString || o.errorText || '') };
}
function offlineCheck() {
  banner(t('Checking for updates\u2026'), 'work');
  rootExec('node ' + SVC + '/helper/selfupdate.js check').then(function (m) {
    var e = execOut(m),
      r = null;
    try {
      r = JSON.parse(e.out);
    } catch (x) {}
    if (!r || r.error) {
      banner(t('Could not check: %s').replace('%s', (r && r.error) || e.err || t('no answer')), 'err');
      return;
    }
    upd = r.updateTo ? r : null;
    build();
    if (upd) idx = updIdx;
    draw();
    banner(
      r.updateTo
        ? t('Version %s is available; this one is %s.').replace('%s', r.updateTo).replace('%s', r.installed)
        : t('Up to date (%s).').replace('%s', r.installed),
      r.updateTo ? 'ok' : ''
    );
  });
}
function offlineUpdate() {
  if (!upd) return;
  banner(t('Updating to %s\u2026').replace('%s', upd.updateTo), 'work');
  rootExec('rm -f /tmp/cytv-selfupdate.log; nohup node ' + SVC + '/helper/selfupdate.js install > /tmp/cytv-selfupdate.log 2>&1 &').then(
    function () {
      pollUpdate(0);
    }
  );
}
function pollUpdate(n) {
  rootExec('tail -n 3 /tmp/cytv-selfupdate.log 2>/dev/null').then(function (m) {
    var out = execOut(m).out.trim(),
      last = out.split('\n').pop();
    if (/^DONE/.test(last)) {
      upd = null;
      banner(tm(last.replace(/^DONE /, '')), 'ok');
      build();
      draw();
      return;
    }
    if (/^ERROR/.test(last)) {
      banner(t('Update failed: %s').replace('%s', last.replace(/^ERROR /, '')), 'err');
      return;
    }
    if (n > 120) {
      banner(t('The update is taking too long. Log: %s on the TV.').replace('%s', '/tmp/cytv-selfupdate.log'), 'err');
      return;
    }
    if (last) banner(t('Updating\u2026 %s').replace('%s', last), 'work');
    setTimeout(function () {
      pollUpdate(n + 1);
    }, 2000);
  });
}
