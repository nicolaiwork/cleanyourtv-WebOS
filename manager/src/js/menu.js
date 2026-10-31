function build() {
  rows = [];
  if (view === 'share') {
    rows.push({ label: t('Close'), fn: closeShare });
    return;
  }
  if (view === 'keys') {
    rows = kRows;
    return;
  }
  if (view === 'notifyhow' || view === 'voicehow') {
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  if (view === 'theme') {
    var tc = (th && th.current) || { id: 'classic', accent: '' };
    ((th && th.themes) || []).forEach(function (x) {
      rows.push({
        label: x.name,
        sub: x.id === tc.id ? t('selected') : x.installed ? '' : t('on GitHub'),
        sel: x.id === tc.id,
        pv: x.preview ? x.id : '',
        info: {
          t: x.name,
          d:
            x.description +
            (x.author ? '\n\n' + t('By %s').replace('%s', x.author) : '') +
            (x.installed || x.id === 'classic' ? '' : '\n\n' + t('Downloaded from GitHub when you choose it.')),
        },
        fn: function () {
          setTheme({ id: x.id, name: x.name });
        },
      });
    });
    rows.push({ sep: true });
    var an = t('Theme default');
    ((th && th.accents) || []).forEach(function (a) {
      if (a.hex === tc.accent) an = t(a.name);
    });
    rows.push({
      label: t('Theme options'),
      sub: t('accent colour') + ' \u00B7 ' + an,
      fn: function () {
        push('themeopts');
      },
    });
    rows.push({ sep: true });
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  if (view === 'themeopts') {
    var to = (th && th.current) || { id: 'classic', accent: '' },
      an2 = t('Theme default');
    ((th && th.accents) || []).forEach(function (a) {
      if (a.hex === to.accent) an2 = t(a.name);
    });
    rows.push({
      label: t('Accent colour'),
      sub: an2,
      fn: function () {
        push('accent');
      },
    });
    rows.push({
      label: t('Go back to the previous theme'),
      sub: th && th.previous ? th.previous.id : t('nothing to go back to'),
      dim: !(th && th.previous),
      fn: function () {
        if (th && th.previous) themeCall('/api/theme/revert', {}, t('Previous theme restored'));
      },
    });
    rows.push({ sep: true });
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  if (view === 'accent') {
    var ta = (th && th.current && th.current.accent) || '';
    ((th && th.accents) || []).forEach(function (a) {
      rows.push({
        label: t(a.name),
        sub: a.hex === ta ? t('selected') : a.hex || '',
        sel: a.hex === ta,
        fn: function () {
          themeCall(
            '/api/theme/set',
            { accent: a.hex },
            a.name === 'Theme default' ? t('Accent: theme default') : t('Accent: %s').replace('%s', t(a.name)),
            true
          );
        },
      });
    });
    rows.push({ sep: true });
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  if (view === 'channel') {
    var cc = (st && st.channel) || '';
    rows.push({
      label: t('Stable releases'),
      sub: (cc ? '' : t('selected') + ' \u00B7 ') + t('the latest published release'),
      sel: !cc,
      fn: function () {
        setChannel('');
      },
    });
    ((tst && tst.builds) || []).forEach(function (b) {
      rows.push({
        label: t('Test: %s').replace('%s', b.branch),
        sub:
          (b.tag === cc ? t('selected') + ' \u00B7 ' : '') +
          (b.build ? t('build %s').replace('%s', b.build) : '') +
          (b.published ? (b.build ? ' \u00B7 ' : '') + String(b.published).slice(0, 10) : ''),
        fn: function () {
          setChannel(b.tag);
        },
        sel: b.tag === cc,
      });
    });
    if (!tst || !tst.builds || !tst.builds.length)
      rows.push({
        label: t('No test builds right now'),
        sub: tst && tst.error ? String(tst.error) : t('a test build appears when a branch is pushed'),
        dim: true,
        fn: null,
      });
    rows.push({ sep: true });
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  if (view === 'models') {
    var cur = ((vo || {}).llm || {}).model;
    mdl.forEach(function (x) {
      rows.push({
        label: x.name,
        sub:
          x.id +
          (x.price != null ? ' \u00B7 ' + t('$%s per million words in').replace('%s', x.price) : '') +
          (x.id === cur ? ' \u00B7 ' + t('selected') : ''),
        sel: x.id === cur,
        fn: function () {
          pickModel(x.id);
        },
      });
    });
    rows.push({ sep: true });
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  if (view === 'agents') {
    var ca = ((vo || {}).ha || {}).agent || '';
    rows.push({
      label: t('Default agent'),
      sub: t('Home Assistant\u2019s own') + (ca ? '' : ' \u00B7 ' + t('selected')),
      sel: !ca,
      fn: function () {
        pickAgent('');
      },
    });
    agl.forEach(function (x) {
      rows.push({
        label: x.name,
        sub: x.id + (x.id === ca ? ' \u00B7 ' + t('selected') : ''),
        sel: x.id === ca,
        fn: function () {
          pickAgent(x.id);
        },
      });
    });
    rows.push({ sep: true });
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  if (view === 'voice') {
    var v = vo || {},
      wk = v.job && v.job.state === 'working';
    var vk = (st.keys && st.keys.voice) || '',
      lm = v.llm || {};
    var ha = v.ha || {},
      haOk = !!ha.configured,
      HR = {
        'ha-first': t('Home Assistant first, then the AI'),
        'ha-only': t('Home Assistant only'),
        'ai-only': t('The AI only'),
      };
    if (!v.installed) {
      rows.push({
        label: t('Install voice'),
        sub: wk ? t('installing…') : t('downloads about 80 MB'),
        dim: wk,
        fn: function () {
          if (wk) return;
          api('/api/voice/install', {}).then(
            function (x) {
              vo = x;
              build();
              draw();
              voiceRefresh();
            },
            function () {
              banner(t('The service did not answer'), 'err');
            }
          );
        },
      });
    } else {
      rows.push({
        label: t('Listen on the voice button'),
        sub: vk ? onoff(v.enabled) : t('learn a button first'),
        dim: !vk,
        fn: function () {
          if (!vk) return;
          api('/api/voice/set', { enabled: !v.enabled })
            .then(function (x) {
              vo = x;
              return api('/api/manager/status');
            })
            .then(
              function (s2) {
                st = s2;
                build();
                draw();
              },
              function () {
                banner(t('The service did not answer'), 'err');
              }
            );
        },
      });
      rows.push({
        label: t('Learn the voice button'),
        sub: vk ? t('now: %s').replace('%s', vk) : t('not learned'),
        fn: function () {
          openKeys('voice');
        },
      });
      rows.push({
        label: t('Try it now'),
        sub: v.listening ? t('listening…') : t('speak when the card appears'),
        dim: v.listening,
        fn: function () {
          if (v.listening) return;
          api('/api/voice/listen', {}).then(
            function (x) {
              if (x.error) banner(x.error, 'err');
              else banner(t('Speak now…'), 'work');
              voiceRefresh();
            },
            function () {
              banner(t('The service did not answer'), 'err');
            }
          );
        },
      });
      rows.push({
        label: t('Switch off LG\u2019s voice assistant'),
        sub: onoff(v.suppressLg) + (v.suppressLg && v.enabled && !v.lgPaused ? ' \u00B7 ' + t('not paused yet') : ''),
        fn: function () {
          api('/api/voice/set', { suppressLg: !v.suppressLg }).then(
            function (x) {
              vo = x;
              build();
              draw();
            },
            function () {
              banner(t('The service did not answer'), 'err');
            }
          );
        },
      });
    }
    rows.push({ sep: true });
    rows.push({
      label: t('Home Assistant (Assist)'),
      sub: haOk
        ? ha.url.replace(/^https?:\/\//, '').replace(/\/.*/, '') + ' \u00B7 ' + HR[ha.route]
        : t('not set \u00B7 set up from your phone'),
      fn: function () {
        if (!haOk) {
          openPair();
          return;
        }
        haTest();
      },
    });
    rows.push({
      label: t('Which answers first'),
      sub: HR[ha.route || 'ha-first'],
      fn: function () {
        var o = ['ha-first', 'ha-only', 'ai-only'],
          n = o[(o.indexOf(ha.route || 'ha-first') + 1) % 3];
        api('/api/voice/set', { ha: { route: n } }).then(
          function (x) {
            if (x.error) {
              banner(x.error, 'err');
              return;
            }
            vo = x;
            build();
            draw();
          },
          function () {
            banner(t('The service did not answer'), 'err');
          }
        );
      },
    });
    rows.push({
      label: t('Assist agent'),
      sub: haOk ? ha.agent || t('default') : t('set up Home Assistant first'),
      dim: !haOk,
      fn: function () {
        if (haOk) openAgents();
      },
    });
    rows.push({
      label: t('AI chat (OpenRouter)'),
      sub: lm.hasKey ? onoff(lm.enabled) + ' \u00B7 ' + lm.model : t('no key set'),
      fn: function () {
        if (!lm.hasKey) {
          openPair();
          return;
        }
        api('/api/voice/set', { llm: { enabled: !lm.enabled } }).then(
          function (x) {
            if (x.error) {
              banner(x.error, 'err');
              return;
            }
            vo = x;
            build();
            draw();
          },
          function () {
            banner(t('The service did not answer'), 'err');
          }
        );
      },
    });
    rows.push({ label: t('Model'), sub: lm.model || 'openrouter/auto', fn: openModels });
    rows.push({
      label: t('Send the text to'),
      sub: v.url ? v.url.replace(/^(https?:\/\/[^\/]+).*/, '$1') : t('not set · shows a card only'),
      fn: function () {
        kText =
          t('Set the address of your server (from a shell on the TV):') +
          '\n\ncurl -X POST localhost:8765/api/voice/set -d \'{"url":"http://server:port/path","token":"optional secret"}\'\n\n' +
          t(
            'The TV sends: POST, JSON {"text":"..."}, with "Authorization: Bearer <token>" when a token is set. If your server answers with JSON {"text":"..."} (or plain text), the answer is shown as a card. Only the recognised text is sent, never audio.'
          );
        push('voicehow');
      },
    });
    rows.push({ sep: true });
    rows.push({ label: t('Set up from your phone'), sub: t('key, model, Home Assistant, server'), fn: openPair });
    rows.push({
      label: t('Set up with commands'),
      sub: t('for scripts and ssh'),
      fn: function () {
        kText = aiHelp();
        push('voicehow');
      },
    });
    rows.push({
      label: t('Forget the conversation'),
      fn: function () {
        api('/api/voice/forget', {}).then(
          function () {
            banner(t('Conversation cleared'), 'ok');
          },
          function () {
            banner(t('The service did not answer'), 'err');
          }
        );
      },
    });
    if (v.installed) {
      rows.push({ sep: true });
      rows.push({
        label: t('Remove voice'),
        sub: t('deletes the %s MB download').replace('%s', Math.round((v.bytes || 0) / 1048576)),
        fn: function () {
          api('/api/voice/uninstall', {})
            .then(function (x) {
              vo = x;
              return api('/api/manager/status');
            })
            .then(
              function (s2) {
                st = s2;
                banner(t('Voice removed'), 'ok');
                build();
                draw();
              },
              function () {
                banner(t('The service did not answer'), 'err');
              }
            );
        },
      });
    }
    rows.push({ sep: true });
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  if (view === 'notifyapi') {
    rows.push({
      label: t('Accept notifications from the network'),
      sub: onoff(napi && napi.enabled),
      fn: function () {
        api('/api/manager/notify-api', { enabled: !(napi && napi.enabled) }).then(
          function (n) {
            napi = n;
            api('/api/manager/status').then(function (s2) {
              st = s2;
              build();
              draw();
            });
          },
          function () {
            banner(t('The service did not answer'), 'err');
          }
        );
      },
    });
    if (napi && napi.enabled) {
      rows.push({
        label: t('How to send'),
        sub: t('address, token, example'),
        fn: function () {
          kText =
            t('Send a POST request:') +
            '\nhttp://' +
            napi.ip +
            ':' +
            napi.port +
            '/notify\n\n' +
            t('Header:') +
            '\nAuthorization: Bearer ' +
            napi.token +
            '\n\n' +
            t('Body (JSON):') +
            '\n{"title":"' +
            t('Front door') +
            '","text":"' +
            t('Someone is at the door') +
            '","image":"http://…/snapshot.jpg","seconds":15}';
          push('notifyhow');
        },
      });
      rows.push({ label: t('Show as QR code'), sub: t('scan with a phone to copy the address and token'), fn: openNotifyQr });
      rows.push({
        label: t('New token'),
        sub: t('the old one stops working'),
        fn: function () {
          api('/api/manager/notify-api', { regenerate: true }).then(function (n) {
            napi = n;
            banner(t('New token created. Open \u201CHow to send\u201D to see it.'), 'ok');
            build();
            draw();
          });
        },
      });
    }
    rows.push({ sep: true });
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  if (offline) {
    // before the setup: a newer package first, then choose, set up, then the extras
    updIdx = 0;
    if (upd) {
      rows.push({
        k: 'Update to',
        label: t('Update to %s').replace('%s', upd.updateTo),
        sub: t('recommended first · installed %s').replace('%s', upd.installed),
        fn: offlineUpdate,
      });
      rows.push({ sep: true });
    }
    rows.push({
      label: t('Debloat LG’s ads and telemetry'),
      sub: onoff(setup.debloat),
      fn: function () {
        setup.debloat = !setup.debloat;
        build();
        draw();
      },
    });
    rows.push({
      label: t('Take over the Input key'),
      sub: onoff(setup.inputKey),
      fn: function () {
        setup.inputKey = !setup.inputKey;
        build();
        draw();
      },
    });
    rows.push({ sep: true });
    setupIdx = rows.length;
    rows.push({
      label: t('Set up now'),
      sub: t('the screen blinks once'),
      fn: function () {
        doSetup(false);
      },
    });
    if (forceOffer)
      rows.push({
        label: t('Set up anyway'),
        sub: t('untested firmware; a failed start restarts the TV'),
        fn: function () {
          doSetup(true);
        },
      });
    rows.push({ sep: true });
    rows.push({ label: t('Check for updates'), sub: t('works without the service'), fn: offlineCheck });
    rows.push({ label: t('Share log'), sub: t('QR code for your phone'), fn: openShare });
    return;
  }
  if (view === 'confirm-home' || view === 'confirm-uninstall') {
    var un = view === 'confirm-uninstall',
      on = !(st.home && st.home.enabled);
    rows.push({ label: t('Cancel'), fn: pop });
    rows.push({
      label: un ? t('Yes, remove CleanYourTV') : on ? t('Yes, use CleanYourTV as Home') : t('Yes, use LG’s Home'),
      sub: un ? t('settings and apps are deleted; the TV restarts') : t('the TV restarts'),
      fn: function () {
        api(un ? '/api/manager/uninstall' : '/api/manager/home', un ? {} : { enabled: on }).catch(function () {});
        banner(
          un
            ? t('Removing CleanYourTV… the TV restarts in a moment and LG’s Home comes back.')
            : on
              ? t('Switching to CleanYourTV… the TV restarts in a moment.')
              : t('Switching to LG’s Home… the TV restarts in a moment.'),
          'work'
        );
      },
    });
    return;
  }
  if (view === 'livetv') {
    var lo = st.options.liveTv !== false,
      l2 = lv || {},
      gk = (st.keys && st.keys.guide) || '';
    rows.push({
      label: t('Show Live TV'),
      sub: onoff(lo),
      fn: function () {
        opt({ liveTv: !lo });
      },
    });
    rows.push({
      label: t('Playlist'),
      sub: l2.configured
        ? t('%s channels').replace('%s', l2.channels) +
          (l2.epg ? ' \u00B7 ' + t('guide for %s programmes').replace('%s', l2.epg) : '') +
          (l2.state && l2.state !== 'idle' ? ' \u00B7 ' + t(l2.state) : '')
        : t('not set \u00B7 set up from your phone'),
      fn: openLivePair,
    });
    rows.push({
      label: t('Refresh playlist and guide'),
      sub: l2.error ? String(l2.error).slice(0, 70) : '',
      dim: !l2.configured,
      fn: function () {
        if (!l2.configured) return;
        banner(t('Refreshing\u2026'), 'work');
        api('/api/live/refresh', {}).then(
          function () {
            banner(t('Refreshing in the background'), 'ok');
            setTimeout(liveRefresh, 3000);
          },
          function () {
            banner(t('The service did not answer'), 'err');
          }
        );
      },
    });
    rows.push({
      label: t('Learn the Guide key'),
      sub: lo ? (gk ? t('now: %s').replace('%s', gk) : t('not learned \u00B7 LG\u2019s guide stays')) : t('Live TV is off'),
      dim: !lo,
      fn: function () {
        if (lo) openKeys('guide');
      },
    });
    rows.push({ sep: true });
    rows.push({
      label: t('Clear recent channels'),
      fn: function () {
        api('/api/live/state', { op: 'clear' }).then(
          function () {
            banner(t('Recent channels cleared'), 'ok');
          },
          function () {
            banner(t('The service did not answer'), 'err');
          }
        );
      },
    });
    rows.push({
      label: t('Remove the playlist'),
      sub: l2.configured ? '' : t('nothing to remove'),
      dim: !l2.configured,
      fn: function () {
        if (l2.configured) push('confirm-live-reset');
      },
    });
    rows.push({ sep: true });
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  if (view === 'confirm-live-reset') {
    rows.push({
      label: t('Yes, remove the playlist'),
      sub: t('the address, the channel list, the guide and your favourites are deleted'),
      fn: function () {
        api('/api/live/reset', {}).then(
          function () {
            banner(t('Playlist removed'), 'ok');
            pop();
            liveRefresh();
          },
          function () {
            banner(t('The service did not answer'), 'err');
          }
        );
      },
    });
    rows.push({ label: t('No, keep it'), fn: pop });
    return;
  }
  if (view === 'buttons') {
    (st.buttons || []).forEach(function (b) {
      rows.push({
        label: b.name || t('Button %s').replace('%s', b.code),
        sub: btnSub(b),
        fn: function () {
          btn = b.code;
          push('button');
        },
      });
    });
    if ((st.buttons || []).length) rows.push({ sep: true });
    rows.push({
      label: t('Learn a button'),
      fn: function () {
        openKeys('button');
      },
    });
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  if (view === 'button') {
    var bt = btnOf(btn);
    if (!bt) return void rows.push({ label: t('Back'), fn: pop });
    BTN_ACTIONS.forEach(function (a) {
      rows.push({
        label: btnAction(a),
        sub: (bt.action === a ? t('selected') : '') + (a === 'app' && bt.action === 'app' ? ' · ' + btnApp(bt.app) : ''),
        info: { t: btnAction(a), d: btnHelp(a) },
        fn: function () {
          if (a === 'app') return openBtnApps();
          setBtn({ code: bt.code, action: a });
        },
      });
    });
    rows.push({ sep: true });
    rows.push({
      label: t('Forget this button'),
      fn: function () {
        setBtn({ code: bt.code, forget: true }, true);
      },
    });
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  if (view === 'buttonapp') {
    var bc = btnOf(btn) || {};
    (bapps || []).forEach(function (a) {
      rows.push({
        label: a.title,
        sub: bc.action === 'app' && bc.app === a.id ? t('selected') : a.input ? t('input') : '',
        fn: function () {
          setBtn({ code: btn, action: 'app', app: a.id });
        },
      });
    });
    rows.push({ sep: true });
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  if (view === 'inputkey') {
    var hk = st.inputhook || {},
      na = hk.hook && !hk.hook.attached;
    rows.push({
      label: t('Input key opens our Inputs list'),
      sub: na ? t('not available on this firmware') : onoff(st.options.inputKey),
      fn: function () {
        opt({ inputKey: !st.options.inputKey });
      },
    });
    rows.push({
      label: t('Learn the Input key'),
      sub: (st.keys && st.keys.inputIsDefault ? t('default (%s)') : t('learned: %s')).replace('%s', st.keys && st.keys.input),
      fn: function () {
        openKeys('input');
      },
    });
    var pk = st.picker || {},
      pkMode = pk.mode || 'overlay',
      PKT = {
        overlay: t('over the running app, ready in the background (instant)'),
        ondemand: t('over the running app, started when pressed'),
        launcher: t('the launcher\u2019s Inputs list'),
      };
    rows.push({
      label: t('Input key shows'),
      sub:
        (pk.released ? t('LG\u2019s own list: CleanYourTV is not the Home') : PKT[pkMode]) +
        (pk.reason && !pk.released ? ' \u00B7 ' + t(pk.reason) : ''),
      fn: function () {
        var o = ['overlay', 'ondemand', 'launcher'];
        opt({ pickerMode: o[(o.indexOf(pkMode) + 1) % 3] });
      },
    });
    rows.push({
      label: t('Learn the Home key'),
      sub: t('optional') + ' · ' + (st.keys && st.keys.home ? t('now: %s').replace('%s', st.keys.home) : t('not learned')),
      fn: function () {
        openKeys('home');
      },
    });
    rows.push({ sep: true });
    rows.push({ label: t('Back'), fn: pop });
    return;
  }
  var fe = st.frontend,
    sv = st.service,
    busy = st.job && st.job.state === 'working';
  var uptxt = function (u) {
    return u
      ? (st.channel ? t('Update to %s (test build)') : t('Update to %s')).replace('%s', u)
      : st.checking
        ? t('Checking…')
        : st.checkError
          ? /no release/.test(st.checkError)
            ? t('No release yet')
            : t('Cannot check')
          : t('Up to date');
  };
  // updates, then the settings, then support; the destructive row last
  rows.push({
    k: 'Launcher',
    label: t('Launcher') + ' ' + fe.version,
    sub: uptxt(fe.updateTo),
    dim: busy,
    fn: fe.updateTo
      ? function () {
          run('/api/manager/update-frontend', { version: fe.updateTo });
        }
      : null,
  });
  rows.push({
    k: 'Service',
    label: t('Service') + ' ' + sv.version,
    sub: uptxt(sv.updateTo),
    dim: busy,
    fn: sv.updateTo
      ? function () {
          run('/api/manager/update-service', { version: sv.updateTo });
        }
      : null,
  });
  rows.push({
    label: t('Check for updates'),
    dim: busy,
    fn: function () {
      banner(t('Checking…'), 'work');
      api('/api/manager/check', {}).then(refreshDone, refreshDone);
    },
  });
  rows.push({
    label: t('Update channel'),
    sub: st.channel ? t('Test: %s').replace('%s', st.channel.replace(/^test-/, '')) : t('Stable releases'),
    dim: busy,
    fn: openChannel,
  });
  if (fe.previous)
    rows.push({
      k: 'Go back to launcher',
      label: t('Go back to launcher %s').replace('%s', fe.previous),
      dim: busy,
      fn: function () {
        run('/api/manager/rollback-frontend', {});
      },
    });
  rows.push({ sep: true });
  rows.push({
    label: t('CleanYourTV as Home'),
    sub: onoff(st.home && st.home.enabled),
    fn: function () {
      push('confirm-home');
    },
  });
  rows.push({
    label: t('Theme'),
    sub: (function () {
      var n = '';
      ((th && th.themes) || []).forEach(function (x) {
        if (th.current && x.id === th.current.id) n = x.name;
      });
      return n;
    })(),
    fn: openTheme,
  });
  rows.push({ label: t('Live TV'), sub: onoff(st.options.liveTv !== false), fn: openLiveTv });
  rows.push({
    label: t('Input key'),
    sub: st.inputhook && st.inputhook.hook && !st.inputhook.hook.attached ? t('not available') : onoff(st.options.inputKey),
    fn: function () {
      push('inputkey');
    },
  });
  rows.push({
    label: t('Remote buttons'),
    sub: (function () {
      var n = (st.buttons || []).filter(function (b) {
        return b.action;
      }).length;
      return n ? t('%s in use').replace('%s', n) : t('none set');
    })(),
    fn: openButtons,
  });
  rows.push({ sep: true });
  rows.push({
    label: t('Voice'),
    sub: st.voice ? (st.voice.installed ? onoff(st.voice.enabled) : t('not installed')) : '',
    fn: function () {
      api('/api/voice/status').then(
        function (v) {
          vo = v;
          push('voice');
          if ((v.job && v.job.state === 'working') || v.listening) voiceRefresh();
        },
        function () {
          banner(t('The service did not answer'), 'err');
        }
      );
    },
  });
  rows.push({
    label: t('Network notifications'),
    sub: onoff(st.notifyApi && st.notifyApi.enabled),
    fn: function () {
      api('/api/manager/notify-api').then(
        function (n) {
          napi = n;
          push('notifyapi');
        },
        function () {
          banner(t('The service did not answer'), 'err');
        }
      );
    },
  });
  rows.push({
    label: t('Debloat LG’s ads and telemetry'),
    sub: onoff(st.options.debloat),
    fn: function () {
      opt({ debloat: !st.options.debloat });
    },
  });
  var ptr = st.pointer || {};
  rows.push({
    label: t('Hide the Magic Remote pointer'),
    sub:
      onoff(st.options.hidePointer) +
      (st.options.hidePointer && (ptr.state === 'unsupported' || ptr.state === 'error') ? ' · ' + t('not possible on this TV') : ''),
    fn: function () {
      opt({ hidePointer: !st.options.hidePointer });
    },
  });
  var lgch = st.lgChannels || {};
  rows.push({
    label: t('Stop LG Channels in the background'),
    sub:
      onoff(st.options.stopLgChannels) +
      (st.options.stopLgChannels && (lgch.state === 'absent' || lgch.state === 'error') ? ' · ' + t('not possible on this TV') : ''),
    fn: function () {
      opt({ stopLgChannels: !st.options.stopLgChannels });
    },
  });
  rows.push({ sep: true });
  rows.push({ label: t('Share log'), sub: t('QR code for your phone'), fn: openShare });
  rows.push({
    label: t('Uninstall'),
    fn: function () {
      push('confirm-uninstall');
    },
  });
}
