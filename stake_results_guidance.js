/* Post-stake guidance. Safe when the global app state is not yet initialized. */
(function(){
  'use strict';
  let lastPage='';
  const getState=()=>window.state||null;
  function add(){
    const s=getState();
    if(!s||!window.supabase||!s.user)return;
    const page=s.page;
    if(!['rooms','leaderboard'].includes(page))return;
    const app=document.querySelector('#app');if(!app)return;
    const old=document.querySelector('#stakeResultsGuidance');if(old)old.remove();
    const box=document.createElement('section');box.id='stakeResultsGuidance';box.className='panel';box.style.cssText='margin:16px 0;border:1px solid rgba(82,224,145,.35);background:rgba(8,28,45,.96);';
    box.innerHTML='<span class="badge">STAKE RESULTS</span><h3>See who staked and what the winners receive</h3><p class="muted">After the group stake is complete and settled, go to the <b>Leaderboard</b> to see the participants and published prize amounts.</p><p class="muted">Loading the latest room prize details…</p><div class="actions"><button class="primary" onclick="go(\'leaderboard\')">VIEW LEADERBOARD →</button></div>';
    const main=app.querySelector('main.wrap');if(main)main.insertBefore(box,main.firstChild);else app.prepend(box);
  }
  const mo=new MutationObserver(()=>{const s=getState();const page=s?.page||'';if(lastPage!==page){lastPage=page;setTimeout(add,0);}});
  function start(){mo.observe(document.body,{subtree:true,childList:true});setTimeout(add,250);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();