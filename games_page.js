/* Games hub: wires the Games nav page to the existing rule engines in
   src/games/*.js. It also owns the live game-room UI for Whot, Dice and
   Snooker. */
import { createDeck, canPlay, validateWhotAction, nextPlayer, SUITS, DEFAULT_HAND_SIZE } from './src/games/whotEngine.js';
import { rollDice, resolveHighestTotal } from './src/games/diceEngine.js';
import { createSnookerState, scorePot, applyFoul, finishSnooker, BALL_VALUES } from './src/games/snookerEngine.js';
import { canStartRoom, shouldFillWithHouseAi } from './src/games/roomRules.js';
import { secureInt } from './src/games/fairRandom.js';
import { GAME_RULES, BOT_RULES } from './game_engine_config.js';

const RULES = { whot: GAME_RULES.WHOT, dice: GAME_RULES.DICE, snooker: GAME_RULES.SNOOKER };
const BOT_WAIT_MS = 15000;

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=secureInt(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;}
function cardLabel(c){if(!c)return '?';const icons={circle:'●',triangle:'▲',cross:'✚',square:'■',star:'★'};return c.value===20?'WHOT ★':`${icons[c.suit]||c.suit} ${c.value}`;}
function isBotPid(pid){return !(window.state.gameRoomPlayers||[]).some(p=>!p.is_bot&&p.user_id===pid);}
function findPlayerName(players,pid){const p=(players||[]).find(x=>(x.user_id||x.id)===pid);return p?(p.display_name||(p.is_bot?BOT_RULES.name:'Player')):'Player';}

/* ---------- Games hub ---------- */
function renderGamesHub(){
  const app=document.querySelector('#app'); if(!app)return;
  const cards=[['whot','🃏','Whot','Fast-paced card battles, up to 4 players'],['dice','🎲','Dice','Roll two dice, highest total wins'],['snooker','🎱','Snooker','1v1 skill-based scoring']];
  app.innerHTML=`<div class="wrap"><div class="section"><h2>Games</h2></div><p class="muted" style="margin-top:-8px">Play Whot, Dice or Snooker against other stakers. Entry is ₦500 — win the room and take the prize pool.</p><div class="grid">${cards.map(([id,icon,name,desc])=>`<div class="card"><span class="badge">${icon} ₦500 ENTRY</span><h3>${name}</h3><p class="muted">${desc}</p><button class="primary" style="width:100%;margin-top:10px" onclick="playGame('${id}')">Find a room</button></div>`).join('')}</div></div>`;
}

/* ---------- Nav entry point ---------- */
window.playGame=async function(type){
  const s=window.state;
  if(s.gameStarting)return;
  if(!s.user){return window.go?window.go('auth'):(s.page='auth',window.render());}
  const rules=RULES[type];
  if(!rules)return alert('This game is not available.');
  const sb=window.supabase;
  s.gameStarting=true;
  try{
    let room=null;
    const {data:openRooms,error:re}=await sb.from('game_rooms').select('id,capacity,status,stake').eq('game_type',type).eq('status','waiting').order('created_at',{ascending:true}).limit(10);
    if(re)throw re;
    for(const r of (openRooms||[])){
      const {count,error:ce}=await sb.from('game_room_players').select('id',{count:'exact',head:true}).eq('room_id',r.id);
      if(ce)throw ce;
      if((count||0)<r.capacity){room=r;break;}
    }
    if(!room){
      const payload={game_code:type,game_type:type,room_type:'public',entry_fee:rules.entryFee,stake:rules.entryFee,max_players:rules.capacity,capacity:rules.capacity,created_by:s.user.id,creator_id:s.user.id,bot_allowed:true,state:{}};
      const {data:created,error:ce}=await sb.from('game_rooms').insert(payload).select().single();
      if(ce)throw ce;
      room=created;
    }
    const {data:roomCheck,error:rce}=await sb.from('game_rooms').select('status,capacity,stake,game_type').eq('id',room.id).single();
    if(rce)throw rce;
    if(!roomCheck||roomCheck.status!=='waiting'){alert('That room just filled up — tap Find a room again.');return;}
    const displayName=(s.user.user_metadata?.name)||(s.user.email||'Player').split('@')[0];
    const {error:je}=await sb.from('game_room_players').insert({room_id:room.id,user_id:s.user.id,display_name:displayName,stake_amount:Number(roomCheck.stake||rules.entryFee),is_bot:false});
    if(je){
      if(je.code==='23505')alert('You are already in this room.');
      else throw je;
      return;
    }
    const debit=await sb.rpc('game_debit_stake',{p_amount:rules.entryFee});
    if(debit.error||!debit.data){
      await sb.from('game_room_players').delete().eq('room_id',room.id).eq('user_id',s.user.id);
      alert('Insufficient cash balance. Deposit at least ₦'+rules.entryFee+' in Wallet to play.');
      return;
    }
    s.gameType=type;
    s.gameRoomId=room.id;
    s.gameWaitStarted=Date.now();
    s.gameRoomCache=null;
    s.gameSettlement=null;
    s.page='game_room';
    window.render();
    startGamePolling();
  }catch(e){console.error('Game start failed',e);alert('Could not start the game: '+(e?.message||e));}
  finally{s.gameStarting=false;}
};

