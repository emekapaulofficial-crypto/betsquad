/* FootballPoints selection + performance rules upgrade.
   - Never shows duplicate player records.
   - Match picker uses fixture-specific starting XI when available.
   - League/1v1 = 7 players.
   - Room = 4 players; room player overlap is limited to 2 by the database.
   - Uses verified match stats for scoring; it does not invent winners for draws.
*/
(function(){
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=v=>String(v??'').replace(/[&<>\"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[s]));
  const key=p=>String(p?.provider_player_id||p?.external_player_id||`${p?.name||''}|${p?.club||''}`).trim().toLowerCase();
  const dedupe=arr=>{const seen=new Set();return (arr||[]).filter(p=>{const k=key(p);if(seen.has(k))return false;seen.add(k);return true;});};
  const needLeague={GK:1,DEF:3,MID:2,ST:1};
  const needRoom={GK:1,DEF:1,MID:1,ST:1};
  const teamNeed=()=>window.state?.roomTeamMode?needRoom:needLeague;
  const teamSize=()=>Object.values(teamNeed()).reduce((a,b)=>a+b,0);
  const fixtureTime=f=>f?.kickoff_at?new Date(f.kickoff_at).toLocaleString([], {weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Kickoff time: TBD';

  async function init(){
    if(!window.state||!window.supabase||!window.render){await sleep(150);return init();}
    const state=window.state,sb=window.supabase;

    const originalLoadDbPlayers=window.loadDbPlayers;
    if(originalLoadDbPlayers){
      window.loadDbPlayers=async function(){await originalLoadDbPlayers();state.dbPlayers=dedupe(state.dbPlayers);};
    }

    window.add=async function(id){
      const p=dedupe(state.dbPlayers).find(x=>String(x.id)===String(id));
      if(!p)return;
      if((state.selected||[]).some(x=>key(x)===key(p)))return alert('That player is already selected. You cannot pick the same player twice.');
      const need=teamNeed();
      if(!need[p.position])return alert(`No ${p.position||'unknown'} slot is available.`);
      if((state.selected||[]).filter(x=>x.position===p.position).length>=need[p.position])return alert(`You can select only ${need[p.position]} ${p.position} player(s).`);
      state.selected=[...(state.selected||[]),p];window.render();
    };

    window.toggleMatchPlayer=async function(id){
      const p=dedupe(state.matchPlayers||[]).find(x=>String(x.id)===String(id));if(!p)return;
      const existing=(state.selected||[]).find(x=>key(x)===key(p));
      if(existing){state.selected=state.selected.filter(x=>key(x)!==key(p));return window.render();}
      const need=teamNeed();
      if(!need[p.position])return alert(`No ${p.position||'unknown'} slot is available.`);
      if((state.selected||[]).filter(x=>x.position===p.position).length>=need[p.position])return alert(`You already filled the ${p.position} slot.`);
      state.selected=[...(state.selected||[]),p];window.render();
    };

    window.matchDetailPage=async function(){
      const f=state.selectedFixtures?.[0];
      if(!f)return `<div class="panel"><p class="muted">No match selected.</p></div>`;
      const n=teamNeed();
      const lineup=await sb.from('fp_fixture_lineups').select('player_id,is_starting').eq('fixture_id',f.id).eq('is_starting',true);
      let players=[]; const lineupLoaded=Array.isArray(lineup.data)&&lineup.data.length>0;
      if(lineupLoaded){
        const ids=lineup.data.map(x=>x.player_id);
        const q=await sb.from('players').select('id,name,real_name,club,position,photo_url,provider_player_id,external_player_id').in('id',ids).order('club').order('name');
        players=dedupe(q.data||[]);
      }
      state.matchPlayers=players;
      const selected=state.selected||[];
      const counts=Object.fromEntries(Object.keys(n).map(k=>[k,selected.filter(p=>p.position===k).length]));
      const complete=Object.keys(n).every(k=>counts[k]===n[k]);
      const selectedHtml=selected.length?`<div class="notice" style="margin-top:16px"><b>Your picks: ${selected.length}/${teamSize()}</b><div style="margin-top:8px">${selected.map(p=>`<span class="badge" style="margin:3px;display:inline-block">${esc(p.name)} · ${esc(p.position)}</span>`).join('')}</div></div>`:'';
      const groups={};players.forEach(p=>(groups[p.club]??=[]).push(p));
      const body=lineupLoaded?Object.entries(groups).map(([club,ps])=>`<div class="panel"><h3>${esc(club)}</h3>${ps.map(p=>{const picked=selected.some(x=>key(x)===key(p));const full=!picked&&(selected.filter(x=>x.position===p.position).length>=n[p.position]);return `<button type="button" class="row" style="width:100%;text-align:left;cursor:${full?'not-allowed':'pointer'};opacity:${full&&!picked?'.55':'1'};background:${picked?'rgba(80,214,143,.12)':'transparent'};border:1px solid ${picked?'rgba(80,214,143,.55)':'rgba(120,150,190,.25)'};margin-bottom:8px" onclick="toggleMatchPlayer('${esc(p.id)}')" ${full&&!picked?'disabled':''}>${p.photo_url?`<img src="${esc(p.photo_url)}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;margin-right:10px">`:''}<div style="flex:1"><b>${esc(p.real_name||p.name)}</b><div class="small">${esc(p.position)}</div></div><span class="badge">${picked?'✓ PICKED':full?'FULL':'STARTING XI'}</span></button>`;}).join('')}</div>`).join(''):`<div class="panel"><h3>Starting XI not loaded yet</h3><p class="muted">This match is locked for player selection until the verified starting XI is imported. We will not guess or display non-starters.</p></div>`;
      return `<button class="back" onclick="go('matches')">← Back to upcoming matches</button><div class="section"><div><span class="badge">MATCH</span><h2>${esc(f.home_team)} vs ${esc(f.away_team)}</h2><p class="muted" style="margin:0">🕒 ${esc(fixtureTime(f))}</p></div><button class="primary" onclick="submitMatchTeam()" ${complete?'':'disabled'} style="opacity:${complete?1:.6}">${complete?`Save ${teamSize()} players for this match →`:`Pick ${teamSize()-selected.length} more player(s)`}</button></div>${selectedHtml}<div class="notice"><b>Starting players only</b><br><span class="muted">Only the verified starting XI for this exact fixture can be selected.</span></div><div class="two" style="margin-top:16px">${body}</div>`;
    };

    window.submitMatchTeam=async function(){
      const n=teamNeed(),selected=dedupe(state.selected||[]);
      const complete=Object.keys(n).every(k=>selected.filter(p=>p.position===k).length===n[k]);
      if(!complete)return alert(`Complete all ${teamSize()} positions first.`);
      state.selected=selected;
      if(state.roomTeamMode)return window.saveRoomTeam();
      if(typeof window.submitTeam==='function')return window.submitTeam();
    };

    const oldSubmit=window.submitTeam;
    if(oldSubmit&&!oldSubmit.__fpUpgrade){
      const wrapped=async function(){
        state.selected=dedupe(state.selected||[]);
        if(state.selected.length!==7&&!state.roomTeamMode)return alert('A 1-v-1 league team must contain exactly 7 different players.');
        return oldSubmit();
      };
      wrapped.__fpUpgrade=true;window.submitTeam=wrapped;
    }

    window.startRoomTeam=async function(roomId){
      const r=await sb.from('match_rooms').select('*').eq('id',roomId).single();
      if(r.error)return alert(r.error.message);
      const f=await sb.from('room_fixtures').select('fixture_id,fixtures(id,home_team,away_team,kickoff_at)').eq('room_id',roomId).order('sort_order').limit(1);
      const fixture=f.data?.[0]?.fixtures;
      if(!fixture)return alert('This room has no match attached yet.');
      state.roomTeamMode=true;state.roomId=roomId;state.selectedFixtures=[fixture];state.selected=[];state.page='matchDetail';window.render();
    };
    window.saveRoomTeam=async function(){
      if(!state.user||!state.roomId)return go('auth');
      const selected=dedupe(state.selected||[]);if(selected.length!==4)return alert('Room play requires exactly 4 different players.');
      const e=await sb.from('room_entries').upsert({room_id:state.roomId,user_id:state.user.id},{onConflict:'room_id,user_id'}).select().single();
      if(e.error)return alert(e.error.message);
      await sb.from('room_entry_players').delete().eq('entry_id',e.data.id);
      const ins=await sb.from('room_entry_players').insert(selected.map(p=>({entry_id:e.data.id,player_id:p.id,slot_position:p.position})));
      if(ins.error){await sb.from('room_entry_players').delete().eq('entry_id',e.data.id);return alert(ins.error.message);}
      alert('Room team saved: 4 different players. The same player can be used by at most 2 room players.');
      state.roomTeamMode=false;state.page='room';if(typeof window.openRoom==='function')return window.openRoom(state.roomId);window.render();
    };

    const oldOpenRoom=window.openRoom;
    if(oldOpenRoom&&!oldOpenRoom.__fpUpgrade){
      const wrappedOpen=async function(id){await oldOpenRoom(id);setTimeout(()=>{
        const build=[...document.querySelectorAll('button')].find(b=>/Build my team/i.test(b.textContent||''));
        if(build){build.textContent='Build my 4-player team';build.onclick=()=>window.startRoomTeam(id);}
      },0);};
      wrappedOpen.__fpUpgrade=true;window.openRoom=wrappedOpen;
    }

    window.calculatePlayerMatchPoints=async function(fixtureId,playerId){
      const q=await sb.from('fp_player_match_stats').select('*').eq('fixture_id',fixtureId).eq('player_id',playerId).maybeSingle();
      if(q.error||!q.data)return null;
      const s=q.data;
      return (s.goals||0)*5+(s.assists||0)*3+(s.clean_sheet?4:0)+(s.team_win?2:0)-(s.yellow_cards||0)-(s.red_cards||0)*3+(s.performance_points||0);
    };
    window.fpScoringRules={goal:5,assist:3,cleanSheet:4,teamWin:2,yellowCard:-1,redCard:-3,drawWinBonus:0};

    const oldStart=window.start;
    if(oldStart&&!oldStart.__fpUpgrade){
      const wrappedStart=async function(m){state.roomTeamMode=false;state.selected=[];await oldStart(m);state.dbPlayers=dedupe(state.dbPlayers);};
      wrappedStart.__fpUpgrade=true;window.start=wrappedStart;
    }
    console.info('FootballPoints selection/performance rules active.');
  }
  init();
})();
