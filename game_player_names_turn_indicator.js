/* BetSquad game player names + always-visible turn indicator. */
(function(){
  'use strict';
  function nameOf(player){
    if(!player)return 'Player';
    return player.display_name||player.username||player.name||player.player_name||String(player.id||'Player').slice(0,8);
  }
  function installNameGate(){
    if(window.state?.page!=='game_room')return;
    if(document.querySelector('#betsquad-player-name-gate'))return;
    const room=window.state.gameRoomCache?.room;
    if(!room)return;
    const key='betsquad_room_name_'+room.id;
    if(localStorage.getItem(key))return;
    const gate=document.createElement('div');
    gate.id='betsquad-player-name-gate';
    gate.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:20px';
    gate.innerHTML='<div style="background:#fff;border-radius:18px;padding:22px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35)"><h2 style="margin-top:0">Choose your player name</h2><p>This is the name everyone in the room will see.</p><input id="betsquad-room-name" maxlength="24" autocomplete="nickname" placeholder="Enter your name" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #ccc;border-radius:10px"><button id="betsquad-save-room-name" style="width:100%;margin-top:12px;padding:12px;border:0;border-radius:10px;font-weight:800;cursor:pointer">Enter Game</button><div id="betsquad-name-error" style="color:#b00020;margin-top:8px"></div></div>';
    document.body.appendChild(gate);
    const input=gate.querySelector('#betsquad-room-name');
    gate.querySelector('#betsquad-save-room-name').onclick=()=>{
      const name=(input.value||'').trim();
      if(name.length<2){gate.querySelector('#betsquad-name-error').textContent='Please choose a name (at least 2 characters).';return;}
      localStorage.setItem(key,name);
      window.betSquadRoomPlayerName=name;
      gate.remove();
      renderPlayers();
    };
    setTimeout(()=>input.focus(),50);
  }
  function renderPlayers(){
    const room=window.state?.gameRoomCache?.room;
    if(!room)return;
    const state=room.state||{};
    const players=Array.isArray(state.players)?state.players:(window.state.gameRoomCache.players||[]);
    const current=state.currentPlayerId||state.current_player_id;
    let box=document.querySelector('#betsquad-player-turn-panel');
    if(!box){box=document.createElement('div');box.id='betsquad-player-turn-panel';box.style.cssText='position:fixed;top:76px;right:12px;z-index:9000;background:rgba(20,20,20,.92);color:#fff;border-radius:12px;padding:10px 12px;max-width:260px;font:600 13px system-ui';document.body.appendChild(box);}
    const list=players.map((p,i)=>{const id=typeof p==='string'?p:(p.id||p.user_id);const n=typeof p==='string'?p:nameOf(p);return '<div style="padding:4px 0;'+(id===current?'color:#ffd54a;font-weight:900':'')+'">'+(id===current?'▶ ':'')+n+(id===current?' — NEXT TO PLAY':'')+'</div>';}).join('');
    box.innerHTML='<div style="font-size:14px;margin-bottom:5px">🎮 Players</div>'+ (list||'<div>No players yet</div>');
  }
  function install(){
    if(window.state?.page!=='game_room')return;
    installNameGate();
    renderPlayers();
  }
  new MutationObserver(install).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(install,1000);
})();
