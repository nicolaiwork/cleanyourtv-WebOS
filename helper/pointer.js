// Hide the Magic Remote pointer (the option hidePointer, off by default; docs/input-key.md#the-pointer).
// LG's input service (lginput2) shows the pointer by sending the compositor its custom key CURSOR_ON (code 1198), which it takes from a
// table of its custom keys: 16-byte entries {1, code, 0...}, codes 1194 to 1199 in a row. Every way it shows the pointer (the Home key,
// moving the remote, the wheel, its own retry timer) goes through that one entry, so writing CURSOR_OFF (1199) over it in the running
// process keeps the pointer hidden while every button works. Only the process's memory changes (through /proc/<pid>/mem), nothing on
// disk: a restart of lginput2 or of the TV undoes it, so it is checked again every 10 s. Switched off, the entry gets 1198 back.
const fs = require('fs');
const P = require('./paths');

const NAME = 'lginput2',
  FIRST = 1194, // the first code of the six entries searched for
  CURSOR_ON = 1198,
  CURSOR_OFF = 1199,
  ENTRY = 16,
  CHECK_MS = 10000;

// The file offset of CURSOR_ON's code in the program, or -1 when the six entries are not there exactly once (other firmware).
function findEntry(bin) {
  const sig = Buffer.alloc(ENTRY * 6);
  for (let i = 0; i < 6; i++) {
    sig.writeUInt16LE(1, i * ENTRY);
    sig.writeUInt16LE(FIRST + i, i * ENTRY + 2);
  }
  const at = bin.indexOf(sig);
  if (at < 0 || bin.indexOf(sig, at + 1) >= 0) return -1;
  return at + (CURSOR_ON - FIRST) * ENTRY + 2;
}
// A file offset in a 32-bit ELF program as the address it is loaded at (relative to the load base), through its PT_LOAD headers; -1
// when no segment holds it.
function fileToVa(bin, off) {
  if (bin.length < 0x34 || bin.readUInt32BE(0) !== 0x7f454c46 || bin[4] !== 1) return -1;
  const phoff = bin.readUInt32LE(0x1c),
    phent = bin.readUInt16LE(0x2a),
    phnum = bin.readUInt16LE(0x2c);
  for (let i = 0; i < phnum; i++) {
    const p = phoff + i * phent;
    if (p + 20 > bin.length || bin.readUInt32LE(p) !== 1) continue;
    const o = bin.readUInt32LE(p + 4),
      va = bin.readUInt32LE(p + 8),
      size = bin.readUInt32LE(p + 16);
    if (off >= o && off < o + size) return va + (off - o);
  }
  return -1;
}
function findPid() {
  let all = [];
  try {
    all = fs.readdirSync(P.PROC);
  } catch (_) {}
  for (const p of all) {
    if (!/^\d+$/.test(p)) continue;
    try {
      if (fs.readFileSync(P.PROC + '/' + p + '/comm', 'utf8').trim() === NAME) return p;
    } catch (_) {}
  }
  return '';
}
// Where CURSOR_ON's code is in the running process: {addr} or {unsupported: why}
function locate(pid) {
  const dir = P.PROC + '/' + pid;
  const exe = fs.readlinkSync(dir + '/exe');
  const bin = fs.readFileSync(dir + '/exe');
  const off = findEntry(bin);
  if (off < 0) return { unsupported: 'the cursor keys were not found in ' + NAME };
  const va = fileToVa(bin, off);
  if (va < 0) return { unsupported: 'the cursor keys are outside the loaded program' };
  // the program's first mapping (file offset 0) is its load base
  const line = fs
    .readFileSync(dir + '/maps', 'utf8')
    .split('\n')
    .filter(l => / 00000000 /.test(l) && l.slice(-exe.length - 1) === ' ' + exe)[0];
  if (!line) return { unsupported: NAME + ' is not mapped from ' + exe };
  return { addr: parseInt(line.split('-')[0], 16) + va };
}

function create(ctx) {
  const { config } = ctx;
  let state = { state: 'off' },
    where = null, // {pid, addr} or {pid, unsupported}, found once per process
    dirty = true; // check even while off: at start, and after switching off
  function set(s, detail) {
    if (s === state.state && detail === state.detail) return;
    state = detail ? { state: s, detail } : { state: s };
    console.log('pointer: ' + s + (detail ? ' (' + detail + ')' : ''));
  }
  function sync() {
    const on = !!config.options().hidePointer;
    if (!on && !dirty) return set('off');
    const pid = findPid();
    if (!pid) return set(on ? 'waiting' : 'off', on ? NAME + ' is not running' : '');
    let fd = null;
    try {
      if (!where || where.pid !== pid) where = Object.assign({ pid }, locate(pid));
      if (where.unsupported) return set(on ? 'unsupported' : 'off', on ? where.unsupported : '');
      fd = fs.openSync(P.PROC + '/' + pid + '/mem', 'r+');
      const b = Buffer.alloc(2);
      fs.readSync(fd, b, 0, 2, where.addr);
      const now = b.readUInt16LE(0),
        want = on ? CURSOR_OFF : CURSOR_ON;
      if (now !== CURSOR_ON && now !== CURSOR_OFF) return set(on ? 'unsupported' : 'off', on ? 'unexpected value ' + now : '');
      if (now !== want) {
        b.writeUInt16LE(want, 0);
        fs.writeSync(fd, b, 0, 2, where.addr);
      }
      dirty = false;
      set(on ? 'hidden' : 'off');
    } catch (e) {
      // switched off, there is only something to put back where it was switched on before
      set(on ? 'error' : 'off', on ? String(e.message || e) : '');
    } finally {
      if (fd !== null) fs.closeSync(fd);
    }
  }
  return {
    name: 'pointer',
    start() {
      sync();
      setInterval(sync, CHECK_MS).unref();
    },
    // after the option changed
    sync() {
      dirty = true;
      sync();
    },
    status: () => Object.assign({ enabled: !!config.options().hidePointer }, state),
  };
}

module.exports = { create, findEntry, fileToVa, CURSOR_ON, CURSOR_OFF };
