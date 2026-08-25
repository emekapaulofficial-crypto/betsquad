/* BetSquad Admin: clear all rooms with server-authoritative auto-refund. */
(function(){'use strict';
  let mounted=false;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  async function clearAll(){
    const sb=window.supabase;
    if(!sb)return alert('Supabase is not ready yet.');
    if(!window.state?.isAdmin)return alert('Admin access required.');
    if(!confirm('CLEAR ALL ROOMS? Every human player in every room will be refunded once, then the rooms will be cleared.'))return;
    const b=document.getElementById('bsClearAllRooms');
    if(b){b.disabled=true;b.textContent='Refunding and clearing…';}
    try{
      const q=await sb.from('game_rooms').select('id');
      if(q.error)throw q.error;
      const rooms=q.data||[];
      let cleared=0, refunded=0, failed=[];
      for(const room of rooms){
        const r=await sb.rpc('admin_clear_game_room',{p_room_id:room.id});
        if(r.error){failed.push((r.error.message||'Room failed')+' ['+room.id+']');continue;}
        cleared++;
        refunded += Number(r.data?.refunded_players||0);
      }
      if(failed.length){
        alert('Cleared '+cleared+' room(s) and refunded '+refunded+' player(s). '+failed.length+' room(s) failed.\n\n'+failed.slice(0,5).join('\n'));
      }else{
        alert('Done. Cleared '+cleared+' room(s) and refunded '+refunded+' player(s).');
      }
      await renderPanel();
    }catch(e){
      alert('Clear all rooms failed: '+(e?.message||e));
    }finally{
      if(b){b.disabled=false;b.textContent='🗑️ CLEAR ALL ROOMS';}
    }
  }
  async function renderPanel(){
    const s=window.state;
    if(!s?.isAdmin||s.page!=='admin'){document.getElementById('bsAdminClearAllRooms')?.remove();return;}
    const host=document.querySelector('main.wrap')||document.getElementById('app');
    if(!host)return;
    let panel=document.getElementById('bsAdminClearAllRooms');
    if(!panel){
      panel=document.createElement('section');
      panel.id='bsAdminClearAllRooms';
      panel.className='panel';
      panel.style.cssText='margin-top:16px;border:1px solid rgba(255,180,0,.35);';
      panel.innerHTML='<span class="badge">ADMIN • ROOM SAFETY</span><h3>Room Cleanup</h3><p class="small muted">Clear all rooms safely. Human players are refunded once before their room records are removed.</p><button id="bsClearAllRooms" type="button" class="primary" style="width:100%;font-weight:800;">🗑️ CLEAR ALL ROOMS</button><div id="bsClearRoomStatus" class="small muted" style="margin-top:8px"></div>';
      host.appendChild(panel);
      panel.querySelector('#bsClearAllRooms').onclick=clearAll;
    }
    const q=await window.supabase?.from('game_rooms').select('id',{count:'exact',head:true});
    const status=panel.querySelector('#bsClearRoomStatus');
    if(status)status.textContent=q?.error?'Unable to count rooms: '+q.error.message:'Rooms currently stored: '+(q?.count??0);
  }
  function run(){renderPanel();}
  const timer=setInterval(run,1000);setTimeout(()=>clearInterval(timer),120000);run();
})();
