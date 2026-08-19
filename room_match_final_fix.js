/* FINAL room match + 7-player flow. Loaded last so older room scripts cannot overwrite it. */
(function(){
  const R=()=>window.roomFlow;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const same=(a,b)=>{const x=norm(a),y=norm(b);return x===y||x.includes(y)||y.includes(x);};
  const limits={GK:1,DEF:2,MID:3,ST:1};
  const pos=v=>{const p=String(v||'').toUpperCase();if(['GK','G','GKP','GOALKEEPER'].includes(p))return 'GK';if(['DEF','DF','D','DEFENDER'].includes(p))return 'DEF';if(['MID','MF','M','MIDFIELDER'].includes(p))return 'MID';if(['ST','FW','F','CF','FORWARD','STRIKER'].includes(p))return 'ST';return p;};
  const count=(mine,p)=>mine.filter(x=>pos(x.slot_position||x.players?.position)===p).length;
  const leader=()=>{const r=R()?.room;return r&&state.user&&String(r.creator_id)===String(state.user.id);};

  async function fixtures(){
    const q=await supabase.from('upcoming_fixtures').select('id,home_team,away_team,kickoff_at,status').gte('kickoff_at',new Date(Date.now()-30*60000).toISOString()).lte('kickoff_at',new Date(Date.now()+48*3600000).toISOString()).order('kickoff_at').limit(100);
    if(q.error)throw q.error;return q.data||[];
  }
  async function playersFor(f){
    const r=R();if(!r||!f)return [];
    const q=await supabase.from('players').select('id,name,club,position,photo_url').eq('active',true).order('name');
    if(q.error)throw q.error;
    return (q.data||[]).filter(p=>[f.home_team,f.away_team].some(t=>same(p.club,t)));
  }
  const ngTime=d=>new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:true}).format(new Date(d));
  const day=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d));

  window.startRoomMatch=async function(){
    if(!leader())return alert('Only the room leader can choose the match.');
    const r=R();state.page='room_match';r.fixtures=[];render();
    try{r.fixtures=await fixtures();render();}catch(e){console.error(e);render();alert('Could not load matches. Press Refresh matches.');}
  };
  window.selectRoomFixture=async function(id){
    if(!leader())return;
    const r=R(),f=(r.fixtures||[]).find(x=>String(x.id)===String(id));
    if(!f)return alert('Match not found. Press Refresh matches.');
    const q=await supabase.from('match_rooms').update({selected_fixture_id:String(id),status:'locked'}).eq('id',r.room.id).eq('creator_id',state.user.id);
    if(q.error)return alert(q.error.message);
    r.fixture=f;r.players=[];
    try{r.players=await playersFor(f);}catch(e){console.warn('Player load failed',e);}
    state.page='room_team';render();
  };
  window.openRoomTeam=async function(){const r=R();if(!r?.fixture)return alert('The room leader has not selected a match yet.');try{r.players=await playersFor(r.fixture);}catch(e){}state.page='room_team';render();};
  window.roomPickPlayer=function(id){
    const r=R();if(!r)return;const p=(r.players||[]).find(x=>String(x.id)===String(id));if(!p)return;
    const mine=r.picks.filter(x=>String(x.user_id)===String(state.user.id));const already=mine.find(x=>String(x.player_id)===String(id));
    if(already){r.picks=r.picks.filter(x=>!(String(x.user_id)===String(state.user.id)&&String(x.player_id)===String(id)));render();return;}
    const pp=pos(p.position);if(!limits[pp])return alert('Only goalkeeper, defender, midfielder and striker players can be picked.');
    if(count(mine,pp)>=limits[pp])return alert(`You can pick only ${limits[pp]} ${pp} player(s).`);
    r.picks.push({user_id:state.user.id,fixture_id:r.room.selected_fixture_id,player_id:p.id,slot_position:pp,players:p});render();
  };
  window.roomRemovePlayer=id=>{const r=R();if(!r)return;r.picks=r.picks.filter(x=>!(String(x.user_id)===String(state.user.id)&&String(x.player_id)===String(id)));render();};
  window.saveRoomTeam=async function(){
    const r=R(),mine=r.picks.filter(x=>String(x.user_id)===String(state.user.id));
    const ok=Object.keys(limits).every(p=>count(mine,p)===limits[p]);
    if(!ok)return alert('Complete your 7-player team: 1 GK + 2 DEF + 3 MID + 1 ST.');
    await supabase.from('room_player_picks').delete().eq('room_id',r.room.id).eq('user_id',state.user.id);
    const q=await supabase.from('room_player_picks').insert(mine.map(x=>({room_id:r.room.id,user_id:state.user.id,fixture_id:String(r.room.selected_fixture_id),player_id:x.player_id,slot_position:pos(x.slot_position)})));
    if(q.error)return alert(q.error.message);state.page='room_payment';render();
  };

  function matchHtml(){
    const r=R(),fs=r?.fixtures||[];const t=day(new Date()),tm=day(Date.now()+86400000);
    const section=(k,title)=>{const rows=fs.filter(f=>day(f.kickoff_at)===k);return `<section class="panel" style="margin-bottom:16px"><h3>${title}</h3>${rows.length?rows.map(f=>`<div class="row" style="margin-bottom:8px;gap:12px"><div style="flex:1"><b>${esc(f.home_team)} vs ${esc(f.away_team)}</b><div class="small">${ngTime(f.kickoff_at)} Nigeria time</div></div><button class="primary" onclick="selectRoomFixture('${esc(f.id)}')">SELECT MATCH</button></div>`).join(''):'<p class="muted">No fixture available.</p>'}</section>;};
    return `<div class="wrap"><button class="back" onclick="backToRoom()">← Back to room</button><div class="section"><div><span class="badge">MATCH SELECTION</span><h2>Today & Tomorrow</h2><p class="muted">Matches load directly from the FootballPoints fixture database.</p></div></div>${section(t,"TODAY'S MATCHES")}${section(tm,"TOMORROW'S MATCHES")}<button class="secondary" onclick="startRoomMatch()">↻ Refresh matches</button></div>`;
  }
  function teamHtml(){
    const r=R(),mine=r.picks.filter(x=>String(x.user_id)===String(state.user.id));
    const groups=[['GK','Goalkeepers'],['DEF','Defenders'],['MID','Midfielders'],['ST','Strikers']];
    const summary=groups.map(([p,n])=>`${n} ${count(mine,p)}/${limits[p]}`).join(' • ');
    const lists=groups.map(([pp,label])=>`<section class="panel" style="margin-bottom:14px"><h3>${label} <span class="small">${count(mine,pp)}/${limits[pp]}</span></h3>${(r.players||[]).filter(x=>pos(x.position)===pp).map(p=>{const picked=mine.some(x=>String(x.player_id)===String(p.id));return `<button type="button" class="row" style="width:100%;margin-bottom:7px;text-align:left;cursor:pointer;background:${picked?'rgba(80,214,143,.12)':'transparent'}" onclick="roomPickPlayer('${esc(p.id)}')"><span><b>${esc(p.name)}</b><div class="small">${esc(p.club||'')}</div></span><span class="badge">${picked?'✓ UNPICK':'PICK'}</span></button>`;}).join('')||'<p class="muted">No players currently available in this position.</p>'}</section>`).join('');
    return `<div class="wrap"><button class="back" onclick="backToRoom()">← Back to room</button><div class="section"><div><span class="badge">7-PLAYER TEAM</span><h2>${esc(r.fixture?.home_team)} vs ${esc(r.fixture?.away_team)}</h2><p class="muted">Pick exactly 7 players: 1 GK + 2 DEF + 3 MID + 1 ST.</p></div><span class="badge">${mine.length}/7</span></div><div class="notice"><b>Your selection:</b> ${summary}</div>${lists}<button class="primary" onclick="saveRoomTeam()">Continue with 7 players →</button></div>`;
  }
  const oldRender=window.render;
  window.render=function(){if(state.page==='room_match'){document.querySelector('#app').innerHTML=matchHtml();return;}if(state.page==='room_team'){document.querySelector('#app').innerHTML=teamHtml();return;}return oldRender?oldRender():undefined;};
  window.FOOTBALLPOINTS_ROOM_RULES={players:7,GK:1,DEF:2,MID:3,ST:1,entry:1000,feePercent:16,firstPercent:60,secondPercent:40,thirdDiamond:300};
})();