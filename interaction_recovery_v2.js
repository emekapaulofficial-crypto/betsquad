/* BetSquad interaction recovery v2: keep navigation, wallet and game controls clickable. */
(() => {
  'use strict';
  const SELECTORS = [
    '#app button', '#app a', '#app input', '#app select', '#app textarea',
    '#quickMenu', '.quick-menu', '[data-quick-menu]'
  ];

  function closeStaleOverlays() {
    // Never allow an old matchmaking modal to cover the entire app after leaving a game.
    const page = window.state?.page;
    if (page !== 'game_room') document.querySelector('#onlineGamePicker')?.remove();
  }

  function restoreControls() {
    closeStaleOverlays();
    SELECTORS.forEach(sel => document.querySelectorAll(sel).forEach(el => {
      el.style.pointerEvents = 'auto';
      el.style.touchAction = 'manipulation';
    }));
    // Do not let decorative game layers intercept clicks.
    document.querySelectorAll('.real-board, .game-visual-layer, [data-game-visual-layer]').forEach(el => {
      el.style.pointerEvents = 'none';
    });
    // Real Whot controls must remain above the decorative layer.
    if (window.state?.page === 'game_room' && window.state?.gameType === 'whot') {
      document.querySelectorAll('#app button').forEach(el => {
        el.style.position = 'relative';
        el.style.zIndex = '100005';
      });
    }
  }

  function boot() {
    restoreControls();
    setTimeout(restoreControls, 250);
    setTimeout(restoreControls, 1000);
  }

  new MutationObserver(boot).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', e => {
    const button = e.target.closest('button,a');
    if (button) button.style.pointerEvents = 'auto';
  }, true);
  setInterval(restoreControls, 1500);
  boot();
})();
