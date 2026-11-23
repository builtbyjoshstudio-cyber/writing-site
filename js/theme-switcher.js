/*! J.S. Warden theme switcher (Dark / Light + fixed book previews). No dependencies. Load with <script defer>.
 *
 *  Markup it wires up automatically:
 *    <button data-theme-set="dark">Dark</button>     sets + saves Dark
 *    <button data-theme-set="light">Light</button>   sets + saves Light
 *    <span data-theme-current></span>                filled with the active theme's name
 *
 *  Fixed book pages (ignore saved choice, never write storage, no switcher):
 *    <html data-theme-fixed="echoes">  or  <html data-theme-fixed="ebonspire">
 *
 *  Migrates legacy saved values on load:
 *    'casefile' | 'light' -> 'light'
 *    'warden' | 'echoes' | 'ebonspire' | 'dark' -> 'dark'
 *
 *  API:  JSWTheme.get()  JSWTheme.set(id)  JSWTheme.themes
 *  Event: window "jsw:themechange", detail = { theme, saved }
 */
(function () {
  'use strict';
  var KEY = 'jsw-theme';
  var FALLBACK = 'dark';
  var THEMES = ['dark', 'light'];
  var root = document.documentElement;

  function normalize(v) {
    if (v === 'light' || v === 'casefile') return 'light';
    if (v === 'dark' || v === 'warden' || v === 'echoes' || v === 'ebonspire') return 'dark';
    return null;
  }

  function fixedTheme() {
    var f = root.getAttribute('data-theme-fixed');
    return f ? f : null;
  }

  function saved() {
    try {
      var raw = localStorage.getItem(KEY);
      var norm = normalize(raw);
      if (norm && norm !== raw) {
        try { localStorage.setItem(KEY, norm); } catch (e2) {}
      }
      return norm;
    } catch (e) { return null; }
  }

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
    get: function () { return root.getAttribute('data-theme') || fixedTheme() || FALLBACK; },
    set: function (id) {
      if (fixedTheme()) return false;
      var norm = normalize(id);
      if (!norm) return false;
      try { localStorage.setItem(KEY, norm); } catch (e) { /* private mode: still applies for this page */ }
      apply(norm, true);
      return true;
    }
  };
  window.JSWTheme = api;

  function init() {
    var f = fixedTheme();
    if (f) {
      apply(f, false);
      window.addEventListener('load', syncChrome);
      return;
    }
    var s = saved();
    apply(s || FALLBACK, !!s);
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-theme-set]') : null;
      if (!t) return;
      api.set(t.getAttribute('data-theme-set'));
    });
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY || fixedTheme()) return;
      var s2 = saved();
      apply(s2 || FALLBACK, !!s2);
    });
    window.addEventListener('load', syncChrome);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
