/* ---------- Films & Series (fork): the library of an iptv-curator server, Plex-style: rows of posters, details, search, a player ---------- */
/* The page talks only to the service (helper/vod.js), which passes the curator's JSON through. Details are asked for only when a title is
   opened, never for a whole row; posters come from the curator's own image cache. docs/vod.md */
var VOD_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130"><rect width="130" height="130" fill="#3d6df2"/><rect x="28" y="30" width="74" height="70" rx="10" fill="none" stroke="#fff" stroke-width="8"/><path d="M28 50 H102 M28 80 H102 M48 30 V100 M82 30 V100" stroke="#fff" stroke-width="6"/></svg>'
  );
var VOD = (function () {
  var o = { on: false, ready: false };
  var CARD = 224 /* poster width and spacing */,
    ROW_H = 430,
    PAGE = 40,
    COLS = 7;
  var base = '',
    lib = null,
    ST = { items: {} },
    tab = 0 /* 0 films, 1 series, 2 search */,
    area = 'rows' /* tabs, rows, details, search, results, player */,
    ti = 0,
    rows = [],
    ri = 0,
    gen = 0;
  var D = null; /* the open details: {kind, card, data, group, bi, si, ei, btns, from} */
  var S = { q: '', results: [], fi: 0, els: [] };
  var KINDS = ['films', 'series'];
  var TABS = ['Films', 'Series', 'Search'];

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
        ST = s && s.items ? s : { items: {} };
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
      h += '<div class="vtab' + (i === tab ? ' on' : '') + (area === 'tabs' && i === ti ? ' f' : '') + '">' + TABS[i] + '</div>';
    $('vd-top').innerHTML = h;
  }
  function setTab(i) {
    tab = i;
    ti = i;
    $('vd-search').classList.toggle('on', tab === 2);
    $('vd-rows').style.display = tab === 2 ? 'none' : '';
    if (tab < 2) buildRows();
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
      var i = new Image();
      i.alt = '';
      i.onerror = function () {
        if (i.parentNode) i.parentNode.removeChild(i);
      };
      i._src = img(it.poster); /* set once the focus rests (see showSoon) */
      d.appendChild(i);
    }
    var mine = itemOf(kind, it.id);
    if (kind === 'films' && mine && mine.watched) {
      var w = document.createElement('div');
      w.className = 'vw';
      w.textContent = '✓';
      d.appendChild(w);
    } else if (kind === 'films' && mine && mine.pos > 0 && mine.dur > 0) {
      var b = document.createElement('div');
      b.className = 'vbar';
      b.style.width = Math.min(100, Math.round((100 * mine.pos) / mine.dur)) + '%';
      d.appendChild(b);
    }
    return d;
  }
  function continueRow(kind) {
    var items =
      kind === 'films'
        ? VL.continueFilms(ST.items).map(function (x) {
            return { id: x.id, label: x.name, poster: x.poster };
          })
        : VL.continueShows(ST.items, Date.now()).map(function (x) {
            return { id: x.id, label: x.name, poster: x.poster };
          });
    return { title: 'Continue watching', kind: kind, src: 'continue', items: items, total: items.length, done: true };
  }
  function buildRows() {
    gen++;
    var kind = KINDS[tab];
    var list = [continueRow(kind), { title: 'Recently added', kind: kind, src: 'recent', items: [], total: -1 }];
    ((lib && lib[kind]) || []).forEach(function (c) {
      if (c.count > 0) list.push({ title: c.name, kind: kind, src: 'cat', cid: c.id, items: [], total: c.count });
    });
    rows = list.filter(function (rw) {
      return rw.src !== 'continue' || rw.items.length;
    });
    var box = $('vd-rows');
    box.textContent = '';
    rows.forEach(function (rw) {
      rw.fi = 0;
      rw.els = {};
      rw.el = document.createElement('div');
      rw.el.className = 'vrow';
      rw.el.innerHTML = '<h2>' + esc(rw.title) + '</h2><div class="vstrip"></div><div class="vlabel"></div>';
      rw.strip = rw.el.childNodes[1];
      rw.label = rw.el.childNodes[2];
      box.appendChild(rw.el);
    });
    ri = 0;
    if (!rows.length) msg('<b>Nothing here yet</b>Tick some categories on the curator page.');
    else msg('');
    drawRows();
  }
  function fill(rw) {
    if (rw.loading || rw.done) return;
    rw.loading = true;
    var g = gen,
      p =
        rw.src === 'recent'
          ? vget('/vod/' + rw.kind + '/recent.json')
          : vget('/vod/' + rw.kind + '/' + rw.cid + '.json', { offset: rw.items.length, limit: PAGE });
    p.then(
      function (list) {
        if (g !== gen) return;
        rw.loading = false;
        rw.items = rw.items.concat(list);
        if (rw.src === 'recent' || list.length < PAGE || (rw.total > 0 && rw.items.length >= rw.total)) rw.done = true;
        if (!rw.items.length) rw.strip.innerHTML = '<div class="vempty">Nothing here.</div>';
        drawRow(rw);
      },
      function (e) {
        if (g !== gen) return;
        rw.loading = false;
        rw.done = true;
        rw.strip.innerHTML = '<div class="vempty">' + esc('Could not load this row: ' + e.message) + '</div>';
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
    if (!rw.done && n - rw.fi <= 10) fill(rw);
  }
  /* Posters load only for what is on screen once the focus rests: holding Right through a long row must not make the curator fetch
     every poster it passes from the provider. */
  var imgT = 0;
  function show(el) {
    var i = el && el.querySelector('img');
    if (i && i._src && !i.src) i.src = i._src;
  }
  function showSoon() {
    clearTimeout(imgT);
    imgT = setTimeout(function () {
      if (tab === 2) {
        var r0 = Math.max(0, Math.floor(S.fi / COLS) - 1);
        for (var i = r0 * COLS; i < Math.min(S.els.length, (r0 + 3) * COLS); i++) show(S.els[i]);
        return;
      }
      for (var r = Math.max(0, ri - 1); r < Math.min(rows.length, ri + 3); r++) {
        var rw = rows[r],
          off = Math.max(0, rw.fi - 2);
        for (var j = off; j < off + 9; j++) show(rw.els[j]);
      }
    }, 250);
  }
  function drawRows() {
    $('vd-rows').style.transform = 'translateY(' + -ri * ROW_H + 'px)';
    for (var i = 0; i < rows.length; i++) {
      var rw = rows[i];
      if (Math.abs(i - ri) <= 2) {
        if (!rw.items.length && !rw.done) fill(rw);
        else drawRow(rw);
      } else if (rw.el.classList.contains('f')) drawRow(rw);
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
    if (tab === 2) drawSearch();
  }
  function tabsKey(k) {
    if (k === 37 && ti > 0) {
      ti--;
      setTab(ti);
    } else if (k === 39 && ti < TABS.length - 1) {
      ti++;
      setTab(ti);
    } else if (k === 40 || k === 13) {
      if (tab === 2) {
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
    msg('Searching…');
    vget('/vod/search.json', { q: q }).then(
      function (list) {
        msg(list.length ? '' : '<b>No titles found</b>' + esc(q));
        S.results = list;
        area = list.length ? 'results' : 'search';
        drawSearch();
      },
      function (e) {
        msg('<b>Search failed</b>' + esc(e.message));
      }
    );
  }
  function searchKey(e) {
    var k = e.keyCode;
    /* the input has the keys (the TV's keyboard types into it); only Enter, Back and Down are ours */
    if (k === 13) {
      e.preventDefault();
      runSearch();
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
    if (d.genre) a.push(esc(d.genre));
    if (d.duration_secs) a.push(VL.fmtLength(d.duration_secs));
    if (d.seasons && d.seasons.length) a.push(d.seasons.length + (d.seasons.length === 1 ? ' season' : ' seasons'));
    if (d.rating) a.push('<b>★ ' + esc(d.rating) + '</b>');
    return a.join('  ·  ');
  }
  function openDetails(kind, c, from) {
    var g = ++gen;
    D = { kind: kind, card: c, data: null, group: 'btn', bi: 0, si: 0, ei: 0, btns: [], from: from };
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
        '</h1><div class="facts">Loading…</div></div>'
    );
    vget(kind === 'films' ? '/vod/film/' + c.id + '.json' : '/vod/show/' + c.id + '.json').then(
      function (d) {
        if (g !== gen || !D) return;
        D.data = d;
        if (d.backdrop) {
          $('vd-bd').src = img(d.backdrop);
          $('vd-bd').style.display = '';
        }
        var nx = kind === 'series' ? VL.nextEpisode(d.seasons, ST.items) : null;
        if (nx)
          for (var i = 0; i < d.seasons.length; i++)
            if (d.seasons[i].season === nx.season) {
              D.si = i;
              D.ei = Math.max(0, d.seasons[i].episodes.indexOf(nx.ep));
            }
        drawDetails();
      },
      function (e) {
        if (g !== gen || !D) return;
        setHtml(
          $('vd-dmain'),
          '<div class="dmeta"><h1>' +
            esc(c.label || c.name) +
            '</h1><div class="facts">' +
            esc('Could not load the details: ' + e.message) +
            '</div></div>'
        );
      }
    );
  }
  function buttons() {
    var d = D.data,
      out = [];
    if (D.kind === 'films') {
      var at = VL.resumeAt(itemOf('films', d.id));
      if (at) {
        out.push({ label: '▶  Resume from ' + VL.clock(at), play: { at: at } });
        out.push({ label: '↺  From the start', play: { at: 0 } });
      } else out.push({ label: '▶  Play', play: { at: 0 } });
      return out;
    }
    var nx = VL.nextEpisode(d.seasons, ST.items);
    if (!nx) return out;
    var started = !!itemOf('series', nx.ep.id) || nx.resume > 0 || anyPlayed(d);
    out.push({
      label:
        '▶  ' + (started ? 'Continue ' : 'Play ') + VL.epCode(nx.season, nx.ep.num) + (nx.resume ? '  ·  ' + VL.clock(nx.resume) : ''),
      play: { ep: nx.ep, season: nx.season, at: nx.resume },
    });
    return out;
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
      (d.poster || c.poster ? '<img src="' + esc(img(d.poster || c.poster)) + '" alt="">' : '') +
      '</div><div class="dmeta"><h1>' +
      esc(d.label || d.name) +
      '</h1><div class="facts">' +
      facts(d) +
      '</div>' +
      (d.plot ? '<div class="plot">' + esc(d.plot) + '</div>' : '') +
      '<div class="credits">' +
      esc([d.director, d.cast].filter(Boolean).join('  ·  ')) +
      '</div><div class="vbtns">';
    D.btns.forEach(function (b, i) {
      h += '<div class="vbtn' + (D.group === 'btn' && i === D.bi ? ' f' : '') + '">' + esc(b.label) + '</div>';
    });
    h += '</div>';
    if (D.kind === 'series' && d.seasons && d.seasons.length) {
      h += '<div class="vseasons">';
      d.seasons.forEach(function (s, i) {
        h +=
          '<div class="vseason' +
          (i === D.si ? ' on' : '') +
          (D.group === 'season' && i === D.si ? ' f' : '') +
          '">Season ' +
          s.season +
          '</div>';
      });
      h += '</div><div class="veps">';
      var eps = d.seasons[D.si].episodes,
        w = VL.windowOf(D.ei, eps.length, 2, 4);
      for (var i = w[0]; i < w[1]; i++) {
        var ep = eps[i],
          mine = itemOf('series', ep.id),
          right = '';
        if (mine && mine.watched) right = '<div class="r">✓</div>';
        else if (mine && mine.pos > 0 && mine.dur > 0)
          right = '<div class="pb"><i style="width:' + Math.min(100, Math.round((100 * mine.pos) / mine.dur)) + '%"></i></div>';
        else if (ep.duration_secs) right = '<div class="r">' + VL.fmtLength(ep.duration_secs) + '</div>';
        h +=
          '<div class="vep' +
          (D.group === 'ep' && i === D.ei ? ' f' : '') +
          '"><div class="n">' +
          (ep.num || i + 1) +
          '</div><div class="l">' +
          esc(ep.label || ep.title) +
          '</div>' +
          right +
          '</div>';
      }
      h += '</div>';
    }
    setHtml($('vd-dmain'), h + '</div>');
  }
  function closeDetails() {
    gen++;
    D = null;
    $('vd-det').classList.remove('on');
    $('vd-bd').removeAttribute('src');
  }
  function backFromDetails() {
    var from = D ? D.from : 'rows';
    closeDetails();
    area = from;
    if (from === 'results') drawSearch();
    else refreshContinue();
  }
  function detailsKey(k) {
    if (isBack(k)) return backFromDetails();
    if (!D || !D.data) return;
    var d = D.data,
      series = D.kind === 'series' && d.seasons && d.seasons.length;
    if (D.group === 'btn') {
      if (k === 37 && D.bi > 0) D.bi--;
      else if (k === 39 && D.bi < D.btns.length - 1) D.bi++;
      else if (k === 40 && series) D.group = 'season';
      else if (k === 13 && D.btns[D.bi]) return playFrom(D.btns[D.bi].play);
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
      } else if (k === 40 && D.ei < eps.length - 1) D.ei++;
      else if (k === 13 && eps[D.ei]) {
        var ep = eps[D.ei];
        return playFrom({ ep: ep, season: d.seasons[D.si].season, at: VL.resumeAt(itemOf('series', ep.id)) });
      }
    }
    drawDetails();
  }
  /* after the player or details: the Continue watching row and the ✓ marks follow what was watched */
  function refreshContinue() {
    loadState().then(function () {
      if (tab === 2 || area !== 'rows') return drawSearch();
      var kind = KINDS[tab],
        had = rows.length && rows[0].src === 'continue',
        nw = continueRow(kind);
      if (had && nw.items.length) {
        rows[0].items = nw.items;
        rows[0].total = nw.items.length;
        rows[0].fi = Math.min(rows[0].fi, nw.items.length - 1);
      }
      if (had !== !!nw.items.length) {
        var keep = rows[ri] ? rows[ri].title : '';
        buildRows();
        for (var i = 0; i < rows.length; i++) if (rows[i].title === keep) ri = i;
      }
      for (var j = 0; j < rows.length; j++) {
        for (var e in rows[j].els) rows[j].strip.removeChild(rows[j].els[e]);
        rows[j].els = {};
      }
      drawRows();
    });
  }

  /* ---------- the player (next commit) ---------- */
  function playFrom(spec) {
    toast('Playing comes with the player');
    return spec;
  }

  /* ---------- entering and leaving ---------- */
  o.enter = function () {
    o.on = true;
    $('vd').classList.add('on');
    area = 'rows';
    msg('Loading…');
    Promise.all([
      api('/api/vod/status'),
      loadState(),
      vget('/vod/library.json').then(
        function (l) {
          lib = l;
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
        setTab(tab === 2 ? 0 : tab);
        area = rows.length ? 'rows' : 'tabs';
        drawTabs();
        drawRows();
      },
      function (e) {
        if (!o.on) return;
        area = 'tabs';
        drawTabs();
        msg('<b>The film library is not reachable</b>' + esc(e && e.message));
      }
    );
  };
  o.exit = function () {
    o.on = false;
    gen++;
    closeDetails();
    $('vd-q').blur();
    msg('');
    $('vd').classList.remove('on');
  };
  o.key = function (e) {
    var k = e.keyCode;
    if (area === 'search') return searchKey(e);
    e.preventDefault();
    if (area === 'tabs') tabsKey(k);
    else if (area === 'rows') rowsKey(k);
    else if (area === 'details') detailsKey(k);
    else if (area === 'results') resultsKey(k);
  };
  /* the tile shows once the service knows a curator */
  api('/api/vod/status').then(
    function (s) {
      base = s.base || '';
      if (s.configured && !o.ready) {
        o.ready = true;
        lastSig = '';
        load();
      }
    },
    function () {}
  );
  return o;
})();
