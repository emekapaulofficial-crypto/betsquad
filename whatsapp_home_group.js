/* Home community invite. Kept separate so it does not change the game logic. */
(function(){
  const GROUP_URL="https://chat.whatsapp.com/KiyjdPps1zz92KHiiZv0d0?s=cl&p=a&ilr=1";
  function install(){
    if(typeof window.render!=="function"||!window.state)return setTimeout(install,100);
    if(window.__whatsappHomeInstalled)return;
    window.__whatsappHomeInstalled=true;
    const originalRender=window.render;
    window.render=function(){
      const result=originalRender.apply(this,arguments);
      setTimeout(()=>{
        if(window.state?.page!=="home")return;
        const app=document.querySelector("#app");
        if(!app||app.querySelector("#whatsappCommunity"))return;
        const card=document.createElement("section");
        card.id="whatsappCommunity";
        card.className="panel whatsapp-community";
        card.innerHTML=`<div><span class="badge">COMMUNITY</span><h2>Join the FootballPoints WhatsApp Group</h2><p class="muted">Meet other stakers, discuss matches, share ideas and stay connected with the FootballPoints community.</p></div><a class="primary whatsapp-join" href="${GROUP_URL}" target="_blank" rel="noopener noreferrer">Join WhatsApp Group</a>`;
        const how=document.querySelector(".section");
        if(how&&how.parentNode)how.parentNode.insertBefore(card,how);
        else app.querySelector("main")?.appendChild(card);
      },0);
      return result;
    };
    window.render();
  }
  install();
})();
