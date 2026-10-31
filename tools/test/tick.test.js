// Repeating timers on the page (app/src/js/tick.js, run here as the page would). The page the TV starts while it boots is treated
// as hidden and its own repeating timers slow to once a minute; a Web Worker's do not, so TICK runs its timers on a worker's
// ticks, and on setInterval where there is no worker or it fails.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const { root, ok, run } = require('./lib');

const src = fs.readFileSync(path.join(root, 'app', 'src', 'js', 'tick.js'), 'utf8');

/* a page: a clock that only moves when told, setInterval/setTimeout that are recorded, and (withWorker) a Worker stand-in */
function page(withWorker, workerThrows) {
  const pg = { now: 1000, intervals: [], timeouts: [], workers: [], nextId: 1 };
  const ctx = {
    Date: { now: () => pg.now },
    setInterval: (fn, ms) => (pg.intervals.push({ id: pg.nextId, fn: fn, ms: ms }), pg.nextId++),
    clearInterval: id => (pg.intervals = pg.intervals.filter(x => x.id !== id)),
    setTimeout: (fn, ms) => (pg.timeouts.push({ fn: fn, ms: ms }), pg.nextId++),
  };
  if (withWorker) {
    ctx.Blob = function (parts, opts) {
      this.parts = parts;
      this.type = opts.type;
    };
    ctx.URL = { createObjectURL: b => ((pg.blob = b), 'blob:x') };
    ctx.Worker = function (url) {
      if (workerThrows) throw new Error('no workers here');
      this.url = url;
      this.terminated = false;
      this.terminate = () => (this.terminated = true);
      pg.workers.push(this);
    };
  }
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.TICK = TICK;', ctx);
  pg.TICK = ctx.TICK;
  pg.live = () => pg.workers.filter(w => !w.terminated);
  /* the worker's tick, ms after the last one */
  pg.tick = ms => {
    pg.now += ms;
    pg.live().forEach(w => w.onmessage({ data: 0 }));
  };
  return pg;
}

run(async () => {
  // no Worker (old pages, the tests of other page files): plain setInterval
  {
    const pg = page(false);
    let n = 0;
    const id = pg.TICK.every(1000, () => n++);
    ok(pg.intervals.length === 1 && pg.intervals[0].ms === 1000, 'without workers: every() is a setInterval');
    pg.intervals[0].fn();
    ok(n === 1, 'without workers: the interval runs the function');
    pg.TICK.stop(id);
    ok(pg.intervals.length === 0, 'without workers: stop() clears the interval');
    pg.TICK.stop(id);
    pg.TICK.stop(0);
    ok(true, 'stop() of an unknown or empty id does nothing');
  }

  // a worker: one for the page, made from a script of its own, ticking once a second
  {
    const pg = page(true);
    let a = 0,
      b = 0;
    const ia = pg.TICK.every(1000, () => a++);
    const ib = pg.TICK.every(15000, () => b++);
    ok(pg.workers.length === 1 && pg.intervals.length === 0, 'with workers: one worker for all timers, no setInterval');
    ok(
      /postMessage/.test(pg.blob.parts.join('')) && /1000/.test(pg.blob.parts.join('')) && pg.blob.type === 'text/javascript',
      'the worker posts a message every second'
    );
    pg.tick(1000);
    ok(a === 1 && b === 0, 'a tick runs what is due, not what is not');
    for (let i = 0; i < 14; i++) pg.tick(1000);
    ok(a === 15 && b === 1, 'a 15 s timer runs on the 15th tick');
    pg.tick(400);
    ok(a === 15, 'a tick that comes early does not run a 1 s timer twice');
    pg.tick(950);
    ok(a === 16, 'a tick a little short of a second still counts');
    pg.tick(60000);
    ok(a === 17 && b === 2, 'after a long gap a timer runs once, not once per missed second');
    pg.TICK.stop(ia);
    pg.tick(1000);
    ok(a === 17, 'a stopped timer does not run');
    ok(pg.live().length === 1, 'the worker stays while a timer uses it');
    pg.TICK.stop(ib);
    ok(pg.live().length === 0, 'the worker ends with the last timer');
    pg.TICK.every(1000, () => a++);
    ok(pg.workers.length === 2 && pg.live().length === 1, 'a new timer starts a worker again');
  }

  // a timer that throws: reported as a page error, the others still run
  {
    const pg = page(true);
    let n = 0;
    pg.TICK.every(1000, () => {
      throw new Error('boom');
    });
    pg.TICK.every(1000, () => n++);
    pg.tick(1000);
    ok(n === 1, 'a throwing timer does not stop the others');
    let thrown = null;
    try {
      pg.timeouts[0].fn();
    } catch (e) {
      thrown = e;
    }
    ok(thrown && thrown.message === 'boom', 'the error is thrown again outside the tick, as a page error');
  }

  // the worker fails: every timer goes on with setInterval, new ones too
  {
    const pg = page(true);
    pg.TICK.every(1000, () => {});
    pg.TICK.every(30000, () => {});
    pg.workers[0].onerror({});
    ok(pg.live().length === 0, 'a failed worker is ended');
    ok(pg.intervals.map(x => x.ms).join() === '1000,30000', 'after a worker error the timers run on setInterval');
    const id = pg.TICK.every(2500, () => {});
    ok(pg.intervals.length === 3 && pg.workers.length === 1, 'later timers use setInterval, no new worker');
    pg.TICK.stop(id);
    ok(pg.intervals.length === 2, 'stop() clears a fallback interval');
  }

  // Worker exists but cannot be made (a page without blob workers): setInterval
  {
    const pg = page(true, true);
    pg.TICK.every(1000, () => {});
    ok(pg.intervals.length === 1 && pg.workers.length === 0, 'a worker that cannot be made: setInterval');
  }
});
