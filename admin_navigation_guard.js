/* Admin navigation guard.
   The admin dashboard must never open just because the app renders, auth changes,
   or another enhancement script runs. It may open only from an explicit Admin click
   (or while already on the admin page when an admin action refreshes its data).
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
      const allowed=explicit || window.state.page==="admin";
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
