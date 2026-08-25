/* BetSquad room speed + admin close/refund lock. */
(function(){'use strict';
  let wrapped=false,roomChannel=null,roomId=null,poll=null;
  const sb=()=>window.supabase,st=()=>window.state;
  const GAME_RULE_FALLBACK={whot:{entryFee:500,capacity:4},dice:{entryFee:500,capacity:4},snooker:{entryFee:500,capacity:2}};
  function stop(){if(poll){clearInterval(poll);poll=null;}if(roomChannel&&sb()){try{sb().removeChannel(roomChannel)}catch(e){}}roomChannel=null;roomId=null;}
  async function fastPlay(type){
    const s=st(),client=sb();if(!s||!client||s.gameStarting)return;
    if(!s.user)return window.go?window.go('auth'):(s.page='auth',window.render?.());
    const gameRules=GAME_RULE_FALLBACK[type]||{};s.gameStarting=true;
    try{
      const {data:rooms,error}=await client.from('game_rooms').select('id,capacity,status,stake,game_type').eq('game_type',type).eq('status','waiting').order('created_at',{ascending:true}).limit(10);if(error)throw error;
      const ids=(rooms||[]).map(r=>r.id);let counts={};
      if(ids.length){const q=await client.from('game_room_players').select('room_id').in('room_id',ids);if(q.error)throw q.error;counts=(q.data||[]).reduce((a,p)=>(a[p.room_id]=(a[p.room_id]||0)+1,a),{});}
      let room=(rooms||[]).find(r=>(counts[r.id]||0)<Number(r.capacity||gameRules.capacity));
      if(!room){const payload={game_code:type,game_type:type,room_type:'public',entry_fee:gameRules.entryFee,stake:gameRules.entryFee,max_players:gameRules.capacity,capacity:gameRules.capacity,created_by:s.user.id,creator_id:s.user.id,bot_allowed:true,state:{}};const q=await client.from('game_rooms').insert(payload).select().single();if(q.error)throw q.error;room=q.data;}
      const displayName=s.user.user_metadata?.name||(s.user.email||'Player').split('@')[0];
      const join=await client.from('game_room_players').insert({room_id:room.id,user_id:s.user.id,display_name:displayName,stake_amount:Number(room.stake||gameRules.entryFee),is_bot:false});
      if(join.error){if(join.error.code==='23505')alert('You are already in this room.');else throw join.error;return;}
      const debit=await client.rpc('game_debit_stake',{p_amount:gameRules.entryFee});
      if(debit.error||!debit.data){await client.from('game_room_players').delete().eq('room_id',room.id).eq('user_id',s.user.id);alert('Insufficient cash balance. Deposit at least ₦'+gameRules.entryFee+' in Wallet to play.');return;}
      s.gameType=type;s.gameRoomId=room.id;s.gameWaitStarted=Date.now();s.gameRoomCache=null;s.gameSettlement=null;s.page='game_room';window.render?.();if(typeof window.startGamePolling==='function')window.startGamePolling();bindRoom(room.id);
    }catch(e){console.error('Fast room start failed',e);alert('Could not start the game: '+(e?.message||e));}finally{s.gameStarting=false;}
  }
  function wrapPlayGame(){if(wrapped||typeof window.playGame!=='function')return;window.playGame=async function(type){type=String(type).toLowerCase();if(['whot','dice','snooker'].includes(type))return fastPlay(type);};wrapped=true;}
  async function adminCloseRefund(){const s=st(),client=sb(),id=s?.gameRoomId;if(!s?.isAdmin||!client||!id)return;if(!confirm('Close this game and refund every human player in this room?'))return;const b=document.getElementById('bsAdminCloseRefund');if(b){b.disabled=true;b.textContent='Closing & refunding…';}const q=await client.rpc('admin_close_game_room',{p_room_id:id,p_reason:'Closed and refunded by Admin'});if(q.error){if(b){b.disabled=false;b.textContent='🛑 Close Game & Refund Players';}return alert(q.error.message);}const d=q.data||{};alert('Room closed. '+Number(d.refunded_players||0)+' player(s) refunded ₦'+Number(d.refunded_total||0).toFixed(2)+'.');try{window.stopGamePolling?.()}catch(e){}s.gameRoomId=null;s.gameRoomCache=null;s.gameRoomPlayers=[];s.gameSettlement=null;s.page='games';stop();window.render?.();}
  function renderAdminButton(){const s=st(),id=s?.gameRoomId;let b=document.getElementById('bsAdminCloseRefund');if(!s?.isAdmin||s.page!=='game_room'||!id){b?.remove();return;}const host=document.querySelector('#app .wrap');if(!host)return;if(!b){b=document.createElement('button');b.id='bsAdminCloseRefund';b.type='button';b.className='primary';b.style.cssText='width:100%;margin:10px 0;border:1px solid #e5a400;background:#3a2500;color:#ffd66b;font-weight:800;';b.textContent='🛑 Close Game & Refund Players';b.onclick=adminCloseRefund;host.appendChild(b);}}
  function bindRoom(id){if(!sb()||!st()?.user||!id)return;if(roomChannel&&roomId===id)return;stop();roomId=id;roomChannel=sb().channel('betsquad-room-fast:'+id,{config:{presence:{key:st().user.id},broadcast:{self:false}}});roomChannel.on('postgres_changes',{event:'*',schema:'public',table:'game_room_players',filter:'room_id=eq.'+id},()=>window.render?.());roomChannel.on('postgres_changes',{event:'UPDATE',schema:'public',table:'game_rooms',filter:'id=eq.'+id},()=>window.render?.());roomChannel.on('broadcast',{event:'room-closed'},({payload})=>{if(payload?.roomId!==id)return;const s=st();s.gameRoomId=null;s.gameRoomCache=null;s.gameRoomPlayers=[];s.page='games';window.render?.();});roomChannel.subscribe(async status=>{if(status==='SUBSCRIBED'){try{await roomChannel.track({user_id:st().user.id,display_name:st().user.user_metadata?.name||'Player',online_at:new Date().toISOString()});}catch(e){}}});poll=setInterval(()=>{if(st()?.page!=='game_room'||st()?.gameRoomId!==id)return stop();window.startGamePolling?.();renderAdminButton();},3000);}
  function run(){wrapPlayGame();const s=st();if(s?.page==='game_room'&&s.gameRoomId)bindRoom(s.gameRoomId);else if(s?.page!=='game_room')stop();renderAdminButton();}
  const timer=setInterval(run,100);setTimeout(()=>clearInterval(timer),60000);run();
})();
