/* ---------- Home (fork): what the screen shows, without the page (tools/test/homelib.test.js) ---------- */
var HL = (function () {
  /* the page's translation (clock.js); English where there is none (the tests) */
  function tx(k) {
    return typeof t === 'function' ? t(k) : k;
  }
  /* the hero: the films Trending row's titles with a backdrop, without those Home's Continue watching row already shows */
  function heroPicks(rows, skipIds, max) {
    var tr = null;
    (rows || []).forEach(function (rw) {
      if (rw && rw.id === 'trending') tr = rw;
    });
    return ((tr && tr.items) || [])
      .filter(function (it) {
        return it && it.backdrop && (skipIds || []).indexOf(it.id) < 0;
      })
      .slice(0, max);
  }
  /* Films & Series' own Continue watching lists (a card per series, removed titles left out), newest first, the first three (or max).
     cards: the curator's cards by kind and id (/vod/cards), when known: their poster and title win over the ones saved when the title
     was played, which the curator's image cache may no longer have */
  function continueCards(st, now, max, cards) {
    var films = VL.continueFilms(st.items || {}, st.hidden).map(function (x) {
        return { kind: 'films', x: x };
      }),
      shows = VL.continueShows(st.items || {}, now, st.hidden).map(function (x) {
        return { kind: 'series', x: x };
      });
    return films
      .concat(shows)
      .sort(function (a, b) {
        return b.x.at - a.x.at;
      })
      .slice(0, max || 3)
      .map(function (c) {
        var k = (cards && cards[c.kind] && cards[c.kind][c.x.id]) || {};
        return {
          kind: c.kind,
          id: c.x.id,
          label: k.label || c.x.name,
          poster: k.poster || c.x.poster || '',
          sub: VL.continueSub(c.x),
          prog: VL.continueProgress(c.x),
          at: c.x.at,
        };
      });
  }
  /* the hero's first button: Resume, with the time left, for a film started and not finished */
  function heroPlay(item, items) {
    var mine = items && items['film:' + item.id];
    return VL.resumeAt(mine) > 0 && mine.dur > mine.pos
      ? { label: 'Resume', left: VL.fmtLeft(mine.dur - mine.pos) }
      : { label: 'Play', left: '' };
  }
  /* a film when Films & Series has one to suggest, else the channel watched last, else nothing */
  function heroMode(picks, chans) {
    return picks && picks.length ? 'film' : chans && chans.length ? 'channel' : 'none';
  }
  /* the strip: Live TV and Films & Series, the saved dock (at most max), then the pinned inputs that are not in it */
  function stripIds(o) {
    var out = [];
    if (o.live) out.push('__live');
    if (o.vod) out.push('__vod');
    (o.dock || [])
      .filter(function (id) {
        return id !== '__live' && id !== '__vod' && o.has(id) && out.indexOf(id) < 0;
      })
      .slice(0, o.max)
      .forEach(function (id) {
        out.push(id);
      });
    (o.pinned || []).forEach(function (id) {
      if (out.indexOf(id) < 0 && o.has(id)) out.push(id);
    });
    return out;
  }
  /* how far into a guide entry [start, end, ...] (seconds), 0..1 */
  function progress(nowSec, e) {
    if (!e || !(e[1] > e[0])) return 0;
    return Math.max(0, Math.min(1, (nowSec - e[0]) / (e[1] - e[0])));
  }
  function two(n) {
    return n < 10 ? '0' + n : String(n);
  }
  function hm(sec) {
    var d = new Date(sec * 1000);
    return two(d.getHours()) + ':' + two(d.getMinutes());
  }
  /* a channel card's lines from the service's now and next (/api/live/home) */
  function chanLine(ch, nowSec) {
    var n = ch.now;
    /* between two programmes: the next one */
    if (!n && ch.next) return { title: ch.next[2], times: tx('From %s').replace('%s', hm(ch.next[0])), next: '', prog: 0 };
    if (!n) return { title: 'No guide', times: '', next: '', prog: -1 };
    return {
      title: n[2],
      times: tx('%s to %s').replace('%s', hm(n[0])).replace('%s', hm(n[1])),
      next: ch.next ? tx('Then %s').replace('%s', ch.next[2]) : '',
      prog: progress(nowSec, n),
    };
  }
  /* a channel card to ask the service about again: the programme on now ended, or the next one began */
  function stale(ch, nowSec) {
    return !!((ch.now && nowSec >= ch.now[1]) || (!ch.now && ch.next && nowSec >= ch.next[0]));
  }
  /* the hero slides while nobody uses the remote (also with the focus resting on Play, where Home puts it), never while the viewer is
     on its buttons, and never within a few seconds of a key, so OK never lands on a title that just changed */
  function maySlide(o) {
    if (o.sinceKey < 4000) return false;
    return !(o.inHero && o.moved);
  }
  return {
    stale: stale,
    maySlide: maySlide,
    heroPicks: heroPicks,
    continueCards: continueCards,
    heroPlay: heroPlay,
    heroMode: heroMode,
    stripIds: stripIds,
    progress: progress,
    hm: hm,
    chanLine: chanLine,
  };
})();
