/* the remote's Input and Home buttons differ between remotes and firmware: learn their codes from the hook, then test. Also the
   remote's other buttons (Remote buttons: Netflix, Prime Video, ...), each set to an action of ours */
function kShow(text, list) {
  kText = text;
  kRows = list;
  build();
  idx = 0;
  draw();
}
function openKeys(flow) {
  kFlow = flow || 'input';
  if (view !== 'keys') push('keys');
  kStep(kFlow === 'home' || kFlow === 'voice' || kFlow === 'guide' || kFlow === 'button' ? kFlow : 'input');
}
function closeKeys() {
  clearTimeout(kTimer);
  banner('');
  pop();
  load(true);
}
/* whole sentences per key, so a translation does not have to fit a key name into one sentence */
function kPress(n) {
  if (n === 'button') return t('Press the button now\u2026');
  return n === 'input'
    ? t('Press the Input button now\u2026')
    : n === 'voice'
      ? t('Press the voice button now\u2026')
      : n === 'guide'
        ? t('Press the Guide button now\u2026')
        : t('Press the Home button now\u2026');
}
function kGot(n, code, label) {
  if (n === 'button') return (label ? t('Learned: %s.').replace('%s', label) + '\n' : '') + t('Code %s.').replace('%s', code);
  return (
    n === 'input'
      ? t('Input key learned: code %s.')
      : n === 'voice'
        ? t('Voice button learned: code %s.')
        : n === 'guide'
          ? t('Guide key learned: code %s.')
          : t('Home key learned: code %s.')
  ).replace('%s', code);
}
function kStep(n) {
  clearTimeout(kTimer);
  var k = (st && st.keys) || { input: '241', home: '' };
  if (n === 'input')
    return kShow(t('The Input key.\nChoose Start, then press the Input button on your remote.'), [
      {
        label: t('Start'),
        sub: (k.inputIsDefault ? t('default: %s') : t('learned: %s')).replace('%s', k.input),
        fn: function () {
          kLearn('input');
        },
      },
      {
        label: t('Skip'),
        fn: function () {
          kStep('test');
        },
      },
      {
        label: t('Clear'),
        sub: t('back to the default (%s)').replace('%s', '241'),
        dim: k.inputIsDefault,
        fn: function () {
          if (!k.inputIsDefault) kClear('input');
        },
      },
      { label: t('Close'), fn: closeKeys },
    ]);
  if (n === 'home')
    return kShow(t('The Home key (optional).\nChoose Start, then press the Home button on your remote.'), [
      {
        label: t('Start'),
        sub: k.home ? t('now: %s').replace('%s', k.home) : '',
        fn: function () {
          kLearn('home');
        },
      },
      {
        label: t('Clear'),
        sub: t('forget the code'),
        dim: !k.home,
        fn: function () {
          if (k.home) kClear('home');
        },
      },
      { label: t('Close'), fn: closeKeys },
    ]);
  if (n === 'voice')
    return kShow(
      t(
        'The voice button.\nChoose Start, then press the button you want to use for voice. The remote\u2019s microphone button may not reach the hook; any spare button works.'
      ),
      [
        {
          label: t('Start'),
          sub: k.voice ? t('now: %s').replace('%s', k.voice) : '',
          fn: function () {
            kLearn('voice');
          },
        },
        {
          label: t('Clear'),
          sub: t('forget the code'),
          dim: !k.voice,
          fn: function () {
            if (k.voice) kClear('voice');
          },
        },
        { label: t('Close'), fn: closeKeys },
      ]
    );
  if (n === 'guide')
    return kShow(
      t(
        'The Guide key.\nChoose Start, then press the Guide button on your remote. It then opens the Live TV channel guide instead of LG\u2019s guide. Clear it to get LG\u2019s guide back.'
      ),
      [
        {
          label: t('Start'),
          sub: k.guide ? t('now: %s').replace('%s', k.guide) : '',
          fn: function () {
            kLearn('guide');
          },
        },
        {
          label: t('Clear'),
          sub: t('LG\u2019s guide again'),
          dim: !k.guide,
          fn: function () {
            if (k.guide) kClear('guide');
          },
        },
        { label: t('Close'), fn: closeKeys },
      ]
    );
  if (n === 'button')
    return kShow(
      t(
        'A button on the remote.\nChoose Start, then press the button you want to use, such as Netflix or Prime Video. It keeps doing what LG made it do until you choose something else.'
      ),
      [
        {
          label: t('Start'),
          fn: function () {
            kLearn('button');
          },
        },
        { label: t('Close'), fn: closeKeys },
      ]
    );
  if (n === 'test') return kTest();
  if (n === 'done')
    return api('/api/manager/keys-done', {})
      .then(function () {
        return api('/api/manager/status');
      })
      .then(
        function (s) {
          st = s;
          kShow(
            t(
              'Done.\nInput key %s.\nThe Home key is optional: learn it from the main list so that it also closes Live TV and Films & Series.'
            ).replace('%s', (s.keys || {}).input || '241'),
            [{ label: t('Close'), fn: closeKeys }]
          );
        },
        function () {
          closeKeys();
        }
      );
}
function kClear(name) {
  api('/api/manager/clear-key', { name: name })
    .then(function () {
      return api('/api/manager/status');
    })
    .then(
      function (s) {
        st = s;
        kShow(
          name === 'input'
            ? t('Input key cleared.\nIt uses the default code (%s).').replace('%s', (s.keys || {}).input || '241')
            : name === 'voice'
              ? t('Voice button cleared.')
              : name === 'guide'
                ? t('Guide key cleared. LG\u2019s guide is back.')
                : t('Home key cleared.'),
          [{ label: t('Close'), fn: closeKeys }]
        );
      },
      function () {
        closeKeys();
      }
    );
}
function kLearn(name) {
  api('/api/manager/learn-key', { name: name }).then(function () {
    kShow(kPress(name), [
      {
        label: t('Cancel'),
        fn: function () {
          kStep(name);
        },
      },
    ]);
    (function poll() {
      kTimer = setTimeout(function () {
        api('/api/manager/learn-state').then(
          function (l) {
            if (view !== 'keys') return;
            if (l.state === 'got' && name === 'button') {
              kShow(kGot(name, l.code, l.label), [
                {
                  label: t('Choose what it does'),
                  fn: function () {
                    api('/api/manager/status').then(function (s) {
                      st = s;
                      clearTimeout(kTimer);
                      banner('');
                      pop();
                      btn = l.code;
                      push('button');
                    });
                  },
                },
              ]);
              return;
            }
            if (l.state === 'got') {
              kShow(kGot(name, l.code), [
                {
                  label: name === 'input' ? t('Continue to the test') : t('Close'),
                  fn: function () {
                    api('/api/manager/status').then(function (s) {
                      st = s;
                      if (name === 'input') kStep('test');
                      else closeKeys();
                    });
                  },
                },
              ]);
              return;
            }
            if (l.state === 'unsupported') {
              api('/api/manager/options', { inputKey: false });
              kShow(
                t(
                  'The hook did not attach on this firmware, so keys cannot be learned. The Input key stays with LG\u2019s picker.\nUse Share log to report this.'
                ),
                [{ label: t('Close'), fn: closeKeys }]
              );
              return;
            }
            if (l.state === 'timeout') {
              kShow(t('Nothing was pressed.'), [
                {
                  label: t('Try again'),
                  fn: function () {
                    kLearn(name);
                  },
                },
                {
                  label: name === 'input' ? t('Skip') : t('Close'),
                  fn: function () {
                    if (name === 'input') kStep('test');
                    else closeKeys();
                  },
                },
              ]);
              return;
            }
            poll();
          },
          function () {
            poll();
          }
        );
      }, 500);
    })();
  });
}
function kTest() {
  api('/api/manager/test-key').then(function (t0) {
    kShow(t('Test.\nPress the Input button once more. Our Inputs list should open over this screen.'), [
      {
        label: t('Skip'),
        fn: function () {
          kStep('done');
        },
      },
    ]);
    var until = Date.now() + 40000;
    (function poll() {
      kTimer = setTimeout(function () {
        api('/api/manager/test-key').then(
          function (r) {
            if (view !== 'keys') return;
            if (r.pickerShownAt > t0.now) {
              kShow(t('The Inputs list opened: the Input key works.'), [
                {
                  label: t('Continue'),
                  fn: function () {
                    kStep('done');
                  },
                },
              ]);
              return;
            }
            if (Date.now() > until) {
              kShow(
                t(
                  'The Inputs list did not open.\nIf LG\u2019s own picker showed, the Input key is not mapped: learn it again or switch the Input key off.'
                ),
                [
                  {
                    label: t('Learn again'),
                    fn: function () {
                      kStep('input');
                    },
                  },
                  {
                    label: t('Skip'),
                    fn: function () {
                      kStep('done');
                    },
                  },
                ]
              );
              return;
            }
            poll();
          },
          function () {
            poll();
          }
        );
      }, 700);
    })();
  });
}