window.leaveGameRoom=async function(){
  const s=window.state, sb=window.supabase;
  if(s.gameRoomId && s.gameRoomCache?.room?.status==='waiting'){
    try{await sb.rpc('game_refund_stake',{p_room_id:s.gameRoomId});}catch(e){console.warn('refund failed',e);}
  }
  stopGamePolling();
  s.gameRoomId=null; s.gameRoomCache=null; s.gameSettlement=null; s.gameRoomPlayers=[]; s.page='games';
  window.render();
};

/* ---------- Polling loop ---------- */
let pollTimer=null, initializing=false;
function startGamePolling(){stopGamePolling();pollTimer=setInterval(tick,2000);tick();}
function stopGamePolling(){if(pollTimer){clearInterval(pollTimer);pollTimer=null;}}

async function tick(){
  const s=window.state;
  if(s.page!=='game_room'||!s.gameRoomId){stopGamePolling();return;}
  const sb=window.supabase;
  const [{data:room,error:re},{data:players,error:pe}]=await Promise.all([
    sb.from('game_rooms').select('*').eq('id',s.gameRoomId).single(),
    sb.from('game_room_players').select('*').eq('room_id',s.gameRoomId).order('joined_at',{ascending:true})
  ]);
  if(re||pe||!room){stopGamePolling();renderGameError(re||pe||new Error('Game room not found'));return;}
  s.gameRoomCache={room,players:players||[]};
  s.gameRoomPlayers=players||[];
  if(room.status==='waiting'){
    const leader=(players||[]).find(p=>!p.is_bot);
    const isLeader=leader&&leader.user_id===s.user.id;
    if(isLeader&&!initializing){
      const {ready,needBot}=readyCheck(room.game_type,players||[],s.gameWaitStarted||Date.now());
      if(ready){
        initializing=true;
        try{
          if(room.game_type==='whot')await initWhot(room,players||[],needBot);
          else if(room.game_type==='dice')await initDice(room,players||[],needBot);
          else if(room.game_type==='snooker')await initSnooker(room,players||[],needBot);
        }catch(e){console.error('Game init failed',e);renderGameError(e);}
        finally{initializing=false;}
      }
    }
  }
  renderGameRoom();
}

function renderGameError(error){
  const app=document.querySelector('#app');
  if(app)app.innerHTML=`<div class="wrap"><div class="panel"><h3>Game room error</h3><p class="muted">${esc(error?.message||error||'Unknown error')}</p><button class="primary" onclick="leaveGameRoom()">Back to Games</button></div></div>`;
}

function readyCheck(gameType,players,waitStartedAt){
  const humans=players.filter(p=>!p.is_bot).length;
  const total=players.length;
  const waited=Date.now()-waitStartedAt>BOT_WAIT_MS;
  if(gameType==='snooker'){
    if(total>=2)return{ready:true,needBot:false};
    if(humans>=1&&waited)return{ready:true,needBot:true};
    return{ready:false};
  }
  if(total>=4)return{ready:true,needBot:false};
  if(humans>=2&&waited)return{ready:true,needBot:shouldFillWithHouseAi(humans,false)};
  if(humans>=1&&waited)return{ready:true,needBot:true};
  return{ready:false};
}

/* ---------- Game initialisation ---------- */
async function addBot(room){
  const {data:bot,error}=await window.supabase.from('game_room_players').insert({room_id:room.id,is_bot:true,display_name:BOT_RULES.name,stake_amount:Number(room.stake||500)}).select().single();
  if(error)throw error;
  return bot;
}

