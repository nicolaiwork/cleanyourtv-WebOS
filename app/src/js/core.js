var API = 'http://127.0.0.1:8765',
  CACHE_KEY = 'cytv.cache.v4',
  VERSION = '1.5.2';
var DEFAULTS = {
  dock: ['netflix', 'youtube.leanback.v4', 'amazon', 'com.disney.disneyplus-prod'],
};
var ICONS = {
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  grid: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>',
  gear: '<path d="M19.3 10.5L21.5 10.8L21.5 13.2L19.3 13.5L18.2 16.1L19.6 17.9L17.9 19.6L16.1 18.2L13.5 19.3L13.2 21.5L10.8 21.5L10.5 19.3L7.9 18.2L6.1 19.6L4.4 17.9L5.8 16.1L4.7 13.5L2.5 13.2L2.5 10.8L4.7 10.5L5.8 7.9L4.4 6.1L6.1 4.4L7.9 5.8L10.5 4.7L10.8 2.5L13.2 2.5L13.5 4.7L16.1 5.8L17.9 4.4L19.6 6.1L18.2 7.9Z"/><circle cx="12" cy="12" r="3"/>',
  hdmi: '<path d="M4 8h16v7l-3 3H7l-3-3z"/><path d="M9 11v3M12 11v3M15 11v3"/>',
  restore: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  none: '' /* an empty mark: lines up a row without a tick with the ones that have one */,
};
function svg(name) {
  return (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    (Object.prototype.hasOwnProperty.call(ICONS, name) ? ICONS[name] : ICONS.grid) +
    '</svg>'
  );
}
