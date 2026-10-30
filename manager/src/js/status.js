function refreshDone() {
  load(true);
}
function run(path, body) {
  api(path, body).then(
    function (r) {
      if (r.error) banner(r.error, 'err');
      else poll();
    },
    function () {
      banner(t('The service did not answer'), 'err');
    }
  );
}
function opt(o) {
  api('/api/manager/options', o).then(
    function (s) {
      st = s;
      build();
      draw();
    },
    function () {
      banner(t('The service did not answer'), 'err');
    }
  );
}
function poll() {
  clearTimeout(pollT);
  api('/api/manager/status').then(
    function (s) {
      st = s;
      var j = s.job || {};
      if (j.state === 'working') {
        banner(tm(j.message), 'work');
        build();
        draw();
        pollT = setTimeout(poll, 1000);
      } else {
        if (j.state === 'error') banner(tm(j.message), 'err');
        else if (j.state === 'done') banner(tm(j.message), 'ok');
        else banner('');
        build();
        draw();
      }
    },
    function () {
      banner(t('Waiting for the service…'), 'work');
      pollT = setTimeout(poll, 2000);
    }
  );
}
function load(keep) {
  api('/api/manager/status').then(
    function (s) {
      offline = false;
      st = s;
      if (s.job && s.job.state === 'working') {
        poll();
        return;
      }
      if (!keep) banner('');
      build();
      if (idx >= rows.length) idx = 0;
      draw();
      if (s.checking)
        setTimeout(function () {
          load(true);
        }, 2000);
    },
    function () {
      offline = true;
      build();
      idx = setupIdx;
      draw();
      banner('');
      if (!checkedOffline) {
        checkedOffline = true;
        setupDefaults();
        offlineCheck();
      }
    }
  );
}
