/* Admin per-player room refunds. Requires the Supabase admin_refund_game_room_player RPC. */
(function(){'use strict';
let mounted=false, loading=false;
const esc=v=>String(v??'').replace(/[<>&\"]/g,'');
async function render(){
 if(!window.state?.page||window.state.page!=='admin'||!window.supabase)return;
 let host=document.getElementById('bsAdminPlayerRefunds');
 if(!host){
  const parent=document.querySelector('main.wrap')||document.getElementById('app'); if(!parent)return;
  host=document.createElement('section'); host.id='bsAdminPlayerRefunds'; host.className='panel'; parent.appendChild(host);
 }
 if(loading)return; loading=true;
 try{
  const rooms=await window.supabase.from('game_rooms').select('id,game_code,game_type,status,stake,created_at').order('created_at',{ascending:false}).limit(100);
  if(rooms.error){host.innerHTML='<h2>💰 Player Refunds</h2><p class="muted">'+esc(rooms.error.message)+'</p>';return;}
  let html='<span class="badge">ADMIN • PLAYER REFUNDS</span><h2>💰 Refund Players Individually</h2><p class="small muted">Close the room first. Each human player has a separate refund button. Refunding one player does not refund anyone else.</p>';
  for(const r of rooms.data||[]){
   const ps=await window.supabase.from('game_room_players').select('id,user_id,display_name,stake_amount,status,is_bot,result,joined_at').eq('room_id',r.id).order('joined_at',{ascending:true});
   const players=(ps.data||[]).filter(p=>!p.is_bot&&p.user_id);
   if(!players.length)continue;
   html+='<div class="notice" style="margin:10px 0"><b>Room '+esc(r.game_code||r.id)+'</b><br>'+esc(r.game_type||'game')+' • '+esc(r.status||'unknown')+'<div style="margin-top:8px">';
   for(const p of players){
    const done=String(p.result||'').toLowerCase()==='refunded';
    const amount=Number(p.stake_amount||r.stake||0);
    html+='<div class="row" style="margin:6px 0;padding:8px;border:1px solid var(--border,#ddd);border-radius:8px"><span><b>'+esc(p.display_name||'Player')+'</b><br><span class="small muted">Stake: ₦'+amount.toLocaleString()+'</span></span><span><button type="button" class="primary bsRefundPlayer" data-player="'+esc(p.id)+'" '+(done?'disabled':'')+'>'+ (done?'✅ REFUNDED':'💸 REFUND ₦'+amount.toLocaleString())+'</button></span></div>';
   }
   html+='</div></div>';
  }
  host.innerHTML=html+(html.endsWith('</h2>')?'<p class="muted">No players found.</p>':'');
  host.querySelectorAll('.bsRefundPlayer').forEach(btn=>btn.onclick=async()=>{
   if(btn.disabled||!confirm('Refund this player now?'))return;
   btn.disabled=true; btn.textContent='Refunding...';
   const q=await window.supabase.rpc('admin_refund_game_room_player',{p_player_id:btn.dataset.player});
   if(q.error){btn.disabled=false;btn.textContent='💸 REFUND';alert(q.error.message);return;}
   btn.textContent='✅ REFUNDED';
  });
 }finally{loading=false;}
}
setInterval(()=>{if(window.state?.page==='admin')render();else document.getElementById('bsAdminPlayerRefunds')?.remove();},1500);
})();
