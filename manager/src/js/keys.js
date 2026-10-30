/* the remote's Input and Home buttons differ between remotes and firmware: learn their codes from the hook, then test */
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
  kStep(kFlow === 'home' || kFlow === 'voice' || kFlow === 'guide' ? kFlow : 'input');
}
function closeKeys() {
  clearTimeout(kTimer);
  banner('');
  pop();
  load(true);
}
/* whole sentences per key, so a translation does not have to fit a key name into one sentence */
function kPress(n) {
  return n === 'input'
    ? t('Press the Input button now\u2026')
    : n === 'voice'
      ? t('Press the voice button now\u2026')
      : n === 'guide'
        ? t('Press the Guide button now\u2026')
        : t('Press the Home button now\u2026');
}
function kGot(n, code) {
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
