/* Final game interaction polish: remove duplicate Quick Menu UI and keep the visual Whot board from blocking playable controls. */
(() => {
  'use strict';

  function removeDuplicateQuickMenus() {
    const candidates = [...document.querySelectorAll('body *')].filter(el => {
      if (el.children.length > 8) return false;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      return /^📌?\s*Quick Menu\s*(OPEN)?$/i.test(text) || /^Quick Menu\s*OPEN$/i.test(text);
    });
    const roots = candidates.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 90 && r.height > 30 && getComputedStyle(el).position === 'fixed';
    });
    if (roots.length > 1) {
      // Keep the actual menu panel (#quickMenu) and remove an extra floating launcher.
      const keep = document.querySelector('#quickMenu') || roots.find(el => !/OPEN$/i.test((el.textContent || '').trim())) || roots[0];
      roots.forEach(el => { if (el !== keep) el.remove(); });
    }
  }

  function fixGameBoardClicks() {
    const board = document.querySelector('.real-board');
    if (board) {
      // game_visuals.js draws a presentation layer over the real game controls.
      // It must never capture taps/clicks from the playable controls underneath.
      board.style.pointerEvents = 'none';
    }

    if (window.state?.page === 'game_room' && window.state?.gameType === 'whot') {
      document.querySelectorAll('#app .panel .grid button').forEach(btn => {
        btn.style.pointerEvents = 'auto';
        btn.style.touchAction = 'manipulation';
        btn.style.position = 'relative';
        btn.style.zIndex = '100005';
      });
    }
  }

  function run() {
    removeDuplicateQuickMenus();
    fixGameBoardClicks();
  }

  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(run, 700);
  run();
})();
