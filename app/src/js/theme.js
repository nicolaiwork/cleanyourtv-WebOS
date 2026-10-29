/* ---------- theme: the service resolves the chosen theme (manager > Theme) into CSS variables and a wallpaper. Home's layout is fixed
   (fork): of a theme only the colours, the font, the speed and the wallpaper apply. ---------- */
var themeKeys = [];
function applyTheme(t) {
  var st = document.documentElement.style,
    k;
  for (k = 0; k < themeKeys.length; k++) st.removeProperty(themeKeys[k]);
  themeKeys = [];
  if (!t || !t.vars) return;
  for (k in t.vars) {
    st.setProperty(k, t.vars[k]);
    themeKeys.push(k);
  }
  var w = t.wallpaper;
  if (w) {
    var d = 'rgba(' + t.nightRgb + ',' + w.dim + ')';
    st.setProperty('--wall', 'linear-gradient(' + d + ',' + d + '),url("' + API + '/api/theme/wallpaper/' + w.id + '/' + w.file + '")');
    themeKeys.push('--wall');
  }
}
