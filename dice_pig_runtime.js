import { rollDice, createPigState, applyPigRoll, holdPigTurn } from './src/games/diceEngine.js';

/* Stable Dice/Pig runtime: owns the visible dice HUD and keeps the rules aligned
   with src/games/diceEngine.js. No bot is added here; room formation remains in games_page.js. */
(function(){
  'use strict';
  const TARGET=100;
  let botTimer=null;
  let lastRoomId=null;

  function playerId(){ return window.state?.user?.id || null; }
  function isGameRoom(){ return window.state?.page==='game_room'; }
  function isDice(room){ return room?.game_type==='dice'; }
  function currentPlayerId(p){ return p?.playerIds?.[p.currentPlayerIndex] || null; }
  function players(){ return window.state?.gameRoomPlayers || []; }
  function name(pid){
    const p=players().find(x=>(x.user_id||x.id)===pid);
    return p?.display_name || (p?.is_bot?'Emeka':'Player');
  }
  function esc(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  async function getRoom(){
    const id=window.state?.gameRoomId, sb=window.supabase;
    if(!id||!sb)return null;
    const r=await sb.from('game_rooms').select('*').eq('id',id).single();
    return r.error?null:r.data;
  }

  async function ensurePig(room){
    if(!isDice(room)||room.status!=='active')return room;
    const state=room.state||{};
    if(state.pig?.playerIds?.length)return room;
    const ids=Array.isArray(state.order)?state.order:players().map(p=>p.user_id||p.id);
    if(ids.length<2)return room;
    const pig=createPigState(ids,TARGET);
    const next={...state,rolls:{},order:ids,pig,status:'active'};
    const saved=await window.supabase.from('game_rooms').update({state:next,status:'active'}).eq('id',room.id).eq('status','active').select('*').single();
    return saved.error?{...room,state:next}:saved.data;
  }

  async function savePig(room,pig){
    const next={...(room.state||{}),pig,rolls:{},order:pig.playerIds,status:pig.status};
    const status=pig.status==='finished'?'finished':'active';
    const r=await window.supabase.from('game_rooms').update({state:next,status}).eq('id',room.id).eq('status','active').select('*').single();
    return r.error?null:r.data;
  }

  function host(){
    return document.querySelector('#app .wrap') || document.querySelector('#app') || document.body;
  }

  function paintWaiting(room){
    let panel=document.getElementById('pigRulesHud');
    if(!panel){panel=document.createElement('section');panel.id='pigRulesHud';panel.className='panel';host().appendChild(panel);}
    const ps=players();
    panel.innerHTML=`<span class="badge">🎲 DICE • ₦500</span><h2>Classic Pig — 2 Dice</h2><p class="muted">Waiting for another player. Dice starts automatically when the room is ready.</p><p><b>Players in room: ${ps.length}</b></p><p class="small muted">The game needs at least 2 players. The bot is not used for a 1v1 game.</p><button type="button" class="secondary" onclick="leaveGameRoom()">Leave Room</button>`;
  }

  function paint(room){
    if(!isDice(room))return;
    const p=room.state?.pig;
    if(!p){paintWaiting(room);return;}
    let panel=document.getElementById('pigRulesHud');
    if(!panel){panel=document.createElement('section');panel.id='pigRulesHud';panel.className='panel';host().appendChild(panel);}
    const me=playerId(),turn=currentPlayerId(p),myTurn=turn===me;
    const scores=p.playerIds.map(id=>`<span style="display:inline-block;margin:4px 8px 4px 0"><b>${esc(name(id))}</b>: ${p.scores[id]||0}</span>`).join('');
    const last=p.lastRoll?`<div class="notice" style="margin-top:10px">Last roll: <b>${p.lastRoll.values.join(' + ')} = ${p.lastRoll.total}</b></div>`:'';
    const action=myTurn&&p.status==='playing'?`<button type="button" class="primary" id="pigRollButton">🎲 ROLL DICE</button><button type="button" class="secondary" id="pigHoldButton" style="margin-left:8px">✋ HOLD & BANK</button>`:`<p class="muted">Current turn: <b>${esc(name(turn))}</b></p>`;
    const result=p.status==='finished'?`<div class="notice" style="margin-top:12px"><b>🏆 ${esc(name(p.winner))} wins!</b><br>Final score: ${p.scores[p.winner]||0}</div>`:'';
    panel.innerHTML=`<span class="badge">🎲 PIG • FIRST TO ${TARGET}</span><h2>Dice Game</h2><p class="muted">Roll both dice as many times as you want. A single 1 ends your turn. Snake Eyes resets your total score to 0. Hold to bank your turn points.</p><div style="margin:8px 0">${scores}</div><p>Turn points: <b>${p.turnScore||0}</b></p>${last}<div style="margin-top:14px">${action}</div>${result}<button type="button" class="secondary" style="margin-top:12px" onclick="leaveGameRoom()">Leave Room</button>`;
    const roll=document.getElementById('pigRollButton');
    if(roll)roll.onclick=window.rollMyDice;
    const hold=document.getElementById('pigHoldButton');
    if(hold)hold.onclick=window.holdPigDice;
  }

  window.rollMyDice=async function(){
    const room=await getRoom();
    if(!room||!isDice(room)||room.status!=='active')return;
    const ready=await ensurePig(room),p=ready?.state?.pig,pid=playerId();
    if(!p||p.status!=='playing')return alert('This Dice game is not active.');
    const turn=currentPlayerId(p);
    if(turn!==pid)return alert(`It is ${name(turn)}'s turn.`);
    let result;
    try{ result=applyPigRoll(p,pid,rollDice(2,6).values); }
    catch(e){ return alert(e.message||'Could not roll the dice.'); }
    const saved=await savePig(ready,p);
    if(!saved)return alert('Dice result could not be saved. Please try again.');
    window.state.gameRoomCache={room:saved,players:players()};
    paint(saved);
    if(result.event==='one_rolled')alert('You rolled a 1. Your turn points were lost.');
    if(result.event==='snake_eyes')alert('Snake Eyes! Your total score has reset to 0.');
    maybeBot(saved.id);
  };

  window.holdPigDice=async function(){
    const room=await getRoom();
    if(!room||!isDice(room)||room.status!=='active')return;
    const ready=await ensurePig(room),p=ready?.state?.pig,pid=playerId();
    if(!p||p.status!=='playing'||currentPlayerId(p)!==pid)return;
    const result=holdPigTurn(p,pid);
    const saved=await savePig(ready,p);
    if(!saved)return alert('Hold could not be saved. Please try again.');
    window.state.gameRoomCache={room:saved,players:players()};
    paint(saved);
    if(result.event==='winner'){
      alert(`🏆 ${name(pid)} wins with ${result.score} points!`);
      const human=!players().find(x=>(x.user_id||x.id)===pid)?.is_bot;
      const settled=await window.supabase.rpc('game_settle_room',{p_room_id:saved.id,p_winner_ids:human?[pid]:[]});
      if(!settled.error)window.state.gameSettlement=settled.data;
      return;
    }
    maybeBot(saved.id);
  };

  function botPid(){ return players().find(p=>p.is_bot)?.id || null; }
  function maybeBot(roomId){
    if(botTimer)return;
    botTimer=setTimeout(async()=>{
      botTimer=null;
      const room=await getRoom();
      if(!room||room.id!==roomId||!isDice(room)||room.status!=='active')return;
      const bp=botPid(),p=room.state?.pig;
      if(!bp||!p||p.status!=='playing'||currentPlayerId(p)!==bp)return;
      const result=applyPigRoll(p,bp,rollDice(2,6).values);
      let saved=await savePig(room,p);
      if(!saved)return;
      if(result.event==='safe_roll'&&(p.turnScore>=12||p.scores[bp]+p.turnScore>=TARGET)){
        const held=holdPigTurn(p,bp);
        saved=await savePig(saved,p);
        if(held.event==='winner'){
          await window.supabase.rpc('game_settle_room',{p_room_id:saved.id,p_winner_ids:[]});
          paint(saved);return;
        }
      }
      paint(saved);
      if(saved.state?.pig?.status==='playing'&&currentPlayerId(saved.state.pig)===bp)maybeBot(saved.id);
    },900);
  }

  async function tick(){
    if(!isGameRoom()){
      document.getElementById('pigRulesHud')?.remove();
      lastRoomId=null;
      return;
    }
    const room=await getRoom();
    if(!room||!isDice(room)){
      document.getElementById('pigRulesHud')?.remove();
      return;
    }
    lastRoomId=room.id;
    if(room.status==='waiting'){
      paintWaiting(room);
      return;
    }
    if(room.status==='active'){
      const ready=await ensurePig(room);
      window.state.gameRoomCache={room:ready,players:players()};
      paint(ready);
      maybeBot(ready.id);
      return;
    }
    if(room.status==='finished')paint(room);
  }

  setInterval(tick,1000);
  tick();
})();
