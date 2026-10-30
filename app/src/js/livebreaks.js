/* ---------- Live TV: ad breaks (the page's side) ---------- */
/* The page asks the service once a second whether the channel is in a break (/api/breaks/now). next() turns each reply into
   'start', 'end' or 'none' and keeps the state; the picture is dimmed (or a partner channel shown) between start and end.
   Three failed polls in a row end a break, so the picture is never left dimmed when the curator stops answering. */
var LB = (function () {
  /* the state for a channel the viewer is not watching a break on */
  function fresh() {
    return { on: false, id: null, skip: null, fails: 0 };
  }

  /* one reply from the service (or null when the request failed) */
  function next(st, reply) {
    if (!reply || reply.status === 'unavailable') {
      st.fails++;
      if (st.fails >= 3 && st.on) {
        st.on = false;
        return 'end';
      }
      return 'none';
    }
    st.fails = 0;
    if (reply.status === 'works' && reply.break) {
      if (!st.on && reply.id !== st.skip) {
        st.on = true;
        st.id = reply.id;
        return 'start';
      }
      return 'none';
    }
    if (st.on) {
      st.on = false;
      return 'end';
    }
    return 'none';
  }

  /* "Se reklamerne" (watch the ads): this break does not dim again */
  function cancel(st) {
    st.skip = st.id;
    st.on = false;
  }

  /* the viewer changed channel or left Live TV */
  function reset(st) {
    var f = fresh();
    st.on = f.on;
    st.id = f.id;
    st.skip = f.skip;
    st.fails = f.fails;
  }

  /* 'partner' shows the partner channel only when the viewer chose it, one exists and it is another channel */
  function how(mode, partnerKey, curKey, hasPartner) {
    return mode === 'partner' && hasPartner && partnerKey !== curKey ? 'partner' : 'dim';
  }

  /* seconds into a break as m:ss; '' when the value is not a finite, non-negative number */
  function clock(sec) {
    if (typeof sec !== 'number' || !isFinite(sec) || sec < 0) return '';
    var s = Math.floor(sec);
    var r = s % 60;
    return Math.floor(s / 60) + ':' + (r < 10 ? '0' : '') + r;
  }

  return { fresh: fresh, next: next, cancel: cancel, reset: reset, how: how, clock: clock };
})();
