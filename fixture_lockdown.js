/* Temporary fixture reset: no match list is shown or synced until manual/automatic fixture management is enabled again. */
(function(){
  function install(){
    if(!window.state||typeof window.render!=='function'||typeof window.go!=='function')return setTimeout(install,100);
    if(window.__fpFixtureLockdown)return;
    window.__fpFixtureLockdown=true;
    window.state.fixtures=[];window.state.selectedFixtures=[];window.state.loadingFixtures=false;
    const originalGo=window.go;
    window.go=function(page){
      if(page==='matches'){
        window.state.page='matches';window.state.menuOpen=false;window.state.fixtures=[];window.state.selectedFixtures=[];window.state.loadingFixtures=false;window.render();return;
      }
      return originalGo.apply(this,arguments);
    };
  }
  install();
})();
