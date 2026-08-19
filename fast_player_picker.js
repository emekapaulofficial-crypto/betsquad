/* Fast player picker: render cached rosters immediately, sync in background, and support PICK/UNPICK. */
(function(){
  const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const same=(a,b)=>{const n=v=>String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");return n(a)===n(b)||n(a).includes(n(b))||n(b).includes(n(a));};
  const need=()=>window.state?.mode==="friendly"?{GK:1,DEF:2,MID:1,ST:1}:{GK:1,DEF:3,MID:2,ST:1};
  const size=()=>Object.values(need()).reduce((a,b)=>a+b,0);
  async function cachedPlayers(f){
    const clubs=[f.home_team,f.away_team].filter(Boolean);
    const q=await supabase.from("players").select("id,name,club,position,photo_url,number,team_provider_id").eq("active",true).in("club",clubs).order("club").order("name");
    let players=!q.error?(q.data||[]):[];
    // Never block the screen on the external roster sync. Start it in the background.
    if(players.length<size()){
      const league=String(f?.league_name||f?.league||"").trim();
      const teams=await supabase.from("fp_teams").select("name,provider_team_id").limit(500);
      const matched=(teams.data||[]).filter(t=>clubs.some(c=>same(t.name,c)));
      const ids={home:matched.find(t=>same(t.name,f.home_team))?.provider_team_id,away:matched.find(t=>same(t.name,f.away_team))?.provider_team_id};
      if(league) supabase.functions.invoke("pablo-roster-sync",{body:{league,home_team:f.home_team,away_team:f.away_team,provider_team_ids:ids}}).catch(()=>{});
    }
    return players;
  }
  function install(){
    if(!window.state||!window.supabase||!window.matchDetailPage){setTimeout(install,100);return;}
    const original=window.matchDetailPage;
    window.matchDetailPage=async function(){
      const f=state.selectedFixtures?.[0];
      if(!f)return original();
      const clubs=[f.home_team,f.away_team].filter(Boolean);
      const players=await cachedPlayers(f);
      // Use the existing picker state/functions; only replace the slow roster source.
      state.matchPlayers=players;
      const n=need(), selected=state.selected||[];
      const isSel=id=>selected.some(p=>String(p.id)===String(id));
      const count=p=>selected.filter(x=>x.position===p).length;
      const complete=Object.keys(n).every(k=>count(k)===n[k]);
      const rows=club=>players.filter(p=>same(p.club,club)).map(p=>{
        const picked=isSel(p.id),full=!picked&&count(p.position)>=(n[p.position]||0);
        return `<button type="button" class="row player-pick-row" style="width:100%;display:flex;align-items:center;text-align:left;cursor:${full?'not-allowed':'pointer'};opacity:${full?.55:1};background:${picked?'rgba(80,214,143,.12)':'transparent'};border:1px solid ${picked?'rgba(80,214,143,.55)':'rgba(120,150,190,.25)'};margin-bottom:8px" onclick="toggleMatchPlayer('${esc(p.id)}')" ${full?'disabled':''}>${p.photo_url?`<img src="${esc(p.photo_url)}" alt="" style="width:38px;height:38px;border-radius:50%;object-fit:cover;margin-right:10px">`:`<span style="display:inline-flex;width:38px;height:38px;border-radius:50%;align-items:center;justify-content:center;background:#16304b;margin-right:10px">⚽</span>`}<div style="flex:1"><b>${esc(p.name)}</b><div class="small">${esc(p.position||'Player')}${p.number?` · #${esc(p.number)}`:''}</div></div><span class="badge">${picked?'UNPICK':full?'FULL':'PICK'}</span></button>`;
      }).join('')||'<p class="muted">No cached players yet. The verified roster is syncing in the background.</p>';
      return `<button class="back" onclick="go('matches')">← Back to upcoming matches</button><div class="section"><div><span class="badge">MATCH</span><h2>${esc(f.home_team)} vs ${esc(f.away_team)}</h2><p class="muted">Select or unselect players. The roster loads from the local database first.</p></div><button class="primary" onclick="submitMatchTeam()" ${complete?'':'disabled'} style="opacity:${complete?1:.6}">${complete?`Save ${size()} players →`:`Pick ${size()-selected.length} more`}</button></div><div class="notice"><b>Your picks: ${selected.length}/${size()}</b><br><span class="muted">Tap PICK to select. Tap UNPICK to remove a player.</span></div><div class="two" style="margin-top:16px">${clubs.map(c=>`<div class="panel"><h3>${esc(c)}</h3>${rows(c)}</div>`).join('')}</div>`;
    };
    // Background refresh: when Pablo finishes, reload the open picker automatically.
    window.addEventListener('fp-roster-synced',()=>{if(state.page==='matchDetail')window.render();});
  }
  install();
})();