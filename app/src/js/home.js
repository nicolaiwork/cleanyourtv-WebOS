/* ---------- Home (fork): the clock, a Trending title over its backdrop with Play, Continue watching and the channels on now, and a
   strip with Live TV, Films & Series, the apps and inputs on Home and All apps. docs/launcher.md ---------- */
/* Focus: rows of focusable elements (rows[r][c]): the hero's buttons, the band of cards, the strip; a row with nothing
   in it is left out. Each element has a key (_k) so the focus stays on the same thing when the rows are made again, and one of _a (an
   app) or _run (what OK does). */
/* an HDMI input in the strip: a solid connector on a dark tile, like the apps' own icons */
var INPUT_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130"><rect width="130" height="130" fill="#212326"/><path d="M20 45 Q20 39 26 39 H104 Q110 39 110 45 V73 L95 91 H35 L20 73 Z" fill="#e8eaed"/><path d="M38 56 H92" stroke="#212326" stroke-width="8" stroke-linecap="round" stroke-dasharray="0 13.5"/></svg>'
  );
var HOME_CACHE = 'cytv.home.v1',
  SLIDE_MS = 15000,
  HERO_N = 10;
var H = { picks: [], hi: 0, cont: [], chans: [], last: '', items: {} },
  heroEls = [],
  bandEls = [],
  stripEls = [],
  heroRow = null,
  stripRow = null,
  focusKey = '',
  userMoved = false /* until the viewer moves the focus (and again after the Home key), it rests on Play */,
  slideT = 0,
  homeGen = 0,
  picUrl = '';

function homeRestore() {
  try {
    var hc = JSON.parse(localStorage.getItem(HOME_CACHE) || 'null');
    if (hc && hc.picks) {
      H.picks = hc.picks;
      H.cont = hc.cont || [];
      H.chans = hc.chans || [];
      H.last = hc.last || '';
    }
  } catch (e) {}
}
function homeStore() {
  try {
    localStorage.setItem(HOME_CACHE, JSON.stringify({ picks: H.picks, cont: H.cont, chans: H.chans, last: H.last }));
  } catch (e) {}
}

/* what Home shows from Films & Series and Live TV; asked each time Home is shown, never blocking the first paint */
function homeData() {
  var g = ++homeGen;
  Promise.all([
    VOD.home(),
    liveOn()
      ? api('/api/live/home').catch(function () {
          return null;
        })
      : null,
  ]).then(function (r) {
    if (g !== homeGen) return;
    var v = r[0] && r[0].rows ? r[0] : null /* the curator not reachable: no films, and nothing to resume either */,
      lv = r[1],
      cur = H.picks[H.hi];
    H.items = v ? v.st.items : {};
    H.cont = v ? HL.continueCards(v.st, Date.now(), lv && lv.channels && lv.channels.length ? 3 : 9, v.cards) : [];
    H.picks = v
      ? HL.heroPicks(
          v.rows,
          H.cont
            .filter(function (x) {
              return x.kind === 'films';
            })
            .map(function (x) {
              return x.id;
            }),
          HERO_N
        )
      : [];
    H.cont.forEach(function (x) {
      x.pic = x.poster ? VOD.img(x.poster) : '';
    });
    H.picks.forEach(function (p) {
      p.pic = VOD.img(p.backdrop);
    });
    /* the title on screen stays when it is still a pick */
    H.hi = 0;
    for (var i = 0; cur && i < H.picks.length; i++) if (H.picks[i].id === cur.id) H.hi = i;
    H.chans = (lv && lv.channels) || [];
    H.last = (lv && lv.last) || '';
    homeStore();
    drawHome();
  });
}

function drawHome() {
  drawHero(false);
  drawBand();
  buildRows();
}

/* ---------- the hero ---------- */
function heroChannel() {
  for (var i = 0; i < H.chans.length; i++) if (H.chans[i].key === H.last) return H.chans[i];
  return H.chans[0];
}
function heroButton(k, html, cls, run) {
  var b = document.createElement('div');
  b.className = 'hbtn fo' + (cls ? ' ' + cls : '');
  b.innerHTML = html;
  b._k = 'hero:' + k;
  b._run = run;
  hit(b);
  return b;
}
var STAR_SVG =
  '<svg class="star" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/></svg>';
var PLAY_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>';
/* the title gets smaller when it wraps, and a title on two lines leaves one line for the description, so the buttons (at a fixed
   place above the band) never move */
