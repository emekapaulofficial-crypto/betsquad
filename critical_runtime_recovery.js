(() => {
  'use strict';
  // Prevent wallet/dashboard enhancers from crashing when another renderer replaced their host.
  const patchWalletDashboard=()=>{
    const body=document.querySelector('#fpPersonalDashboard #fpDashBody');
    if(!body)return;
    if(body.dataset.safe==='1')return;
    body.dataset.safe='1';
  };
  // Recover duplicate/blocked click layers without replacing the game's own handlers.
  const unblock=()=>{
    document.querySelectorAll('.game-visual-overlay,[data-game-visual-overlay]').forEach(el=>{el.style.pointerEvents='none';});
  };
  // If a game-room player already exists, navigate into that room instead of treating a 409 as fatal.
  window.recoverExistingGameRoom=async function(type){
    const s=window.state,sb=window.supabase;if(!s?.user||!sb)return false;
    const {data,error}=await sb.from('game_room_players').select('room_id').eq('user_id',s.user.id).limit(10);
    if(error||!data?.length)return false;
    for(const row of data){
      const r=await sb.from('game_rooms').select('id,status,game_type,stake').eq('id',row.room_id).in('status',['waiting','active']).maybeSingle();
      if(r.data){s.gameType=r.data.game_type;s.gameRoomId=r.data.id;s.gameWaitStarted=Date.now();s.page='game_room';window.render();return true;}
    }
    return false;
  };
  patchWalletDashboard();unblock();
  new MutationObserver(()=>{patchWalletDashboard();unblock();}).observe(document.body,{childList:true,subtree:true});
})();