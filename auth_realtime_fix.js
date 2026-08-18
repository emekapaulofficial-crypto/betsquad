/* Robust auth synchronization: navigate immediately after successful sign-in without requiring refresh. */
(function(){
  let installed=false;
  function install(){
    if(installed||!window.supabase||!window.state||typeof window.render!=="function"||typeof window.go!=="function")return setTimeout(install,100);
    installed=true;

    window.supabase.auth.onAuthStateChange((event,session)=>{
      setTimeout(async()=>{
        const user=session?.user||null;
        window.state.user=user;
        if(event==="SIGNED_IN"&&user){
          window.state.page="home";
          window.state.menuOpen=false;
          try{await window.render();}catch(e){console.error("post-login render failed",e);}
        }else if(event==="SIGNED_OUT"){
          window.state.user=null;
          window.state.selected=[];
          window.state.menuOpen=false;
          window.state.page="home";
          try{await window.render();}catch(e){console.error("post-logout render failed",e);}
        }
      },0);
    });

    const originalSignIn=window.signIn;
    window.signIn=async function(){
      const result=await originalSignIn.apply(this,arguments);
      const {data}=await window.supabase.auth.getSession();
      if(data?.session?.user){
        window.state.user=data.session.user;
        window.state.page="home";
        window.state.menuOpen=false;
        await window.render();
      }
      return result;
    };
  }
  install();
})();
