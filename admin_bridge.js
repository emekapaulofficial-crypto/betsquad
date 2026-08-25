/* BetSquad admin navigation safety bridge.
   Prevents stale inline onclick="loadAdmin()" handlers from crashing the app.
   The real admin UI can replace this later without changing navigation markup.
*/
(function(){
  window.loadAdmin = function(){
    try {
      if (typeof window.go === 'function') {
        window.go('admin');
        return;
      }
      var app = document.getElementById('app');
      if (app) app.innerHTML = '<main class="wrap"><button class="back" onclick="history.back()">← Back</button><div class="panel"><h2>Admin</h2><p class="muted">Admin is loading. Please try again.</p></div></main>';
    } catch (e) {
      console.error('Admin navigation failed:', e);
      var app = document.getElementById('app');
      if (app) app.innerHTML = '<main class="wrap"><button class="back" onclick="history.back()">← Back</button><div class="panel"><h2>Admin</h2><p class="muted">Admin could not be opened.</p><button class="primary" onclick="location.reload()">Reload</button></div></main>';
    }
  };
})();
