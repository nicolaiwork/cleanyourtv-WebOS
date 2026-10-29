/* ---------- colour: a steady colour for something without a picture (a channel without a logo, a poster not loaded yet) ---------- */
function hsl2rgb(h, s, l) {
  var a = s * Math.min(l, 1 - l);
  function f(n) {
    var k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  }
  return [f(0), f(8), f(4)];
}
function hashHue(id) {
  var h = 0;
  for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}
