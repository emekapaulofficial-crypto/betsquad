/* BetSquad room/resume bridge.
   Loaded before app.js so missing room helpers can never break navigation.
   It also gives players a single Resume Game action for unfinished rooms. */
(function(){
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gameName=t=>({whot:'🃏 Whot',dice:'🎲 Dice',snooker:'🎱 Snooker'}[t]||t||'Game');
  let resumeTimer=null;

  async function loadMyRooms(){
    const s=window.state, sb=window.supabase;
    if(!s?.user||!sb)return [];
    const {data:members,error}=await sb.from('game_room_players')
      .select('room_id,display_name,is_bot,stake_amount,joined_at')
      .eq('user_id',s.user.id)
      .order('joined_at',{ascending:false}).limit(20);
    if(error){console.warn('Room list failed:',error.message);return []}
    const ids=[...(new Set((members||[]).map(x=>x.room_id).filter(Boolean)))];
    if(!ids.length)return [];
    const {data:rooms,error:re}=await sb.from('game_rooms')
      .select('id,game_type,status,capacity,stake,created_at,started_at,state')
      .in('id',ids).in('status',['waiting','active']).order('created_at',{ascending:false});
    if(re){console.warn('Room details failed:',re.message);return []}
    return (rooms||[]).map(r=>({...r,membership:(members||[]).find(m=>m.room_id===r.id)}));
  }

  window.prepareRoomsPage=async function(){
    window.state.myGameRooms=await loadMyRooms();
    return true;
  };

  window.roomsPage=function(){
    const rooms=window.state.myGameRooms||[];
    const resume=rooms.filter(r=>r.status==='active');
    const waiting=rooms.filter(r=>r.status==='waiting');
    const resumeHtml=resume.length?`<div class="panel" style="border:1px solid #55d98b;margin-bottom:16px"><span class="badge">🎮 GAME IN PROGRESS</span><h2>Resume your game</h2><p class="muted">Continue the game you left behind. Your room and stake remain attached to your account.</p>${resume.map(r=>`<div class="row"><div><b>${gameName(r.game_type)}</b><div class="small">Room ${esc(r.id.slice(0,8))} • ₦${Number(r.stake||0).toFixed(0)} stake • ${r.capacity} seats</div></div><button class="primary" onclick="resumeGame('${r.id}')">Resume Game</button></div>`).join('')}</div>`:'';
    const waitingHtml=waiting.length?`<div class="panel"><span class="badge">WAITING</span><h3>Your unfinished room</h3>${waiting.map(r=>`<div class="row"><div><b>${gameName(r.game_type)}</b><div class="small">Room ${esc(r.id.slice(0,8))} • waiting for players</div></div><button class="primary" onclick="resumeGame('${r.id}')">Continue</button></div>`).join('')}</div>`:'';
    return `<div class="section"><h2>Rooms</h2><p class="muted">Your unfinished games appear here so you can resume them instead of being told you are already in a room.</p></div>${resumeHtml}${waitingHtml}${(!resumeHtml&&!waitingHtml)?`<div class="panel"><h3>No unfinished games</h3><p class="muted">You are not currently in a waiting or active game room.</p><button class="primary" onclick="go('games')">Find a game</button></div>`:''}`;
  };

  async function refreshResumedRoom(){
    const s=window.state,sb=window.supabase;
    if(!s?.user||!s.gameRoomId||s.page!=='game_room'||!sb)return;
    const [{data:room,error:re},{data:players,error:pe}]=await Promise.all([
      sb.from('game_rooms').select('*').eq('id',s.gameRoomId).single(),
      sb.from('game_room_players').select('*').eq('room_id',s.gameRoomId).order('joined_at',{ascending:true})
    ]);
    if(re||pe||!room){clearInterval(resumeTimer);resumeTimer=null;return;}
    if(!(players||[]).some(p=>p.user_id===s.user.id&&!p.is_bot)){
      clearInterval(resumeTimer);resumeTimer=null;
      alert('You are no longer a player in this room.');
      s.gameRoomId=null;s.gameRoomCache=null;s.page='rooms';
      await window.prepareRoomsPage();
      return window.render();
    }
    s.gameRoomCache={room,players:players||[]};
    s.gameRoomPlayers=players||[];
    if(typeof window.render==='function')await window.render();
  }

  window.resumeGame=async function(roomId){
    const s=window.state,sb=window.supabase;
    if(!s?.user||!sb)return window.go?.('auth');
    try{
      const {data:room,error:re}=await sb.from('game_rooms').select('*').eq('id',roomId).single();
      if(re||!room)throw re||new Error('Room not found');
      const {data:players,error:pe}=await sb.from('game_room_players').select('*').eq('room_id',roomId).order('joined_at',{ascending:true});
      if(pe)throw pe;
      if(!(players||[]).some(p=>p.user_id===s.user.id&&!p.is_bot)){
        alert('You are no longer a player in this room.');
        await window.prepareRoomsPage();
        return window.render();
      }
      s.gameType=room.game_type;
      s.gameRoomId=room.id;
      s.gameWaitStarted=s.gameWaitStarted||Date.now();
      s.gameRoomCache={room,players:players||[]};
      s.gameRoomPlayers=players||[];
      s.gameSettlement=null;
      s.page='game_room';
      if(resumeTimer)clearInterval(resumeTimer);
      resumeTimer=setInterval(refreshResumedRoom,2000);
      if(typeof window.render==='function')await window.render();
      await refreshResumedRoom();
    }catch(e){console.error('Resume room failed',e);alert('Could not resume this room: '+(e?.message||e));}
  };

  window.roomLobby=window.roomLobby||function(){return window.roomsPage();};
  window.__betSquadRoomsBridge=true;
})();