async function initWhot(room,players,needBot){
  const sb=window.supabase;
  let allPlayers=players;
  if(needBot){const bot=await addBot(room);if(bot)allPlayers=[...players,bot];}
  const deck=shuffle(createDeck());
  const pids=allPlayers.map(p=>p.user_id||p.id);
  const hands={};let idx=0;
  for(const pid of pids){hands[pid]=deck.slice(idx,idx+DEFAULT_HAND_SIZE);idx+=DEFAULT_HAND_SIZE;}
  const topCard=deck[idx++];
  const drawPile=deck.slice(idx);
  const newState={hands,topCard,drawPile,turnPlayerId:pids[0],turnOrder:pids,declaredSuit:null,status:'active'};
  const {error}=await sb.from('game_rooms').update({status:'active',state:newState,started_at:new Date().toISOString()}).eq('id',room.id).eq('status','waiting');
  if(error)throw error;
}

async function initDice(room,players,needBot){
  const sb=window.supabase;
  let allPlayers=players,bot=null;
  if(needBot){bot=await addBot(room);if(bot)allPlayers=[...players,bot];}
  const pids=allPlayers.map(p=>p.user_id||p.id);
  const rolls={};
  if(bot)rolls[bot.id]=rollDice(2,6);
  const newState={rolls,order:pids,status:'active'};
  const {error}=await sb.from('game_rooms').update({status:'active',state:newState,started_at:new Date().toISOString()}).eq('id',room.id).eq('status','waiting');
  if(error)throw error;
}

async function initSnooker(room,players,needBot){
  const sb=window.supabase;
  let allPlayers=players;
  if(needBot){const bot=await addBot(room);if(bot)allPlayers=[...players,bot];}
  const pids=allPlayers.slice(0,2).map(p=>p.user_id||p.id);
  const newState=createSnookerState(pids);
  const {error}=await sb.from('game_rooms').update({status:'active',state:newState,started_at:new Date().toISOString()}).eq('id',room.id).eq('status','waiting');
  if(error)throw error;
}

/* ---------- Settlement ---------- */
async function settleRoom(roomId,winnerIds){
  const sb=window.supabase;
  const {data,error}=await sb.rpc('game_settle_room',{p_room_id:roomId,p_winner_ids:winnerIds});
  if(error)console.error('Settlement failed',error);
  window.state.gameSettlement=data||null;
  renderGameRoom();
}

/* ---------- Whot actions ---------- */
window.playWhotCard=async function(idx){
  const s=window.state,sb=window.supabase;
  const {data:room}=await sb.from('game_rooms').select('*').eq('id',s.gameRoomId).single();
  if(!room||room.status!=='active')return;
  const state=room.state,pid=s.user.id;
  if(state.turnPlayerId!==pid)return alert("It's not your turn.");
  const hand=state.hands[pid]||[],card=hand[idx];
  let declaredSuit=null;
  if(card&&card.value===20){declaredSuit=prompt('Whot! Declare a suit: '+SUITS.join(', '));if(!SUITS.includes(declaredSuit))return alert('Invalid suit.');}
  try{validateWhotAction(state,pid,idx,declaredSuit);}catch(e){return alert(e.message);}
  const newHand=hand.filter((_,i)=>i!==idx);
  state.hands[pid]=newHand;state.topCard=card;state.declaredSuit=declaredSuit;
  if(newHand.length===0){
    await sb.from('game_rooms').update({state:{...state,status:'finished'}}).eq('id',room.id);
    await settleRoom(room.id,isBotPid(pid)?[]:[pid]);return;
  }
  state.turnPlayerId=nextPlayer(state.turnOrder,pid);
  await sb.from('game_rooms').update({state}).eq('id',room.id);renderGameRoom();maybeBotMove(room.id);
};

window.drawWhotCard=async function(){
  const s=window.state,sb=window.supabase;
  const {data:room}=await sb.from('game_rooms').select('*').eq('id',s.gameRoomId).single();
  if(!room||room.status!=='active')return;
  const state=room.state,pid=s.user.id;
  if(state.turnPlayerId!==pid)return alert("It's not your turn.");
  if(!state.drawPile.length)return alert('Draw pile is empty.');
  const card=state.drawPile.shift();state.hands[pid]=[...(state.hands[pid]||[]),card];state.turnPlayerId=nextPlayer(state.turnOrder,pid);
  await sb.from('game_rooms').update({state}).eq('id',room.id);renderGameRoom();maybeBotMove(room.id);
};

/* ---------- Dice actions ---------- */
window.rollMyDice=async function(){
  const s=window.state,sb=window.supabase;
  const {data:room}=await sb.from('game_rooms').select('*').eq('id',s.gameRoomId).single();
  if(!room||room.status!=='active')return;
  const state=room.state,pid=s.user.id;
  if(state.rolls[pid])return;
  state.rolls[pid]=rollDice(2,6);
  await sb.from('game_rooms').update({state}).eq('id',room.id);renderGameRoom();await maybeFinishDice(room.id);
};

