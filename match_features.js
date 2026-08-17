/* FootballPoints match detail + fixture-linked team submission.
   Adds exact match context, kickoff time visibility, and links league entries to
   the fixtures the user selected. The player pool is limited to the two clubs
   in the selected match; a confirmed starting XI can be shown when the data
   provider supplies one later.
*/
(function(){
  function esc(v){return String(v??"").replace(/[&<>\"]/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[s]));}
  function fixtureTime(f){
    if(!f?.kickoff_at) return "Kickoff time: TBD";
    return new Date(f.kickoff_at).toLocaleString([], {weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});
  }
  function currentFixture(id){return (window.state?.fixtures||[]).find(f=>String(f.id)===String(id));}

  window.openMatch=async function(id){
    const f=currentFixture(id);
    if(!f) return alert("Match not found.");
    state.selectedFixtures=[f];
    state.page="matchDetail";
    await window.render();
  };

  window.matchDetailPage=async function(){
    const f=state.selectedFixtures?.[0];
    if(!f) return `<div class="panel"><p class="muted">No match selected.</p><button class="primary" onclick="go('matches')">Back to matches</button></div>`;
    const clubs=[f.home_team,f.away_team].filter(Boolean);
    const {data,error}=await supabase.from("players").select("id,name,club,position").eq("active",true).in("club",clubs).order("club").order("name");
    const players=error?[]:(data||[]);
    const byClub={};
    players.forEach(p=>(byClub[p.club]??=[]).push(p));
    return `<button class="back" onclick="go('matches')">← Back to upcoming matches</button>
      <div class="section"><div><span class="badge">MATCH</span><h2>${esc(f.home_team)} vs ${esc(f.away_team)}</h2><p class="muted" style="margin:0">🕒 ${esc(fixtureTime(f))}</p></div>
      <button class="primary" onclick="buildTeamForMatch('${esc(f.id)}')">Pick players for this match →</button></div>
      <div class="notice"><b>Players for this match</b><br><span class="muted">Only players belonging to ${esc(f.home_team)} and ${esc(f.away_team)} are shown. If the football-data provider supplies a confirmed matchday lineup, that lineup can replace the club pool.</span></div>
      <div class="two" style="margin-top:16px">${clubs.map(club=>`<div class="panel"><h3>${esc(club)}</h3>${(byClub[club]||[]).map(p=>`<div class="row"><div><b>${esc(p.name)}</b><div class="small">${esc(p.position)}</div></div><span class="badge">AVAILABLE</span></div>`).join("")||`<p class="muted">No active players found for this club yet.</p>`}</div>`).join("")}</div>`;
  };

  window.buildTeamForMatch=async function(id){
    const f=currentFixture(id);
    if(!f) return alert("Match not found.");
    state.selectedFixtures=[f];
    await window.start("league");
  };

  const originalRender=window.render;
  const originalGo=window.go;
  const originalSubmitTeam=window.submitTeam;
  if(!originalRender || !originalGo || !originalSubmitTeam) return;

  window.go=function(p){
    if(p==="matchDetail"){
      state.page="matchDetail";state.menuOpen=false;return window.render();
    }
    return originalGo(p);
  };

  window.render=async function(){
    if(state.page!=="matchDetail"){
      await originalRender();
      if(state.page==="builder" && state.selectedFixtures?.length){
        const main=document.querySelector("main.wrap");
        if(main && !main.querySelector(".selected-match-time")){
          const box=document.createElement("div");
          box.className="notice selected-match-time";
          box.style.marginBottom="16px";
          box.innerHTML=`<b>Selected match time:</b> ${state.selectedFixtures.map(f=>`${esc(f.home_team)} vs ${esc(f.away_team)} — ${esc(fixtureTime(f))}`).join("<br>")}`;
          main.prepend(box);
        }
      }
      return;
    }
    const page=await window.matchDetailPage();
    // Reuse the existing application shell by rendering Home once, then replace only the main area.
    const oldPage=state.page; state.page="home";
    await originalRender();
    state.page=oldPage;
    const main=document.querySelector("main.wrap");
    if(main) main.innerHTML=page;
  };

  // The original submit function creates the entry. After it succeeds, attach every
  // selected fixture to that entry so settlement can award points for those matches.
  window.submitTeam=async function(){
    const fixtures=(state.selectedFixtures||[]).map(f=>f.id).filter(Boolean);
    await originalSubmitTeam();
    if(state.mode!=="league" || !state.user || !fixtures.length || state.page!=="leaderboard") return;
    const {data:round}=await supabase.from("rounds").select("id").eq("status","open").order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(!round?.id) return;
    const {data:entry}=await supabase.from("entries").select("id").eq("round_id",round.id).eq("user_id",state.user.id).order("submitted_at",{ascending:false}).limit(1).maybeSingle();
    if(!entry?.id) return;
    const rows=fixtures.map(fixture_id=>({entry_id:entry.id,fixture_id}));
    await supabase.from("entry_fixtures").upsert(rows,{onConflict:"entry_id,fixture_id"});
  };
})();
