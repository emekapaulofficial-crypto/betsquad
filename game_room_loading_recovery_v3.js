/* BetSquad room loader v3: recover an existing room without leaving the UI on Loading room. */
(function(){
  'use strict';
  let busy=false, lastId=null;
  const timeout=(p,ms)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error('Room request timed out')),ms))]);
  const getState=()=>window.state;
  const client=()=>window.supabase;
  async function loadRoom(id){
    const sb=client(); if(!sb||!id)return false;
    try{
      const [r,p]=await timeout(Promise.all([
        sb.from('game_rooms').select('*').eq('id',id).single(),
        sb.from('game_room_players').select('*').eq('room_id',id).order('joined_at',{ascending:true})
      ]),6000);
      if(r.error)throw r.error;
      if(p.error)throw p.error;
      if(!r.data)return false;
      const s=getState();
      if(!s)return false;
      s.gameRoomId=r.data.id;
      s.gameType=r.data.game_type||s.gameType;
      s.gameRoomCache={room:r.data,players:p.data||[]};
      s.gameRoomPlayers=p.data||[];
      if(typeof window.renderGameRoom==='function')window.renderGameRoom();
      else if(typeof window.render==='function')window.render();
      lastId=id;
      return true;
    }catch(e){console.warn('Room loader v3:',e?.message||e);return false;}
  }
  async function findExisting(){
    const s=getState(),sb=client();
    if(!s?.user||!sb)return null;
    try{
      const q=await timeout(sb.from('game_room_players').select('room_id').eq('user_id',s.user.id).eq('is_bot',false),6000);
      if(q.error||!q.data?.length)return null;
      const ids=[...new Set(q.data.map(x=>x.room_id).filter(Boolean))];
      if(!ids.length)return null;
      const r=await timeout(sb.from('game_rooms').select('*').in('id',ids).in('status',['waiting','active']).order('created_at',{ascending:false}),6000);
      if(r.error||!r.data?.length)return null;
      return r.data.find(x=>x.status==='active')||r.data[0]||null;
    }catch(e){console.warn('Existing room lookup v3:',e?.message||e);return null;}
  }
  async function tick(){
    const s=getState(); if(busy||!s?.user||!client())return;
    if(s.page==='game_room'){
      if(s.gameRoomId && (!s.gameRoomCache||s.gameRoomCache.room?.id!==s.gameRoomId)){
        busy=true;await loadRoom(s.gameRoomId);busy=false;return;
      }
      if(!s.gameRoomId){
        busy=true;const room=await findExisting();if(room){s.gameRoomId=room.id;s.gameType=room.game_type;s.gameRoomCache=null;await loadRoom(room.id);}busy=false;return;
      }
      if(lastId===s.gameRoomId&&s.gameRoomCache)return;
    }
  }
  const boot=setInterval(()=>{if(getState()&&client()){clearInterval(boot);setInterval(tick,1500);tick();}},250);
  setTimeout(()=>clearInterval(boot),30000);
})();