async function maybeFinishDice(roomId){
  const sb=window.supabase;
  const {data:room}=await sb.from('game_rooms').select('*').eq('id',roomId).single();
  if(!room||room.status!=='active')return;
  const state=room.state;
  if(!state.order.every(pid=>state.rolls[pid]))return;
  const results=state.order.map(pid=>({pid,total:state.rolls[pid].total}));
  const {winners}=resolveHighestTotal(results);const winnerPids=winners.map(w=>w.pid);
  await sb.from('game_rooms').update({state:{...state,status:'finished'}}).eq('id',roomId);
  const humanWinners=winnerPids.filter(pid=>!isBotPid(pid)).slice(0,2);await settleRoom(roomId,humanWinners);
}

/* ---------- Snooker actions ---------- */
window.snookerPot=async function(colour){
  const s=window.state,sb=window.supabase;
  const {data:room}=await sb.from('game_rooms').select('*').eq('id',s.gameRoomId).single();
  if(!room||room.status!=='active')return;
  const state=room.state,pid=s.user.id;
  try{scorePot(state,pid,colour);}catch(e){return alert(e.message);}
  state.currentPlayerId=state.playerIds.find(id=>id!==pid);await sb.from('game_rooms').update({state}).eq('id',room.id);renderGameRoom();maybeBotMove(room.id);
};

window.snookerFoul=async function(points){
  const s=window.state,sb=window.supabase;
  const {data:room}=await sb.from('game_rooms').select('*').eq('id',s.gameRoomId).single();
  if(!room||room.status!=='active')return;
  const state=room.state,pid=s.user.id;
  try{applyFoul(state,pid,points);}catch(e){return alert(e.message);}
  state.currentPlayerId=state.playerIds.find(id=>id!==pid);await sb.from('game_rooms').update({state}).eq('id',room.id);renderGameRoom();maybeBotMove(room.id);
};

window.snookerEndFrame=async function(){
  const s=window.state,sb=window.supabase;
  const {data:room}=await sb.from('game_rooms').select('*').eq('id',s.gameRoomId).single();
  if(!room||room.status!=='active')return;
  const state=room.state,result=finishSnooker(state);
  await sb.from('game_rooms').update({state:{...state,status:'finished'}}).eq('id',room.id);
  if(result.tie||!result.winner){await settleRoom(room.id,[]);return;}
  await settleRoom(room.id,isBotPid(result.winner)?[]:[result.winner]);
};

/* ---------- Bot moves ---------- */
function maybeBotMove(roomId){
  const sb=window.supabase;
  setTimeout(async()=>{
    const {data:room}=await sb.from('game_rooms').select('*').eq('id',roomId).single();
    if(!room||room.status!=='active')return;
    const botPlayer=(window.state.gameRoomPlayers||[]).find(p=>p.is_bot);if(!botPlayer)return;
    const botPid=botPlayer.id,st=room.state;
    if(room.game_type==='whot'){
      if(st.turnPlayerId!==botPid)return;
      const hand=st.hands[botPid]||[],i=hand.findIndex(c=>canPlay(c,st.topCard,st.declaredSuit));
      if(i===-1){if(st.drawPile.length){const card=st.drawPile.shift();st.hands[botPid]=[...hand,card];}st.turnPlayerId=nextPlayer(st.turnOrder,botPid);await sb.from('game_rooms').update({state:st}).eq('id',roomId);renderGameRoom();return;}
      const card=hand[i],newHand=hand.filter((_,idx)=>idx!==i);st.hands[botPid]=newHand;st.topCard=card;st.declaredSuit=card.value===20?SUITS[secureInt(0,SUITS.length-1)]:null;
      if(newHand.length===0){await sb.from('game_rooms').update({state:{...st,status:'finished'}}).eq('id',roomId);await settleRoom(roomId,[]);return;}
      st.turnPlayerId=nextPlayer(st.turnOrder,botPid);await sb.from('game_rooms').update({state:st}).eq('id',roomId);renderGameRoom();
    }
    if(room.game_type==='snooker'){
      if(st.currentPlayerId!==botPid)return;
      const colours=Object.keys(BALL_VALUES),colour=colours[secureInt(0,colours.length-1)];
      try{scorePot(st,botPid,colour);}catch(e){}
      st.currentPlayerId=st.playerIds.find(id=>id!==botPid);await sb.from('game_rooms').update({state:st}).eq('id',roomId);renderGameRoom();
    }
  },1200);
}

