/* ---------- menus ---------- */
var stack = [],
  ovEl = null;
/* webOS 5's Chromium (68) can leave the old text in the compositor tile when an element's content is replaced, so menu and list text shows
   twice (issue 4). There the element is swapped for a fresh one instead of rewriting its content; newer engines just set innerHTML. */
var OLDGPU = (function () {
  var m = /Chrome\/(\d+)/.exec(navigator.userAgent || '');
  return !!m && +m[1] < 79;
})();
function setHtml(el, h) {
  if (!OLDGPU || !el.parentNode) {
    el.innerHTML = h;
    return el;
  }
  var n = el.cloneNode(false);
  n.innerHTML = h;
  el.parentNode.replaceChild(n, el);
  return n;
}
/* o: {grid: a grid of app icons (item.app), hint: a line under the title, settings: the Settings menu (redrawSettings)} */
function openMenu(title, items, o) {
  o = o || {};
  stack.push({ title: title, items: items, idx: 0, grid: !!o.grid, hint: o.hint || '', settings: !!o.settings });
  drawMenu();
}
function closeMenus() {
  stack = [];
  if (ovEl) {
    ovEl.remove();
    ovEl = null;
  }
}
function backMenu() {
  stack.pop();
  if (stack.length) drawMenu();
  else closeMenus();
}
function drawMenu() {
  var m = stack[stack.length - 1];
  if (m.grid) return drawGrid(m);
  var N = 8,
    start = Math.max(0, Math.min(m.idx - 3, m.items.length - N));
  if (!ovEl) {
    ovEl = document.createElement('div');
    ovEl.id = 'ov';
    document.body.appendChild(ovEl);
  }
  var h = '<div class="panel"><h2></h2><div class="more">' + (start > 0 ? '▲' : '') + '</div>';
  for (var i = start; i < Math.min(m.items.length, start + N); i++) {
    var it = m.items[i];
    h +=
      '<div class="row' +
      (i === m.idx ? ' f' : '') +
      (it.dim ? ' dim' : '') +
      '" data-i="' +
      i +
      '">' +
      (it.icon ? svg(it.icon) : '') +
      '<span class="lb"></span>' +
      (it.sub ? '<span class="st"></span>' : '') +
      '</div>';
  }
  h += '<div class="more">' + (start + N < m.items.length ? '▼' : '') + '</div></div>';
  ovEl = setHtml(ovEl, h);
  ovEl.className = '';
  ovEl._grid = null;
  ovEl.querySelector('h2').textContent = m.title;
  [].forEach.call(ovEl.querySelectorAll('.row'), function (row) {
    var it = m.items[+row.getAttribute('data-i')];
    row.querySelector('.lb').textContent = it.label;
    if (it.sub) row.querySelector('.st').textContent = it.sub;
    wire(row, it, m);
  });
}
/* the pointer: a click picks the item, a long press gives its options */
function wire(row, it, m) {
  var pt = 0,
    rowHeld = false;
  if (it.hold) {
    row.addEventListener('mousedown', function () {
      rowHeld = false;
      clearTimeout(pt);
      pt = setTimeout(function () {
        rowHeld = true;
        it.hold();
      }, 650);
    });
    row.addEventListener('mouseup', function () {
      clearTimeout(pt);
    });
  }
  row.addEventListener('click', function () {
    if (rowHeld) return void (rowHeld = false);
    m.idx = +row.getAttribute('data-i');
    pickMenu();
  });
}
/* All apps: six icons a row, three rows on screen; moving within them only moves the focus (no new elements) */
var GRID_COLS = 6,
  GRID_ROWS = 3;