function heroText(h) {
  var el = $('htext');
  if (el.innerHTML !== h) el = setHtml(el, h);
  var h1 = el.querySelector('h1');
  el.classList.remove('two');
  if (h1) {
    h1.className = '';
    if (h1.offsetHeight > 140) {
      /* two lines at the full size: smaller, and still two lines there leaves one line for the description */
      h1.className = 'long';
      if (h1.offsetHeight > 100) el.classList.add('two');
    }
  }
  return el;
}
function filmText(it) {
  var len = VL.fmtLength((it.runtime || 0) * 60),
    facts = [];
  /* (the title's size is set by heroText, from its height) */
  if (it.year) facts.push('<span>' + esc(it.year) + '</span>');
  if (len) facts.push('<span>' + esc(len) + '</span>');
  if (it.genres && it.genres.length) facts.push('<span>' + esc(it.genres.slice(0, 2).join(', ')) + '</span>');
  if (it.rating) facts.push('<b>' + esc(it.rating) + '</b>');
  var name = it.label || it.name || '';
  return (
    '<div class="eb">' +
    esc(t('Trending in Films & Series')) +
    '</div><h1>' +
    esc(name) +
    '</h1><div class="facts">' +
    facts.join('') +
    '</div>' +
    (it.overview ? '<p>' + esc(it.overview) + '</p>' : '')
  );
}
function chanText(ch) {
  var l = HL.chanLine(ch, Date.now() / 1000);
  return (
    '<div class="eb">' +
    esc(t('Last watched')) +
    '</div><h1>' +
    esc(ch.name) +
    '</h1><div class="facts"><b>' +
    esc(ch.num) +
    '</b><span>' +
    esc(l.title === 'No guide' ? t('No guide') : l.title) +
    '</span>' +
    (l.times ? '<span>' + esc(l.times) + '</span>' : '') +
    '</div>' +
    (l.prog >= 0 ? '<div class="bar hbar"><i style="width:' + Math.round(100 * l.prog) + '%"></i></div>' : '') +
    (l.next ? '<p>' + esc(l.next) + '</p>' : '')
  );
}
/* fade: a slide to the next title (the text fades out and in, the backdrop cross-fades) */
function drawHero(fade) {
  var mode = HL.heroMode(H.picks, H.chans),
    b = document.body;
  b.classList.toggle('no-hero', mode === 'none');
  b.classList.toggle('no-pic', mode !== 'film');
  heroEls = [];
  if (mode === 'film') {
    var it = H.picks[H.hi] || H.picks[0],
      pl = HL.heroPlay(it, H.items),
      mine = VOD.listed('films', it.id);
    heroEls.push(
      heroButton('play', PLAY_SVG + esc(t(pl.label)) + (pl.left ? '<span class="left">' + esc(pl.left) + '</span>' : ''), '', function () {
        VOD.open('films', H.picks[H.hi], true);
      })
    );
    heroEls.push(
      heroButton('info', esc(t('More info')), '', function () {
        VOD.open('films', H.picks[H.hi], false);
      })
    );
    var lb = heroButton('list', svg(mine ? 'check' : 'plus'), 'sq', function () {
      var p = H.picks[H.hi];
      VOD.toggleList('films', p).then(function (on) {
        lb.innerHTML = svg(on ? 'check' : 'plus');
        toast((on ? t('%s added to My list') : t('%s removed from My list')).replace('%s', p.label || p.name));
      });
    });
    heroEls.push(lb);
    showPic(it.pic);
    if (fade) {
      $('htext').classList.add('out');
      setTimeout(function () {
        /* the element itself: on webOS 5 setHtml swaps it for a copy, which keeps the class */
        heroText(filmText(H.picks[H.hi])).classList.remove('out');
      }, 260);
    } else heroText(filmText(it));
    var nx = H.picks[(H.hi + 1) % H.picks.length];
    if (nx && nx.pic) new Image().src = nx.pic; /* the next backdrop is in the cache before it slides in */
  } else if (mode === 'channel') {
    var ch = heroChannel();
    heroText(chanText(ch));
    heroEls.push(
      heroButton('watch', PLAY_SVG + esc(t('Watch')), '', function () {
        LIVE.enter(false, ch.key);
      })
    );
  }
  var bt = $('hbtns');
  bt.textContent = '';
  heroEls.forEach(function (e) {
    bt.appendChild(e);
  });
  var dots = '';
  if (mode === 'film' && H.picks.length > 1)
    for (var i = 0; i < H.picks.length; i++) dots += '<i' + (i === H.hi ? ' class="on"' : '') + '></i>';
  setHtml($('hdots'), dots);
}
/* the backdrop: the hidden layer loads the picture and fades in over the other */
function showPic(url) {
  if (!url || url === picUrl) return;
  picUrl = url;
  /* always into the layer that is not shown, which then fades in once loaded; a picture that fails leaves the shown one */
  var a = $('hb0'),
    b = $('hb1'),
    cur = a.classList.contains('on') ? a : b.classList.contains('on') ? b : null,
    nxt = cur === a ? b : a;
  nxt.onload = function () {
    if (picUrl !== url) return;
    nxt.classList.add('on');
    if (cur) cur.classList.remove('on');
  };
  nxt.onerror = function () {
    if (picUrl === url) picUrl = '';
  };
  nxt.src = url;
}
function slideLater() {
  clearTimeout(slideT);
  slideT = setTimeout(slide, SLIDE_MS);
}
/* the next Trending title, but never while the focus is on the hero's buttons or something covers Home */
function slide() {
  if (H.picks.length < 2 || HL.heroMode(H.picks, H.chans) !== 'film') return;
  if (
    document.hidden ||
    LIVE.on ||
    VOD.on ||
    stack.length ||
    !HL.maySlide({ inHero: !!heroRow && rows[r] === heroRow, moved: userMoved, sinceKey: Date.now() - lastKey })
  )
    return slideLater();
  H.hi = (H.hi + 1) % H.picks.length;
  drawHero(true);
  buildRows();
  slideLater();
}

