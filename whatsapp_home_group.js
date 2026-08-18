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
        card.innerHTML=`<div class="whatsapp-community-inner"><div><span class="badge">FOOTBALLPOINTS COMMUNITY</span><h2>Join our WhatsApp Group</h2><p>Chat with other stakers, plan together, discuss matches and stay connected.</p></div><a class="primary whatsapp-join" href="${GROUP_URL}" target="_blank" rel="noopener noreferrer">JOIN WHATSAPP GROUP →</a></div>`;
        const main=app.querySelector("main.wrap");
        const hero=main?.querySelector(".hero");
        if(hero&&hero.parentNode)hero.parentNode.insertBefore(card,hero.nextSibling);
        else if(main)main.insertBefore(card,main.firstChild);
        else app.appendChild(card);
      },0);
      return result;
    };
    window.render();
  }
  install();
})();
