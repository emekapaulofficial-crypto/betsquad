/* Post-stake guidance: sends group and 1v1 players to the leaderboard and explains fees/payouts. */
(function(){
  'use strict';
  const FEE=0.15;
  let lastPage='';
  async function details(){
    if(!window.state||!window.supabase||!state.user)return;
    const box=document.querySelector('#stakeResultsGuidance'); if(!box)return;
    if(state.page==='friendly'){
      const q=await supabase.from('friendly_challenges').select('id,stake_points,status,winner_id,created_at').or(`challenger_id.eq.${state.user.id},opponent_id.eq.${state.user.id}`).order('created_at',{ascending:false}).limit(1);
      const c=q.data?.[0];
      const stake=Number(c?.stake_points||0),pot=stake*2,payout=Math.floor(pot*0.85);
      const d=box.querySelector('[data-live-details]');
      if(d)d.innerHTML=c?`<b>Current 1v1 stake:</b> ${stake.toLocaleString()} points each • <b>combined stake:</b> ${pot.toLocaleString()} points • <b>winner payout:</b> ${payout.toLocaleString()} points after the 15% maintenance fee.`:'No recent 1v1 stake found yet.';
    }else if(state.page==='rooms'){
      const m=await supabase.from('room_members').select('room_id,joined_at').eq('user_id',state.user.id).order('joined_at',{ascending:false}).limit(1);
      const roomId=m.data?.[0]?.room_id;
      if(roomId){
        const r=await supabase.from('room_prizes').select('prize_pool,platform_fee,first_place,second_place,third_place,settled').eq('room_id',roomId).maybeSingle();
        const p=r.data; const d=box.querySelector('[data-live-details]');
        if(d&&p)d.innerHTML=`<b>Total prize pool:</b> ${Number(p.prize_pool||0).toFixed(2)} • <b>15% maintenance fee:</b> ${Number(Math.max(Number(p.platform_fee||0),Number(p.prize_pool||0)*FEE)).toFixed(2)} • <b>1st:</b> ${Number(p.first_place||0).toFixed(2)} • <b>2nd:</b> ${Number(p.second_place||0).toFixed(2)} • <b>3rd:</b> ${Number(p.third_place||0).toFixed(2)}.`;
      }
    }
  }
  function add(){
    if(!window.state||!window.supabase||!state.user)return;
    const page=state.page;
    if(!['rooms','friendly','leaderboard'].includes(page))return;
    const app=document.querySelector('#app');if(!app)return;
    const old=document.querySelector('#stakeResultsGuidance');if(old)old.remove();
    const box=document.createElement('section');box.id='stakeResultsGuidance';box.className='panel';box.style.cssText='margin:16px 0;border:1px solid rgba(82,224,145,.35);background:rgba(8,28,45,.96);';
    if(page==='friendly')box.innerHTML=`<span class="badge">1v1 RESULTS</span><h3>Check the leaderboard after your 1v1</h3><p class="muted">After the match is settled, both players can use the Leaderboard to see the result and the winner's payout. The current 1v1 stake is <b>points</b>, not a cash deposit.</p><p class="muted" data-live-details>Loading your latest 1v1 stake…</p><p class="muted"><b>15% maintenance fee:</b> when there is a winner, the winner receives 85% of the combined stake. A tie returns each player's stake.</p><div class="actions"><button class="primary" onclick="go('leaderboard')">VIEW LEADERBOARD →</button></div><p class="small" style="margin-top:10px"><b>Play responsibly.</b> Only stake what you can afford to lose. Do not chase losses.</p>`;
    else box.innerHTML=`<span class="badge">STAKE RESULTS</span><h3>See who staked and what the winners receive</h3><p class="muted">After the group stake is complete and settled, go to the <b>Leaderboard</b> to see the participants, total stake/prize pool and the published <b>1st, 2nd and 3rd place</b> prize amounts.</p><p class="muted" data-live-details>Loading the latest room prize details…</p><p class="muted"><b>15% maintenance fee:</b> this is deducted from the group prize pool before the winners are paid. The remaining 85% is distributed according to the room's configured 1st/2nd/3rd prize split.</p><div class="actions"><button class="primary" onclick="go('leaderboard')">VIEW LEADERBOARD →</button></div><p class="small" style="margin-top:10px"><b>Gamble responsibly.</b> Staking involves risk. Only stake money you can afford to lose and never chase losses.</p>`;
    const main=app.querySelector('main.wrap');if(main)main.insertBefore(box,main.firstChild);else app.prepend(box);
    details();
  }
  const mo=new MutationObserver(()=>{if(lastPage!==state?.page){lastPage=state.page;setTimeout(add,0);}});
  function start(){mo.observe(document.body,{subtree:true,childList:true});setTimeout(add,250);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
