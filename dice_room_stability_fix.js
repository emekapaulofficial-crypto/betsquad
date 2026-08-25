/* BetSquad Dice room stability overlay. Fixes the two-human wait state without replacing the existing game engine. */
(function(){'use strict';
  const POLL=700;
  let timer=null, busy=false, lastKey='';
  const esc=v=>String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function diceRoom(){return window.state?.page==='game_room'&&window.state?.gameType==='dice'&&window.state?.gameRoomId&&window.supabase;}
  function renderStable(room,players){
    const app=document.querySelector('#app'); if(!app)return;
    const me=window.state?.user?.id, st=room.state||{}, rolls=st.rolls||{};
    if(room.status==='waiting'){
      app.innerHTML=`<div class="wrap"><button class="back" onclick="leaveGameRoom()">← Back</button><div class="panel"><span class="badge">🎲 DICE • WAITING</span><h2>${players.length}/${room.capacity||2} players connected</h2><p class="muted">Waiting for the other player. The game starts automatically when both players are connected.</p><div class="grid">${players.map(p=>`<div class="card"><b>${esc(p.display_name||'Player')}</b><div class="small muted">${p.is_bot?'Robot':'Player connected'}</div></div>`).join('')}</div></div></div>`;
      return;
    }
    if(room.status==='active'){
      const mine=rolls[me]; const waiting=(st.order||players.map(p=>p.user_id||p.id)).filter(pid=>!rolls[pid]).length;
      app.innerHTML=`<div class="wrap"><button class="back" onclick="leaveGameRoom()">← Back</button><div class="panel"><span class="badge">🎲 DICE • LIVE</span><h2>Dice Game</h2>${players.map(p=>{const r=rolls[p.user_id||p.id];return `<div class="row"><span>${esc(p.display_name||'Player')}${p.is_bot?' 🤖':''}</span><b>${r?esc(r.values.join(' + ')+' = '+r.total):'Ready'}</b></div>`;}).join('')}<p class="muted" style="margin-top:12px">${mine?'Your dice are rolled. Waiting on '+waiting+' player(s).':'Your turn to roll.'}</p>${!mine?'<button class="primary" onclick="rollMyDice()">🎲 ROLL DICE</button>':''}</div></div>`;
    }
  }
  async function tick(){
    if(!diceRoom()||busy)return;
    busy=true;
    try{
      const sb=window.supabase,id=window.state.gameRoomId;
      const [{data:room,error:re},{data:players,error:pe}]=await Promise.all([
        sb.from('game_rooms').select('*').eq('id',id).single(),
        sb.from('game_room_players').select('*').eq('room_id',id).order('joined_at',{ascending:true})
      ]);
      if(re||pe||!room){busy=false;return;}
      window.state.gameRoomCache={room,players:players||[]}; window.state.gameRoomPlayers=players||[];
      const humans=(players||[]).filter(p=>!p.is_bot);
      if(room.status==='waiting'&&humans.length>=2){
        const leader=humans[0];
        if(leader.user_id===window.state.user.id){
          const order=players.map(p=>p.user_id||p.id);
          const rolls={};
          const {error:ue}=await sb.from('game_rooms').update({status:'active',state:{rolls,order,status:'active'},started_at:new Date().toISOString()}).eq('id',id).eq('status','waiting');
          if(ue)console.warn('Dice activation failed',ue);
          else {room.status='active';room.state={rolls,order,status:'active'};}
        }
      }
      const key=JSON.stringify([room.status,players.map(p=>[p.id,p.user_id,p.is_bot]),room.state?.rolls]);
      if(key!==lastKey){lastKey=key;renderStable(room,players||[]);}
    }catch(e){console.warn('Dice stability fix',e)}finally{busy=false;}
  }
  function start(){if(timer)clearInterval(timer);timer=setInterval(tick,POLL);tick();}
  const boot=setInterval(()=>{if(window.supabase&&window.state){clearInterval(boot);start();}},300);
})();
