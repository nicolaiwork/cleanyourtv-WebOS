/* ---------- Films & Series (fork): the library of an iptv-curator server, Plex-style: rows of posters, details, search, a player ---------- */
/* The page talks only to the service (helper/vod.js), which passes the curator's JSON through. Details are asked for only when a title is
   opened, never for a whole row; posters come from the curator's own image cache. docs/vod.md */
/* a clapperboard: films and series (a solid mark on a dark tile, like the apps' own icons) */
var VOD_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130"><rect width="130" height="130" fill="#212326"/><g transform="translate(65 68) scale(1.22) translate(-65 -64)"><rect x="30" y="59" width="70" height="42" rx="6" fill="#4d8dff"/><g transform="rotate(-14 30 54)"><rect x="30" y="38" width="70" height="15" rx="3" fill="#4d8dff"/><path d="M47 38 L40 53 M63 38 L56 53 M79 38 L72 53 M95 38 L88 53" stroke="#212326" stroke-width="6.5"/></g><path d="M58 70 V90 L76 80 Z" fill="#212326"/></g></svg>'
  );
var VOD = (function () {
  var o = { on: false, ready: false };
  var CARD = 224 /* poster width and spacing */,
    ROW_H = 400,
    PAGE = 40,
    COLS = 7;
  var base = '',
    lib = null,
    ST = { items: {}, hidden: {}, list: {} },
    tab = 0 /* 0 films, 1 series, LIST my list, FIND search */,
    area = 'rows' /* tabs, rows, details, search, results, player */,
    ti = 0,
    rows = [],
    ri = 0,
    gen = 0;
  /* each tab's rows while the screen is open (kind -> {rows, ri, box}): switching tabs shows them as they were, posters and all */
  var T = {};
  /* the curator's rows for each tab (/vod/home/<kind>.json: Trending now, Popular, genres…), null with an older curator */
  var HOME = {};
  /* titles as the browse screen shows them (genres, overview, backdrop), for the rows the TV makes itself: kind -> id -> card */
  var CARDS = { films: {}, series: {} };
  /* Because you watched: kind -> {name, items} */
  var BEC = {};
  /* poster paths the TV has loaded once: a new card sets them at once, they come from its cache */
  var seen = {};
  var D = null; /* the open details: {kind, card, data, group, bi, si, ei, mi, btns, sim, menu, from, prev} */
  var S = { q: '', results: [], fi: 0, els: [] };
  var KINDS = ['films', 'series'];
  var TABS = ['Films', 'Series', 'My list', 'Search'];
  /* the end of a Continue watching line ("12 min left"), left off on a narrow card */
  var LEFT = new RegExp(' ' + t('%s left').replace('%s', '').trim() + '$');
  var LIST = 2,
    FIND = 3;
  /* the My list tab: films and series together, newest first, as a grid */
  var L = { items: [], fi: 0, els: [] };
  /* kept in the browser between visits and boots: the tab and each tab's sort (the rows open at the top) */
  var MEM = (function () {
    try {
      var m = JSON.parse(localStorage.getItem('vod.mem') || '{}');
      return m && typeof m === 'object' ? m : {};
    } catch (e) {
      return {};
    }
  })();
  function keepMem() {
    try {
      localStorage.setItem('vod.mem', JSON.stringify(MEM));
    } catch (e) {}
  }
  if (MEM.tab === 1 || MEM.tab === LIST) tab = MEM.tab;
  if (!MEM.sort) MEM.sort = {};
  delete MEM.films; /* where the rows were left, kept by older versions */
  delete MEM.series;
  /* the sorts the curator offers for a category (library.json "sorts"), none from an older curator */
  function sortsOffered() {
    return (lib && lib.sorts) || [];
  }
  function sortOf(kind) {
    var s = MEM.sort[kind];
    return s && sortsOffered().indexOf(s) >= 0 ? s : '';
  }

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function isBack(k) {
    return k === 461 || k === 27 || k === 8;
  }
  /* the curator's JSON through the service; rejects on an error answer */
  function vget(path, params) {
    var q = '';
    for (var k in params || {}) q += '&' + k + '=' + encodeURIComponent(params[k]);
    return fetch(API + '/api/vod/get?path=' + encodeURIComponent(path) + q).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error((j && (j.error || j.detail)) || 'HTTP ' + r.status);
        return j;
      });
    });
  }
  function img(p) {
    return !p ? '' : /^https?:/.test(p) ? p : base + p;
  }
  function msg(h) {
    var e = $('vd-msg');
    if (!h) {
      e.classList.remove('on');
      return;
    }
    e.innerHTML = h;
    e.classList.add('on');
  }
  function loadState() {
    return api('/api/vod/state').then(
      function (s) {
        ST = s && s.items ? { items: s.items, hidden: s.hidden || {}, list: s.list || {} } : { items: {}, hidden: {}, list: {} };
      },
      function () {}
    );
  }
  function itemOf(kind, id) {
    return ST.items[(kind === 'films' || kind === 'film' ? 'film:' : 'episode:') + id];
  }

  /* ---------- the tabs ---------- */
  function drawTabs() {
    var h = '';
    for (var i = 0; i < TABS.length; i++)
      h += '<div class="vtab' + (i === tab ? ' on' : '') + (area === 'tabs' && i === ti ? ' f' : '') + '">' + esc(t(TABS[i])) + '</div>';
    if (hasSort())
      h +=
        '<div class="vsort' +
        (area === 'sort' ? ' f' : '') +
        '">' +
        esc(t('Sort:')) +
        ' <b>' +
        esc(VL.sortLabel(sortOf(KINDS[tab]) || 'added', sortsOffered())) +
        '</b></div>';
    $('vd-top').innerHTML = h;
  }
  /* the sort pill (top right, on Films and Series): Up from the first row, OK steps through the curator's sorts */
  function hasSort() {
    return tab < 2 && !HOME[KINDS[tab]] && sortsOffered().length > 1 && !!T[KINDS[tab]];
  }
  function sortKey(k) {
    if (k === 13) {
      var kind = KINDS[tab];
      MEM.sort[kind] = VL.nextSort(sortOf(kind) || 'added', sortsOffered());
      var keep = { row: rows[ri] ? VL.rowKey(rows[ri]) : '', fi: {} };
      keepMem();
      /* the category rows again in the new order; Continue watching, My list and Recently added stay as they are */
      var tb = T[kind];
      tb.box.parentNode.removeChild(tb.box);
      delete T[kind];
      showRows(keep);
      drawTabs();
    } else if (k === 40) {
      if (!rows.length) return;
      area = 'rows';
      drawTabs();
      drawRows();
    } else if (k === 38 || k === 37 || isBack(k)) toTabs();
  }
  function setTab(i) {
    if (tab < 2 && T[KINDS[tab]]) T[KINDS[tab]].ri = ri;
    tab = i;
    ti = i;
    $('vd-search').classList.toggle('on', tab === FIND);
    $('vd-list').classList.toggle('on', tab === LIST);
    $('vd-rows').style.display = tab < 2 ? '' : 'none';
    $('vd').classList.toggle('srch', tab === FIND);
    msg('');
    if (tab === FIND) showInfo(null);
    if (tab < 2) showRows();
    else if (tab === LIST) showList();
    else drawSearch();
    drawTabs();
  }

  /* ---------- rows ---------- */
  /* a row: {title, kind, src: continue|recent|cat, cid, items, total, loading, done, fi, el, strip, label, els} */
  function card(it, kind) {
    var d = document.createElement('div');
    d.className = 'vp';
    d.style.background = 'hsl(' + hashHue(String(it.id)) + ',30%,24%)';
    var tx = document.createElement('div');
    tx.className = 'vt';
    tx.textContent = it.label || it.name || '';
    d.appendChild(tx);
    if (it.poster) {
      var i = new Image(),
        src = img(it.poster);
      i.alt = '';
      i.onload = function () {
        seen[src] = 1;
      };
      i.onerror = function () {
        if (i.parentNode) i.parentNode.removeChild(i);
      };
      if (seen[src]) i.src = src;
      else i._src = src; /* set once the focus rests (see showSoon) */
      d.appendChild(i);
    }
    if (it.sub) {
      d.className += ' hs';
      var sb = document.createElement('div');
      sb.className = 'vsub';
      sb.textContent =
        it.sub.indexOf('·') > 0 ? it.sub.replace(LEFT, '') : it.sub; /* the card is narrow; the details above say it in full */
      d.appendChild(sb);
    }
    var mine = itemOf(kind, it.id),
      prog = it.prog !== undefined ? it.prog : kind === 'films' && mine && mine.pos > 0 && mine.dur > 0 ? mine.pos / mine.dur : -1;
    if (kind === 'films' && mine && mine.watched && it.prog === undefined) {
      var w = document.createElement('div');
      w.className = 'vw';
      w.textContent = '✓';
      d.appendChild(w);
    } else if (prog >= 0) {
      var b = document.createElement('div');
      b.className = 'vbar';
      b.style.width = Math.min(100, Math.round(100 * prog)) + '%';
      d.appendChild(b);
    }
    return d;
  }
  function continueRow(kind) {
    var list = kind === 'films' ? VL.continueFilms(ST.items, ST.hidden) : VL.continueShows(ST.items, Date.now(), ST.hidden);
    var items = list.map(function (x) {
      return { id: x.id, label: x.name, poster: x.poster, sub: VL.continueSub(x), prog: VL.continueProgress(x) };
    });
    return { title: t('Continue watching'), kind: kind, src: 'continue', items: items, total: items.length, done: true };
  }
  function listRow(kind) {
    var items = VL.myList(ST.list, kind === 'films' ? 'film' : 'show').map(function (x) {
      return { id: x.id, label: x.name, poster: x.poster };
    });
    return { title: t('My list'), kind: kind, src: 'mylist', items: items, total: items.length, done: true };
  }
  function becauseRow(kind) {
    var b = BEC[kind];
    return {
      title: b ? t('Because you watched %s').replace('%s', b.name) : '',
      kind: kind,
      src: 'because',
      items: b ? b.items : [],
      total: b ? b.items.length : 0,
      done: true,
    };
  }
  /* the rows made from what the viewer did, on top of a tab: Continue watching, My list and Because you watched, each only when
     it has titles; their titles get the browse screen's details (genres, overview, backdrop) from the curator */
  function personalRows(kind) {
    var out = [continueRow(kind), listRow(kind), becauseRow(kind)].filter(function (rw) {
      return rw.items.length;
    });
    out.forEach(function (rw) {
      rw.items.forEach(function (it) {
        merge(it, CARDS[kind][it.id]);
      });
    });
    return out;
  }
  function isPersonal(rw) {
    return rw.src === 'continue' || rw.src === 'mylist' || rw.src === 'because';
  }
  /* label: the curator's (TMDB's Danish) title over the name saved when the title was played */
  var CARD_KEYS = ['label', 'poster', 'overview', 'genres', 'backdrop', 'rating', 'year', 'runtime'];
  function merge(it, c) {
    if (c) for (var i = 0; i < CARD_KEYS.length; i++) if (c[CARD_KEYS[i]] !== undefined) it[CARD_KEYS[i]] = c[CARD_KEYS[i]];
  }
  /* the details of the personal rows' titles not known yet, in one request per tab */
  function needCards(kind) {
    if (!lib || !lib.cards) return;
    var want = [];
    [continueRow(kind), listRow(kind)].forEach(function (rw) {
      rw.items.forEach(function (it) {
        if (!CARDS[kind][it.id] && want.indexOf(it.id) < 0) want.push(it.id);
      });
    });
    if (!want.length) return;
    want.forEach(function (id) {
      CARDS[kind][id] = { none: true }; /* asked for: not again while the answer is on its way */
    });
    vget('/vod/cards/' + kind + '.json', { ids: want.slice(0, 60).join(',') }).then(
      function (list) {
        want.forEach(function (id) {
          CARDS[kind][id] = CARDS[kind][id] || { none: true };
        });
        list.forEach(function (c) {
          CARDS[kind][c.id] = c;
        });
        if (o.on && tab === LIST) showList();
        var tb = T[kind];
        if (!tb) return;
        tb.rows.forEach(function (rw) {
          if (!isPersonal(rw)) return;
          rw.items.forEach(function (it) {
            merge(it, CARDS[kind][it.id]);
          });
          clearRow(rw); /* drawn again with the cards' posters */
        });
        if (o.on && tab < 2 && KINDS[tab] === kind && (area === 'rows' || area === 'tabs' || area === 'sort')) drawRows();
        else if (o.on && KINDS[tab] === kind) showFocus();
      },
      function () {}
    );
  }
  /* "Because you watched …": the curator's titles like the one played last on this tab */
  function loadBecause(kind) {
    if (!lib || !lib.similar || BEC[kind] !== undefined) return;
    var last = null;
    for (var k in ST.items) {
      var x = ST.items[k];
      if ((kind === 'films' ? x.kind === 'film' : x.kind === 'episode' && x.show) && (!last || x.at > last.at)) last = x;
    }
    if (!last) return;
    BEC[kind] = null;
    var id = kind === 'films' ? last.id : last.show.id,
      name = kind === 'films' ? last.name : last.show.name;
    /* with the title's card, for its name as the rest of the screen shows it (the saved one can be older) */
    Promise.all([
      vget('/vod/' + (kind === 'films' ? 'film/' : 'show/') + id + '/similar.json'),
      lib.cards ? vget('/vod/cards/' + kind + '.json', { ids: String(id) }).catch(function () {}) : null,
    ]).then(
      function (r) {
        var list = r[0],
          c = r[1] && r[1][0];
        if (!list || list.length < 4) return;
        BEC[kind] = { name: (c && c.label) || name, items: list };
        if (T[kind]) {
          if (tab < 2 && KINDS[tab] === kind) T[kind].ri = ri;
          syncPersonal(kind);
          if (o.on && tab < 2 && KINDS[tab] === kind && area !== 'details' && area !== 'player') {
            rows = T[kind].rows;
            ri = T[kind].ri;
            drawRows();
          }
        }
      },
      function () {}
    );
  }
  /* keep: the row to stay on when the rows are made again in a new sort, else the top */
  function showRows(keep) {
    var kind = KINDS[tab];
    if (!T[kind]) buildRows(kind, keep);
    for (var k in T) T[k].box.style.display = k === kind ? '' : 'none';
    rows = T[kind].rows;
    ri = T[kind].ri;
    if (!rows.length) msg('<b>' + esc(t('Nothing here yet')) + '</b>' + esc(t('Tick some categories on the curator page.')));
    else msg('');
    drawRows();
  }
  function buildRows(kind, keep) {
    var list = personalRows(kind);
    if (HOME[kind])
      HOME[kind].forEach(function (r) {
        if (r.path)
          list.push({ title: t(r.title), kind: kind, src: 'cat', cid: String(r.id).replace(/^cat-/, ''), items: [], total: r.count });
        else if (r.items && r.items.length)
          list.push({ title: t(r.title), kind: kind, src: 'home', cid: r.id, items: r.items, total: r.items.length, done: true });
      });
    else {
      list.push({ title: t('Recently added'), kind: kind, src: 'recent', items: [], total: -1 });
      ((lib && lib[kind]) || []).forEach(function (c) {
        if (c.count > 0) list.push({ title: c.name, kind: kind, src: 'cat', cid: c.id, items: [], total: c.count, sort: sortOf(kind) });
      });
    }
    needCards(kind);
    loadBecause(kind);
    var tb = (T[kind] = { rows: list, ri: 0, box: document.createElement('div') });
    tb.box.className = 'vbox';
    tb.rows.forEach(function (rw) {
      tb.box.appendChild(rowEl(rw));
    });
    /* the same row after a new sort (a row loads far enough to reach its title, at most 12 pages) */
    tb.ri = VL.recall(keep, tb.rows);
    tb.rows.forEach(function (rw) {
      rw.want = Math.min(rw.want || 0, PAGE * 12);
    });
    $('vd-rows').appendChild(tb.box);
  }
  /* a row still on one of the tabs (an answer can come after the screen was left) */
  function alive(rw) {
    var tb = T[rw.kind];
    return !!tb && tb.rows.indexOf(rw) >= 0;
  }
  function rowEl(rw) {
    rw.fi = rw.fi || 0;
    rw.els = {};
    rw.el = document.createElement('div');
    rw.el.className = 'vrow';
    rw.el.innerHTML = '<h2>' + esc(rw.title) + '</h2><div class="vstrip"></div><div class="vlabel"></div>';
    rw.strip = rw.el.childNodes[1];
    rw.label = rw.el.childNodes[2];
    return rw.el;
  }
  /* the cards of a row that is off screen: gone, so the always-loaded launcher doesn't keep their pictures */
  function clearRow(rw) {
    for (var k in rw.els) rw.strip.removeChild(rw.els[k]);
    rw.els = {};
    rw.el.classList.remove('f');
  }
  function fill(rw) {
    if (rw.loading || rw.done) return;
    rw.loading = true;
    var p =
      rw.src === 'recent'
        ? vget('/vod/' + rw.kind + '/recent.json')
        : vget(
            '/vod/' + rw.kind + '/' + rw.cid + '.json',
            rw.sort ? { offset: rw.items.length, limit: PAGE, sort: rw.sort } : { offset: rw.items.length, limit: PAGE }
          );
    p.then(
      function (list) {
        rw.loading = false;
        if (!alive(rw)) return; /* the screen was left meanwhile; switching tabs or opening a title doesn't drop the answer */
        rw.items = rw.items.concat(list);
        if (rw.src === 'recent' || list.length < PAGE || (rw.total > 0 && rw.items.length >= rw.total)) rw.done = true;
        if (!rw.items.length) rw.strip.innerHTML = '<div class="vempty">' + esc(t('Nothing here.')) + '</div>';
        if (rw.want) {
          if (rw.want >= rw.items.length && !rw.done) return fill(rw); /* the next page, towards where the row was left */
          rw.fi = Math.min(rw.want, rw.items.length - 1);
          rw.want = 0;
        }
        drawRow(rw);
      },
      function (e) {
        rw.loading = false;
        if (!alive(rw)) return;
        rw.done = true;
        rw.strip.innerHTML = '<div class="vempty">' + esc(t('Could not load this row: %s').replace('%s', e.message)) + '</div>';
      }
    );
  }
  function drawRow(rw) {
    var n = rw.items.length,
      w = VL.windowOf(rw.fi, n, 12, 16),
      focused = area === 'rows' && rows[ri] === rw;
    for (var k in rw.els) {
      var i = +k;
      if (i < w[0] || i >= w[1]) {
        rw.strip.removeChild(rw.els[k]);
        delete rw.els[k];
      }
    }
    for (var j = w[0]; j < w[1]; j++)
      if (!rw.els[j]) {
        var e = card(rw.items[j], rw.kind);
        e.style.left = j * CARD + 'px';
        rw.strip.appendChild(e);
        rw.els[j] = e;
      }
    for (var f in rw.els) rw.els[f].classList.toggle('f', focused && +f === rw.fi);
    rw.strip.style.transform = 'translateX(' + -Math.max(0, rw.fi - 2) * CARD + 'px)';
    showSoon();
    var it = rw.items[rw.fi];
    rw.label.textContent = it ? (it.label || it.name) + (it.year ? '  ·  ' + it.year : '') : '';
    rw.el.classList.toggle('f', focused);
    if (tab < 2 && rows[ri] === rw && (area === 'rows' || area === 'tabs' || area === 'sort')) showInfo(it, rw);
    if (!rw.done && n - rw.fi <= 10) fill(rw);
  }
  /* Posters load once the focus rests, for what is on screen and the next screenful (right, and the row below), so a step never shows
     an empty card: the curator has them on disk (it fetches the ticked titles' posters ahead), and holding Right through a long row
     doesn't ask for every poster it passes. */
  var imgT = 0;
  function show(el) {
    var i = el && el.querySelector('img');
    if (i && i._src && !i.src) i.src = i._src;
  }
  function showSoon() {
    clearTimeout(imgT);
    imgT = setTimeout(function () {
      if (tab === FIND) {
        var r0 = Math.max(0, Math.floor(S.fi / COLS) - 1);
        for (var i = r0 * COLS; i < Math.min(S.els.length, (r0 + 5) * COLS); i++) show(S.els[i]);
        return;
      }
      if (tab === LIST) {
        var l0 = Math.floor(L.fi / COLS) * COLS;
        for (var n = l0; n < Math.min(L.els.length, l0 + 3 * COLS); n++) show(L.els[n]);
        return;
      }
      for (var r = Math.max(0, ri - 1); r < Math.min(rows.length, ri + 3); r++) {
        var rw = rows[r],
          off = Math.max(0, rw.fi - 2);
        for (var j = off; j < off + 18; j++) show(rw.els[j]);
      }
    }, 150);
  }
  function drawRows() {
    T[KINDS[tab]].box.style.transform = 'translateY(' + -ri * ROW_H + 'px)';
    if (!rows.length) showInfo(null);
    for (var i = 0; i < rows.length; i++) {
      var rw = rows[i];
      rw.el.style.opacity = i < ri ? 0 : 1; /* the rows above the focus would sit under the title's details */
      if (Math.abs(i - ri) <= 2) {
        if (!rw.items.length && !rw.done) fill(rw);
        else drawRow(rw);
      } else clearRow(rw);
    }
  }
  function rowsKey(k) {
    var rw = rows[ri];
    if (!rw) {
      if (k === 38 || isBack(k)) toTabs();
      return;
    }
    if (k === 37 && rw.fi > 0) {
      rw.fi--;
      drawRow(rw);
    } else if (k === 39 && rw.fi < rw.items.length - 1) {
      rw.fi++;
      drawRow(rw);
    } else if (k === 38) {
      if (ri > 0) {
        ri--;
        drawRows();
      } else if (hasSort()) {
        area = 'sort';
        drawTabs();
        drawRow(rw);
      } else toTabs();
    } else if (k === 40 && ri < rows.length - 1) {
      ri++;
      drawRows();
    } else if (k === 13 && rw.items[rw.fi]) openDetails(rw.kind, rw.items[rw.fi], 'rows');
    else if (isBack(k)) toTabs();
  }
  function toTabs() {
    area = 'tabs';
    ti = tab;
    drawTabs();
    if (tab < 2 && rows[ri]) drawRow(rows[ri]);
    if (tab === LIST) drawList();
    if (tab === FIND) drawSearch();
  }
  function tabsKey(k) {
    if (k === 37 && ti > 0) {
      ti--;
      setTab(ti);
    } else if (k === 39 && ti < TABS.length - 1) {
      ti++;
      setTab(ti);
    } else if (k === 40 || k === 13) {
      if (tab === LIST) {
        if (!L.items.length) return;
        area = 'list';
        drawTabs();
        drawList();
        return;
      }
      if (tab === FIND) {
        area = 'search';
        drawTabs();
        drawSearch();
        $('vd-q').focus();
        return;
      }
      if (!rows.length) return;
      area = 'rows';
      drawTabs();
      drawRows();
    } else if (isBack(k)) o.exit();
  }

  /* ---------- the focused title's details over its backdrop, above the rows ---------- */
  var heroT = 0,
    heroSrc = '',
    infoKey = '';
  function showFocus() {
    if (tab === LIST) return drawList();
    var rw = tab < 2 ? rows[ri] : null;
    showInfo(rw ? rw.items[rw.fi] : null, rw);
  }
  function metaOf(it, kind) {
    var a = [];
    if (it.year) a.push(esc(it.year));
    if (it.rating) a.push('<b>★ ' + esc(it.rating) + '</b>');
    if (it.runtime && kind === 'films') a.push(VL.fmtLength(it.runtime * 60));
    if (it.genres && it.genres.length) a.push(esc(it.genres.map(t).join(', ')));
    return a.join('  ·  ');
  }
  /* new elements rather than new text in old ones: webOS 5's compositor can keep showing the old text */
  function showInfo(it, rw) {
    var key = it ? (rw ? rw.kind : '') + ':' + it.id + ':' + (it.overview ? 1 : 0) + ':' + (it.sub || '') : '';
    if (key === infoKey) return;
    infoKey = key;
    var box = $('vd-info'),
      el = document.createElement('div');
    if (it)
      el.innerHTML =
        '<h1>' +
        esc(it.label || it.name) +
        '</h1><div class="im">' +
        metaOf(it, rw && rw.kind) +
        '</div>' +
        (it.sub ? '<div class="is">' + esc(it.sub) + '</div>' : '') +
        (it.overview ? '<div class="io">' + esc(it.overview) + '</div>' : '');
    box.textContent = '';
    box.appendChild(el);
    hero(it && it.backdrop ? img(it.backdrop) : '');
  }
  /* the backdrop changes once the focus rests, fading over the last one */
  function hero(src) {
    clearTimeout(heroT);
    if (src === heroSrc) return;
    heroT = setTimeout(function () {
      heroSrc = src;
      var a = $('vd-hb0'),
        b = $('vd-hb1'),
        on = a.classList.contains('on') ? a : b,
        off = on === a ? b : a;
      if (!src) {
        on.classList.remove('on');
        return;
      }
      off.onload = function () {
        if (heroSrc !== src) return;
        off.classList.add('on');
        on.classList.remove('on');
      };
      off.onerror = function () {
        if (heroSrc === src) on.classList.remove('on');
      };
      off.src = src;
    }, 320);
  }
  function clearHero() {
    clearTimeout(heroT);
    heroSrc = '';
    infoKey = '';
    $('vd-info').textContent = '';
    ['vd-hb0', 'vd-hb1'].forEach(function (id) {
      $(id).classList.remove('on');
      $(id).removeAttribute('src');
    });
  }

  /* ---------- My list: a grid of what was added with + My list, films and series together ---------- */
  function listItems() {
    var out = [];
    ['films', 'series'].forEach(function (kind) {
      VL.myList(ST.list, kind === 'films' ? 'film' : 'show').forEach(function (x) {
        var it = { kind: kind, id: x.id, label: x.name, poster: x.poster, at: x.at };
        merge(it, CARDS[kind][x.id]);
        out.push(it);
      });
    });
    return out.sort(function (a, b) {
      return b.at - a.at;
    });
  }
  /* (re)built from the list: on the tab, after a title's page (it may have left the list), when cards come */
  function showList() {
    needCards('films');
    needCards('series');
    var cur = L.items[L.fi];
    L.items = listItems();
    L.fi = 0;
    for (var i = 0; cur && i < L.items.length; i++) if (L.items[i].kind === cur.kind && L.items[i].id === cur.id) L.fi = i;
    L.els = [];
    var grid = $('vd-lgrid');
    grid.textContent = '';
    L.items.forEach(function (it, n) {
      var e = card(it, it.kind);
      e.style.left = (n % COLS) * CARD + 'px';
      e.style.top = Math.floor(n / COLS) * 340 + 'px';
      grid.appendChild(e);
      L.els.push(e);
    });
    if (!L.items.length) {
      if (area === 'list') area = 'tabs';
      msg('<b>' + esc(t('My list is empty')) + '</b>' + esc(t('Add films and series with + My list on their page.')));
      showInfo(null);
      drawTabs();
    } else msg('');
    drawList();
  }
  function drawList() {
    for (var i = 0; i < L.els.length; i++) L.els[i].classList.toggle('f', area === 'list' && i === L.fi);
    $('vd-lgrid').style.transform = 'translateY(' + -Math.floor(L.fi / COLS) * 340 + 'px)';
    var it = L.items[L.fi];
    if (it) showInfo(it, { kind: it.kind });
    showSoon();
  }
  function gridKey(k) {
    var n = L.items.length;
    if (k === 37 && L.fi % COLS > 0) L.fi--;
    else if (k === 39 && L.fi % COLS < COLS - 1 && L.fi < n - 1) L.fi++;
    else if (k === 40 && Math.floor(L.fi / COLS) < Math.floor((n - 1) / COLS)) L.fi = Math.min(n - 1, L.fi + COLS);
    else if (k === 38) {
      if (L.fi >= COLS) L.fi -= COLS;
      else return toTabs();
    } else if (k === 13 && L.items[L.fi]) return openDetails(L.items[L.fi].kind, L.items[L.fi], 'list');
    else if (isBack(k)) return toTabs();
    drawList();
  }

  /* ---------- search ---------- */
  function drawSearch() {
    var q = $('vd-q');
    q.classList.toggle('f', area === 'search');
    var grid = $('vd-grid');
    if (!S.els.length && S.results.length) {
      grid.textContent = '';
      S.results.forEach(function (it, i) {
        var e = card(it, it.kind);
        e.style.left = (i % COLS) * CARD + 'px';
        e.style.top = Math.floor(i / COLS) * 340 + 'px';
        grid.appendChild(e);
        S.els.push(e);
      });
    }
    for (var i = 0; i < S.els.length; i++) S.els[i].classList.toggle('f', area === 'results' && i === S.fi);
    grid.style.transform = 'translateY(' + -Math.max(0, Math.floor(S.fi / COLS) - 1) * 340 + 'px)';
    showSoon();
  }
  function runSearch() {
    var q = $('vd-q').value.trim();
    $('vd-q').blur();
    S = { q: q, results: [], fi: 0, els: [] };
    $('vd-grid').textContent = '';
    if (q.length < 2) {
      area = 'search';
      drawSearch();
      return;
    }
    msg(esc(t('Searching…')));
    vget('/vod/search.json', { q: q }).then(
      function (list) {
        msg(list.length ? '' : '<b>' + esc(t('No titles found')) + '</b>' + esc(q));
        S.results = list;
        area = list.length ? 'results' : 'search';
        drawSearch();
      },
      function (e) {
        msg('<b>' + esc(t('Search failed')) + '</b>' + esc(e.message));
      }
    );
  }
  function searchKey(e) {
    var k = e.keyCode;
    /* the input has the keys (the TV's keyboard types into it); only Enter, Back and Down are ours */
    if (k === 13) {
      e.preventDefault();
      if (document.activeElement !== $('vd-q')) $('vd-q').focus(); /* the keyboard again */
      else runSearch();
    } else if (k === 461 || k === 27) {
      e.preventDefault();
      $('vd-q').blur();
      if ($('vd-q').value) {
        $('vd-q').value = '';
        S = { q: '', results: [], fi: 0, els: [] };
        $('vd-grid').textContent = '';
        msg('');
      }
      toTabs();
    } else if (k === 40 && S.results.length) {
      e.preventDefault();
      $('vd-q').blur();
      area = 'results';
      drawSearch();
    } else if (k === 38) {
      e.preventDefault();
      $('vd-q').blur();
      toTabs();
    }
  }
  function resultsKey(k) {
    var n = S.results.length;
    if (k === 37 && S.fi % COLS > 0) S.fi--;
    else if (k === 39 && S.fi % COLS < COLS - 1 && S.fi < n - 1) S.fi++;
    else if (k === 40 && S.fi + COLS < n) S.fi += COLS;
    else if (k === 38) {
      if (S.fi >= COLS) S.fi -= COLS;
      else {
        area = 'search';
        drawSearch();
        $('vd-q').focus();
        return;
      }
    } else if (k === 13 && S.results[S.fi]) {
      var it = S.results[S.fi];
      openDetails(it.kind, it, 'results');
      return;
    } else if (isBack(k)) {
      area = 'search';
      drawSearch();
      $('vd-q').focus();
      return;
    }
    drawSearch();
  }

  /* ---------- details ---------- */
  function facts(d) {
    var a = [];
    if (d.year) a.push(esc(d.year));
    if (d.genres && d.genres.length) a.push(esc(d.genres.slice(0, 3).map(t).join(', ')));
    else if (d.genre)
      a.push(
        esc(
          d.genre
            .split(/\s*,\s*/)
            .map(t)
            .join(', ')
        )
      );
    if (d.duration_secs) a.push(VL.fmtLength(d.duration_secs));
    if (d.seasons && d.seasons.length) a.push(esc(t(d.seasons.length === 1 ? '%s season' : '%s seasons').replace('%s', d.seasons.length)));
    if (d.rating) a.push('<b>★ ' + esc(d.rating) + '</b>');
    return a.join('  ·  ');
  }
  function openDetails(kind, c, from) {
    var g = ++gen,
      prev = from === 'details' ? D : null;
    if (prev) {
      prev.menu = null;
      /* at most four titles deep: the oldest is let go */
      for (var n = 1, p = prev; p.prev; p = p.prev, n++) if (n >= 3) p.prev = null;
    }
    D = {
      kind: kind,
      card: c,
      data: null,
      group: 'btn',
      bi: 0,
      si: 0,
      ei: 0,
      mi: 0,
      btns: [],
      sim: [],
      from: prev ? prev.from : from,
      prev: prev,
      auto: !prev && autoNext /* Home's Play: press the first button once the details are there */,
    };
    autoNext = false;
    $('vd-dmain').style.transform = '';
    area = 'details';
    var det = $('vd-det');
    det.classList.add('on');
    $('vd-bd').removeAttribute('src');
    $('vd-bd').style.display = 'none';
    setHtml(
      $('vd-dmain'),
      '<div class="dposter">' +
        (c.poster ? '<img src="' + esc(img(c.poster)) + '" alt="">' : '') +
        '</div><div class="dmeta"><h1>' +
        esc(c.label || c.name) +
        '</h1><div class="facts">' +
        esc(t('Loading…')) +
        '</div></div>'
    );
    loadSimilar(g); /* at the same time as the details, not after them */
    vget(kind === 'films' ? '/vod/film/' + c.id + '.json' : '/vod/show/' + c.id + '.json').then(
      function (d) {
        if (g !== gen || !D) return;
        D.data = d;
        if (d.backdrop) {
          $('vd-bd').src = img(d.backdrop);
          $('vd-bd').style.display = '';
        }
        toNext();
        drawDetails();
        if (D.auto) {
          D.auto = false;
          var b = D.btns[0];
          if (b && b.play) playFrom(b.play);
        }
      },
      function (e) {
        if (g !== gen || !D) return;
        setHtml(
          $('vd-dmain'),
          '<div class="dmeta"><h1>' +
            esc(c.label || c.name) +
            '</h1><div class="facts">' +
            esc(t('Could not load the details: %s').replace('%s', e.message)) +
            '</div></div>'
        );
      }
    );
  }
  /* the poster saved with a title (My list, Continue watching): the card's, which is TMDB's where the curator has one; the
     details' is the provider's, whose image host often fails */
  function posterOf(d) {
    return (D && D.card && D.card.poster) || d.poster || '';
  }
  /* the season and episode the list opens at: the one Continue plays */
  function toNext() {
    var d = D.data,
      nx = D.kind === 'series' && d.seasons ? VL.nextEpisode(d.seasons, ST.items) : null;
    if (nx)
      for (var i = 0; i < d.seasons.length; i++)
        if (d.seasons[i].season === nx.season) {
          D.si = i;
          D.ei = Math.max(0, d.seasons[i].episodes.indexOf(nx.ep));
        }
  }
  function buttons() {
    var d = D.data,
      out = [];
    if (D.kind === 'films') {
      var at = VL.resumeAt(itemOf('films', d.id));
      if (at) {
        out.push({ label: '▶  ' + t('Resume from %s').replace('%s', VL.clock(at)), play: { at: at } });
        out.push({ label: t('From the start'), play: { at: 0 } });
      } else out.push({ label: '▶  ' + t('Play'), play: { at: 0 } });
    } else {
      var nx = VL.nextEpisode(d.seasons, ST.items);
      if (nx) {
        var started = !!itemOf('series', nx.ep.id) || nx.resume > 0 || anyPlayed(d);
        out.push({
          label: nx.again
            ? '▶  ' + t('Watch again from %s').replace('%s', VL.epCode(nx.season, nx.ep.num))
            : '▶  ' +
              t(started ? 'Continue %s' : 'Play %s').replace('%s', VL.epCode(nx.season, nx.ep.num)) +
              (nx.resume ? '  ·  ' + VL.clock(nx.resume) : ''),
          play: { ep: nx.ep, season: nx.season, at: nx.resume },
        });
      }
    }
    var mine = !!ST.list[listKey()];
    out.push({ label: (mine ? '✓  ' : '+  ') + t('My list'), small: true, run: toggleList });
    if (d.trailer && /^[\w-]{6,20}$/.test(d.trailer))
      out.push({
        label: t('Trailer'),
        small: true,
        run: function () {
          openTrailer(d.trailer);
        },
      });
    out.push({ label: t('More'), small: true, run: openMenu });
    return out;
  }
  /* ---------- what can be done to a title by hand: My list, watched or not, off Continue watching ---------- */
  function listKey() {
    return (D.kind === 'films' ? 'film:' : 'show:') + D.data.id;
  }
  function changed() {
    return loadState().then(function () {
      if (D && D.data) drawDetails();
    });
  }
  function toggleList() {
    var d = D.data;
    api('/api/vod/state', {
      op: 'list',
      kind: D.kind === 'films' ? 'film' : 'show',
      id: d.id,
      on: !ST.list[listKey()],
      name: String(d.label || d.name || '').slice(0, 200),
      poster: posterOf(d),
    }).then(changed, changed);
  }
  /* an episode's name; one without a name of its own is "Episode 3" from the curator, said in the TV's language */
  function epName(ep) {
    var l = String(ep.label || ep.title || '');
    return /^Episode( \d+)?$/.test(l) ? t('Episode') + l.slice(7) : l;
  }
  /* an episode as the service keeps it, with the one after it (null after the show's last) */
  function epItem(d, season, ep) {
    return {
      kind: 'episode',
      id: ep.id,
      name: epName(ep).slice(0, 200),
      poster: posterOf(d),
      show: { id: d.id, name: String(d.label || d.name || '').slice(0, 200), poster: posterOf(d) },
      season: season,
      num: ep.num || 0,
      next: VL.nextOf(d.seasons, ep.id),
    };
  }
  function mark(items, on) {
    return api('/api/vod/state', { op: 'mark', on: on, items: items }).then(changed, changed);
  }
  function seasonItems(si) {
    var s = D.data.seasons[si];
    return s.episodes.map(function (ep) {
      return epItem(D.data, s.season, ep);
    });
  }
  function allWatched(items) {
    for (var i = 0; i < items.length; i++) {
      var it = ST.items['episode:' + items[i].id];
      if (!it || !it.watched) return false;
    }
    return items.length > 0;
  }
  function inContinue() {
    var list = D.kind === 'films' ? VL.continueFilms(ST.items, ST.hidden) : VL.continueShows(ST.items, Date.now(), ST.hidden);
    for (var i = 0; i < list.length; i++) if (list[i].id === D.data.id) return true;
    return false;
  }
  function menuOf() {
    var d = D.data,
      out = [];
    if (D.kind === 'films') {
      var it = itemOf('films', d.id),
        film = { kind: 'film', id: d.id, name: String(d.label || d.name || '').slice(0, 200), poster: posterOf(d) };
      out.push(
        it && it.watched
          ? {
              label: t('Mark as unwatched'),
              run: function () {
                mark([film], false);
              },
            }
          : {
              label: t('Mark as watched'),
              run: function () {
                mark([film], true);
              },
            }
      );
    } else if (d.seasons && d.seasons.length) {
      var si = D.si,
        sItems = seasonItems(si),
        all = [];
      d.seasons.forEach(function (x, i) {
        all = all.concat(seasonItems(i));
      });
      var sn = d.seasons[si].season;
      out.push(
        allWatched(sItems)
          ? {
              label: t('Mark season %s as unwatched').replace('%s', sn),
              run: function () {
                mark(sItems, false);
              },
            }
          : {
              label: t('Mark season %s as watched').replace('%s', sn),
              run: function () {
                mark(sItems, true);
              },
            }
      );
      if (d.seasons.length > 1)
        out.push(
          allWatched(all)
            ? {
                label: t('Mark every season as unwatched'),
                run: function () {
                  mark(all, false);
                },
              }
            : {
                label: t('Mark every season as watched'),
                run: function () {
                  mark(all, true);
                },
              }
        );
    }
    if (inContinue())
      out.push({
        label: t('Remove from Continue watching'),
        run: function () {
          api('/api/vod/state', { op: 'hide', kind: D.kind === 'films' ? 'film' : 'show', id: d.id }).then(changed, changed);
        },
      });
    out.push({ label: t('Close'), run: function () {} });
    return out;
  }
  function openMenu() {
    D.menu = { i: 0, items: menuOf() };
    drawDetails();
  }
  function dmenuKey(k) {
    var m = D.menu;
    if (k === 38 && m.i > 0) m.i--;
    else if (k === 40 && m.i < m.items.length - 1) m.i++;
    else if (k === 13) {
      D.menu = null;
      m.items[m.i].run();
    } else if (isBack(k) || k === 37) D.menu = null;
    drawDetails();
  }
  /* an episode's own watched mark: Right from the episode, OK sets or clears it */
  function toggleEp() {
    var s = D.data.seasons[D.si],
      ep = s.episodes[D.ei],
      it = itemOf('series', ep.id);
    mark([epItem(D.data, s.season, ep)], !(it && it.watched));
  }
  /* ---------- trailers: YouTube's player over the title's page (the service's /api/vod/trailer page), so Back comes back here.
     YouTube's own app would go to its home screen on Back. A video YouTube won't play outside its site opens in its app. ---------- */
  var TR = null; /* {frame, key, playing, failT, hintT} */
  var TRAILER = 'http://127.0.0.1:8795/trailer?v='; /* the service's trailer page, on a port of its own (helper/vod.js) */
  function openTrailer(key) {
    closeTrailer();
    var f = document.createElement('iframe');
    f.setAttribute('allow', 'autoplay; encrypted-media');
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin'); /* no navigating the launcher, no pop-ups */
    f.setAttribute('scrolling', 'no');
    f.setAttribute('tabindex', '-1');
    TR = { frame: f, key: key, playing: false };
    f.onload = keepKeys;
    f.src = TRAILER + encodeURIComponent(key);
    $('vd-tframe').appendChild(f);
    area = 'trailer';
    $('vd-trailer').classList.add('on');
    $('vd-tspin').classList.add('on');
    trHint(t('OK pauses  ·  Left / Right skips  ·  Back returns to the title'));
    /* nothing playing after 15 s (YouTube unreachable): its app instead */
    TR.failT = setTimeout(function () {
      if (TR && !TR.playing) trailerApp();
    }, 15000);
  }
  function closeTrailer() {
    if (!TR) return;
    clearTimeout(TR.failT);
    clearTimeout(TR.hintT);
    try {
      TR.frame.src = 'about:blank'; /* stops the video and lets go of the connection */
    } catch (e) {}
    if (TR.frame.parentNode) TR.frame.parentNode.removeChild(TR.frame);
    TR = null;
    $('vd-trailer').classList.remove('on');
    $('vd-tspin').classList.remove('on');
    $('vd-thint').classList.remove('on');
  }
  function backFromTrailer() {
    closeTrailer();
    if (!o.on) return;
    area = 'details';
    if (D && D.data) drawDetails();
  }
  function trailerApp() {
    var key = TR && TR.key;
    backFromTrailer();
    if (key) launch('youtube.leanback.v4', { contentTarget: 'https://www.youtube.com/tv?v=' + key });
  }
  function trHint(text) {
    if (!TR) return;
    $('vd-thint').textContent = text;
    $('vd-thint').classList.add('on');
    clearTimeout(TR.hintT);
    TR.hintT = setTimeout(function () {
      $('vd-thint').classList.remove('on');
    }, 4000);
  }
  /* the remote's keys must stay with the screen, not go to YouTube's frame */
  function keepKeys() {
    if (TR && document.activeElement === TR.frame) TR.frame.blur();
  }
  function trSend(c) {
    if (TR && TR.frame.contentWindow) TR.frame.contentWindow.postMessage(JSON.stringify(c), '*');
  }
  window.addEventListener('message', function (e) {
    if (!TR || e.source !== TR.frame.contentWindow) return;
    var m;
    try {
      m = JSON.parse(e.data);
    } catch (x) {
      return;
    }
    if (m.t === 'state' && m.s === 1) {
      TR.playing = true;
      $('vd-tspin').classList.remove('on');
      keepKeys();
    } else if (m.t === 'state' && m.s === 0) backFromTrailer(); /* the end */
    else if (m.t === 'error') trailerApp(); /* not allowed outside YouTube, or gone */
  });
  window.addEventListener('blur', function () {
    if (TR) setTimeout(keepKeys, 0);
  });
  function trailerKey(k) {
    if (isBack(k)) return backFromTrailer();
    if (k === 13) {
      trSend({ c: 'toggle' });
      trHint(t('OK plays / pauses  ·  Back returns to the title'));
    } else if (k === 37 || k === 39) trSend({ c: 'seek', d: k === 37 ? -10 : 10 });
  }

  /* ---------- More like this: titles the curator finds close to this one (its cached lists only; never the provider) ---------- */
  function loadSimilar(g) {
    if (!lib || !lib.similar) return;
    vget('/vod/' + (D.kind === 'films' ? 'film/' : 'show/') + D.card.id + '/similar.json').then(
      function (list) {
        if (g !== gen || !D || !list || !list.length) return;
        D.sim = list.slice(0, 20);
        drawDetails(); /* nothing until the details are there; they draw it then */
      },
      function () {}
    );
  }
  function anyPlayed(d) {
    for (var i = 0; i < d.seasons.length; i++)
      for (var j = 0; j < d.seasons[i].episodes.length; j++) if (itemOf('series', d.seasons[i].episodes[j].id)) return true;
    return false;
  }
  function drawDetails() {
    var d = D.data,
      c = D.card;
    if (!d) return;
    D.btns = buttons();
    var h =
      '<div class="dposter">' +
      (c.poster || d.poster ? '<img src="' + esc(img(c.poster || d.poster)) + '" alt="">' : '') /* the card's, already loaded */ +
      '</div><div class="dmeta"><h1>' +
      esc(d.label || d.name) +
      '</h1>' +
      (d.tagline ? '<div class="tagline">' + esc(d.tagline) + '</div>' : '') +
      '<div class="facts">' +
      facts(d) +
      '</div>' +
      (d.plot ? '<div class="plot">' + esc(d.plot) + '</div>' : '') +
      '<div class="credits">' +
      esc([d.director, d.cast].filter(Boolean).join('  ·  ')) +
      '</div><div class="vbtns">';
    D.btns.forEach(function (b, i) {
      h += '<div class="vbtn' + (b.small ? ' sm' : '') + (D.group === 'btn' && i === D.bi ? ' f' : '') + '">' + esc(b.label) + '</div>';
    });
    h += '</div>';
    if (D.kind === 'series' && d.seasons && d.seasons.length) {
      h += '<div class="vseasons">';
      d.seasons.forEach(function (s, i) {
        h +=
          '<div class="vseason' +
          (i === D.si ? ' on' : '') +
          (D.group === 'season' && i === D.si ? ' f' : '') +
          '">' +
          esc(t('Season %s').replace('%s', s.season)) +
          '</div>';
      });
      h += '</div><div class="veps">';
      var eps = d.seasons[D.si].episodes,
        w = VL.windowOf(D.ei, eps.length, 2, D.sim.length ? 3 : 4);
      for (var i = w[0]; i < w[1]; i++) {
        var ep = eps[i],
          mine = itemOf('series', ep.id),
          right = '';
        if (mine && mine.watched) right = '<div class="r">✓</div>';
        else if (mine && mine.pos > 0 && mine.dur > 0)
          right = '<div class="pb"><i style="width:' + Math.min(100, Math.round((100 * mine.pos) / mine.dur)) + '%"></i></div>';
        else if (ep.duration_secs) right = '<div class="r">' + VL.fmtLength(ep.duration_secs) + '</div>';
        /* the focused episode's watched mark, reached with Right */
        if ((D.group === 'ep' || D.group === 'eptog') && i === D.ei)
          right +=
            '<div class="vtog' +
            (D.group === 'eptog' ? ' f' : '') +
            '">' +
            esc(t(mine && mine.watched ? 'Mark unwatched' : 'Mark watched')) +
            '</div>';
        h +=
          '<div class="vep' +
          ((D.group === 'ep' || D.group === 'eptog') && i === D.ei ? ' f' : '') +
          (D.group === 'eptog' && i === D.ei ? ' t' : '') +
          '"><div class="n">' +
          esc(ep.num || i + 1) +
          '</div><div class="l">' +
          esc(epName(ep)) +
          '</div>' +
          right +
          '</div>';
      }
      h += '</div>';
    }
    if (D.sim.length) {
      var sw = VL.windowOf(D.mi, D.sim.length, 2, 7);
      h +=
        '<div class="vsim' +
        (D.group === 'sim' ? ' on' : '') +
        '"><h2>' +
        esc(t('More like this')) +
        '</h2><div class="vsstrip" style="transform:translateX(' +
        -Math.max(0, D.mi - 2) * CARD +
        'px)">';
      for (var m = sw[0]; m < sw[1]; m++) {
        var it = D.sim[m];
        h +=
          '<div class="vp' +
          (D.group === 'sim' && m === D.mi ? ' f' : '') +
          '" style="left:' +
          m * CARD +
          'px;background:hsl(' +
          hashHue(String(it.id)) +
          ',30%,24%)"><div class="vt">' +
          esc(it.label || it.name) +
          '</div>' +
          (it.poster ? '<img src="' + esc(img(it.poster)) + '" alt="" onerror="this.parentNode.removeChild(this)">' : '') +
          '</div>';
      }
      h +=
        '</div><div class="vlabel">' +
        (D.group === 'sim' && D.sim[D.mi] ? esc(D.sim[D.mi].label || D.sim[D.mi].name) : '') +
        '</div></div>';
    }
    if (D.menu) {
      h += '<div class="vdmenu">';
      D.menu.items.forEach(function (it, i) {
        h += '<div class="mrow' + (i === D.menu.i ? ' f' : '') + '"><div class="ml">' + esc(it.label) + '</div></div>';
      });
      h += '</div>';
    }
    var main = $('vd-dmain');
    setHtml(main, h + '</div>');
    /* More like this sits below the episodes: the page moves up while it has the focus */
    var row = D.group === 'sim' && main.querySelector('.vsim');
    main.style.transform = row ? 'translateY(' + -Math.max(0, row.offsetTop + 470 - 1040 + 110) + 'px)' : '';
  }
  function closeDetails() {
    gen++;
    D = null;
    $('vd-det').classList.remove('on');
    $('vd-bd').removeAttribute('src');
    $('vd-dmain').style.transform = '';
  }
  function backFromDetails() {
    var from = D ? D.from : fromHome ? 'home' : 'rows'; /* no D yet: a title from Home still loading */
    if (D && D.prev) {
      /* back to the title this one was opened from */
      gen++;
      D = D.prev;
      var bd = D.data && D.data.backdrop;
      if (bd) $('vd-bd').src = img(bd);
      else $('vd-bd').removeAttribute('src');
      $('vd-bd').style.display = bd ? '' : 'none';
      return changed();
    }
    closeDetails();
    if (from === 'home') return o.exit(); /* opened from Home: back there */
    area = from;
    if (from === 'results') drawSearch();
    else refreshContinue();
  }
  function detailsKey(k) {
    if (D && D.menu) return dmenuKey(k);
    if (isBack(k)) return backFromDetails();
    if (!D || !D.data) return;
    var d = D.data,
      series = D.kind === 'series' && d.seasons && d.seasons.length,
      sim = D.sim.length > 0;
    if (D.group === 'btn') {
      if (k === 37 && D.bi > 0) D.bi--;
      else if (k === 39 && D.bi < D.btns.length - 1) D.bi++;
      else if (k === 40 && series) D.group = 'season';
      else if (k === 40 && sim) D.group = 'sim';
      else if (k === 13 && D.btns[D.bi]) {
        var b = D.btns[D.bi];
        if (b.play) return playFrom(b.play);
        return b.run();
      }
    } else if (D.group === 'season') {
      if (k === 37 && D.si > 0) {
        D.si--;
        D.ei = 0;
      } else if (k === 39 && D.si < d.seasons.length - 1) {
        D.si++;
        D.ei = 0;
      } else if (k === 38) D.group = 'btn';
      else if (k === 40) D.group = 'ep';
    } else if (D.group === 'ep') {
      var eps = d.seasons[D.si].episodes;
      if (k === 38) {
        if (D.ei > 0) D.ei--;
        else D.group = 'season';
      } else if (k === 40) {
        if (D.ei < eps.length - 1) D.ei++;
        else if (sim) D.group = 'sim';
      } else if (k === 39 && eps[D.ei]) D.group = 'eptog';
      else if (k === 13 && eps[D.ei]) {
        var ep = eps[D.ei];
        return playFrom({ ep: ep, season: d.seasons[D.si].season, at: VL.resumeAt(itemOf('series', ep.id)) });
      }
    } else if (D.group === 'eptog') {
      if (k === 37) D.group = 'ep';
      else if (k === 13) return toggleEp();
      else if (k === 38 || k === 40) {
        D.group = 'ep';
        return detailsKey(k);
      }
    } else if (D.group === 'sim') {
      if (k === 37 && D.mi > 0) D.mi--;
      else if (k === 39 && D.mi < D.sim.length - 1) D.mi++;
      else if (k === 38) D.group = series ? 'ep' : 'btn';
      else if (k === 13 && D.sim[D.mi]) return openDetails(D.kind, D.sim[D.mi], 'details');
    }
    drawDetails();
  }
  /* after the player or details: Continue watching, My list and the ✓ marks follow what was done, on both tabs */
  function refreshContinue() {
    loadState().then(function () {
      if (tab < 2 && T[KINDS[tab]]) T[KINDS[tab]].ri = ri;
      for (var k in T) syncPersonal(k);
      if (tab === LIST) return showList();
      if (tab === FIND || area !== 'rows') return drawSearch();
      rows = T[KINDS[tab]].rows; /* a new list when a personal row came or went */
      ri = T[KINDS[tab]].ri;
      drawRows();
    });
  }
  /* the personal rows come, go or change in place: every other row keeps its position, and the focus stays on its row */
  function syncPersonal(kind) {
    var tb = T[kind],
      n0 = 0;
    while (n0 < tb.rows.length && isPersonal(tb.rows[n0])) n0++;
    var focus = tb.rows[tb.ri],
      old = tb.rows.slice(0, n0),
      now = personalRows(kind).map(function (nw) {
        for (var i = 0; i < old.length; i++)
          if (old[i].src === nw.src) {
            old[i].items = nw.items;
            old[i].total = nw.items.length;
            old[i].fi = Math.min(old[i].fi, nw.items.length - 1);
            return old[i];
          }
        rowEl(nw);
        return nw;
      });
    old.forEach(function (rw) {
      if (now.indexOf(rw) < 0) tb.box.removeChild(rw.el);
    });
    var first = tb.rows[n0] ? tb.rows[n0].el : null;
    now.forEach(function (rw) {
      tb.box.insertBefore(rw.el, first);
    });
    tb.rows = now.concat(tb.rows.slice(n0));
    var at = tb.rows.indexOf(focus);
    if (at < 0 && focus) for (var j = 0; j < now.length; j++) if (now[j].src === focus.src) at = j; /* the same row, rebuilt */
    tb.ri = at >= 0 ? at : Math.min(tb.ri, tb.rows.length - 1);
    if (tb.ri < 0) tb.ri = 0;
    for (var r = 0; r < tb.rows.length; r++) clearRow(tb.rows[r]); /* redrawn with the new marks */
  }

  /* ---------- the player: one <video> per playback, created on play and removed on stop, so nothing holds a connection ---------- */
  var MENU_KEY = 1062 /* the 123 button of the 2025 Magic Remote; F2 in a desktop browser */,
    START_MS = 20000,
    SAVE_MS = 10000,
    SEEK_MS = 400,
    NEXT_S = 10;
  var P =
    null; /* {cur, video, at, started, failed, startT, saveT, barT, seek, seekN, seekT, seekAt, menu, subs, sub, tries, subT, next, nextT, nextN,
             after, early, earlyOff} */
  function duration() {
    var v = P && P.video;
    return v && isFinite(v.duration) && v.duration > 0 ? v.duration : (P && P.cur.durHint) || 0;
  }
  function player(id, on) {
    $(id).classList.toggle('on', !!on);
  }
  function playFrom(spec) {
    var d = D && D.data;
    if (!d) return;
    var cur;
    if (D.kind === 'films')
      cur = {
        kind: 'film',
        id: d.id,
        name: d.label || d.name,
        poster: posterOf(d),
        backdrop: d.backdrop || '',
        play: d.play,
        durHint: d.duration_secs || 0,
        ext: d.ext || '',
      };
    else
      cur = {
        kind: 'episode',
        id: spec.ep.id,
        name: epName(spec.ep),
        poster: posterOf(d),
        show: { id: d.id, name: d.label || d.name || '', poster: posterOf(d) },
        season: spec.season,
        num: spec.ep.num || 0,
        next: VL.nextOf(d.seasons, spec.ep.id),
        backdrop: d.backdrop || '',
        play: spec.ep.play,
        durHint: spec.ep.duration_secs || 0,
        ext: spec.ep.ext || '',
      };
    start(cur, spec.at || 0);
  }
  function hidePlayer() {
    ['vd-play', 'vd-bar', 'vd-menu', 'vd-next', 'vd-pmsg', 'vd-spin', 'vd-load', 'vd-early'].forEach(function (id) {
      player(id, false);
    });
    $('vd-limg').removeAttribute('src');
  }
  /* the episode after the one playing, with its season, or null (films, the last episode, details not open) */
  function nextAfter(c) {
    var nx = c.kind === 'episode' && D && D.data && D.data.seasons ? VL.after(D.data.seasons, c.id) : null;
    if (!nx) return null;
    var season = c.season;
    D.data.seasons.forEach(function (s) {
      if (s.episodes.indexOf(nx) >= 0) season = s.season;
    });
    return { ep: nx, season: season };
  }
  /* while a title starts: its backdrop (or poster) and name under the spinner, instead of a black screen */
  function drawLoad(cur) {
    var pic = cur.backdrop || cur.poster;
    $('vd-limg').onerror = function () {
      this.style.display = 'none';
    };
    if (pic) $('vd-limg').src = img(pic);
    $('vd-limg').style.display = pic ? '' : 'none';
    $('vd-ltitle').textContent =
      cur.kind === 'episode' ? cur.show.name + '  ·  ' + VL.epCode(cur.season, cur.num) + '  ·  ' + cur.name : cur.name;
    player('vd-load', true);
  }
  /* "Next episode" once the episode counts as watched (the last minutes, its credits): OK plays it, Down hides it */
  function early() {
    var v = P && P.video;
    if (!v || !P.after || P.next) return;
    var on = VL.watched(P.seek !== null ? P.seek : v.currentTime, duration());
    if (!on) P.earlyOff = false;
    on = on && !P.earlyOff;
    if (on === !!P.early) return;
    P.early = on;
    if (on)
      setHtml(
        $('vd-early'),
        '<b>▶  ' +
          esc(t('Next episode')) +
          '</b>' +
          esc(VL.epCode(P.after.season, P.after.ep.num) + '  ·  ' + epName(P.after.ep)) +
          '<div class="small">' +
          esc(t('OK plays it  ·  Down hides this')) +
          '</div>'
      );
    player('vd-early', on);
  }
  function start(cur, at) {
    release();
    area = 'player';
    P = { cur: cur, at: at, started: false, failed: false, seek: null, seekN: 0, seekAt: 0, menu: null, subs: [], sub: -1, tries: 0 };
    hidePlayer();
    P.after = nextAfter(cur);
    player('vd-play', true);
    player('vd-spin', true);
    drawLoad(cur);
    var v = document.createElement('video');
    v.autoplay = true;
    P.video = v;
    v.addEventListener('loadedmetadata', function () {
      if (P && P.video === v && P.at > 0) v.currentTime = P.at;
    });
    function playing() {
      if (!P || P.video !== v || v.paused) return;
      player('vd-spin', false);
      if (!P.started && v.currentTime > 0) {
        P.started = true;
        clearTimeout(P.startT);
        player('vd-load', false);
        tracksStart();
      }
    }
    v.addEventListener('playing', playing);
    v.addEventListener('timeupdate', function () {
      playing();
      if (P && P.video === v && P.barOn) drawBar();
      if (P && P.video === v) early();
    });
    v.addEventListener('waiting', function () {
      if (P && P.video === v) player('vd-spin', true);
    });
    v.addEventListener('ended', function () {
      if (P && P.video === v) ended();
    });
    v.addEventListener(
      'error',
      function () {
        if (P && P.video === v && !P.started) fail();
      },
      true
    );
    v.src = /^https?:/.test(cur.play) ? cur.play : base + cur.play;
    $('vd-stage').appendChild(v);
    P.startT = setTimeout(function () {
      if (P && P.video === v && !P.started) fail();
    }, START_MS);
    P.saveT = setInterval(save, SAVE_MS);
    showBar(4000);
  }
  function fail() {
    player('vd-spin', false);
    player('vd-load', false);
    P.failed = true;
    var ext = P.cur.ext ? ' (.' + esc(P.cur.ext) + ')' : '';
    release(true);
    setHtml(
      $('vd-pmsg'),
      '<b>' +
        esc(P.cur.name) +
        '</b>' +
        esc(t("This title can't be played on the TV%s.")).replace('%s', ext) +
        '<div class="small">' +
        esc(t('Press Back.')) +
        '</div>'
    );
    player('vd-pmsg', true);
  }
  /* stop the video and let go of the connection; keepP leaves the player's state for the message */
  function release(keepP) {
    if (!P) return;
    clearTimeout(P.startT);
    clearInterval(P.saveT);
    clearTimeout(P.barT);
    clearTimeout(P.seekT);
    clearTimeout(P.subT);
    clearInterval(P.nextT);
    var v = P.video;
    P.video = null;
    if (v) {
      try {
        v.pause();
        v.removeAttribute('src');
        v.load();
      } catch (e) {}
      if (v.parentNode) v.parentNode.removeChild(v);
    }
    if (!keepP) P = null;
  }
  function save(then) {
    var v = P && P.video;
    if (!v || !P.started) return then && then();
    var pos = P.seek !== null ? P.seek : v.currentTime,
      dur = duration(),
      c = P.cur;
    if (!VL.shouldSave(pos, dur)) return then && then();
    var b = { op: 'pos', kind: c.kind, id: c.id, pos: Math.floor(pos), dur: Math.floor(dur), name: c.name.slice(0, 200), poster: c.poster };
    if (c.kind === 'episode') {
      b.show = { id: c.show.id, name: c.show.name.slice(0, 200), poster: c.show.poster };
      b.season = c.season;
      b.num = c.num;
      b.next = c.next;
    }
    var w = VL.watched(pos, dur);
    api('/api/vod/state', b)
      .then(function () {
        if (w) return api('/api/vod/state', { op: 'watched', kind: c.kind, id: c.id, on: true });
      })
      .then(
        function () {
          if (then) then();
        },
        function () {
          if (then) then();
        }
      );
  }
  /* the bar: title, progress, elapsed / total, when it ends */
  function drawBar() {
    var v = P.video,
      dur = duration(),
      pos = P.seek !== null ? P.seek : v ? v.currentTime : 0,
      c = P.cur,
      title = c.kind === 'episode' ? c.show.name + '  ·  ' + VL.epCode(c.season, c.num) + '  ·  ' + c.name : c.name;
    $('vd-btitle').textContent = title;
    $('vd-bfill').style.transform = 'scaleX(' + (dur ? Math.min(1, pos / dur) : 0) + ')';
    $('vd-btime').textContent =
      VL.clock(pos) +
      (dur ? ' / ' + VL.clock(dur) + '    ' + t('ends at %s').replace('%s', VL.endsAt(Date.now(), Math.max(0, dur - pos))) : '') +
      (v && v.paused && P.seek === null ? '    ❚❚ ' + t('Paused') : '');
  }
  function showBar(ms) {
    P.barOn = true;
    drawBar();
    player('vd-bar', true);
    clearTimeout(P.barT);
    if (ms)
      P.barT = setTimeout(function () {
        if (P && P.video && !P.video.paused && P.seek === null) {
          P.barOn = false;
          player('vd-bar', false);
        }
      }, ms);
  }
  /* Left/Right: one seek once the keys rest, not one per key repeat (every seek is a new request to the provider) */
  function skip(dir) {
    var v = P.video;
    if (!v || !P.started) return;
    var now = Date.now();
    if (P.seek === null || now - P.seekAt > SEEK_MS) {
      if (P.seek === null) P.seek = v.currentTime;
      P.seekN = 0;
    }
    P.seekAt = now;
    P.seekN++;
    P.seek = Math.max(0, Math.min(duration() ? duration() - 2 : 1e9, P.seek + dir * VL.skipStep(P.seekN)));
    showBar();
    clearTimeout(P.seekT);
    P.seekT = setTimeout(function () {
      if (!P || !P.video) return;
      P.video.currentTime = P.seek;
      P.seek = null;
      showBar(3000);
    }, SEEK_MS);
  }
  function ended() {
    var c = P.cur;
    save(function () {
      var nx = nextAfter(c);
      if (!nx) return stop();
      release(true);
      player('vd-early', false);
      P.next = nx;
      P.nextN = NEXT_S;
      drawNext();
      player('vd-next', true);
      P.nextT = setInterval(function () {
        if (!P || !P.next) return;
        if (--P.nextN <= 0) return playNext();
        drawNext();
      }, 1000);
    });
  }
  function drawNext() {
    $('vd-next').innerHTML =
      '<div class="small">' +
      esc(t('Next in %s s').replace('%s', P.nextN)) +
      '</div><b>' +
      esc(VL.epCode(P.next.season, P.next.ep.num) + '  ·  ' + epName(P.next.ep)) +
      '</b><div class="small">' +
      esc(t('OK plays it now, Back stops')) +
      '</div>';
  }
  function playNext() {
    var n = P.next;
    player('vd-next', false);
    playFrom({ ep: n.ep, season: n.season, at: 0 });
  }
  /* back to the details, which now show Resume / ✓ */
  function stop() {
    var done = function () {
      release();
      hidePlayer();
      if (!o.on) return;
      area = 'details';
      loadState().then(function () {
        if (D && D.data) {
          if (D.kind === 'series') {
            var nx = VL.nextEpisode(D.data.seasons, ST.items);
            if (nx)
              for (var i = 0; i < D.data.seasons.length; i++)
                if (D.data.seasons[i].season === nx.season) {
                  D.si = i;
                  D.ei = Math.max(0, D.data.seasons[i].episodes.indexOf(nx.ep));
                }
          }
          D.group = 'btn';
          D.bi = 0;
          drawDetails();
        }
      });
    };
    if (P && P.video) save(done);
    else done();
  }

  /* audio language and subtitles, remembered with Live TV's choice (live.audio, live.subs) */
  function pref(k) {
    try {
      return localStorage.getItem('live.' + k) || '';
    } catch (e) {
      return '';
    }
  }
  function setPref(k, v) {
    try {
      localStorage.setItem('live.' + k, v);
    } catch (e) {}
  }
  function audioList() {
    var a = P && P.video && P.video.audioTracks,
      out = [];
    if (a) for (var i = 0; i < a.length; i++) out.push(a[i]);
    return out;
  }
  function audioNow(list) {
    for (var i = 0; i < list.length; i++) if (list[i].enabled) return i;
    return 0;
  }
  function setAudio(i) {
    var list = audioList();
    if (!list[i]) return;
    list[i].enabled = true;
    for (var j = 0; j < list.length; j++) if (j !== i) list[j].enabled = false;
  }
  function setSub(i) {
    var id = P && P.video && P.video.mediaId;
    P.sub = i;
    if (!id) return;
    if (i < 0) return LT.luna('luna://com.webos.media/setSubtitleEnable', { mediaId: id, enable: false });
    LT.luna('luna://com.webos.media/selectTrack', { mediaId: id, type: 'text', index: P.subs[i].index }, function () {
      LT.luna('luna://com.webos.media/setSubtitleEnable', { mediaId: id, enable: true }, function () {
        subStyle(id, 0);
      });
    });
  }
  /* The TV draws a film's subtitles itself, large and without an outline by default. This is the size Nicolai picked on the TV
     (2026-10-26): small, white, a thin black outline. Values found in the TV's media server (com.webos.media). */
  var SUB_STYLE = [
    ['setSubtitleCustomStyleEnable', { enable: true }],
    ['setSubtitleCharacterColor', { charColor: 'white' }],
    ['setSubtitleCharacterEdge', { charEdgeType: 'uniform' }],
    ['setSubtitleCharacterEdgeColor', { charEdgeColor: 'black' }],
    /* last: the size settings override each other (setSubtitleCharacterFontSize after this one undoes it) */
    ['setSubtitleFontSize', { fontSize: 0 }],
  ];
  function subStyle(id, n) {
    if (n >= SUB_STYLE.length || !P || !P.video || P.video.mediaId !== id) return;
    var p = { mediaId: id };
    for (var k in SUB_STYLE[n][1]) p[k] = SUB_STYLE[n][1][k];
    LT.luna('luna://com.webos.media/' + SUB_STYLE[n][0], p, function () {
      subStyle(id, n + 1);
    });
  }
  function tracksStart() {
    var list = audioList(),
      a = LT.pick(
        list.map(function (x) {
          return x.language;
        }),
        pref('audio')
      );
    if (a >= 0 && !list[a].enabled) setAudio(a);
    askSubs(P.video);
  }
  function askSubs(v) {
    var id = v && v.mediaId;
    if (!id) return;
    LT.luna('luna://com.webos.media/getPipelineState', { mediaId: id }, function (r) {
      if (!P || P.video !== v || !r) return;
      if (!LT.known(r) && P.tries++ < 5) {
        P.subT = setTimeout(function () {
          askSubs(v);
        }, 1000);
        return;
      }
      P.subs = LT.subs(r);
      var s = LT.pick(
        P.subs.map(function (x) {
          return x.lang;
        }),
        pref('subs')
      );
      if (s >= 0) setSub(s);
      if (P.menu) drawMenu();
    });
  }
  function menuItems() {
    var it = [],
      list = audioList();
    if (list.length > 1) {
      var names = LT.labels(
        list.map(function (x) {
          return x.language;
        }),
        t('Audio')
      );
      var stepA = function (d) {
        var i = (audioNow(list) + d + list.length) % list.length;
        setAudio(i);
        setPref('audio', LT.lang(list[i].language));
      };
      it.push({ label: t('Audio'), sub: names[audioNow(list)], step: stepA });
    }
    if (P.subs.length) {
      var subNames = LT.labels(
        P.subs.map(function (x) {
          return x.lang;
        }),
        t('Subtitles')
      );
      var stepS = function (d) {
        var n = P.subs.length + 1,
          i = ((P.sub + 1 + d + n) % n) - 1; /* -1 is Off */
        setSub(i);
        setPref('subs', i < 0 ? '' : LT.lang(P.subs[i].lang));
      };
      it.push({ label: t('Subtitles'), sub: P.sub < 0 ? t('Off') : subNames[P.sub], step: stepS });
    }
    if (!it.length) it.push({ label: t('No audio or subtitle choices'), sub: '' });
    it.push({ label: t('Close'), sub: '', close: true });
    return it;
  }
  function drawMenu() {
    P.menu.items = menuItems();
    if (P.menu.i >= P.menu.items.length) P.menu.i = P.menu.items.length - 1;
    var h = '<h3>' + esc(P.cur.name) + '</h3>';
    P.menu.items.forEach(function (m, i) {
      h +=
        '<div class="mrow' +
        (i === P.menu.i ? ' f' : '') +
        '"><div class="ml">' +
        esc(m.label) +
        '</div><div class="mv">' +
        esc(m.sub) +
        '</div></div>';
    });
    setHtml($('vd-menu'), h);
  }
  function menuKey(k) {
    var m = P.menu,
      row = m.items[m.i];
    if (k === 38 && m.i > 0) m.i--;
    else if (k === 40 && m.i < m.items.length - 1) m.i++;
    else if ((k === 37 || k === 39) && row.step) row.step(k === 37 ? -1 : 1);
    else if (k === 13 && row.step) row.step(1);
    else if ((k === 13 && row.close) || k === MENU_KEY || k === 113 || isBack(k)) {
      P.menu = null;
      player('vd-menu', false);
      return;
    }
    drawMenu();
  }
  function playerKey(k) {
    if (!P) return;
    if (P.menu) return menuKey(k);
    if (P.next) {
      if (k === 13) {
        clearInterval(P.nextT);
        playNext();
      } else if (isBack(k)) stop();
      return;
    }
    if (isBack(k)) return stop();
    if (P.failed || !P.video) return;
    var v = P.video;
    if (P.early && k === 13) {
      /* the next episode now: this one is saved (watched) first */
      var nx = P.after;
      return save(function () {
        if (!P || !o.on) return;
        P.next = nx;
        playNext();
      });
    }
    if (P.early && k === 40) {
      P.earlyOff = true;
      return early();
    }
    if (k === 13) {
      if (P.seek !== null || !P.started) return;
      if (v.paused) {
        v.play();
        showBar(3000);
      } else {
        v.pause();
        save();
        showBar();
      }
    } else if (k === 37 || k === 39) skip(k === 37 ? -1 : 1);
    else if (k === MENU_KEY || k === 113) {
      P.menu = { i: 0, items: [] };
      drawMenu();
      player('vd-menu', true);
    }
  }

  /* ---------- entering and leaving ---------- */
  o.enter = function () {
    o.on = true;
    $('vd-q').placeholder = t('Search films and series');
    $('vd').classList.add('on');
    area = 'rows';
    msg(esc(t('Loading…')));
    Promise.all([
      api('/api/vod/status'),
      loadState(),
      vget('/vod/library.json').then(
        function (l) {
          lib = l;
          HOME = {};
          BEC = {};
          CARDS = { films: {}, series: {} }; /* asked again each visit: the curator learns more about titles over time */
          if (!l.home) return;
          /* both tabs' rows at once (a few hundred kB): switching tabs is then instant */
          return Promise.all(
            KINDS.map(function (kind) {
              return vget('/vod/home/' + kind + '.json').then(
                function (h) {
                  HOME[kind] = h && h.rows && h.rows.length ? h.rows : null;
                },
                function () {
                  HOME[kind] = null;
                }
              );
            })
          );
        },
        function (e) {
          lib = null;
          throw e;
        }
      ),
    ]).then(
      function (r) {
        if (!o.on) return;
        base = r[0].base || base;
        msg('');
        if (wantFind) {
          wantFind = false;
          setTab(FIND);
          area = 'search';
          drawTabs();
          drawSearch();
          $('vd-q').focus();
          return;
        }
        setTab(tab === FIND ? (MEM.tab === 1 || MEM.tab === LIST ? MEM.tab : 0) : tab);
        if (tab === LIST) {
          area = L.items.length ? 'list' : 'tabs';
          drawTabs();
          drawList();
          return;
        }
        area = rows.length ? 'rows' : 'tabs';
        drawTabs();
        drawRows();
      },
      function (e) {
        if (!o.on) return;
        wantFind = false;
        area = 'tabs';
        drawTabs();
        msg('<b>' + esc(t('The film library is not reachable')) + '</b>' + esc(e && e.message));
      }
    );
  };
  o.exit = function () {
    o.on = false;
    /* the tab for the next visit; its rows open at the top again */
    if (tab !== FIND) MEM.tab = tab;
    keepMem();
    if (P) {
      save();
      release();
    }
    hidePlayer();
    closeTrailer();
    gen++;
    closeDetails();
    $('vd-q').blur();
    msg('');
    /* nothing kept while the launcher shows: rows, cards and pictures go, and come back on the next visit */
    rows = [];
    T = {};
    lib = null;
    S = { q: '', results: [], fi: 0, els: [] };
    $('vd-rows').textContent = '';
    $('vd-grid').textContent = '';
    $('vd-q').value = '';
    HOME = {};
    clearHero();
    $('vd').classList.remove('on');
    fromHome = false;
    wantFind = false;
    if (o.onExit) o.onExit();
  };
  /* webOS repeats keydown while OK is held, not always with e.repeat: a held OK is one press, so it can't open a title and then
     press Play (a stream) on its own */
  var okAt = 0;
  o.key = function (e) {
    var k = e.keyCode;
    if (k === 13) {
      var now = Date.now(),
        held = e.repeat || now - okAt < 400;
      okAt = now;
      if (held) {
        e.preventDefault();
        return;
      }
    }
    if (area === 'search') return searchKey(e);
    e.preventDefault();
    if (area === 'tabs') tabsKey(k);
    else if (area === 'rows') rowsKey(k);
    else if (area === 'list') gridKey(k);
    else if (area === 'sort') sortKey(k);
    else if (area === 'details') detailsKey(k);
    else if (area === 'results') resultsKey(k);
    else if (area === 'player') playerKey(k);
    else if (area === 'trailer') trailerKey(k);
  };
  /* the tile shows while the service knows a curator; asked again on every load(), since after a boot the service can start after
     the page, and the address can be set later */
  o.check = function () {
    api('/api/vod/status').then(
      function (s) {
        base = s.base || '';
        if (!!s.configured !== o.ready) {
          o.ready = !!s.configured;
          lastSig = '';
          load();
        }
      },
      function () {}
    );
  };
  o.check();
  /* the remote's Films & Series button (launched with {vod:true}): open now, or once the service says a curator is set (just after a
     boot the page can ask before it knows) */
  o.open = function () {
    if (o.ready) return o.enter();
    api('/api/vod/status').then(
      function (s) {
        if (!s.configured || o.on) return;
        base = s.base || '';
        o.ready = true;
        lastSig = '';
        load();
        o.enter();
      },
      function () {}
    );
  };

  /* ---------- what Home (home.js) asks of Films & Series ---------- */
  var autoNext = false,
    wantFind = false,
    fromHome = false /* a title opened from Home: Back returns there, also while it loads */,
    homeRows = null,
    homeRowsAt = 0;
  o.onExit = null;
  o.img = function (p) {
    return img(p);
  };
  /* the curator's cards of the titles in Home's Continue watching (their poster and title now, as the personal rows get them):
     only the ones not known yet, so a Home shown again asks nothing; never rejects */
  function homeCards() {
    return Promise.all(
      ['films', 'series'].map(function (kind) {
        var list = kind === 'films' ? VL.continueFilms(ST.items, ST.hidden) : VL.continueShows(ST.items, Date.now(), ST.hidden),
          want = list
            .slice(0, 9)
            .map(function (x) {
              return x.id;
            })
            .filter(function (id) {
              return !CARDS[kind][id];
            });
        if (!want.length) return null;
        return vget('/vod/cards/' + kind + '.json', { ids: want.join(',') }).then(
          function (list) {
            (list || []).forEach(function (c) {
              CARDS[kind][c.id] = c;
            });
            want.forEach(function (id) {
              CARDS[kind][id] = CARDS[kind][id] || { none: true };
            });
          },
          function () {}
        );
      })
    );
  }
  /* the address, the viewer's state and the films rows (kept 30 minutes); never rejects: what is missing is empty */
  o.home = function () {
    return api('/api/vod/status')
      .then(function (s) {
        base = s.base || '';
        if (!s.configured) return null;
        var rowsP =
          homeRows && Date.now() - homeRowsAt < 30 * 60 * 1000
            ? Promise.resolve(homeRows)
            : vget('/vod/home/films.json').then(
                function (h) {
                  homeRows = h && h.rows && h.rows.length ? h.rows : null;
                  homeRowsAt = Date.now();
                  return homeRows;
                },
                function () {
                  return null;
                }
              );
        return Promise.all([rowsP, loadState().then(homeCards)]).then(function (r) {
          return { base: base, st: ST, rows: r[0], cards: CARDS };
        });
      })
      .catch(function () {
        return null;
      });
  };
  /* a title's page straight from Home (kind films | series, card {id, label, poster}); play: press its first button (Play, Resume,
     Continue) once the details are there. Back from the page returns to Home. */
  o.open = function (kind, card, play) {
    if (o.on) return;
    o.on = true;
    fromHome = true;
    $('vd').classList.add('on');
    area = 'details';
    msg(esc(t('Loading…')));
    var g = ++gen;
    Promise.all([
      api('/api/vod/status'),
      loadState(),
      lib
        ? null
        : vget('/vod/library.json').then(
            function (l) {
              lib = l;
            },
            function () {}
          ),
    ]).then(
      function (r) {
        if (!o.on || g !== gen) return;
        base = r[0].base || base;
        autoNext = !!play;
        msg('');
        openDetails(kind, card, 'home');
      },
      function () {
        if (o.on) o.exit();
      }
    );
  };
  o.search = function () {
    wantFind = true;
    o.enter();
  };
  /* My list from Home's hero */
  o.toggleList = function (kind, card) {
    var key = (kind === 'films' ? 'film:' : 'show:') + card.id,
      on = !ST.list[key];
    return api('/api/vod/state', {
      op: 'list',
      kind: kind === 'films' ? 'film' : 'show',
      id: card.id,
      on: on,
      name: String(card.label || card.name || '').slice(0, 200),
      poster: card.poster || '',
    }).then(function () {
      return loadState().then(function () {
        return !!ST.list[key];
      });
    });
  };
  o.listed = function (kind, id) {
    return !!ST.list[(kind === 'films' ? 'film:' : 'show:') + id];
  };
  return o;
})();
