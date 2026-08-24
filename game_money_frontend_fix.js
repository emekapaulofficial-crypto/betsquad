/* Frontend safety for game exits: leaving an unfinished room always requests the
   server-side refund. The RPC is idempotent, so refreshes/double taps cannot pay twice. */
(function(){
  'use strict';
  let tries=0;
  function install(){
    if(typeof window.leaveGameRoom!=='function'){
      if(tries++<200)setTimeout(install,100);
      return;
    }
    if(window.__gameMoneyFrontendFix)return;
    window.__gameMoneyFrontendFix=true;
    const original=window.leaveGameRoom;
    window.leaveGameRoom=async function(){
      const s=window.state, sb=window.supabase;
      if(s?.gameRoomId && sb && s.gameRoomCache?.room?.status!=='finished'){
        try{
          const {error}=await sb.rpc('game_refund_stake',{p_room_id:s.gameRoomId});
          if(error) throw error;
        }catch(e){
          alert('We could not safely close this game yet. Your stake was not intentionally forfeited. Please try again.');
          console.error('Game refund failed:',e);
          return;
        }
      }
      return original.apply(this,arguments);
    };
  }
  install();
})();
