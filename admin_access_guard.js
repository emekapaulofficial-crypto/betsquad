/* Final Admin access guard.
   The database is the authority: public.is_admin() checks admin_users.active.
   Normal users must not see or enter the Admin section.
*/
(function(){
  let tries=0;
  async function install(){
    if(!window.supabase || !window.state || typeof window.render!=="function" || typeof window.loadAdmin!=="function"){
      if(tries++<150)setTimeout(install,100);
      return;
    }
    if(window.__fpAdminAccessGuardInstalled)return;
    window.__fpAdminAccessGuardInstalled=true;

    state.isAdmin=false;
    async function refreshAdminStatus(){
      if(!state.user){ state.isAdmin=false; return false; }
      try{
        const {data,error}=await supabase.rpc("is_admin");
        state.isAdmin=!error && data===true;
      }catch(e){
        state.isAdmin=false;
      }
      return state.isAdmin;
    }
    window.refreshAdminStatus=refreshAdminStatus;

    const originalLoadAdmin=window.loadAdmin;
    window.loadAdmin=async function(){
      const allowed=await refreshAdminStatus();
      if(!allowed){
        state.page="home";
        state.menuOpen=false;
        render();
        alert("Admin access is restricted to the authorized administrator.");
        return false;
      }
      return originalLoadAdmin.apply(this,arguments);
    };

    const originalSignOut=window.signOut;
    if(typeof originalSignOut==="function"){
      window.signOut=async function(){
        state.isAdmin=false;
        return originalSignOut.apply(this,arguments);
      };
    }

    const originalRender=window.render;
    window.render=function(){
      if(state.page==="admin" && !state.isAdmin){
        state.page="home";
      }
      return originalRender.apply(this,arguments);
    };

    // Refresh the server-backed admin flag after authentication changes.
    try{
      supabase.auth.onAuthStateChange(async()=>{
        setTimeout(async()=>{await refreshAdminStatus();if(state.page!=="admin")render();},0);
      });
    }catch(e){}

    await refreshAdminStatus();
    render();
  }
  install();
})();
