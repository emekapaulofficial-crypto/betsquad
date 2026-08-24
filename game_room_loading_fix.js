/* BetSquad game-room loading watchdog.
   Keeps the room UI from getting stuck on "Loading room…" when the initial
   polling request is delayed or the first render happens before room data is
   available. It is intentionally additive: the existing games_page.js remains
   the source of game rules and settlement.
*/
(function(){
  'use strict';
  let timer=null, busy=false, lastRoom=null, startedAt=0;
  const sb=()=>window.supabase;
  const st=()=>window.state;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function timed(p,ms){
    return await Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('Room connection timed out.')),ms))]);
  }
  function render(){if(typeof window.render==='function')window.render();}
  async function load(){
    const s=st(),client=sb();
    if(!s||s.page!=='game_room'||!s.gameRoomId||!client)return false;
    if(busy)return false;
    busy=true;
    try{
      const rid=s.gameRoomId;
      const [rr,pp]=await timed(Promise.all([
        client.from('game_rooms').select('*').eq('id',rid).single(),
        client.from('game_room_players').select('*').eq('room_id',rid).order('joined_at',{ascending:true})
      ]),7000);
      if(rr.error)throw rr.error;
      if(pp.error)throw pp.error;
      if(!rr.data)throw new Error('Game room was not found.');
      if(s.gameRoomId!==rid||s.page!=='game_room')return false;
      s.gameRoomCache={room:rr.data,players:pp.data||[]};
      s.gameRoomPlayers=pp.data||[];
      lastRoom=rid;
      startedAt=startedAt||Date.now();
      render();
      return true;
    }catch(e){
      console.warn('Game room watchdog:',e?.message||e);
      return false;
    }finally{busy=false;}
  }
  async function tick(){
    const s=st();
    if(!s||s.page!=='game_room'||!s.gameRoomId){startedAt=0;lastRoom=null;return;}
    if(lastRoom!==s.gameRoomId){lastRoom=s.gameRoomId;startedAt=Date.now();}
    if(!s.gameRoomCache)await load();
    else if(Date.now()-startedAt>12000)await load();
    if(!s.gameRoomCache&&Date.now()-startedAt>10000){
      const app=document.querySelector('#app');
      if(app&&!app.querySelector('#gameRoomRetry')){
        const box=document.createElement('div');box.id='gameRoomRetry';box.className='panel';
        box.innerHTML='<h3>Room is taking too long to connect</h3><p class="muted">Your room is still saved. Try reconnecting.</p><button class="primary" id="gameRoomRetryBtn">Reconnect to room</button><button class="secondary" id="gameRoomBackBtn" style="margin-left:8px">Back to Games</button>';
        app.appendChild(box);
        box.querySelector('#gameRoomRetryBtn').onclick=async()=>{box.remove();startedAt=Date.now();await load();};
        box.querySelector('#gameRoomBackBtn').onclick=()=>window.leaveGameRoom?window.leaveGameRoom():null;
      }
    }
  }
  function install(){
    if(timer)return;
    timer=setInterval(tick,1800);
    tick();
  }
  const wait=setInterval(()=>{
    if(window.state&&window.supabase){clearInterval(wait);install();}
  },250);
  setTimeout(()=>clearInterval(wait),30000);
})();
