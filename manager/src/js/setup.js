function doSetup(force) {
  forceOffer = false;
  banner(t('Setting up\u2026 the screen blinks once while LG\u2019s system restarts'), 'work');
  var flags =
    (setup.debloat ? '--debloat' : '--no-debloat') + ' ' + (setup.inputKey ? '--input-key' : '--no-input-key') + (force ? ' --force' : '');
  rootExec(
    'rm -f /media/developer/cytv-setup.log*; nohup sh ' +
      SVC +
      '/bootstrap.sh install ' +
      flags +
      ' > /media/developer/cytv-setup.log 2>&1 &'
  ).then(function (m) {
    var o = {};
    try {
      o = JSON.parse(m);
    } catch (e) {}
    if (o.returnValue === false) {
      banner(
        t('Could not start the setup: %s').replace(
          '%s',
          o.errorText || t('no answer from the Homebrew Channel service (is it installed and up to date?)')
        ),
        'err'
      );
      return;
    }
    waitUp(0);
  });
}
function logTail(cb) {
  rootExec('tail -n 3 /media/developer/cytv-setup.log 2>/dev/null').then(function (m) {
    var o = {};
    try {
      o = JSON.parse(m);
    } catch (e) {}
    cb(
      String(o.stdoutString || '')
        .replace(/\[cleanyourtv\] /g, '')
        .trim()
    );
  });
}
function waitUp(n) {
  api('/api/manager/status').then(
    function (s0) {
      offline = false;
      banner('');
      load();
      if (!(s0.keys && s0.keys.learned) && s0.options && s0.options.inputKey)
        setTimeout(function () {
          api('/api/manager/status').then(function (s) {
            st = s;
            openKeys('input');
          });
        }, 1500);
    },
    function () {
      logTail(function (tail) {
        if (/ERROR|rolled back/.test(tail)) {
          forceOffer = /looks different/.test(tail);
          build();
          draw();
          banner(
            t('Setup stopped: %s').replace(
              '%s',
              tail
                .split('\n')
                .pop()
                .replace(/^ERROR: /, '')
            ),
            'err'
          );
          return;
        }
        if (n > 90) {
          banner(
            t('The service did not start. Log: %s on the TV.').replace('%s', '/media/developer/cytv-setup.log') +
              ' ' +
              tail.split('\n').pop(),
            'err'
          );
          return;
        }
        if (tail) banner(t('Setting up\u2026 %s').replace('%s', tail.split('\n').pop()), 'work');
        setTimeout(function () {
          waitUp(n + 1);
        }, 2000);
      });
    }
  );
}
