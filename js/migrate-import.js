/* Brings a returning visitor's saved tabletop-tool data over from tools.builtbyjoshstudio.com, where these tools
   lived before they moved here. Browser storage belongs to one origin, so the data stayed behind when they moved.
   (The same design as cooking.builtbyjoshstudio.com/js/migrate-import.js.)

   How: if a key this tool page uses is missing here, load tools.builtbyjoshstudio.com/migrate.html in a hidden
   frame and ask it for the old values. It answers only this origin, by exact origin. Give up after about 2
   seconds; the tool has already started and never waits. Reload once if one of this page's own keys now holds
   the old site's value (written by this tab or by another tab), so the tool shows the data. A change the visitor
   made meanwhile (a roll, a kept name) never causes a reload.

   Never overwrites a visitor's data here: a key is written only when it is missing here, and only if the old
   value is readable JSON (every tabletop tool saves JSON). One request brings every tool's keys, so a visit to
   any tool brings the others' data too. One answer (even an empty one) is remembered, so the frame is not loaded
   again. Only if the frame got no answer does the page offer "Bring my saved data from the old tools site",
   which opens the same page in a small window (a top-level window always sees the old data). None of the tools
   saves anything when its page loads, so "missing" means the visitor has nothing of their own here yet. */
(function () {
  'use strict';
  var OLD = 'https://tools.builtbyjoshstudio.com';
  var BRIDGE = OLD + '/migrate.html';
  var DONE = 'bbj-migrate-done-v1';            // set after one answer, from the frame or the window
  var RELOADED = 'bbj-migrate-reloaded';        // sessionStorage: reload at most once per tab
  var TIMEOUT = 2000;

  // Each tool page and the keys it shows (Session Notes' key is also written by the NPC generator). Nine of the ten
  // tools: the dice roller's roll log is not carried over (owner), and its page does not load this script.
  var PAGES = {
    '/tabletop/character-name-generator/': ['tynkr-name-generator-kept-v1'],
    '/tabletop/initiative-tracker/': ['tynkr-initiative-tracker-v1'],
    '/tabletop/loot-generator/': ['tynkr-loot-generator-kept-v1'],
    '/tabletop/npc-generator/': ['tynkr-npc-generator-kept-v1', 'tynkr-session-notes-v1'],
    '/tabletop/plot-hook-generator/': ['tynkr-plot-hook-kept-v1'],
    '/tabletop/random-table-roller/': ['tynkr-table-roller-v1'],
    '/tabletop/session-notes/': ['tynkr-session-notes-v1'],
    '/tabletop/tavern-generator/': ['tynkr-tavern-generator-kept-v1'],
    '/tabletop/wargame-score-tracker/': ['tynkr-wargame-score-v1']
  };
  var ALL_KEYS = [];
  Object.keys(PAGES).forEach(function (p) { PAGES[p].forEach(function (k) { if (ALL_KEYS.indexOf(k) < 0) ALL_KEYS.push(k); }); });

  function get(key) { try { return localStorage.getItem(key); } catch (e) { return undefined; } }
  function set(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } }

  var page = location.pathname.replace(/index\.html$/, '');
  var mine = PAGES[page];
  if (!mine) return;
  if (get(DONE) === undefined) return;          // storage blocked: nothing can be saved here anyway

  function needsData() { return mine.some(function (k) { return get(k) === null; }); }
  function snapshot() { var s = {}; mine.forEach(function (k) { s[k] = get(k); }); return s; }
  // True when one of this page's keys changed to the value the old site sent: imported, here or in another tab.
  function imported(snap, data) {
    return mine.some(function (k) { var v = get(k); return v !== snap[k] && typeof data[k] === 'string' && v === data[k]; });
  }

  // Write what came back: only missing keys, only readable JSON. Returns how many keys changed.
  function apply(data) {
    var changed = 0;
    ALL_KEYS.forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(data, k) || typeof data[k] !== 'string') return;
      if (get(k) !== null) return;                                       // the visitor's own data here wins
      try { JSON.parse(data[k]); } catch (e) { return; }                // every tabletop tool saves JSON
      if (set(k, data[k])) changed++;
    });
    return changed;
  }

  // Record the answer; reload once if this page's own keys took the old site's data. Returns true when reloading.
  function settle(snap, data) {
    set(DONE, String(Date.now()));
    if (!imported(snap, data)) return false;
    var reloaded = null;
    try { reloaded = sessionStorage.getItem(RELOADED); sessionStorage.setItem(RELOADED, '1'); }
    catch (e) { reloaded = null; }              // sessionStorage blocked: reload anyway; DONE stops a second ask
    if (reloaded) return false;
    location.reload();
    return true;
  }

  // Ask a bridge window (hidden frame or small window) for the data. cb(data, or null on timeout).
  var asks = 0;
  function ask(win, timeout, cb) {
    var id = Date.now().toString(36) + '-' + (++asks), settled = false, timer;   // not Math.random: the tools' own rolls use it
    function done(data) {
      if (settled) return; settled = true;
      clearTimeout(timer); window.removeEventListener('message', onMessage); cb(data);
    }
    function onMessage(e) {
      if (e.origin !== OLD || !win() || e.source !== win() || !e.data) return;
      if (e.data.type === 'bbj-migrate-ready') {
        win().postMessage({ type: 'bbj-migrate-request', id: id, keys: ALL_KEYS }, OLD);
      } else if (e.data.type === 'bbj-migrate-data' && e.data.id === id && e.data.data && typeof e.data.data === 'object') {
        done(e.data.data);
      }
    }
    window.addEventListener('message', onMessage);
    timer = setTimeout(function () { done(null); }, timeout);
  }

  // The manual route, offered only when the hidden frame got no answer: a small note just above the tool.
  function offerButton() {
    var tool = document.querySelector('.studio-tool');
    if (!tool || document.getElementById('bbj-migrate')) return;
    var box = document.createElement('div');
    box.id = 'bbj-migrate';
    box.className = 'jsw-wrap jsw-migrate';   // lined up with the page's content column
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'jsw-btn jsw-btn--ghost';
    btn.textContent = 'Bring my saved data from the old tools site';
    var status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.tabIndex = -1;
    function say(text, final) {
      status.textContent = text;
      if (final) { btn.remove(); status.focus(); }
    }
    btn.addEventListener('click', function () {
      var popup = window.open(BRIDGE, 'bbj-migrate', 'popup,width=420,height=240');
      if (!popup) { say('Your browser blocked the small window. Allow pop-ups for this site and try again.'); return; }
      btn.disabled = true;
      var snap = snapshot();
      ask(function () { return popup; }, 15000, function (data) {
        try { popup.close(); } catch (e) { /* already closed */ }
        btn.disabled = false;
        if (data === null) { say("Couldn't reach the old tools site. Please try again."); return; }
        var found = ALL_KEYS.some(function (k) { return typeof data[k] === 'string'; });
        var wrote = apply(data);
        if (settle(snap, data)) return;         // reloading to show the data
        if (!found) say('No saved data from the old tools site in this browser.', true);
        else if (wrote) say('Your data was brought over. Reload the page to see it.', true);
        else say('Nothing new to bring over.', true);
      });
    });
    box.appendChild(btn);
    box.appendChild(status);
    tool.parentNode.insertBefore(box, tool);
  }

  function start() {
    if (get(DONE) !== null || !needsData()) return;    // asked once already, or nothing missing here
    var snap = snapshot();
    var frame = document.createElement('iframe');
    frame.src = BRIDGE;
    frame.title = 'Data bridge';
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    ask(function () { return frame.contentWindow; }, TIMEOUT, function (data) {
      frame.remove();
      if (data === null) { offerButton(); return; }      // blocked or slow: the tool carries on; offer the button
      apply(data);
      settle(snap, data);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  else setTimeout(start, 0);
})();
