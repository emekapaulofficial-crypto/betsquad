/* Post-stake guidance: sends group and 1v1 players to the leaderboard and explains fees/payouts. */
(function(){
  'use strict';
  const FEE=0.15;
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function add(){
    if(!window.state||!window.supabase||!state.user)return;
    const page=state.page;
    if(!['rooms','friendly','leaderboard'].includes(page))return;
    const app=document.querySelector('#app'); if(!app)return;
    const old=document.querySelector('#stakeResultsGuidance'); if(old)old.remove();
    const box=document.createElement('section'); box.id='stakeResultsGuidance'; box.className='panel'; box.style.cssText='margin:16px 0;border:1px solid rgba(82,224,145,.35);background:rgba(8,28,45,.96);';
    if(page==='friendly'){
      box.innerHTML=`<span class="badge">1v1 RESULTS</span><h3>Check the leaderboard after your 1v1</h3><p class="muted">After the match is settled, both players can use the Leaderboard to see the result and the winner's payout. The current 1v1 stake is <b>points</b>, not a cash deposit.</p><p class="muted"><b>15% maintenance fee:</b> when there is a winner, the winner receives 85% of the combined stake. A tie returns each player's stake.</p><div class="actions"><button class="primary" onclick="go('leaderboard')">VIEW LEADERBOARD →</button></div><p class="small" style="margin-top:10px"><b>Play responsibly.</b> Only stake what you can afford to lose. Do not chase losses.</p>`;
    }else{
      box.innerHTML=`<span class="badge">STAKE RESULTS</span><h3>See who staked and what the winners receive</h3><p class="muted">After the group stake is complete and settled, go to the <b>Leaderboard</b> to see the participants, total stake/prize pool and the published <b>1st, 2nd and 3rd place</b> prize amounts.</p><p class="muted"><b>15% maintenance fee:</b> this is deducted from the group prize pool before the winners are paid. The remaining 85% is distributed according to the room's configured 1st/2nd/3rd prize split.</p><div class="actions"><button class="primary" onclick="go('leaderboard')">VIEW LEADERBOARD →</button></div><p class="small" style="margin-top:10px"><b>Gamble responsibly.</b> Staking involves risk. Only stake money you can afford to lose and never chase losses.</p>`;
    }
    const main=app.querySelector('main.wrap'); if(main)main.insertBefore(box,main.firstChild); else app.prepend(box);
  }
  const mo=new MutationObserver(()=>setTimeout(add,0));
  function start(){mo.observe(document.body,{subtree:true,childList:true});setTimeout(add,250);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
