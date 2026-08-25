/* BetSquad: resume a player's existing Whot/Dice/Snooker room after refresh or logout. */
(function(){
  'use strict';
  const sb=()=>window.supabase, st=()=>window.state;
  let lastRoomId=null, checking=false;

  async function findMyRoom(){
    const s=st(), client=sb();
    if(!s?.user||!client)return null;
    const q=await client.from('game_room_players').select('room_id').eq('user_id',s.user.id).eq('is_bot',false).limit(20);
    if(q.error||!q.data?.length)return null;
    for(const row of q.data){
      const r=await client.from('game_rooms').select('id,game_type,status,stake,capacity,state').eq('id',row.room_id).in('status',['waiting','active']).maybeSingle();
      if(r.data)return r.data;
    }
    return null;
  }

  window.resumeMyGameRoom=async function(){
    const s=st(),room=await findMyRoom();
    if(!s||!room)return false;
    s.gameType=room.game_type;
    s.gameRoomId=room.id;
    s.gameWaitStarted=s.gameWaitStarted||Date.now();
    s.gameRoomCache={room,players:[]};
    s.gameSettlement=null;
    s.page='game_room';
    if(typeof window.render==='function')window.render();
    if(typeof window.startGamePolling==='function')window.startGamePolling();
    return true;
  };

  async function check(){
    const s=st();
    if(checking||!s?.user||!sb()||s.page!=='games')return;
    checking=true;
    try{
      const room=await findMyRoom();
      if(!room||room.id===lastRoomId)return;
      lastRoomId=room.id;
      const app=document.querySelector('#app');
      if(!app||app.querySelector('#resumeExistingGame'))return;
      const box=document.createElement('div');
      box.id='resumeExistingGame';
      box.className='panel';
      box.style.cssText='margin:0 0 16px;border:1px solid rgba(82,224,145,.45);';
      const name=String(room.game_type||'game').replace(/^./,x=>x.toUpperCase());
      box.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><span class="badge">GAME IN PROGRESS</span><h3 style="margin:8px 0 4px">Resume '+name+'</h3><p class="muted" style="margin:0">You are already in this room. Continue from where you stopped.</p></div><button class="primary" id="resumeExistingGameBtn">Resume game</button></div>';
      const host=app.querySelector('.wrap')||app.firstElementChild;
      if(host)host.insertBefore(box,host.firstChild); else app.prepend(box);
      box.querySelector('#resumeExistingGameBtn').onclick=()=>window.resumeMyGameRoom();
    }catch(e){console.warn('Resume room check failed:',e);}
    finally{checking=false;}
  }

  function boot(){
    setInterval(()=>{if(st()?.page==='games')check();},1500);
    check();
  }
  const wait=setInterval(()=>{if(st()&&sb()){clearInterval(wait);boot();}},250);
  setTimeout(()=>clearInterval(wait),30000);
})();