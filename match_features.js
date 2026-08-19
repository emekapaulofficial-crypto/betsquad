/* FootballPoints match detail + fixture-linked team submission. */
(function(){
  function esc(v){return String(v??"").replace(/[&<>\"]/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[s]||s));}
  function fixtureTime(f){if(!f?.kickoff_at)return "Kickoff time: TBD";return new Date(f.kickoff_at).toLocaleString([], {weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});}
  function need(){return state.mode==="friendly"?{GK:1,DEF:2,MID:1,ST:1}:{GK:1,DEF:3,MID:2,ST:1};}
  function teamSize(){return Object.values(need()).reduce((a,b)=>a+b,0);}
  function isSelected(id){return (state.selected||[]).some(p=>String(p.id)===String(id));}
  function positionComplete(position){const n=need();return (state.selected||[]).filter(p=>p.position===position).length >= (n[position]||0);}
  function init(){
    const state=window.state,supabase=window.supabase;
    if(!state||!supabase||!window.render||!window.go||!window.submitTeam||!window.start){setTimeout(init,100);return;}
    window.openMatch=async function(id){const f=(state.fixtures||[]).find(x=>String(x.id)===String(id));if(!f)return alert("Match not found.");state.selectedFixtures=[f];state.selected=[];state.page="matchDetail";await window.render();};
    window.toggleMatchPlayer=function(id){const p=(state.matchPlayers||[]).find(x=>String(x.id)===String(id));if(!p)return;if(isSelected(p.id)){state.selected=state.selected.filter(x=>String(x.id)!==String(p.id));return window.render();}const n=need();if(!n[p.position])return alert(`This player position (${p.position||"unknown"}) is not used in this team.`);if(positionComplete(p.position))return alert(`You already selected the maximum ${n[p.position]} ${p.position} player(s).`);state.selected=[...(state.selected||[]),p];window.render();};
    window.submitMatchTeam=async function(){const n=need(),selected=state.selected||[];const complete=Object.keys(n).every(k=>selected.filter(p=>p.position===k).length===n[k]);if(!complete)return alert(`Complete your ${teamSize()}-player team first: ${Object.entries(n).map(([k,v])=>`${v} ${k}`).join(", ")}.`);await window.submitTeam();};
    function leagueCodeFromFixture(f){const raw=String(f?.external_id||"");const m=raw.match(/^espn:([^:]+):/i);return m?.[1]||String(f?.league_name||f?.league||"").trim();}
    async function rosterForClubs(clubs,f){
      let players=[];
      const first=await supabase.from("players").select("id,name,club,position,photo_url").eq("active",true).in("club",clubs).order("club").order("name");
      if(!first.error)players=first.data||[];
      if(players.length<teamSize()){
        try{
          const league=leagueCodeFromFixture(f);
          const teams=await supabase.from("fp_teams").select("name,provider_team_id").in("name",clubs);
          const map={};for(const t of (teams.data||[]))map[String(t.name).toLowerCase()]=t.provider_team_id;
          const body={league,home_team:f.home_team,away_team:f.away_team,provider_team_ids:{home:map[String(f.home_team).toLowerCase()],away:map[String(f.away_team).toLowerCase()]}};
          if(league)await supabase.functions.invoke('pablo-roster-sync',{body});
        }catch(e){console.warn('Pablo roster trigger:',e.message)}
        const refreshed=await supabase.from("players").select("id,name,club,position,photo_url").eq("active",true).in("club",clubs).order("club").order("name");
        if(!refreshed.error&&refreshed.data?.length)players=refreshed.data;
      }
      const found=new Set(players.map(p=>`${String(p.name).toLowerCase()}|${String(p.club).toLowerCase()}`));
      const teams=await supabase.from("fp_teams").select("id,name,logo_url").in("name",clubs);const teamIds=(teams.data||[]).map(t=>t.id).filter(Boolean);
      if(!teamIds.length)return players;
      const second=await supabase.from("fp_players").select("id,name,position,photo_url,team_id,fp_teams(name,logo_url)").eq("active",true).in("team_id",teamIds).order("name");if(second.error)return players;
      for(const p of (second.data||[])){const club=p.fp_teams?.name||clubs.find(c=>String(c).toLowerCase()===String(p.fp_teams?.name||'').toLowerCase());const key=`${String(p.name).toLowerCase()}|${String(club||'').toLowerCase()}`;if(found.has(key))continue;players.push({id:p.id,name:p.name,club,position:p.position,photo_url:p.photo_url});found.add(key);}
      return players;
    }
    window.matchDetailPage=async function(){
      const f=state.selectedFixtures?.[0];if(!f)return `<div class="panel"><p class="muted">No match selected.</p><button class="primary" onclick="go('matches')">Back to matches</button></div>`;
      const clubs=[f.home_team,f.away_team].filter(Boolean);const players=await rosterForClubs(clubs,f);state.matchPlayers=players;const n=need(),selected=state.selected||[];const selectedByPos=Object.fromEntries(Object.keys(n).map(k=>[k,selected.filter(p=>p.position===k).length]));const complete=Object.keys(n).every(k=>selectedByPos[k]===n[k]);
      const selectedHtml=selected.length?`<div class="notice" style="margin-top:16px"><b>Your picks: ${selected.length}/${teamSize()}</b><div style="margin-top:8px">${selected.map(p=>`<span class="badge" style="margin:3px;display:inline-block">${esc(p.name)} · ${esc(p.position)}</span>`).join("")}</div></div>`:`<div class="notice" style="margin-top:16px"><b>Pick your players here</b><br><span class="muted">Tap a player to select them. You need ${teamSize()} players: 1 GK, ${n.DEF} DEF, ${n.MID} MID, ${n.ST} ST.</span></div>`;
      const clubHtml=clubs.map(club=>{const rows=players.filter(p=>String(p.club||'').toLowerCase()===String(club).toLowerCase());return `<div class="panel"><h3>${esc(club)}</h3>${rows.map(p=>{const picked=isSelected(p.id),full=!picked&&positionComplete(p.position);return `<button type="button" class="row" style="width:100%;text-align:left;cursor:${full?"not-allowed":"pointer"};opacity:${full&&!picked?".55":"1"};background:${picked?"rgba(80,214,143,.12)":"transparent"};border:1px solid ${picked?"rgba(80,214,143,.55)":"rgba(120,150,190,.25)"};margin-bottom:8px" onclick="toggleMatchPlayer('${esc(p.id)}')" ${full&&!picked?"disabled":""}>${p.photo_url?`<img src="${esc(p.photo_url)}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;margin-right:10px">`:`<span style="display:inline-flex;width:36px;height:36px;border-radius:50%;align-items:center;justify-content:center;background:#16304b;margin-right:10px">⚽</span>`}<div style="flex:1"><b>${esc(p.name)}</b><div class="small">${esc(p.position)}</div></div><span class="badge">${picked?"✓ PICKED":full?"FULL":"PICK"}</span></button>`;}).join('')||`<p class="muted">Pablo is still syncing the verified roster for this team.</p>`}</div>`;}).join("");
      return `<button class="back" onclick="go('matches')">← Back to upcoming matches</button><div class="section"><div><span class="badge">MATCH</span><h2>${esc(f.home_team)} vs ${esc(f.away_team)}</h2><p class="muted" style="margin:0">🕒 ${esc(fixtureTime(f))}</p></div><button class="primary" onclick="submitMatchTeam()" ${complete?"":"disabled"} style="opacity:${complete?"1":".6"}">${complete?`Save ${teamSize()} players for this match →`:`Pick ${teamSize()-selected.length} more player(s)`}</button></div>${selectedHtml}<div class="notice"><b>Players for this match</b><br><span class="muted">Pablo's roster database is used automatically when the normal player table is missing data. Only players belonging to these two teams are shown.</span></div><div class="two" style="margin-top:16px">${clubHtml}</div>`;
    };
    window.buildTeamForMatch=async function(id){const f=(state.fixtures||[]).find(x=>String(x.id)===String(id));if(!f)return alert("Match not found.");state.selectedFixtures=[f];await window.start("league");};
    const originalRender=window.render,originalGo=window.go,originalStart=window.start,originalSubmitTeam=window.submitTeam;
    window.go=function(p){if(p==="matchDetail"||p==="matches"){state.page=p;state.menuOpen=false;return window.render();}return originalGo(p);};
    window.start=async function(m){await originalStart(m);if(state.page==="builder")await window.render();};
    window.render=async function(){if(state.page!=="matchDetail"){await originalRender();if(state.page==="matches"){const cards=document.querySelectorAll("main.wrap .grid > .card");(state.fixtures||[]).forEach((f,i)=>{const card=cards[i];if(!card||card.querySelector(".view-match-btn"))return;const b=document.createElement("button");b.className="secondary view-match-btn";b.style.marginTop="8px";b.textContent="View players for this match";b.onclick=()=>window.openMatch(f.id);card.appendChild(b);});}if(state.page==="builder"&&state.selectedFixtures?.length){const main=document.querySelector("main.wrap");if(main&&!main.querySelector(".selected-match-time")){const box=document.createElement("div");box.className="notice selected-match-time";box.style.marginBottom="16px";box.innerHTML=`<b>Selected match time:</b> ${state.selectedFixtures.map(f=>`${esc(f.home_team)} vs ${esc(f.away_team)} — ${esc(fixtureTime(f))}`).join("<br>")}`;main.prepend(box);}}return;}const page=await window.matchDetailPage();const old=state.page;state.page="home";await originalRender();state.page=old;const main=document.querySelector("main.wrap");if(main)main.innerHTML=page;};
    window.submitTeam=async function(){const fixtureIds=(state.selectedFixtures||[]).map(f=>f.id).filter(Boolean);await originalSubmitTeam();if(state.mode!=="league"||!state.user||!fixtureIds.length||state.page!=="leaderboard")return;const {data:round}=await supabase.from("rounds").select("id").eq("status","open").order("created_at",{ascending:false}).limit(1).maybeSingle();if(!round?.id)return;const {data:entry}=await supabase.from("entries").select("id").eq("round_id",round.id).eq("user_id",state.user.id).order("submitted_at",{ascending:false}).limit(1).maybeSingle();if(!entry?.id)return;await supabase.from("entry_fixtures").upsert(fixtureIds.map(fixture_id=>({entry_id:entry.id,fixture_id})),{onConflict:"entry_id,fixture_id"});};
  }
  init();
})();