/* ---------- the band: Continue watching and the channels on now ---------- */
function drawBand() {
  var band = $('band'),
    h = '';
  bandEls = [];
  var nCh = H.cont.length ? 4 : 6;
  if (H.cont.length) h += '<div class="grp"><h2>' + esc(t('Continue watching')) + '</h2><div class="cards" id="bcw"></div></div>';
  if (H.chans.length) h += '<div class="grp"><h2>' + esc(t('On your channels now')) + '</h2><div class="cards" id="bch"></div></div>';
  band = setHtml(band, h);
  document.body.classList.toggle('no-band', !h);
  H.cont.forEach(function (x) {
    var d = document.createElement('div');
    d.className = 'cw card fo';
    d._k = 'cw:' + x.kind + ':' + x.id;
    d.innerHTML =
      '<div class="pic" style="background:hsl(' +
      hashHue(String(x.id)) +
      ',30%,24%)"><div class="nm"></div></div><div class="bar' +
      (x.prog >= 0 ? '' : ' none') +
      '"><i style="width:' +
      Math.round(100 * Math.max(0, x.prog)) +
      '%"></i></div><div class="sub"></div>';
    d.querySelector('.nm').textContent = x.label;
    d.querySelector('.sub').textContent = x.sub;
    if (x.pic) {
      var i = new Image();
      i.alt = '';
      i.onerror = function () {
        if (i.parentNode) i.parentNode.removeChild(i);
      };
      i.src = x.pic;
      d.firstChild.appendChild(i);
    }
    d._run = function () {
      VOD.open(x.kind, { id: x.id, label: x.label, poster: x.poster }, true);
    };
    hit(d);
    $('bcw').appendChild(d);
    bandEls.push(d);
  });
  var nowS = Date.now() / 1000;
  H.chans.slice(0, nCh).forEach(function (ch) {
    var l = HL.chanLine(ch, nowS),
      d = document.createElement('div');
    d.className = 'ch card fo' + (ch.now || ch.next ? '' : ' ng');
    d._k = 'ch:' + ch.key;
    d.innerHTML =
      '<div class="cn"><b></b><span></span></div><div class="pt"></div><div class="tm"></div><div class="bar"><i style="width:' +
      Math.round(100 * Math.max(0, l.prog)) +
      '%"></i></div><div class="nx"></div>';
    d.querySelector('.cn b').textContent = ch.num;
    d.querySelector('.cn span').textContent = ch.name;
    if (ch.fav) d.querySelector('.cn').insertAdjacentHTML('beforeend', STAR_SVG);
    d.querySelector('.pt').textContent = l.title === 'No guide' ? t('No guide') : l.title;
    d.querySelector('.tm').textContent = l.times;
    d.querySelector('.nx').textContent = l.next;
    if (!ch.now) d.querySelector('.bar').style.visibility = 'hidden';
    d._ch = ch;
    d._run = function () {
      LIVE.enter(false, ch.key);
    };
    hit(d);
    $('bch').appendChild(d);
    bandEls.push(d);
  });
}
/* every 15 seconds: the channels' progress; a programme that ended asks the service for the next */
function homeTick() {
  if (document.hidden || LIVE.on || VOD.on) return;
  var nowS = Date.now() / 1000,
    ended = false;
  bandEls.forEach(function (d) {
    var ch = d._ch;
    if (!ch) return;
    if (HL.stale(ch, nowS)) ended = true;
    if (ch.now) d.querySelector('.bar i').style.width = Math.round(100 * HL.progress(nowS, ch.now)) + '%';
  });
  var hc = HL.heroMode(H.picks, H.chans) === 'channel' && heroChannel();
  if (ended || (hc && HL.stale(hc, nowS))) homeData();
}
setInterval(homeTick, 15000);

