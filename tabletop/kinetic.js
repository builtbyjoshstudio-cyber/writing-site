/* =========================================================
   Shared behaviour for every page on writing.builtbyjoshstudio.com
   · Service-worker registration (offline support), so a visit to any
     page, not only a tool page, installs the offline copy
   · Copy buttons and manual copies put normal spaces on the clipboard
     (the tool tables use non-breaking spaces between numbers and units)
   The theme is the pack's switcher (/js/theme-switcher.js). The studio
   theme switch and its view-transition wipe are not used here.
   Load once per page: tool pages use "../kinetic.js", the other pages "/tabletop/kinetic.js"
   ========================================================= */
(function () {
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    var h = location.hostname;
    var local = h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
    if (location.protocol !== 'https:' && !local) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      // ask for a newer worker on every page load (sw.js itself never comes from the browser's cache)
      .then(function (reg) { return reg.update(); })
      .catch(function () {});
  }
  // register after load so the SW never competes with first-paint assets
  if (document.readyState === 'complete') registerSW();
  else window.addEventListener('load', registerSW);
})();

/* ---------------------------------------------------------
   Copy buttons put NORMAL spaces on the clipboard (owner rule).
   The tool tables join numbers and units with non-breaking spaces
   (12&nbsp;lb) so they never split on a phone; whatever a copy button
   or a manual copy puts on the clipboard uses ordinary spaces instead.
   Covers both ways the tools copy: navigator.clipboard.writeText and
   the document.execCommand('copy') fallback (through the copy event).
   --------------------------------------------------------- */
(function () {
  var NBSP = /[  ]/g;
  function plain(t) { return typeof t === 'string' ? t.replace(NBSP, ' ') : t; }
  var cb = navigator.clipboard;
  if (cb && typeof cb.writeText === 'function') {
    var write = cb.writeText.bind(cb);
    try { cb.writeText = function (t) { return write(plain(t)); }; } catch (e) {}
  }
  document.addEventListener('copy', function (e) {
    var el = document.activeElement, text;
    if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search|url|tel)$/i.test(el.type))) && typeof el.selectionStart === 'number') {
      text = el.value.slice(el.selectionStart, el.selectionEnd);
    } else {
      text = String(window.getSelection ? window.getSelection() : '');
    }
    if (!text || !NBSP.test(text) || !e.clipboardData) { NBSP.lastIndex = 0; return; }
    NBSP.lastIndex = 0;
    e.clipboardData.setData('text/plain', plain(text));
    e.preventDefault();
  });
})();
