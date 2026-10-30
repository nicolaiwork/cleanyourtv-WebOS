// The input hook (inputhook.js): which of LG's processes it goes into (issue 23: hooked into micomservice, HDMI-CEC control of
// other devices and eARC stopped working).
const fs = require('fs'),
  path = require('path');
const { ok, req, run } = require('./lib');

const PROC = process.env.CYTV_PROC;
const proc = (pid, name) => {
  fs.mkdirSync(path.join(PROC, String(pid)));
  fs.writeFileSync(path.join(PROC, String(pid), 'comm'), name + '\n');
};

run(async () => {
  const hook = req('inputhook');
  proc(100, 'micomservice');
  proc(200, 'lginput2');
  proc(300, 'tvservice');
  proc(400, 'bash');
  let p = hook.procs();
  ok(
    p.length === 1 && p[0].name === 'lginput2',
    "where LG's input service runs, the hook goes only into lginput2, never into micomservice"
  );
  fs.unlinkSync(path.join(PROC, '200', 'comm'));
  fs.rmdirSync(path.join(PROC, '200'));
  p = hook.procs();
  ok(
    p
      .map(x => x.name)
      .sort()
      .join() === 'micomservice,tvservice',
    'firmware without lginput2: the other input processes, as before'
  );

  // the binds: ours follow the keys, LG's and other binds stay
  const binds = path.join(process.env.CYTV_HOOK_CFG, 'keybinds.json');
  const read = () => JSON.parse(fs.readFileSync(binds, 'utf8'));
  const cmd = k => (read()[k] || {}).command || '';
  let home = '773',
    guide = '';
  hook.setHomeKey(() => home);
  hook.setGuideKey(() => guide);
  hook.setVoiceKey(() => '');
  hook.ensure(true, '1023');
  ok(/inputkey\.sh$/.test(cmd('1023')) && /homekey\.sh$/.test(cmd('773')), 'the Input key and a learned Home key are bound');
  const b = read();
  b['999'] = { action: 'exec', command: 'echo other' };
  fs.writeFileSync(binds, JSON.stringify(b));
  home = '';
  guide = '362';
  hook.ensure(false, '1023');
  ok(
    !read()['773'] && !read()['1023'] && /guidekey\.sh$/.test(cmd('362')) && cmd('999') === 'echo other',
    'without a Home key (or with LG as Home) its bind goes; the Input key released; other binds are left alone'
  );

  // the remote's other buttons (buttons.js): bound next to the keys, never over one of them or over a bind that is not ours
  const bk = 'sh ' + process.env.CYTV_DIR + '/buttonkey.sh ';
  let btn = { 1037: bk + 'live', 362: bk + 'vod', 999: bk + 'none' };
  hook.setButtons(() => btn);
  hook.ensure(false, '1023');
  ok(
    /buttonkey\.sh live$/.test(cmd('1037')) && /guidekey\.sh$/.test(cmd('362')) && cmd('999') === 'echo other',
    'a button is bound; a learned key and a bind that is not ours win over it'
  );
  btn = { 1038: bk + 'app youtube.leanback.v4' };
  guide = '';
  hook.ensure(false, '1023');
  ok(
    !read()['1037'] && !read()['362'] && /app youtube\.leanback\.v4$/.test(cmd('1038')) && cmd('999') === 'echo other',
    "a button set back to LG's own loses its bind, wherever it was; the new one is bound"
  );
});
