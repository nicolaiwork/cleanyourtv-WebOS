// Live TV ad breaks on the page (app/src/js/livebreaks.js, run here as the page would): the break state from the service's
// /api/breaks/now replies, ending a break when the curator stops answering, the picture's mode, and the clock text.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const { root, ok, run } = require('./lib');

const src = fs.readFileSync(path.join(root, 'app', 'src', 'js', 'livebreaks.js'), 'utf8');
function load() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.LB = LB;', ctx);
  return ctx.LB;
}

run(async () => {
  const LB = load();

  const st = LB.fresh();
  ok(st.on === false && st.id === null && st.skip === null && st.fails === 0, 'a fresh state is off');
  ok(LB.next(st, { status: 'works', break: true, id: 7, elapsed: 0 }) === 'start' && st.on && st.id === 7, 'start on a break');
  ok(LB.next(st, { status: 'works', break: true, id: 7, elapsed: 1 }) === 'none', 'once per break');
  ok(LB.next(st, { status: 'works', break: false, id: null }) === 'end' && !st.on, 'end when the logo is back');

  LB.next(st, { status: 'works', break: true, id: 8 });
  LB.cancel(st);
  ok(st.on === false && st.skip === 8, 'cancel clears the break and remembers its id');
  ok(LB.next(st, { status: 'works', break: true, id: 8 }) === 'none', 'cancel: the same break stays undimmed');
  ok(LB.next(st, { status: 'works', break: true, id: 9 }) === 'start', 'cancel: the next break dims again');

  ok(
    [null, null].map(r => LB.next(st, r)).join() === 'none,none' && LB.next(st, null) === 'end' && !st.on,
    'fails undim: three failed polls end it'
  );
  ok(LB.next(st, { status: 'works', break: true, id: 10 }) === 'start', 'after a failed break a new break dims');
  ok(LB.next(st, { status: 'unavailable' }) === 'none' && st.fails === 1, 'unavailable counts as a failed poll');
  ok(LB.next(st, { status: 'works', break: true, id: 10 }) === 'none' && st.fails === 0 && st.on, 'a good reply clears the count');
  ok(LB.next(st, null) === 'none' && LB.next(st, null) === 'none' && st.on, 'two failures do not end a break');
  ok(LB.next(st, { status: 'off' }) === 'end' && !st.on, 'a curator that is off ends the break');

  const off = LB.fresh();
  ok(
    LB.next(off, null) === 'none' && LB.next(off, null) === 'none' && LB.next(off, null) === 'none' && off.fails === 3 && !off.on,
    'failures without a break start nothing'
  );
  ok(LB.next(LB.fresh(), { status: 'works', break: true, id: undefined }) === 'start', 'a break without an id still starts');
  ok(LB.next(LB.fresh(), { status: 'off', break: true, id: 3 }) === 'none', 'a break reply that is not works does not start');

  LB.reset(st);
  ok(!st.on && st.id === null && st.skip === null && st.fails === 0, 'reset gives the fresh values');

  ok(LB.how('partner', 'a', 'b', true) === 'partner', 'partner mode uses a partner channel that differs');
  ok(LB.how('partner', 'a', 'a', true) === 'dim', 'partner mode dims when the partner is the same channel');
  ok(LB.how('partner', 'a', 'b', false) === 'dim', 'partner mode dims without a partner');
  ok(LB.how('dim', 'a', 'b', true) === 'dim', 'dim mode always dims');

  ok(LB.clock(72) === '1:12' && LB.clock(5) === '0:05' && LB.clock(0) === '0:00', 'the clock reads minutes and seconds');
  ok(LB.clock(3600) === '60:00', 'long breaks keep counting minutes');
  ok(LB.clock(null) === '' && LB.clock(undefined) === '' && LB.clock('12') === '' && LB.clock(NaN) === '', 'no number gives no clock');
  ok(LB.clock(-3) === '' && LB.clock(Infinity) === '', 'a negative or infinite number gives no clock');
});
