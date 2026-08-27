/* Admin navigation guard.
   Admin is an additional protected section and must not replace normal user navigation.
   Prevent unsolicited Admin navigation while avoiding recursive render calls.
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
      const button=e.target?.closest?.("button");
      if(!button)return;
      const label=(button.textContent||"").trim().toLowerCase();
      if(label==="admin")explicit=true;
    },true);

    window.loadAdmin=function(){
      if(window.state.page==="admin" && !explicit){
        return Promise.resolve(true);
      }

      if(!explicit){
        console.warn("FootballPoints: blocked unsolicited Admin dashboard navigation.");
        return Promise.resolve(false);
      }

      explicit=false;
      return Promise.resolve(original.apply(this,arguments));
    };

    window.openAdmin=function(){
      explicit=true;
      return window.loadAdmin();
    };
  }
  install();
})();