function drawGrid(m) {
  var n = m.items.length,
    top = Math.max(0, Math.min(Math.floor(m.idx / GRID_COLS) - 1, Math.ceil(n / GRID_COLS) - GRID_ROWS)),
    start = top * GRID_COLS,
    end = Math.min(n, start + GRID_COLS * GRID_ROWS);
  if (ovEl && ovEl._grid === m && ovEl._top === top) {
    [].forEach.call(ovEl.querySelectorAll('.gt'), function (g) {
      g.classList.toggle('f', +g.getAttribute('data-i') === m.idx);
    });
    return;
  }
  if (!ovEl) {
    ovEl = document.createElement('div');
    ovEl.id = 'ov';
    document.body.appendChild(ovEl);
  }
  var h = '<div class="gpanel"><h2></h2><div class="hint"></div><div class="more">' + (top > 0 ? '▲' : '') + '</div><div class="grid">';
  for (var i = start; i < end; i++)
    h += '<div class="gt' + (i === m.idx ? ' f' : '') + '" data-i="' + i + '"><img class="gi" alt=""><span class="lb"></span></div>';
  h += '</div><div class="more">' + (end < n ? '▼' : '') + '</div></div>';
  ovEl = setHtml(ovEl, h);
  ovEl.className = 'grid';
  ovEl._grid = m;
  ovEl._top = top;
  ovEl.querySelector('h2').textContent = m.title;
  ovEl.querySelector('.hint').textContent = m.hint;
  [].forEach.call(ovEl.querySelectorAll('.gt'), function (g) {
    var it = m.items[+g.getAttribute('data-i')],
      im = g.querySelector('img');
    g.querySelector('.lb').textContent = it.label;
    im.onerror = function () {
      var s = document.createElement('span');
      s.className = 'gi';
      s.innerHTML = svg('grid');
      if (im.parentNode) im.parentNode.replaceChild(s, im);
    };
    im.src = API + '/icon/' + encodeURIComponent(it.app);
    wire(g, it, m);
  });
}
function pickMenu() {
  var m = stack[stack.length - 1],
    it = m.items[m.idx];
  if (it && it.fn) {
    var n = stack.length;
    it.fn();
    if (stack.length === n && !it.stay) closeMenus();
  }
}
function menuKey(k) {
  var m = stack[stack.length - 1];
  if (m.grid && k >= 37 && k <= 40) {
    var n = m.items.length,
      C = GRID_COLS;
    if (k === 37 && m.idx % C > 0) m.idx--;
    else if (k === 39 && m.idx % C < C - 1 && m.idx < n - 1) m.idx++;
    else if (k === 38 && m.idx >= C) m.idx -= C;
    else if (k === 40 && Math.floor(m.idx / C) < Math.floor((n - 1) / C)) m.idx = Math.min(n - 1, m.idx + C);
    drawMenu();
    return true;
  }
  if (k === 38 && m.idx > 0) {
    m.idx--;
    drawMenu();
  } else if (k === 40 && m.idx < m.items.length - 1) {
    m.idx++;
    drawMenu();
  } else if (k === 13) pickMenu();
  else if (k === 461 || k === 27 || k === 8) backMenu();
  else return false;
  return true;
}

/* Back on the home screen lists the running apps to close them, as LG's Home does with its Recents on a second Back (issue 16) */
function runningMenu() {
  api('/api/running').then(
    function (x) {
      if (x.error) return toast(t('Could not read the running apps'));
      openMenu(t('Running apps'), runningItems(x.apps || []));
      stack[stack.length - 1].running = true;
    },
    function () {
      toast(t('Could not read the running apps'));
    }
  );
}
/* the list is only true for the moment it was read: it goes when Home is left, so it is never shown out of date */
function closeRunningMenu() {
  if (
    stack.some(function (m) {
      return m.running;
    })
  )
    closeMenus();
}
function runningItems(list) {
  if (!list.length) return [{ label: t('No apps are running'), dim: true }];
  var items = list.map(function (a) {
    return {
      label: a.title,
      sub: t('Close'),
      stay: true,
      fn: function () {
        closeRunning(list, [a.id]);
      },
    };
  });
  if (list.length > 1)
    items.push({
      label: t('Close all'),
      stay: true,
      fn: function () {
        closeRunning(
          list,
          list.map(function (a) {
            return a.id;
          })
        );
      },
    });
  return items;
}
/* the app manager's running list lags by seconds after a close, so the rows go at once instead of after a new reading */
function closeRunning(list, ids) {
  var m = stack[stack.length - 1],
    left = list.filter(function (a) {
      return ids.indexOf(a.id) < 0;
    });
  api('/api/running/close', ids.length > 1 ? { all: true } : { id: ids[0] }).then(
    function (x) {
      if (!x || x.returnValue !== true) toast(t('Could not close'));
    },
    function () {
      toast(t('Could not close'));
    }
  );
  m.items = runningItems(left);
  m.idx = Math.min(m.idx, m.items.length - 1);
  drawMenu();
}

function inputsMenu() {
  api('/api/inputs').then(function (x) {
    var items = (x.devices || [])
      .filter(function (d) {
        return d.appId;
      })
      .map(function (d) {
        var port = 'HDMI ' + d.port,
          named = d.label && d.label !== port && d.label !== 'HDMI ' + d.port,
          parts = [];
        if (named) parts.push(port);
        if (d.hdmiPlugIn) parts.push(t('Connected'));
        if (d.activate) parts.push(t('Active'));
        return {
          icon: 'hdmi',
          label: d.label || port,
          sub: parts.join(' \u00B7 '),
          dim: !d.hdmiPlugIn,
          fn: function () {
            launch(d.appId);
          },
          /* hold OK: pin the input to Home, where it is in the strip */
          hold: function () {
            inputMenu(d.appId, d.label || port);
          },
        };
      });
    openMenu(t('Inputs'), items);
  });
}
function isPinned(id) {
  return apps.some(function (a) {
    return a.id === id && a.input;
  });
}
function inputMenu(id, name) {
  var on = isPinned(id);
  openMenu(name, [
    {
      label: t('Open'),
      fn: function () {
        launch(id);
      },
    },
    {
      label: on ? t('Remove from Home') : t('Add to Home'),
      fn: function () {
        pinInput(id, name, !on);
      },
    },
  ]);
}
/* the service keeps the pinned inputs (also for the Inputs picker) and lists them with the apps */
function pinInput(id, name, on) {
  api('/api/inputs/pin', { id: id, on: on }).then(
    function (x) {
      if (!x || x.returnValue !== true) return toast(t('Could not change Home'));
      toast((on ? t('%s added to Home') : t('%s removed from Home')).replace('%s', name));
      lastSig = '';
      load();
    },
    function () {
      toast(t('Could not change Home'));
    }
  );
}

