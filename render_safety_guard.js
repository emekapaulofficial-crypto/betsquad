/* Keep navigation helpers from ever sending the main renderer an unknown page key. */
(function(){'use strict';
  // matchDetail is a real internal route used by match_features.js. Games and
  // game_room are also real routes and must not be redirected back to Home.
  const valid=new Set(['home','auth','matches','matchDetail','builder','games','game_room','rooms','rounds','friendly','leaderboard','wallet','admin','1v1']);
  let tries=0;
  function install(){
    if(typeof window.render!=='function'||!window.state){if(tries++<200)setTimeout(install,100);return;}
    if(window.__fpRenderSafetyGuard)return;
    window.__fpRenderSafetyGuard=true;
    const original=window.render;
    window.render=function(){
      if(!valid.has(String(window.state.page||''))) window.state.page='home';
      return original.apply(this,arguments);
    };
    const originalGo=window.go;
    if(typeof originalGo==='function'){
      window.go=function(p){if(!valid.has(String(p)))return;return originalGo.apply(this,arguments);};
    }
  }
  install();
})();
