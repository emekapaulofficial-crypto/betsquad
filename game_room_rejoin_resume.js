/* BetSquad: reliable resume/reconnect for an existing Whot/Dice/Snooker room. */
(function(){
  'use strict';
  const sb=()=>window.supabase, st=()=>window.state;
  let busy=false,lastRoomId=null;
  const withTimeout=(p,ms=7000)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
  async function findMyRoom(){
    const s=st(),client=sb(); if(!s?.user||!client)return null;
    try{
      const q=await withTimeout(client.from('game_room_players').select('room_id').eq('user_id',s.user.id).eq('is_bot',false).limit(20));
      if(q.error||!q.data?.length)return null;
      const ids=[...new Set(q.data.map(x=>x.room_id).filter(Boolean))]; if(!ids.length)return null;
      const r=await withTimeout(client.from('game_rooms').select('*').in('id',ids).in('status',['waiting','active']));
      if(r.error||!r.data?.length)return null;
      return r.data.find(x=>x.status==='active')||r.data[0]||null;
    }catch(e){console.warn('Resume room lookup:',e.message);return null;}
  }
  async function resume(room){
    const s=st();if(!s||!room)return false;
    s.gameType=room.game_type||s.gameType;s.gameRoomId=room.id;s.gameWaitStarted=s.gameWaitStarted||Date.now();s.gameRoomCache={room,players:[]};s.gameSettlement=null;s.page='game_room';
    if(typeof window.render==='function')window.render();
    setTimeout(()=>{try{if(typeof window.startGamePolling==='function')window.startGamePolling();}catch(e){console.warn(e);}},100);return true;
  }
  window.resumeMyGameRoom=async function(){if(busy)return false;busy=true;try{const room=await findMyRoom();return room?await resume(room):false;}finally{busy=false;}};
  async function check(){
    const s=st();if(busy||!s?.user||!sb())return;
    if(s.page==='game_room'&&!s.gameRoomId){busy=true;try{const room=await findMyRoom();if(room)await resume(room);}finally{busy=false;}return;}
    if(s.page!=='games')return;
    busy=true;try{
      const room=await findMyRoom();if(!room||room.id===lastRoomId)return;lastRoomId=room.id;
      const app=document.querySelector('#app');if(!app)return;let box=app.querySelector('#resumeExistingGame');
      if(!box){box=document.createElement('div');box.id='resumeExistingGame';box.className='panel';box.style.cssText='margin:0 0 16px;border:1px solid rgba(82,224,145,.45);';const host=app.querySelector('.wrap')||app.firstElementChild;if(host)host.insertBefore(box,host.firstChild);else app.prepend(box);}
      const name=String(room.game_type||'game').replace(/^./,x=>x.toUpperCase());
      box.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><span class="badge">GAME IN PROGRESS</span><h3 style="margin:8px 0 4px">Resume '+name+'</h3><p class="muted" style="margin:0">Your game is still here. Continue without paying again.</p></div><button class="primary" id="resumeExistingGameBtn" type="button">Resume game</button></div>';
      box.querySelector('#resumeExistingGameBtn').onclick=()=>window.resumeMyGameRoom();
    }catch(e){console.warn('Resume room check failed:',e.message);}finally{busy=false;}
  }
  function boot(){setInterval(check,1500);check();}
  const wait=setInterval(()=>{if(st()&&sb()&&st().user){clearInterval(wait);boot();}},250);setTimeout(()=>clearInterval(wait),120000);
})();