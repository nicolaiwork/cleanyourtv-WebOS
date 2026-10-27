/* ---------- Films & Series (fork): the rules behind resume, watched marks and the rows, without the page (tools/test/vodlib.test.js) ---------- */
var VL = (function () {
  /* watched: less than 5 minutes or 5 % left */
  function watched(pos, dur) {
    return dur > 0 && (dur - pos < 300 || pos / dur >= 0.95);
  }
  /* a position worth keeping: past the first seconds, of a title whose length is known */
  function shouldSave(pos, dur) {
    return pos >= 5 && dur > 0 && isFinite(dur);
  }
  function resumeAt(item) {
    return item && !item.watched && item.pos >= 5 ? Math.floor(item.pos) : 0;
  }
  function values(items) {
    var out = [];
    for (var k in items) if (Object.prototype.hasOwnProperty.call(items, k)) out.push(items[k]);
    return out;
  }
  function newestFirst(a, b) {
    return b.at - a.at;
  }
  /* taken off Continue watching by hand (hidden: {"film:1" | "show:2": at}) and not played since */
  function isHidden(hidden, key, at) {
    return !!hidden && hidden[key] >= at;
  }
  function continueFilms(items, hidden) {
    return values(items)
      .filter(function (x) {
        return x.kind === 'film' && x.pos > 0 && !x.watched && !isHidden(hidden, 'film:' + x.id, x.at);
      })
      .sort(newestFirst)
      .slice(0, 20);
  }
  /* one card per show with an episode played in the last 90 days, newest first, with that episode (ep). A show whose last episode was
     watched is finished and left out (next: null is stored with the show's last episode). */
  function continueShows(items, now, hidden) {
    var seen = {},
      out = [];
    values(items)
      .filter(function (x) {
        return x.kind === 'episode' && x.show && now - x.at < 90 * 24 * 3600 * 1000;
      })
      .sort(newestFirst)
      .forEach(function (x) {
        if (seen[x.show.id]) return;
        seen[x.show.id] = true;
        if (x.watched && x.next === null) return;
        if (isHidden(hidden, 'show:' + x.show.id, x.at)) return;
        out.push({ id: x.show.id, name: x.show.name, poster: x.show.poster || '', at: x.at, ep: x });
      });
    return out.slice(0, 20);
  }
  /* My list (list: {"film:1" | "show:2": {kind, id, name, poster, at}}) for one tab, newest first */
  function myList(list, kind) {
    return values(list || {})
      .filter(function (x) {
        return x.kind === kind;
      })
      .sort(newestFirst);
  }
  function fmtLeft(sec) {
    var m = Math.max(1, Math.round((sec || 0) / 60));
    return (m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min') + ' left';
  }
  /* the line on a Continue watching card: what is left of a film; for a show the episode and what is left, or the one after */
  function continueSub(x) {
    var e = x.ep;
    if (!e) return x.dur > x.pos ? fmtLeft(x.dur - x.pos) : '';
    if (!e.watched) return epCode(e.season, e.num) + (e.dur > e.pos ? '  ·  ' + fmtLeft(e.dur - e.pos) : '');
    return e.next ? 'Next: ' + epCode(e.next.season, e.next.num) : 'After ' + epCode(e.season, e.num);
  }
  /* how far into a Continue watching card (0..1), or -1 for none */
  function continueProgress(x) {
    var e = x.ep || x;
    return !e.watched && e.dur > 0 && e.pos > 0 ? Math.min(1, e.pos / e.dur) : -1;
  }
  function flat(seasons) {
    var out = [];
    (seasons || []).forEach(function (s) {
      (s.episodes || []).forEach(function (ep) {
        out.push({ season: s.season, ep: ep });
      });
    });
    return out;
  }
  /* what "Continue" plays: the most recent half-watched episode, else the one after the most recently watched, else the first.
     After the last episode was watched: the first again, with again set. */
  function nextEpisode(seasons, items) {
    var all = flat(seasons),
      last = null,
      lastI = -1;
    if (!all.length) return null;
    for (var i = 0; i < all.length; i++) {
      var it = items['episode:' + all[i].ep.id];
      if (it && (!last || it.at > last.at)) {
        last = it;
        lastI = i;
      }
    }
    if (!last) return { season: all[0].season, ep: all[0].ep, resume: 0 };
    if (!last.watched && last.pos >= 5) return { season: all[lastI].season, ep: all[lastI].ep, resume: Math.floor(last.pos) };
    if (lastI === all.length - 1) return { season: all[0].season, ep: all[0].ep, resume: 0, again: true };
    var n = all[lastI + 1];
    return { season: n.season, ep: n.ep, resume: 0 };
  }
  /* the episode after this one, or null after the last */
  function after(seasons, id) {
    var all = flat(seasons);
    for (var i = 0; i < all.length - 1; i++) if (all[i].ep.id === id) return all[i + 1].ep;
    return null;
  }
  /* the episode after this one as {season, num} for the service, or null after the last */
  function nextOf(seasons, id) {
    var all = flat(seasons);
    for (var i = 0; i < all.length; i++)
      if (all[i].ep.id === id) return i < all.length - 1 ? { season: all[i + 1].season, num: all[i + 1].ep.num || 0 } : null;
    return null;
  }
  /* where a tab's rows were left (rows: [{src, cid, fi}], ri), to be found again on the next visit even if rows came or went */
  function rowKey(rw) {
    return rw.src + ':' + (rw.cid || '');
  }
  function remember(rows, ri) {
    var fi = {};
    rows.forEach(function (rw) {
      if (rw.fi > 0 && rw.src !== 'continue') fi[rowKey(rw)] = rw.fi;
    });
    return { row: rows[ri] ? rowKey(rows[ri]) : '', fi: fi };
  }
  /* the row index to return to; each row's fi is set from the memory (the page loads a row far enough to reach it) */
  function recall(mem, rows) {
    var ri = 0;
    if (!mem) return 0;
    rows.forEach(function (rw, i) {
      var k = rowKey(rw);
      if (k === mem.row) ri = i;
      rw.want = (mem.fi && mem.fi[k]) || 0;
    });
    return ri;
  }
  /* the category sorts the curator offers, in the order OK steps through them */
  var SORTS = [
    ['added', 'Newest'],
    ['name', 'A–Z'],
    ['year', 'Year'],
    ['rating', 'Rating'],
  ];
  function sorts(offered) {
    return SORTS.filter(function (s) {
      return (offered || []).indexOf(s[0]) >= 0;
    });
  }
  function nextSort(cur, offered) {
    var list = sorts(offered);
    if (!list.length) return '';
    for (var i = 0; i < list.length; i++) if (list[i][0] === cur) return list[(i + 1) % list.length][0];
    return list[0][0];
  }
  function sortLabel(cur, offered) {
    var list = sorts(offered);
    for (var i = 0; i < list.length; i++) if (list[i][0] === cur) return list[i][1];
    return list.length ? list[0][1] : '';
  }
  /* seconds per keypress while Left/Right is held: 10, then 30, then a minute */
  function skipStep(count) {
    return count <= 3 ? 10 : count <= 8 ? 30 : 60;
  }
  function two(n) {
    return n < 10 ? '0' + n : String(n);
  }
  function clock(sec) {
    var s = Math.max(0, Math.floor(sec || 0)),
      h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60);
    return h ? h + ':' + two(m) + ':' + two(s % 60) : m + ':' + two(s % 60);
  }
  function fmtLength(sec) {
    var m = Math.round((sec || 0) / 60);
    if (!(m > 0)) return '';
    return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min';
  }
  function endsAt(nowMs, remainingSec) {
    var d = new Date(nowMs + remainingSec * 1000);
    return two(d.getHours()) + ':' + two(d.getMinutes());
  }
  /* the posters of a long row that are drawn: [from, to) around the focus */
  function windowOf(focus, total, before, ahead) {
    return [Math.max(0, Math.min(focus - before, total)), Math.max(0, Math.min(focus + ahead, total))];
  }
  function epCode(season, num) {
    return 'S' + two(season) + 'E' + two(num);
  }
  return {
    watched: watched,
    shouldSave: shouldSave,
    resumeAt: resumeAt,
    continueFilms: continueFilms,
    continueShows: continueShows,
    myList: myList,
    fmtLeft: fmtLeft,
    continueSub: continueSub,
    continueProgress: continueProgress,
    nextOf: nextOf,
    rowKey: rowKey,
    remember: remember,
    recall: recall,
    nextSort: nextSort,
    sortLabel: sortLabel,
    nextEpisode: nextEpisode,
    after: after,
    skipStep: skipStep,
    clock: clock,
    fmtLength: fmtLength,
    endsAt: endsAt,
    windowOf: windowOf,
    epCode: epCode,
  };
})();
