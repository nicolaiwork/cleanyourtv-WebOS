// The remote's other buttons (buttons.js): what is kept from config.json, the command the hook runs, and LG's name for a button.
const { ok, req, run } = require('./lib');

run(async () => {
  const b = req('buttons');
  const c = b.clean({
    1037: { name: 'Netflix', action: 'live' },
    1038: { name: 'Prime Video', action: 'app', app: 'youtube.leanback.v4' },
    1042: { name: 'Disney+', action: 'app', app: 'x; reboot' },
    1043: { name: 'LG Channels', action: 'format' },
    abc: { action: 'none' },
    1044: 'none',
  });
  ok(
    JSON.stringify(c) ===
      JSON.stringify({
        1037: { name: 'Netflix', action: 'live', app: '' },
        1038: { name: 'Prime Video', action: 'app', app: 'youtube.leanback.v4' },
        1042: { name: 'Disney+', action: '', app: '' },
        1043: { name: 'LG Channels', action: '', app: '' },
      }),
    'config.json is read with unknown actions, bad app ids and bad codes dropped: ' + JSON.stringify(c)
  );
  const all = () => true;
  ok(b.command(c['1037'], '/d', all) === 'sh /d/buttonkey.sh live', 'an action is one argument of buttonkey.sh');
  ok(b.command(c['1038'], '/d', all) === 'sh /d/buttonkey.sh app youtube.leanback.v4', 'an app is the second');
  ok(b.command(c['1042'], '/d', all) === '', "no action: LG's own, no command");
  ok(b.command(c['1037'], '/d', a => a !== 'live') === '', "an action that cannot run now: LG's own");
  ok(
    JSON.stringify(b.binds(c, '/d', all)) ===
      JSON.stringify({ 1037: 'sh /d/buttonkey.sh live', 1038: 'sh /d/buttonkey.sh app youtube.leanback.v4' }),
    'the binds are the buttons with a command'
  );

  const h = s => '[10/30(14:08:51)] (LGE MR25GA) ' + s;
  ok(b.nameFrom([h('KEY_ALEXAVOICE Release'), h('KEY_ALEXAVOICE Press'), h('KEY_NETFLIX Press')]) === 'Alexa', 'the newest press names it');
  ok(b.nameFrom([h('KEY_AMAZON Press')]) === 'Prime Video', "LG's key names become the service's name");
  ok(b.nameFrom([h('KEY_SOME_NEW_THING Press')]) === 'Some New Thing', 'an unknown one is spelled out');
  ok(b.nameFrom(undefined) === '' && b.nameFrom(['junk']) === '', 'no history: no name');
  // on the TV, LG's history had the OK press of Start but not yet the button: the name was "Ok"
  const two = n => (n < 10 ? '0' : '') + n;
  const at = ms => {
    const d = new Date(ms);
    return (
      '[' +
      two(d.getMonth() + 1) +
      '/' +
      two(d.getDate()) +
      '(' +
      two(d.getHours()) +
      ':' +
      two(d.getMinutes()) +
      ':' +
      two(d.getSeconds()) +
      ')] (LGE MR25GA) '
    );
  };
  const now = Date.now();
  ok(
    b.nameFrom([at(now) + 'KEY_OK Press', at(now - 60000) + 'KEY_NETFLIX Press'], now - 2000) === '',
    'only presses since the learning started, never the OK of Start'
  );
  ok(
    b.nameFrom([at(now) + 'KEY_OK Release', at(now) + 'KEY_DISNEY Press', at(now) + 'KEY_OK Press'], now - 2000) === 'Disney+',
    'the button pressed after Start'
  );
});
