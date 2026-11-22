/*! J.S. Warden site header: phone menu toggle. No dependencies. Load with <script defer>.
 *  Without JavaScript the menu is simply always open (see html:not(.js) rules in css/site.css). */
(function () {
  'use strict';
  function init() {
    var btn = document.querySelector('.jsw-nav-toggle');
    var panel = btn && document.getElementById(btn.getAttribute('aria-controls'));
    if (!btn || !panel) return;
    function set(open) {
      btn.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
    }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
    });
    // picking a destination closes the menu; picking a theme does not
    panel.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) set(false); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
