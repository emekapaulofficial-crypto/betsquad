/* Fast match/player UI + standard 11-player formation.
   Formation: 1 GK, 4 DEF, 3 MID, 2 ST + 1 SUB.
   This file intentionally avoids waiting for external roster sync before showing cached DB players. */
(function(){
  const FORM={GK:1,DEF:4,MID:3,ST:2,SUB:1};
  const total11=10+1;
  function esc(v){return String(v??"").replace(/[&<>\"]/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[s]||s));}
  function sameClub(a,b){const norm=v=>String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");return norm(a)===norm(b)||norm(a).includes(norm(b))||norm(b).includes(norm(a));}
  function selected(id){return (state.selected||[]).some(p=>String(p.id)===String(id));}
  function count(pos){return (state.selected||[]).filter(p=>String(p.position||"").toUpperCase()===pos).length;}
  function normalPos(pos){const p=String(pos||"").toUpperCase();if(["GK","GOALKEEPER","G","GKP"].includes(p))return "GK";if(["DEF","DF","D","DEFENDER"].includes(p))return "DEF";if(["MID","MF","M","MIDFIELDER"].includes(p))return "MID";if(["ST","FW","F","CF","FORWARD","STRIKER"].includes(p))return "ST";return p;}
  function pick(id){const p=(state.matchPlayers||[]).find(x=>String(x.id)===String(id));if(!p)return;const pos=normalPos(p.position);if(selected(id)){state.selected=state.selected.filter(x=>String(x.id)!==String(id));return render();}if(!FORM[pos])return alert("This player position is not part of the 11-player formation.");if(count(pos)>=FORM[pos])return alert(`You can select only ${FORM[pos]} ${pos} player(s).`);state.selected=[...(state.selected||[]),p];render();}
  window.toggleMatchPlayer=pick;
  window.submitMatchTeam=async function(){
    const s=state.selected||[];
    const ok=Object.keys(FORM).every(pos=>s.filter(p=>normalPos(p.position)===pos).length===FORM[pos]);
    if(!ok)return alert("Complete your squad: 1 goalkeeper, 4 defenders, 3 midfielders, 2 strikers and 1 substitute.");
    if(typeof window.submitTeam==='function')return window.submitTeam();
  };
  window.matchDetailPage=async function(){
    const f=state.selectedFixtures?.[0];
    if(!f)return `<div class="panel"><p class="muted">No match selected.</p><button class="primary" onclick="go('matches')">Back to matches</button></div>`;
    const clubs=[f.home_team,f.away_team].filter(Boolean);
    /* First query is deliberately cheap and local to Supabase. Do not wait for Pablo. */
    const q=await supabase.from("players").select("id,name,club,position,photo_url,team_provider_id").eq("active",true).in("club",clubs).order("club").order("name");
    state.matchPlayers=q.data||[];
    const s=state.selected||[];
    const complete=Object.keys(FORM).every(pos=>s.filter(p=>normalPos(p.position)===pos).length===FORM[pos]);
    const summary=`1 GK • 4 DEF • 3 MID • 2 ST • 1 SUB`;
    const selectedHtml=s.length?`<div class="notice" style="margin-top:16px"><b>Your squad: ${s.length}/${total11}</b><div style="margin-top:8px">${s.map(p=>`<button type="button" class="badge" style="margin:3px;display:inline-block;cursor:pointer" onclick="toggleMatchPlayer('${esc(p.id)}')">${esc(p.name)} · ${esc(normalPos(p.position))} ×</button>`).join("")}</div></div>`:`<div class="notice" style="margin-top:16px"><b>Pick your players</b><br><span class="muted">${summary}</span></div>`;
    const clubHtml=clubs.map(club=>{
      const rows=state.matchPlayers.filter(p=>sameClub(p.club,club));
      return `<div class="panel"><h3>${esc(club)}</h3>${rows.map(p=>{const picked=selected(p.id),pos=normalPos(p.position),full=!picked&&count(pos)>=FORM[pos];return `<button type="button" class="row" style="width:100%;display:flex;align-items:center;text-align:left;cursor:${full?'not-allowed':'pointer'};opacity:${full&&!picked?'.5':'1'};background:${picked?'rgba(80,214,143,.12)':'transparent'};border:1px solid ${picked?'rgba(80,214,143,.55)':'rgba(120,150,190,.25)'};margin-bottom:8px" onclick="toggleMatchPlayer('${esc(p.id)}')" ${full&&!picked?'disabled':''}>${p.photo_url?`<img src="${esc(p.photo_url)}" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover;margin-right:10px">`:`<span style="display:inline-flex;width:38px;height:38px;border-radius:50%;align-items:center;justify-content:center;background:#16304b;margin-right:10px">⚽</span>`}<div style="flex:1"><b>${esc(p.name)}</b><div class="small">${esc(pos)}${p.number?' · #'+esc(p.number):''}</div></div><span class="badge">${picked?'✓ UNPICK':full?'FULL':'PICK'}</span></button>`;}).join('')||'<p class="muted">No cached players found for this team yet.</p>'}</div>`;
    }).join('');
    /* Background sync only. The user never waits for it. */
    setTimeout(async()=>{try{const league=String(f.league_name||f.league||'');if(league)await supabase.functions.invoke('pablo-roster-sync',{body:{league,home_team:f.home_team,away_team:f.away_team}}); }catch(e){console.warn('Background roster sync:',e.message)}},0);
    return `<button class="back" onclick="go('matches')">← Back to upcoming matches</button><div class="section"><div><span class="badge">MATCH</span><h2>${esc(f.home_team)} vs ${esc(f.away_team)}</h2><p class="muted">${f.kickoff_at?new Date(f.kickoff_at).toLocaleString():"Kickoff time: TBD"}</p></div><button class="primary" onclick="submitMatchTeam()" ${complete?'':'disabled'}>${complete?'Save squad →':`Pick ${total11-s.length} more`}</button></div>${selectedHtml}<div class="notice"><b>Squad formation</b><br><span class="muted">${summary}. Players are loaded from the local database first; roster synchronization continues in the background.</span></div><div class="two" style="margin-top:16px">${clubHtml}</div>`;
  };
  /* Room picker: use the same formation rules when the room UI calls it. */
  window.roomPickPlayer=function(id){
    const R=window.roomFlow,p=(R?.players||[]).find(x=>String(x.id)===String(id));if(!p)return;
    const pos=normalPos(p.position),mine=(R.picks||[]).filter(x=>x.user_id===state.user.id);
    if(mine.some(x=>String(x.player_id)===String(id))){R.picks=R.picks.filter(x=>!(x.user_id===state.user.id&&String(x.player_id)===String(id)));return render();}
    if(!FORM[pos]||pos==='SUB')return alert('This player cannot be used in the starting XI.');
    if(mine.filter(x=>normalPos(x.slot_position||x.players?.position)===pos).length>=FORM[pos])return alert(`You can pick only ${FORM[pos]} ${pos} player(s).`);
    R.picks.push({user_id:state.user.id,fixture_id:R.room.selected_fixture_id,player_id:id,slot_position:pos,players:p});render();
  };
})();