/* ---------- the strip, from the apps and settings ---------- */
function rebuild() {
  var by = {};
  apps.forEach(function (a) {
    by[a.id] = a;
  });
  var ids = HL.stripIds({
    dock: dockIds(),
    live: liveOn() && !!by.__live,
    vod: !!by.__vod,
    pinned: apps
      .filter(function (a) {
        return a.input;
      })
      .map(function (a) {
        return a.id;
      }),
    has: function (id) {
      return !!by[id] && !isHidden(id);
    },
    max: HOME_DOCK,
  });
  var row = $('strow');
  row.textContent = '';
  stripEls = ids.map(function (id) {
    var d = stripItem(by[id]);
    row.appendChild(d);
    return d;
  });
  var all = document.createElement('div');
  all.className = 'si ap fo';
  all._k = 'strip:all';
  all.innerHTML = svg('grid') + '<span></span>';
  all.lastChild.textContent = t('All apps');
  all._run = allAppsMenu;
  hit(all);
  row.appendChild(all);
  stripEls.push(all);
  buildRows();
}
function stripItem(a) {
  var d = document.createElement('div');
  d.className = 'si fo' + (a.input && a.off ? ' off' : '');
  d._a = a;
  d._k = 'app:' + a.id;
  if (a.input) d.innerHTML = '<img class="ic" alt="" src="' + INPUT_ICON + '"><span></span><span class="dot"></span>';
  else {
    d.innerHTML = '<img class="ic" alt=""><span></span>';
    var i = d.firstChild;
    i.onerror = function () {
      var s = document.createElement('span');
      s.className = 'ic';
      s.innerHTML = svg('grid');
      if (i.parentNode) i.parentNode.replaceChild(s, i);
    };
    i.src = a.id === '__live' ? LIVE_ICON : a.id === '__vod' ? VOD_ICON : API + '/icon/' + encodeURIComponent(a.id);
  }
  d.children[1].textContent = a.title;
  hit(d);
  return d;
}

/* ---------- focus ---------- */
function buildRows() {
  var old = rows[r] && rows[r][c];
  if (old) old.classList.remove('f');
  heroRow = heroEls.length ? heroEls : null;
  stripRow = stripEls;
  var keepR = r;
  rows = [heroEls, bandEls, stripEls].filter(function (x) {
    return x.length;
  });
  if (!userMoved) return setFocus(rows.indexOf(heroRow || stripRow), 0, true);
  for (var i = 0; i < rows.length; i++)
    for (var j = 0; j < rows[i].length; j++) if (rows[i][j]._k === focusKey) return setFocus(i, j, true);
  /* what had the focus is gone: the same row number, as near as there is */
  setFocus(Math.min(keepR, rows.length - 1), c, true);
}
/* auto: placed by Home itself, not moved by the viewer */
function setFocus(nr, nc, auto) {
  if (!auto) userMoved = true;
  var old = rows[r] && rows[r][c],
    oldRow = rows[r];
  if (old) old.classList.remove('f');
  r = Math.max(0, Math.min(nr, rows.length - 1));
  c = Math.max(0, Math.min(nc, rows[r].length - 1));
  var e = rows[r][c];
  e.classList.add('f');
  focusKey = e._k;
  if (oldRow === heroRow && rows[r] !== heroRow) slideLater(); /* the hero waits a whole turn after the focus left it */
  if (rows[r] === stripRow) {
    /* the strip moves left when the focus would leave the screen */
    var right = e.offsetLeft + e.offsetWidth,
      x = right > 1728 - 40 ? right - (1728 - 40) : 0;
    $('strow').style.transform = x ? 'translateX(' + -x + 'px)' : '';
  }
}
function mapCol(from, to, col) {
  return from > 1 ? Math.round((col * (to - 1)) / (from - 1)) : 0;
}
function posOf(e) {
  for (var i = 0; i < rows.length; i++) {
    var j = rows[i].indexOf(e);
    if (j >= 0) return [i, j];
  }
  return null;
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
  });
}
