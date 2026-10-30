// The pages that run on the TV (launcher, manager, picker, notification card): nothing newer than Chromium 68 (webOS 5), and fixes that
// must not come back.
const fs = require('fs'),
  path = require('path');
const { root, ok, run } = require('./lib');

run(async () => {
  const pages = ['app', 'manager/app', 'picker/app', 'notify/app'].map(d => path.join(root, d, 'index.html'));
  const rules = [
    [/\?\?|\?\.[A-Za-z_\[(]/, 'optional chaining or ??'],
    [/\|\|=|&&=/, 'logical assignment'],
    [
      /\.(flat|flatMap|matchAll|replaceAll|findLast)\(|\.at\(-?\d|\bObject\.fromEntries\b|\bPromise\.(allSettled|any)\b|\bglobalThis\b|\bstructuredClone\b|\bAbortSignal\.timeout\b/,
      'a function newer than Chromium 68',
    ],
    [
      /\baspect-ratio\s*:|:is\(|:where\(|:has\(|\binset\s*:|:focus-visible|\bcontainer-type|color-mix\(|\b\d+d?v?[sd]vh\b|@layer\b/,
      'CSS newer than Chromium 68',
    ],
  ];
  const bad = [];
  for (const f of pages)
    fs.readFileSync(f, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        for (const r of rules) if (r[0].test(line)) bad.push(path.relative(root, f) + ':' + (i + 1) + ' ' + r[1]);
      });
  ok(!bad.length, 'the pages use nothing newer than Chromium 68' + (bad.length ? ':\n  ' + bad.join('\n  ') : ''));
  // the scripts must be ES5: Chromium 68 knows most of ES2015, but a slip there is a page that stays blank on webOS 5 only
  const acorn = require(path.join(root, 'tools', 'vendor', 'acorn.js'));
  for (const f of pages) {
    const html = fs.readFileSync(f, 'utf8'),
      re = /<script>([\s\S]*?)<\/script>/g;
    let m,
      err = '';
    while ((m = re.exec(html))) {
      try {
        acorn.parse(m[1], { ecmaVersion: 5 });
      } catch (e) {
        err = e.message;
      }
    }
    ok(!err, 'the script of ' + path.relative(root, f) + ' is ES5' + (err ? ': ' + err : ''));
  }
  // flex "gap" is ignored before Chromium 84, and the script that once added the spacing after each redraw made lists jump and left old
  // text behind on webOS 5 (issues 4, 8, 13): flex children are spaced with sibling margins
  const gapBad = [];
  for (const f of pages) {
    const t = fs.readFileSync(f, 'utf8'),
      re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(t))) {
      if (/display:\s*(inline-)?flex/.test(m[2]) && /(^|[;\s])(row-|column-)?gap\s*:/.test(m[2]))
        gapBad.push(path.relative(root, f) + ': ' + m[1].trim().split('\n').pop());
    }
  }
  ok(!gapBad.length, 'no flex container uses gap (a sibling margin instead)' + (gapBad.length ? ':\n  ' + gapBad.join('\n  ') : ''));
  ok(
    !fs.existsSync(path.join(root, 'shared', 'flexgap.js')) && !/flexgap/.test(fs.readFileSync(path.join(root, 'ipk', 'build.py'), 'utf8')),
    'no script adds the spacing after a redraw'
  );
  ok(
    !/\.card\.f\s*\{[^}]*outline/.test(fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8')) &&
      /\.card\.f::before\s*\{[^}]*border-radius:/.test(fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8')),
    "the focus ring of Home's cards has its own rounded corners (an outline is a rectangle before Chromium 94)"
  );
  const built = require(path.join(root, 'tools', 'build-pages.js'));
  for (const p of built.PAGES)
    ok(
      built.build(p[0]) === fs.readFileSync(path.join(root, p[1]), 'utf8'),
      p[1] + ' is built from ' + p[0] + ' (run: node tools/build-pages.js)'
    );
  // a long device name (HDMI-CEC) is the second line of a chip in the Inputs picker: the line could not shrink, so it was painted outside the
  // card, over the next ones (issue 19). It wraps onto a second line now, ends in an ellipsis there when that is not enough, and the card
  // reserves the two lines so every card's icon and port sit at the same height.
  const pickerPage = fs.readFileSync(path.join(root, 'picker', 'app', 'index.html'), 'utf8'),
    cssRule = (css, sel) => (css.match(new RegExp(sel.replace(/\./g, '\\.') + '\\s*\\{([^}]*)\\}')) || [])[1] || '',
    chipSt = cssRule(pickerPage, '.chip .st'),
    chipTx = cssRule(pickerPage, '.chip .tx');
  ok(
    /-webkit-line-clamp:\s*2/.test(chipSt) &&
      /overflow:\s*hidden/.test(chipSt) &&
      /min-height:\s*2\.4em/.test(chipSt) &&
      !/white-space:\s*nowrap/.test(chipSt) &&
      /text-align:\s*center/.test(chipSt) &&
      /width:\s*100%/.test(chipTx) &&
      /overflow:\s*hidden/.test(cssRule(pickerPage, '.chip')),
    'a long input name stays inside its card in the Inputs picker, on two lines'
  );
  // the favourite star and the menus' right-hand text both had the class st: the star's width squeezed the menu text into a column
  const launcher = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8');
  ok(
    !/(^|\n)\s*\.st\s*\{/.test(launcher) && /svg\.st\s*\{\s*width:\s*26px/.test(launcher),
    "the favourite star is styled as svg.st, so the menu's .st text keeps its natural width"
  );
  // Home has no buttons at the top (fork): Customise is the last row of All apps, and Customise puts HDMI inputs on Home
  const src = n => fs.readFileSync(path.join(root, 'app', 'src', n), 'utf8'),
    menus = src('js/menus.js'),
    fnBody = n => (menus.match(new RegExp('\\nfunction ' + n + '\\(\\) \\{\\n([\\s\\S]*?)\\n\\}\\n')) || [])[1] || '';
  ok(
    !/id="bar"/.test(src('index.html')) && !/\btopbar\b|\bbarEls\b/.test(src('js/home.js') + src('js/config.js') + menus),
    'Home has no top buttons'
  );
  // one Settings tile at the end of the strip (fork): All apps (a grid of icons) is its first row; Home's layout and the language follow
  ok(/_run = settingsMenu/.test(src('js/home.js')) && !/allAppsMenu/.test(src('js/home.js')), "the strip's last tile is Settings");
  const rowsOf = fnBody('settingsItems');
  ok(
    /^\s*return \[\s*\{ icon: 'grid', label: t\('All apps'\)[^\n]*fn: allAppsMenu/m.test(rowsOf) &&
      ['homeAppsMenu', 'inputsHomeMenu', 'hiddenMenu', 'languageMenu', 'resetMenu'].every(f => rowsOf.indexOf('fn: ' + f) > 0),
    'Settings: All apps first, then Home, the language, the clock, the order, the manager and a reset'
  );
  ok(/\{ grid: true/.test(fnBody('allAppsMenu')), 'All apps is a grid');
  const vm = require('vm'),
    sb = { window: {}, navigator: { language: 'en-GB' } };
  vm.runInNewContext(src('js/clock.js') + '\nthis.TX = TX;', sb);
  const words = [
      'Settings',
      'All apps',
      'Apps on Home',
      'Inputs on Home',
      'On Home',
      'No inputs',
      'Could not read the inputs',
      'Reset Home?',
    ],
    missing = [];
  ['nl', 'de', 'fr', 'es', 'da'].forEach(l =>
    words.forEach(w => {
      if (!sb.TX[l][w]) missing.push(l + ': ' + w);
    })
  );
  ok(!missing.length, 'the Settings and Inputs on Home texts are translated' + (missing.length ? ': ' + missing.join(', ') : ''));
  // the language: the TV's, or the one chosen in Settings, read from the launcher's cache before the first drawing
  const langAt = (tvLang, cached) => {
    const b = {
      window: {},
      navigator: { language: tvLang },
      CACHE_KEY: 'k',
      localStorage: { getItem: () => (cached === undefined ? null : JSON.stringify({ cfg: { language: cached } })) },
    };
    vm.runInNewContext(src('js/clock.js') + '\nthis.LANG = LANG; this.LOC = LOC; this.t = t;', b);
    return b;
  };
  ok(langAt('en-GB').LANG === 'en' && langAt('da-DK', 'auto').LANG === 'da', 'the language follows the TV until one is chosen');
  ok(
    langAt('en-GB', 'da').LOC === 'da-DK' &&
      langAt('en-GB', 'da').t('Settings') === 'Indstillinger' &&
      langAt('da-DK', 'en').LOC === 'en-GB',
    'a language chosen in Settings wins over the TV (dates and times too)'
  );
  ok(langAt('en-US', 'en').LOC === 'en-US', "English on an English TV keeps the TV's own English (its clock and dates)");
  // Danish (fork): every text the launcher gives t(), as t('…'), t(a ? '…' : '…') or vodlib/homelib's tx('…'), and the ones it
  // passes in a variable: the Films & Series tabs and sorts, Home's Play / Resume, Live TV's stream errors, the curator's row
  // titles and TMDB's genres (iptv_curator/tmdb.py)
  const dsb = { window: {}, navigator: { language: 'da-DK' } };
  vm.runInNewContext(src('js/clock.js') + '\nthis.t = t;', dsb);
  const lit = '\'((?:[^\'\\\\]|\\\\.)*)\'|"((?:[^"\\\\]|\\\\.)*)"',
    keys = {};
  fs.readdirSync(path.join(root, 'app', 'src', 'js')).forEach(f => {
    const js = src('js/' + f);
    [
      new RegExp('\\btx?\\(\\s*(?:' + lit + ')\\s*\\)', 'g'),
      new RegExp('\\bt\\([^()?]*\\?\\s*(?:' + lit + ')\\s*:\\s*(?:' + lit + ')\\s*\\)', 'g'),
    ].forEach(re => {
      let m;
      while ((m = re.exec(js)))
        m.slice(1).forEach(k => {
          if (k !== undefined) keys[k] = f;
        });
    });
  });
  const named = [
    ...['Films', 'Series', 'My list', 'Search', 'Newest', 'A–Z', 'Year', 'Rating', 'Resume', 'Play'],
    ...(
      src('js/live.js')
        .match(/var WHY = \{([\s\S]*?)\};/)[1]
        .match(/'[^']+'/g) || []
    ).map(q => q.slice(1, -1)),
    ...['Trending now', 'Popular', 'New releases', 'New series', 'Top rated', 'Danish films', 'Danish series', 'Nordic films'],
    ...['Nordic series', 'Kids & family', 'Action', 'Adventure', 'Comedy', 'Crime', 'Documentary', 'Family', 'History', 'Horror'],
    ...['Music', 'Mystery', 'Romance', 'Science Fiction', 'TV Movie', 'War', 'Action & Adventure', 'Kids', 'News', 'Sci-Fi & Fantasy'],
    ...['Soap', 'Talk', 'War & Politics'],
  ];
  named.forEach(k => (keys[k] = keys[k] || 'named'));
  const same = [
      'Action',
      'Animation',
      'Drama',
      'Fantasy',
      'Thriller',
      'Western',
      'Reality',
      'Trailer',
      'Stream',
      'streams',
      'buffer',
      'S%sE%s',
    ],
    untranslated = Object.keys(keys).filter(k => dsb.t(k) === k && same.indexOf(k) < 0);
  ok(Object.keys(keys).length > 150, 'the launcher texts are found (' + Object.keys(keys).length + ')');
  ok(
    !untranslated.length,
    'every launcher text has a Danish translation' + (untranslated.length ? ': ' + untranslated.map(k => keys[k] + ' ' + k).join(', ') : '')
  );
  // the Inputs picker's words, and the voice cards' words the service sends the notification page (helper/voice.js), in Danish too
  const page = d => fs.readFileSync(path.join(root, d, 'app', 'index.html'), 'utf8'),
    psb = {};
  vm.runInNewContext(
    page('picker').match(/var TX=\{[\s\S]*?\}\};/)[0] + page('picker').match(/var EN=\{.*\};/)[0] + 'this.TX=TX;this.EN=EN;',
    psb
  );
  const pmiss = Object.keys(psb.EN).filter(k => !psb.TX.da[k]);
  ok(!pmiss.length, 'the picker has every text in Danish' + (pmiss.length ? ': ' + pmiss.join(', ') : ''));
  const nsb = { window: {}, navigator: { language: 'da-DK' } };
  vm.runInNewContext(page('notify').match(/var VOICE=[\s\S]*?\nfunction vt\(s\)\{[^\n]*\}/)[0] + '\nthis.vt=vt;', nsb);
  const said = [],
    voice = fs.readFileSync(path.join(root, 'helper', 'voice.js'), 'utf8'),
    re = /(?:title|text): '([^']+)'/g;
  let vm2;
  while ((vm2 = re.exec(voice))) said.push(vm2[1]);
  const nmiss = said.filter(k => nsb.vt(k) === k);
  ok(said.length >= 6 && !nmiss.length, 'the voice cards have every word in Danish' + (nmiss.length ? ': ' + nmiss.join(', ') : ''));
});
