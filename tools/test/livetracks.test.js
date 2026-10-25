// Live TV audio languages and subtitles (app/src/js/livetracks.js, run here as the page would): language codes, menu labels, the
// subtitle tracks in the TV player's getPipelineState reply, and luna calls from the page.
const fs = require('fs'),
  path = require('path'),
  vm = require('vm');
const { root, ok, run } = require('./lib');

const src = fs.readFileSync(path.join(root, 'app', 'src', 'js', 'livetracks.js'), 'utf8');
function load(extra) {
  const ctx = Object.assign({ JSON, setTimeout, clearTimeout }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.LT = LT;', ctx);
  return ctx.LT;
}

run(async () => {
  const LT = load();
  ok(LT.lang('dan') === 'da' && LT.lang('da') === 'da' && LT.lang('DA-dk') === 'da', 'two- and three-letter codes compare as one');
  ok(LT.lang('nob') === 'no' && LT.lang('nb') === 'no' && LT.lang('nor') === 'no', 'the Norwegian codes are one language');
  ok(LT.lang('ger') === 'de' && LT.lang('deu') === 'de', 'both ISO 639-2 forms are known');
  ok(LT.lang('') === '' && LT.lang(null) === '', 'no language stays empty');
  ok(LT.name('swe') === 'Svenska' && LT.name('xx') === 'XX' && LT.name('') === '', 'names are the language in its own words');

  ok(LT.pick(['sv', 'da', 'no'], 'dan') === 1, 'the remembered language is found among the tracks');
  ok(LT.pick(['sv', 'no'], 'da') === -1, 'a language the stream does not have is not picked');
  ok(LT.pick(['sv', 'da'], '') === -1, 'nothing remembered picks nothing');
  ok(LT.pick(['da', 'da'], 'da') === 0, 'with two tracks of a language the first is taken');

  const l = LT.labels(['da', 'da', 'sv', ''], 'Audio');
  ok(l.join('|') === 'Dansk|Dansk 2|Svenska|Audio', 'labels number a language that comes twice and name unknown tracks');

  // a reply as the TV's player gives it (webOS 26, a stream with DVB teletext in Danish and Swedish): data is a JSON string
  const state = {
    returnValue: true,
    data: JSON.stringify({
      sourceInfo: {
        programInfo: [
          {
            numAudioTracks: 3,
            numSubtitleTracks: 2,
            subtitleTrackInfo: [
              { trackNum: 0, pid: 260, language: 'da', type: 'teletext' },
              { trackNum: 1, pid: 260, language: 'sv', type: 'teletext' },
            ],
          },
        ],
      },
    }),
  };
  const s = LT.subs(state);
  ok(s.length === 2 && s[1].index === 1 && s[1].lang === 'sv' && s[0].type === 'teletext', 'the subtitle tracks are read');
  ok(LT.subs(JSON.stringify(state)).length === 2, 'a reply that is still a string is read too');
  const none = { returnValue: true, data: JSON.stringify({ sourceInfo: { programInfo: [{ subtitleTrackInfo: '' }] } }) };
  ok(LT.subs(none).length === 0 && LT.known(none), 'a stream without subtitles has none, and is known');
  ok(!LT.known({ returnValue: true, data: JSON.stringify({ media_state: 'load' }) }), 'a stream still loading is not known yet');
  ok(LT.subs('not json').length === 0 && LT.subs(null).length === 0 && !LT.known(null), 'a broken reply gives no tracks');

  // luna: without the bridge (a browser) the call answers null; with it, the reply arrives once
  let got = 'x';
  LT.luna('luna://com.webos.media/selectTrack', {}, r => (got = r));
  ok(got === null, 'without PalmServiceBridge a call answers null');
  const sent = [];
  function PalmServiceBridge() {
    this.call = (uri, p) => {
      sent.push([uri, JSON.parse(p)]);
      setTimeout(() => {
        this.onservicecallback('{"returnValue":true}');
        this.onservicecallback('{"returnValue":true}');
      }, 5);
    };
    this.cancel = () => {};
  }
  const LT2 = load({ PalmServiceBridge });
  const replies = [];
  LT2.luna('luna://com.webos.media/setSubtitleEnable', { mediaId: 'm1', enable: true }, r => replies.push(r));
  await new Promise(r => setTimeout(r, 30));
  ok(sent.length === 1 && sent[0][1].mediaId === 'm1' && sent[0][1].enable === true, 'the call carries its parameters');
  ok(replies.length === 1 && replies[0] === '{"returnValue":true}', 'the reply is passed on once');
});
