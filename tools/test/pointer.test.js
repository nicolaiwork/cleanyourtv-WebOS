// Hiding the Magic Remote pointer (pointer.js): finding CURSOR_ON in LG's input service, writing CURSOR_OFF over it in the running
// process and back, again after the process restarts, and leaving alone what it does not recognise. /proc is a folder here and the
// process's memory a plain file.
const fs = require('fs'),
  path = require('path');
const { ok, req, run, tmp, memoryConfig } = require('./lib');

const PROC = process.env.CYTV_PROC;
const BASE = 0x1000, // where the program is mapped
  SEG_OFF = 0x200, // its second segment: file offset and address differ, as on the TV
  SEG_VA = 0x10200,
  TABLE = 0x300; // file offset of the six cursor keys

// a 32-bit ELF program with two PT_LOAD segments and, optionally, the table of custom keys 1194..1199 (16-byte entries)
function program(withTable) {
  const b = Buffer.alloc(0x400);
  b.writeUInt32BE(0x7f454c46, 0);
  b[4] = 1;
  b.writeUInt32LE(0x34, 0x1c);
  b.writeUInt16LE(32, 0x2a);
  b.writeUInt16LE(2, 0x2c);
  const load = (i, off, va, size) => {
    const p = 0x34 + i * 32;
    b.writeUInt32LE(1, p);
    b.writeUInt32LE(off, p + 4);
    b.writeUInt32LE(va, p + 8);
    b.writeUInt32LE(size, p + 16);
  };
  load(0, 0, 0, SEG_OFF);
  load(1, SEG_OFF, SEG_VA, 0x400 - SEG_OFF);
  if (withTable)
    for (let i = 0; i < 6; i++) {
      b.writeUInt16LE(1, TABLE + i * 16);
      b.writeUInt16LE(1194 + i, TABLE + i * 16 + 2);
    }
  return b;
}
const ADDR = BASE + SEG_VA + (TABLE - SEG_OFF) + 4 * 16 + 2; // CURSOR_ON's code in the process

function proc(pid, bin, value) {
  const dir = path.join(PROC, String(pid));
  fs.mkdirSync(dir);
  const exe = path.join(tmp, 'lginput2-' + pid);
  fs.writeFileSync(exe, bin);
  fs.symlinkSync(exe, path.join(dir, 'exe'));
  fs.writeFileSync(path.join(dir, 'comm'), 'lginput2\n');
  fs.writeFileSync(path.join(dir, 'maps'), '00001000-00002000 r-xp 00000000 b3:3b 1 ' + exe + '\n');
  const mem = Buffer.alloc(ADDR + 16);
  mem.writeUInt16LE(value, ADDR);
  fs.writeFileSync(path.join(dir, 'mem'), mem);
}
const gone = pid => {
  const dir = path.join(PROC, String(pid));
  for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
  fs.rmdirSync(dir);
};
const value = pid => fs.readFileSync(path.join(PROC, String(pid), 'mem')).readUInt16LE(ADDR);

run(async () => {
  const pointer = req('pointer');
  ok(pointer.findEntry(program(true)) === TABLE + 4 * 16 + 2, 'CURSOR_ON is found by the six cursor keys in a row');
  ok(pointer.findEntry(program(false)) === -1, 'a program without them: not found');
  const twice = Buffer.concat([program(true), program(true)]);
  ok(pointer.findEntry(twice) === -1, 'found twice: not trusted');
  ok(pointer.fileToVa(program(true), TABLE) === SEG_VA + (TABLE - SEG_OFF), 'a file offset becomes its address through PT_LOAD');

  const config = memoryConfig({});
  const p = pointer.create({ config });
  proc(200, program(true), 1198);
  p.sync();
  ok(value(200) === 1198 && p.status().state === 'off' && !p.status().enabled, 'off by default: the pointer is left alone');

  config.update('test', c => {
    c.options = { hidePointer: true };
  });
  p.sync();
  ok(value(200) === 1199 && p.status().state === 'hidden', 'switched on: CURSOR_ON becomes CURSOR_OFF in the running process');

  gone(200);
  proc(300, program(true), 1198);
  p.sync();
  ok(value(300) === 1199 && p.status().state === 'hidden', 'LG restarts its input service: the new process gets it again');

  config.update('test', c => {
    c.options = { hidePointer: false };
  });
  p.sync();
  ok(value(300) === 1198 && p.status().state === 'off', 'switched off: CURSOR_ON is put back at once');

  gone(300);
  proc(400, program(true), 1300);
  config.update('test', c => {
    c.options = { hidePointer: true };
  });
  p.sync();
  ok(value(400) === 1300 && p.status().state === 'unsupported', 'a value that is not one of the cursor keys is not touched');

  gone(400);
  proc(500, program(false), 1198);
  p.sync();
  ok(value(500) === 1198 && p.status().state === 'unsupported', 'firmware without the table: reported, nothing written');

  gone(500);
  p.sync();
  ok(p.status().state === 'waiting', 'no input service running: waits for it');
});
