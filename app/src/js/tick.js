/* ---------- repeating timers that keep time (fork) ---------- */
/* The launcher page that the TV starts while it boots is treated by the browser as hidden, even while it is on screen, and five
   minutes later its repeating timers run only once a minute (Chromium's throttling of hidden pages). A page loaded later is not
   slowed. A Web Worker's timers are not slowed either: one worker sends a tick every second and TICK.every(ms, fn) runs fn on
   the first tick at least ms after the last run. Where a worker cannot be made, or stops with an error, setInterval is used. */
var TICK = (function () {
  var subs = {},
    nextId = 1,
    worker = null,
    failed = false;

  function fallback(s) {
    if (!s.iv) s.iv = setInterval(s.fn, s.ms);
  }
  function onTick() {
    var now = Date.now();
    for (var id in subs) {
      var s = subs[id];
      if (!s || s.iv || now - s.at < s.ms - 100) continue; /* 100 ms early still counts: ticks are a second apart */
      s.at = now;
      try {
        s.fn();
      } catch (e) {
        setTimeout(function () {
          throw e; /* reported as a page error, as from a timer; the other ticks still run */
        }, 0);
      }
    }
  }
  function fail() {
    failed = true;
    if (worker) {
      try {
        worker.terminate();
      } catch (e) {}
    }
    worker = null;
    for (var id in subs) fallback(subs[id]);
  }
  function start() {
    if (worker || failed) return !!worker;
    try {
      var url = URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},1000)'], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = onTick;
      worker.onerror = fail;
    } catch (e) {
      fail();
    }
    return !!worker;
  }
  function stopWorker() {
    for (var id in subs) return; /* still in use */
    if (!worker) return;
    try {
      worker.terminate();
    } catch (e) {}
    worker = null;
  }

  /* run fn every ms milliseconds (a second or more); returns an id for stop() */
  function every(ms, fn) {
    var id = nextId++,
      s = { ms: ms, fn: fn, at: Date.now(), iv: 0 };
    subs[id] = s;
    if (!start()) fallback(s);
    return id;
  }
  function stop(id) {
    var s = id && subs[id];
    if (!s) return;
    if (s.iv) clearInterval(s.iv);
    delete subs[id];
    stopWorker();
  }
  return { every: every, stop: stop };
})();
