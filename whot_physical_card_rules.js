/* BetSquad Whot physical-card UX + rules layer. */
(function(){
  'use strict';
  const RULES_HTML = `<details class="whot-rules-panel" style="margin:12px 0"><summary style="cursor:pointer;font-weight:800">🃏 Whot Rules</summary><div style="margin-top:8px;line-height:1.55"><b>General rules</b><ul><li>Play only when it is your turn.</li><li>A card must match the top card by shape/suit or number.</li><li>A wrong card is rejected and stays in your hand.</li><li>Whot (20) may be played at any time; choose the new shape when prompted.</li></ul><b>Pick 2</b><ul><li>Number 2 is <b>Pick 2</b>.</li><li>When a 2 is played, the next player must pick 2 cards unless they can legally respond with another Pick 2.</li><li>Pick-2 penalties stack.</li></ul><b>General Market</b><ul><li>Number 14 is <b>General Market</b>.</li><li>When 14 is played, every other player draws one card.</li></ul></div></details>`;

  function addRules(){
    if(window.state?.page!=='game_room')return;
    const room=window.state.gameRoomCache?.room;
    if(!room||room.game_type!=='whot')return;
    const panel=document.querySelector('#app .wrap .panel');
    if(!panel||panel.querySelector('.whot-rules-panel'))return;
    const host=panel.querySelector('.real-board')||panel.firstElementChild;
    if(host)host.insertAdjacentHTML('afterend',RULES_HTML);
  }

  function hideManualCards(){
    if(window.state?.page!=='game_room')return;
    const room=window.state.gameRoomCache?.room;
    if(!room||room.game_type!=='whot')return;
    document.querySelectorAll('#app .wrap .panel button, #app .wrap .panel [role="button"]').forEach(el=>{
      const text=(el.textContent||'').trim().toLowerCase();
      if(text.includes('play card')||text.includes('select card')||text.includes('manual card')){
        el.style.display='none';
      }
    });
  }

  function wirePhysicalCards(){
    if(window.state?.page!=='game_room')return;
    const room=window.state.gameRoomCache?.room;
    if(!room||room.game_type!=='whot')return;
    const pid=window.state.user?.id;
    const hand=room.state?.hands?.[pid]||[];
    document.querySelectorAll('#app .real-board .whot-hand .whot-card').forEach((el,index)=>{
      el.style.cursor='pointer';
      el.style.touchAction='manipulation';
      el.dataset.cardIndex=String(index);
      el.onclick=async function(ev){
        ev.preventDefault(); ev.stopPropagation();
        if(typeof window.playWhotCard!=='function')return;
        const card=hand[index];
        if(!card)return;
        /* The game engine performs the authoritative legality check. */
        try{ await window.playWhotCard(index); }catch(e){ console.warn('Whot card rejected',e); }
      };
    });
  }

  function install(){
    if(window.state?.page==='game_room'&&window.state.gameRoomCache?.room?.game_type==='whot'){
      addRules(); hideManualCards(); wirePhysicalCards();
    }
  }
  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(install,500);
  install();
})();
