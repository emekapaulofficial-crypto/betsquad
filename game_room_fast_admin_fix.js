/* BetSquad room speed + admin close/refund + Dice stability lock. */
(function(){'use strict';
  let wrapped=false,renderWrapped=false,roomChannel=null,roomId=null,poll=null,fixTimer=null,busy=false;
  const sb=()=>window.supabase,st=()=>window.state;
  const GAME_RULE_FALLBACK={whot:{entryFee:500,capacity:4},dice:{entryFee:500,capacity:2},snooker:{entryFee:500,capacity:2}};
  const esc=v=>String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function stop(){if(poll){clearInterval(poll);poll=null;}if(fixTimer){clearInterval(fixTimer);fixTimer=null;}if(roomChannel&&sb()){try{sb().removeChannel(roomChannel)}catch(e){}}roomChannel=null;roomId=null;}
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
      s.gameType=type;s.gameRoomId=room.id;s.gameWaitStarted=Date.now();s.gameRoomCache=null;s.gameSettlement=null;s.page='game_room';window.render?.();bindRoom(room.id);
    }catch(e){console.error('Fast room start failed',e);alert('Could not start the game: '+(e?.message||e));}finally{s.gameStarting=false;}
  }
  function wrapPlayGame(){if(wrapped||typeof window.playGame!=='function')return;window.playGame=async function(type){type=String(type).toLowerCase();if(['whot','dice','snooker'].includes(type))return fastPlay(type);};wrapped=true;}
  function stableDiceRender(){
    const s=st(),app=document.querySelector('#app');if(!app||!s?.gameRoomCache)return;
    const room=s.gameRoomCache.room,players=s.gameRoomPlayers||[],pid=s.user?.id,stt=room.state||{},rolls=stt.rolls||{};
    const sig=JSON.stringify([room.status,players.map(p=>[p.id,p.user_id,p.is_bot,p.display_name]),stt.order,Object.keys(rolls),rolls[pid]?.total]);
    if(stableDiceRender.last===sig)return;stableDiceRender.last=sig;
    if(room.status==='waiting'){
      app.innerHTML=`<div class="wrap"><button class="back" onclick="leaveGameRoom()">← Back</button><div class="panel"><span class="badge">🎲 DICE • WAITING</span><h2>${players.length}/${room.capacity||2} players connected</h2><p class="muted">Waiting for the other player. The game will start automatically when both players are connected.</p><div class="grid">${players.map(p=>`<div class="card"><b>${esc(p.display_name||'Player')}</b><div class="small muted">${p.is_bot?'Robot':'Connected'}</div></div>`).join('')}</div><button class="secondary" style="margin-top:14px" onclick="leaveGameRoom()">Cancel & refund</button></div></div>`;
    } else if(room.status==='active'){
      const mine=rolls[pid],order=stt.order||players.map(p=>p.user_id||p.id),waiting=order.filter(x=>!rolls[x]).length;
      app.innerHTML=`<div class="wrap"><button class="back" onclick="leaveGameRoom()">← Back</button><div class="panel"><span class="badge">🎲 DICE • LIVE</span><h2>Dice Game</h2>${players.map(p=>{const r=rolls[p.user_id||p.id];return `<div class="row"><span>${esc(p.display_name||'Player')}${p.is_bot?' 🤖':''}</span><b>${r?esc((r.values||[]).join(' + ')+' = '+r.total):'Ready'}</b></div>`;}).join('')}<p class="muted" style="margin-top:12px">${mine?'Waiting on '+waiting+' player(s).':'Roll your dice to play.'}</p>${!mine?'<button class="primary" onclick="rollMyDice()">🎲 ROLL DICE</button>':''}</div></div>`;
    }
  }
  async function stabilizeDiceRoom(){
    const s=st(),client=sb(),id=s?.gameRoomId;if(!client||s?.page!=='game_room'||s?.gameType!=='dice'||!id||busy)return;
    busy=true;
    try{
      const [{data:room,error:re},{data:players,error:pe}]=await Promise.all([
        client.from('game_rooms').select('*').eq('id',id).single(),
        client.from('game_room_players').select('*').eq('room_id',id).order('joined_at',{ascending:true})
      ]);
      if(re||pe||!room)return;
      s.gameRoomCache={room,players:players||[]};s.gameRoomPlayers=players||[];
      const humans=(players||[]).filter(p=>!p.is_bot);
      if(room.status==='waiting'&&humans.length>=2){
        const leader=humans[0];
        if(leader.user_id===s.user.id){
          const order=(players||[]).map(p=>p.user_id||p.id);
          const state={...(room.state||{}),rolls:{...(room.state?.rolls||{})},order,status:'active'};
          const q=await client.from('game_rooms').update({status:'active',state,started_at:new Date().toISOString()}).eq('id',id).eq('status','waiting');
          if(!q.error){room.status='active';room.state=state;}
        }
      }
      stableDiceRender();
    }catch(e){console.warn('Dice stability fix',e)}finally{busy=false;}
  }
  function wrapRender(){
    if(renderWrapped||typeof window.render!=='function')return;
    const original=window.render;
    window.render=function(){
      const s=st();
      if(s?.page==='game_room'&&s.gameType==='dice'){stableDiceRender();return;}
      return original.apply(this,arguments);
    };
    renderWrapped=true;
  }
  async function adminCloseRefund(){const s=st(),client=sb(),id=s?.gameRoomId;if(!s?.isAdmin||!client||!id)return;if(!confirm('Close this game and refund every human player in this room?'))return;const b=document.getElementById('bsAdminCloseRefund');if(b){b.disabled=true;b.textContent='Closing & refunding…';}const q=await client.rpc('admin_close_game_room',{p_room_id:id,p_reason:'Closed and refunded by Admin'});if(q.error){if(b){b.disabled=false;b.textContent='🛑 Close Game & Refund Players';}return alert(q.error.message);}const d=q.data||{};alert('Room closed. '+Number(d.refunded_players||0)+' player(s) refunded ₦'+Number(d.refunded_total||0).toFixed(2)+'.');s.gameRoomId=null;s.gameRoomCache=null;s.gameRoomPlayers=[];s.gameSettlement=null;s.page='games';stop();window.render?.();}
  function renderAdminButton(){const s=st(),id=s?.gameRoomId;let b=document.getElementById('bsAdminCloseRefund');if(!s?.isAdmin||s.page!=='game_room'||!id){b?.remove();return;}const host=document.querySelector('#app .wrap');if(!host)return;if(!b){b=document.createElement('button');b.id='bsAdminCloseRefund';b.type='button';b.className='primary';b.style.cssText='width:100%;margin:10px 0;border:1px solid #e5a400;background:#3a2500;color:#ffd66b;font-weight:800;';b.textContent='🛑 Close Game & Refund Players';b.onclick=adminCloseRefund;host.appendChild(b);}}
  function bindRoom(id){if(!sb()||!st()?.user||!id)return;if(roomChannel&&roomId===id)return;stop();roomId=id;roomChannel=sb().channel('betsquad-room-fast:'+id,{config:{presence:{key:st().user.id},broadcast:{self:false}}});roomChannel.on('postgres_changes',{event:'*',schema:'public',table:'game_room_players',filter:'room_id=eq.'+id},()=>{if(st()?.gameType==='dice')stabilizeDiceRoom();else window.render?.();});roomChannel.on('postgres_changes',{event:'UPDATE',schema:'public',table:'game_rooms',filter:'id=eq.'+id},()=>{if(st()?.gameType==='dice')stabilizeDiceRoom();else window.render?.();});roomChannel.subscribe(async status=>{if(status==='SUBSCRIBED'){try{await roomChannel.track({user_id:st().user.id,display_name:st().user.user_metadata?.name||'Player',online_at:new Date().toISOString()});}catch(e){}}});fixTimer=setInterval(()=>{if(st()?.page!=='game_room'||st()?.gameRoomId!==id){stop();return;}stabilizeDiceRoom();renderAdminButton();},700);}
  function run(){wrapPlayGame();wrapRender();const s=st();if(s?.page==='game_room'&&s.gameRoomId)bindRoom(s.gameRoomId);else if(s?.page!=='game_room')stop();renderAdminButton();if(s?.page==='game_room'&&s.gameType==='dice')stabilizeDiceRoom();}
  const timer=setInterval(run,100);setTimeout(()=>clearInterval(timer),60000);run();
})();
