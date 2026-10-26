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
  function continueFilms(items) {
    return values(items)
      .filter(function (x) {
        return x.kind === 'film' && x.pos > 0 && !x.watched;
      })
      .sort(newestFirst)
      .slice(0, 20);
  }
  /* one card per show with an episode played in the last 90 days, newest first */
  function continueShows(items, now) {
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
        out.push({ id: x.show.id, name: x.show.name, poster: x.show.poster || '', at: x.at });
      });
    return out.slice(0, 20);
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
  /* what "Continue" plays: the most recent half-watched episode, else the one after the most recently watched, else the first */
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
    var n = all[(lastI + 1) % all.length];
    return { season: n.season, ep: n.ep, resume: 0 };
  }
  /* the episode after this one, or null after the last */
  function after(seasons, id) {
    var all = flat(seasons);
    for (var i = 0; i < all.length - 1; i++) if (all[i].ep.id === id) return all[i + 1].ep;
    return null;
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