/* ---------- Remote buttons: what each learned button does (helper/buttons.js, scripts/buttonkey.sh) ---------- */
var BTN_ACTIONS = ['', 'none', 'live', 'guide', 'vod', 'inputs', 'voice', 'app'];
function btnOf(code) {
  var f = null;
  (st.buttons || []).forEach(function (b) {
    if (b.code === code) f = b;
  });
  return f;
}
function btnAction(a) {
  return a === 'none'
    ? t('Nothing')
    : a === 'live'
      ? t('Live TV')
      : a === 'guide'
        ? t('Live TV guide')
        : a === 'vod'
          ? t('Films & Series')
          : a === 'inputs'
            ? t('Inputs list')
            : a === 'voice'
              ? t('Voice')
              : a === 'app'
                ? t('An app or input\u2026')
                : t('LG\u2019s own');
}
function btnHelp(a) {
  return a === 'none'
    ? t('The button does nothing; LG\u2019s app no longer opens.')
    : a === 'live'
      ? t('Opens Live TV. Only while Live TV is on and CleanYourTV is Home; otherwise the button does what LG made it do.')
      : a === 'guide'
        ? t(
            'Opens the Live TV channel guide over whatever is running, as the Guide key does. Only while Live TV is on and CleanYourTV is Home.'
          )
        : a === 'vod'
          ? t('Opens Films & Series. Only while CleanYourTV is Home.')
          : a === 'inputs'
            ? t('Shows the Inputs list, as the Input key does.')
            : a === 'voice'
              ? t('Starts listening, as the voice button does. Only while voice is installed and on.')
              : a === 'app'
                ? t('Opens an app or an input (HDMI) you choose.')
                : t('The button does what LG made it do, such as opening its streaming app.');
}
function btnApp(id) {
  var n = id;
  (bapps || []).forEach(function (a) {
    if (a.id === id) n = a.title;
  });
  return n;
}
function btnSub(b) {
  if (!b.action) return t('LG\u2019s own');
  var s = b.action === 'app' ? btnApp(b.app) : btnAction(b.action);
  return b.bound ? s : s + ' \u00B7 ' + t('not now: LG\u2019s own');
}
/* the apps and the inputs a button can open: the inputs first, then the apps by name; never ours or Home */
function loadBtnApps() {
  return Promise.all([
    api('/api/apps').catch(function () {
      return {};
    }),
    api('/api/inputs').catch(function () {
      return {};
    }),
  ]).then(function (r) {
    var seen = {},
      ins = [],
      aps = [];
    (r[1].devices || []).forEach(function (d) {
      if (d.appId && !seen[d.appId]) {
        seen[d.appId] = true;
        ins.push({ id: d.appId, title: d.label || 'HDMI ' + d.port, input: true });
      }
    });
    (r[0].apps || []).forEach(function (a) {
      if (a.input || seen[a.id] || /^com\.cleanyourtv\./.test(a.id) || a.id === 'com.webos.app.home') return;
      seen[a.id] = true;
      aps.push({ id: a.id, title: a.title || a.id });
    });
    aps.sort(function (x, y) {
      return x.title.toLowerCase() < y.title.toLowerCase() ? -1 : 1;
    });
    bapps = ins.concat(aps);
    return bapps;
  });
}
function openButtons() {
  loadBtnApps().then(
    function () {
      push('buttons');
    },
    function () {
      push('buttons');
    }
  );
}
/* straight to one button's screen, over Remote buttons (from the main list) */
function openButton(code) {
  api('/api/manager/status').then(
    function (s) {
      st = s;
      banner('');
      loadBtnApps().then(go, go);
    },
    function () {
      load();
    }
  );
  function go() {
    build();
    draw();
    push('buttons');
    btn = code;
    if (btnOf(code)) push('button');
  }
}
function openBtnApps() {
  loadBtnApps().then(function () {
    push('buttonapp');
  });
}
/* body: {code, action, app} or {code, forget: true}; back: leave this button's screen */
function setBtn(body, back) {
  api('/api/manager/button', body).then(
    function (s) {
      if (s.error) return banner(t('The service did not answer'), 'err');
      st = s;
      if (back || view === 'buttonapp') pop();
      else {
        build();
        draw();
      }
    },
    function () {
      banner(t('The service did not answer'), 'err');
    }
  );
}