/* hold OK on an app or input in the strip or in All apps: where it is on Home */
function appMenu(a) {
  var di = dockIds(),
    pos = di.indexOf(a.id),
    items = [
      {
        label: t('Open'),
        fn: function () {
          launch(a.id);
        },
      },
    ];
  function move(d) {
    var n = di.slice();
    n.splice(pos, 1);
    n.splice(pos + d, 0, a.id);
    setDock(n);
  }
  if (pos >= 0) {
    if (pos > 0)
      items.push({
        label: t('Move left'),
        fn: function () {
          move(-1);
        },
      });
    if (pos < di.length - 1)
      items.push({
        label: t('Move right'),
        fn: function () {
          move(1);
        },
      });
  }
  if (a.input)
    items.push({
      label: t('Remove from Home'),
      fn: function () {
        if (pos >= 0)
          setDock(
            di.filter(function (i) {
              return i !== a.id;
            })
          );
        pinInput(a.id, a.title, false);
      },
    });
  else if (pos >= 0)
    items.push({
      label: t('Remove from Home'),
      fn: function () {
        setDock(
          di.filter(function (i) {
            return i !== a.id;
          })
        );
      },
    });
  else if (di.length < HOME_DOCK)
    items.push({
      label: t('Add to Home'),
      fn: function () {
        setDock(di.concat(a.id));
      },
    });
  else
    items.push({
      label: t('Add to Home...'),
      stay: true,
      fn: function () {
        openMenu(
          t('Replace which app?'),
          di.map(function (id, i) {
            return {
              label: title(id),
              fn: function () {
                var d = di.slice();
                d[i] = a.id;
                setDock(d);
              },
            };
          })
        );
      },
    });
  if (!a.input)
    items.push({
      label: t('Hide app'),
      fn: function () {
        hideApp(a.id);
      },
    });
  openMenu(a.title, items);
}
/* ---------- Settings: the one tile at the end of Home's strip. Every app, what Home shows, the language, the clock, the order;
   the rest is in the CleanYourTV app (the manager) ---------- */
