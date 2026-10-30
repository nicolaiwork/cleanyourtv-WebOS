// Picture notifications (notify.js): the voice cards carry the language chosen in the launcher; other cards are shown as sent.
const path = require('path');
const { ok, helper, req, memoryConfig, run } = require('./lib');

const sent = [];
require.cache[require.resolve(path.join(helper, 'luna'))] = {
  exports: async (uri, p) => {
    sent.push(p.params);
    return { returnValue: true };
  },
};

run(async () => {
  const conf = memoryConfig({});
  const n = req('notify').create({ config: conf });
  await n.show({ kind: 'listening', title: 'Listening' }, true);
  ok(sent[0].kind === 'listening' && sent[0].lang === undefined, 'a voice card follows the TV while no language is chosen');
  conf.update('test', c => {
    c.language = 'da';
  });
  await n.show({ kind: 'answer', title: 'You said', text: 'hej' }, true);
  await n.show({ title: 'Doorbell', kind: 'answer' });
  ok(sent[1].lang === 'da', 'a voice card carries the language chosen in the launcher');
  ok(!sent[2].kind && sent[2].lang === undefined, 'a notification from the network is shown as sent');
});
