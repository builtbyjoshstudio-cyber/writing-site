/*! J.S. Warden theme switcher. No dependencies. Load with <script defer>.
 *
 *  Markup it wires up automatically:
 *    <button data-theme-set="echoes">Echoes</button>     sets + saves a theme
 *    <button data-theme-reset>Default</button>           forgets the saved choice
 *    <span data-theme-current></span>                    filled with the active theme's name
 *
 *  Page default (e.g. a book page that should open in its own world unless the
 *  reader already picked something):  <html data-theme-default="echoes">
 *
 *  API:  JSWTheme.get()  JSWTheme.set(id)  JSWTheme.reset()  JSWTheme.themes
 *  Event: window "jsw:themechange", detail = { theme, saved }
 */
(function () {
  'use strict';
  var KEY = 'jsw-theme';
  var FALLBACK = 'warden';
  var THEMES = ['warden', 'echoes', 'ebonspire', 'casefile'];
  var root = document.documentElement;

  function valid(id) { return THEMES.indexOf(id) > -1; }
  function saved() { try { var v = localStorage.getItem(KEY); return valid(v) ? v : null; } catch (e) { return null; } }
  function pageDefault() { var d = root.getAttribute('data-theme-default'); return valid(d) ? d : FALLBACK; }

  // Browser chrome colour follows the theme's --bg token, so no colour lives in this file.
  function syncChrome() {
    var bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (!bg) return;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    meta.setAttribute('content', bg);
  }

  function apply(id, isSaved) {
    root.setAttribute('data-theme', id);
    syncChrome();
    var name = '';
    var btns = document.querySelectorAll('[data-theme-set]');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-theme-set') === id;
      btns[i].setAttribute('aria-pressed', String(on));
      if (on && !name) name = (btns[i].textContent || '').replace(/\s+/g, ' ').trim();
    }
    var outs = document.querySelectorAll('[data-theme-current]');
    for (var j = 0; j < outs.length; j++) outs[j].textContent = name || id;
    window.dispatchEvent(new CustomEvent('jsw:themechange', { detail: { theme: id, saved: !!isSaved } }));
  }

  var api = {
    themes: THEMES.slice(),
    get: function () { return root.getAttribute('data-theme') || pageDefault(); },
    set: function (id) {
      if (!valid(id)) return false;
      try { localStorage.setItem(KEY, id); } catch (e) { /* private mode: still applies for this page */ }
      apply(id, true);
      return true;
    },
    reset: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      apply(pageDefault(), false);
    }
  };
  window.JSWTheme = api;

  function init() {
    var s = saved();
    apply(s || pageDefault(), !!s);
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-theme-set],[data-theme-reset]') : null;
      if (!t) return;
      if (t.hasAttribute('data-theme-reset')) api.reset(); else api.set(t.getAttribute('data-theme-set'));
    });
    // keep other open tabs in step
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY) return;
      var s2 = saved();
      apply(s2 || pageDefault(), !!s2);
    });
    window.addEventListener('load', syncChrome);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