var LANGS = [
  ['auto', 'Follow the TV'],
  ['da', 'Dansk'],
  ['en', 'English'],
];
function langName(l) {
  for (var i = 0; i < LANGS.length; i++) if (LANGS[i][0] === (l || 'auto')) return t(LANGS[i][1]);
  return t(LANGS[0][1]);
}
/* "Netflix, YouTube +3" */
function namesOf(list) {
  if (!list.length) return t('None');
  return list.slice(0, 2).join(', ') + (list.length > 2 ? ' +' + (list.length - 2) : '');
}
function settingsItems() {
  var pinned = apps
      .filter(function (a) {
        return a.input;
      })
      .map(function (a) {
        return a.title;
      }),
    hidden = (cfg.hidden || []).filter(function (id) {
      return apps.some(function (a) {
        return a.id === id;
      });
    });
  return [
    { icon: 'grid', label: t('All apps'), stay: true, fn: allAppsMenu },
    { label: t('Apps on Home'), sub: namesOf(dockIds().filter(not(isInput)).map(title)), stay: true, fn: homeAppsMenu },
    { label: t('Inputs on Home'), sub: namesOf(pinned), stay: true, fn: inputsHomeMenu },
    { label: t('Hidden apps'), sub: hidden.length ? String(hidden.length) : t('None'), stay: true, fn: hiddenMenu },
    { label: t('Language'), sub: langName(cfg.language), stay: true, fn: languageMenu },
    {
      label: t('Clock'),
      sub: cfg.clock === '24' ? t('24-hour') : cfg.clock === '12' ? t('12-hour') : t('Automatic'),
      stay: true,
      fn: function () {
        cfg.clock = cfg.clock === '24' ? '12' : cfg.clock === '12' ? 'auto' : '24';
        saveCfg();
        tick();
        redrawSettings();
      },
    },
    {
      label: t('App order'),
      sub: cfg.sort === 'alpha' ? t('A to Z') : t('Most used first'),
      stay: true,
      fn: function () {
        cfg.sort = cfg.sort === 'alpha' ? 'usage' : 'alpha';
        saveCfg();
        redrawSettings();
      },
    },
    {
      label: t('More in the CleanYourTV app'),
      fn: function () {
        launch('com.cleanyourtv.manager');
      },
    },
    { label: t('Reset Home...'), stay: true, fn: resetMenu },
  ];
}
function settingsMenu() {
  openMenu(t('Settings'), settingsItems(), { settings: true });
}
/* the Settings rows again with their new values, wherever Settings is in the stack */
function redrawSettings() {
  for (var i = 0; i < stack.length; i++) if (stack[i].settings) stack[i].items = settingsItems();
  if (stack.length) drawMenu();
}
function not(f) {
  return function (x) {
    return !f(x);
  };
}
function isInput(id) {
  return apps.some(function (a) {
    return a.id === id && a.input;
  });
}
/* every app that is not hidden, as a grid of icons in the chosen order: OK opens one, holding OK gives its options */
function allAppsMenu() {
  openMenu(
    t('All apps'),
    apps
      .filter(function (a) {
        return !a.input && a.id !== '__live' && a.id !== '__vod' && !isHidden(a.id);
      })
      .sort(byOrder)
      .map(function (a) {
        return {
          app: a.id,
          label: a.title,
          fn: function () {
            launch(a.id);
          },
          hold: function () {
            appMenu(a);
          },
        };
      }),
    { grid: true, hint: t('Hold OK on an app for its options') }
  );
}
/* the apps, each on Home or not: OK puts it on Home (while there is room) or takes it off */
function homeAppsMenu() {
  var list = apps
    .filter(function (a) {
      return !a.input && a.id !== '__live' && a.id !== '__vod' && !isHidden(a.id);
    })
    .sort(byOrder);
  function items() {
    var di = dockIds();
    return list.map(function (a) {
      var on = di.indexOf(a.id) >= 0;
      return {
        icon: on ? 'check' : 'none',
        label: a.title,
        sub: on ? t('On Home') : '',
        stay: true,
        fn: function () {
          var d = dockIds();
          if (d.indexOf(a.id) >= 0)
            setDock(
              d.filter(function (i) {
                return i !== a.id;
              })
            );
          else if (d.length < HOME_DOCK) setDock(d.concat(a.id));
          else return toast(t('Home is full: take an app off first'));
          stack[stack.length - 1].items = items();
          redrawSettings();
        },
      };
    });
  }
  openMenu(t('Apps on Home'), items());
}
function languageMenu() {
  openMenu(
    t('Language'),
    LANGS.map(function (l) {
      var on = (cfg.language || 'auto') === l[0];
      return {
        icon: on ? 'check' : 'none',
        label: t(l[1]),
        fn: function () {
          if (on) return;
          /* saved, then the page again in the new language (layout.js would reload it as well) */
          cfg.language = l[0];
          store();
          api('/api/config', cfg).then(
            function () {
              location.reload();
            },
            function () {
              toast(t('Could not save settings'));
            }
          );
        },
      };
    })
  );
}
/* Home's layout back to the start (the strip, hidden apps, order, clock); the language stays */
function resetMenu() {
  openMenu(t('Reset Home?'), [
    {
      label: t('Reset'),
      fn: function () {
        cfg = { language: cfg.language };
        saveCfg();
      },
    },
    { label: t('Cancel'), fn: function () {} },
  ]);
}
/* the HDMI inputs, each on Home (in the strip, after the apps) or not: OK switches it */
function inputsHomeMenu() {
  api('/api/inputs').then(
    function (x) {
      var list = (x.devices || []).filter(function (d) {
        return d.appId;
      });
      if (!list.length) return toast(t('No inputs'));
      openMenu(
        t('Inputs on Home'),
        list.map(function (d) {
          /* the row keeps its own state: the app list is read again only after the service answers */
          var name = d.label || 'HDMI ' + d.port,
            on = isPinned(d.appId),
            it = {
              icon: 'hdmi',
              label: name,
              sub: on ? t('On Home') : '',
              stay: true,
              fn: function () {
                on = !on;
                pinInput(d.appId, name, on);
                it.sub = on ? t('On Home') : '';
                drawMenu();
              },
            };
          return it;
        })
      );
    },
    function () {
      toast(t('Could not read the inputs'));
    }
  );
}
function hiddenMenu() {
  var h = (cfg.hidden || []).filter(function (id) {
    return apps.some(function (a) {
      return a.id === id;
    });
  });
  if (!h.length) return toast(t('No hidden apps'));
  openMenu(
    t('Hidden apps (OK to show again)'),
    h.map(function (id) {
      return {
        label: title(id),
        fn: function () {
          unhideApp(id);
        },
      };
    })
  );
}