/* ---------- Rendering ---------- */
function renderGameRoom(){
  const app=document.querySelector('#app');if(!app)return;
  const s=window.state,cache=s.gameRoomCache;
  if(!cache){app.innerHTML='<div class="wrap"><div class="panel"><h3>Loading room…</h3></div></div>';return;}
  const {room,players}=cache,rules=RULES[room.game_type]||{name:room.game_type};let inner='';
  if(room.status==='waiting')inner=`<div class="panel"><span class="badge">${esc(rules.name)} • WAITING</span><h2>${players.length}/${room.capacity} players joined</h2><p class="muted">Entry ₦${room.stake}. The room starts automatically once enough players join — a house bot may fill a remaining seat after a short wait.</p><div class="grid">${players.map(p=>`<div class="card"><b>${esc(p.display_name||(p.is_bot?BOT_RULES.name+' (Bot)':'Player'))}</b>${p.is_bot?'<div class="small muted">House bot</div>':''}</div>`).join('')}</div><button class="secondary" style="margin-top:14px" onclick="leaveGameRoom()">Cancel & refund</button></div>`;
  else if(room.status==='active')inner=renderActiveGame(room,players);
  else{const st=s.gameSettlement;inner=`<div class="panel"><span class="badge">GAME OVER</span><h2>Round finished</h2>${st&&st.ok?`<p class="muted">Prize pool: ₦${Number(st.prize_pool||0).toFixed(2)} • 1st: ₦${Number(st.first||0).toFixed(2)} • 2nd: ₦${Number(st.second||0).toFixed(2)}</p>`:'<p class="muted">Check your Wallet for any winnings.</p>'}<button class="primary" onclick="leaveGameRoom()">Back to Games</button></div>`;}
  app.innerHTML=`<div class="wrap"><button class="back" onclick="leaveGameRoom()">← Back</button>${inner}</div>`;
}

function renderActiveGame(room,players){
  const s=window.state,pid=s.user.id,state=room.state;
  if(room.game_type==='whot'){
    const hand=state.hands?.[pid]||[],myTurn=state.turnPlayerId===pid;
    return `<div class="panel"><span class="badge">WHOT</span><h3>Top card: ${cardLabel(state.topCard)}${state.declaredSuit?` (suit: ${esc(state.declaredSuit)})`:''}</h3><p class="muted">${myTurn?'Your turn':findPlayerName(players,state.turnPlayerId)+"'s turn"}</p><div class="grid">${hand.map((c,i)=>`<button class="secondary" ${myTurn?'':'disabled'} onclick="playWhotCard(${i})">${cardLabel(c)}</button>`).join('')}</div>${myTurn?`<button class="secondary" style="margin-top:10px" onclick="drawWhotCard()">Draw card</button>`:''}</div>`;
  }
  if(room.game_type==='dice'){
    const mine=state.rolls?.[pid],waiting=(state.order||[]).filter(p=>!state.rolls[p]).length;
    return `<div class="panel"><span class="badge">DICE</span><h3>${mine?`You rolled: ${mine.values.join(' + ')} = ${mine.total}`:'Roll your dice'}</h3><p class="muted">Waiting on ${waiting} player(s)</p>${!mine?`<button class="primary" onclick="rollMyDice()">🎲 Roll</button>`:''}</div>`;
  }
  if(room.game_type==='snooker'){
    const myTurn=state.currentPlayerId===pid,scoreLine=Object.entries(state.scores||{}).map(([k,v])=>`${esc(findPlayerName(players,k))}: ${v}`).join(' • ');
    return `<div class="panel"><span class="badge">SNOOKER</span><h3>${myTurn?'Your turn':"Opponent's turn"}</h3><p class="muted">${scoreLine}</p>${myTurn?`<div class="grid">${Object.keys(BALL_VALUES).map(c=>`<button class="secondary" onclick="snookerPot('${c}')">${c} (+${BALL_VALUES[c]})</button>`).join('')}</div><button class="secondary" style="margin-top:10px" onclick="snookerFoul(4)">Log foul (4pts to opponent)</button>`:''}<button class="primary" style="margin-top:10px" onclick="snookerEndFrame()">End frame & settle</button></div>`;
  }
  return '';
}

/* ---------- Hook into the app's render pipeline ---------- */
function installRenderHook(){
  if(!window.state||typeof window.render!=='function')return setTimeout(installRenderHook,100);
  if(window.__fpGamesRenderHookInstalled)return;
  window.__fpGamesRenderHookInstalled=true;
  const originalRender=window.render;
  window.render=async function(){
    if(window.state?.page==='games'){renderGamesHub();return;}
    if(window.state?.page==='game_room'){renderGameRoom();return;}
    return originalRender.apply(this,arguments);
  };
}
installRenderHook();
