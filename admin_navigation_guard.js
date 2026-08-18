/* Admin navigation guard.
   Admin is an additional protected section and must not replace normal user navigation.
   Prevent unsolicited Admin navigation while also preventing the admin render loop
   caused by pages.admin() calling loadAdmin() while loadAdmin() itself calls render().
*/
(function(){
  let tries=0;
  function install(){
    if(typeof window.loadAdmin!=="function" || !window.state){
      if(tries++<100)setTimeout(install,100);
      return;
    }
    if(window.__fpAdminNavigationGuardInstalled)return;
    window.__fpAdminNavigationGuardInstalled=true;
    const original=window.loadAdmin;
    let explicit=false;
    window.addEventListener("click",function(e){
      const b=e.target?.closest?.("button");
      if(!b)return;
      const label=(b.textContent||"").trim().toLowerCase();
      if(label==="admin")explicit=true;
    },true);
    window.loadAdmin=function(){
      if(window.state.page==="admin" && !explicit){
        // pages.admin() calls loadAdmin() during render. The original loadAdmin()
        // renders again after setting page=admin, which creates an infinite loop.
        // Admin data is already loaded by the explicit navigation call.
        return Promise.resolve(true);
      }
      const allowed=explicit;
      explicit=false;
      if(!allowed){
        console.warn("FootballPoints: blocked unsolicited Admin dashboard navigation.");
        return Promise.resolve(false);
      }
      return original.apply(this,arguments);
    };
    window.openAdmin=function(){explicit=true;return window.loadAdmin();};
  }
  install();
})();
