/* Final admin navigation: show Admin only to the database-authorized administrator. */
(function(){
  let tries=0;
  async function install(){
    if(!window.supabase||!window.state||typeof window.render!=="function"){
      if(tries++<150)setTimeout(install,100); return;
    }
    if(window.__fpAdminNavRestoreInstalled)return;
    window.__fpAdminNavRestoreInstalled=true;

    async function check(){
      if(!window.state.user){window.state.isAdmin=false;return false;}
      try{const {data,error}=await window.supabase.rpc('is_admin');window.state.isAdmin=!error&&data===true;}
      catch(e){window.state.isAdmin=false;}
      return window.state.isAdmin;
    }
    window.refreshAdminStatus=check;

    const originalRender=window.render;
    window.render=function(){
      const result=originalRender.apply(this,arguments);
      setTimeout(()=>{
        document.querySelectorAll('nav button,.mobile-menu button').forEach(b=>{
          if((b.textContent||'').trim().toLowerCase()==='admin') b.style.display=window.state.isAdmin?'':'none';
        });
      },0);
      return result;
    };

    await check();
    originalRender();
  }
  install();
})();
