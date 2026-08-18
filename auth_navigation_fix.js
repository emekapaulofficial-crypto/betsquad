/* Final navigation/auth layer. Runs after the other UI extensions. */
(function(){
  const GROUP_URL="https://chat.whatsapp.com/KiyjdPps1zz92KHiiZv0d0?s=cl&p=a&ilr=1";

  function install(){
    if(!window.state||!window.supabase||typeof window.render!=="function"||typeof window.signIn!=="function") return setTimeout(install,100);
    if(window.__finalNavigationFixInstalled)return;
    window.__finalNavigationFixInstalled=true;

    const originalSignIn=window.signIn;
    window.signIn=async function(){
      await originalSignIn.apply(this,arguments);
      if(window.state?.user){
        window.state.page="home";
        window.state.menuOpen=false;
        await window.render();
      }
    };

    window.signOut=async function(){
      try{
        const {error}=await window.supabase.auth.signOut();
        if(error)throw error;
      }catch(e){
        console.error("Sign out failed:",e);
        alert("Sign out failed: "+(e?.message||e));
        return;
      }
      window.state.user=null;
      window.state.selected=[];
      window.state.menuOpen=false;
      window.state.page="home";
      await window.render();
    };

    const originalRender=window.render;
    window.render=async function(){
      const result=await originalRender.apply(this,arguments);
      if(window.state?.page==="home"){
        setTimeout(addCommunityCard,0);
      }
      return result;
    };

    addCommunityCard();
  }

  function addCommunityCard(){
    if(window.state?.page!=="home")return;
    const main=document.querySelector("#app main");
    if(!main||main.querySelector("#whatsappCommunity"))return;
    const hero=main.querySelector(".hero");
    const card=document.createElement("section");
    card.id="whatsappCommunity";
    card.className="panel whatsapp-community";
    card.style.cssText="margin-top:16px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap";
    card.innerHTML=`<div><span class="badge">COMMUNITY</span><h2 style="margin:10px 0 6px">Join the FootballPoints WhatsApp Group</h2><p class="muted" style="margin:0">Meet other stakers, discuss matches, share ideas and stay connected with the FootballPoints community.</p></div><a class="primary whatsapp-join" href="${GROUP_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;white-space:nowrap">Join WhatsApp Group</a>`;
    if(hero)hero.insertAdjacentElement("afterend",card); else main.prepend(card);
  }

  install();
})();
