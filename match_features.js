/* FootballPoints match detail + fixture-linked team submission. */
(function(){
  function esc(v){return String(v??"").replace(/[&<>\"]/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[s]));}
  function fixtureTime(f){if(!f?.kickoff_at)return "Kickoff time: TBD";return new Date(f.kickoff_at).toLocaleString([], {weekday:"long",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"});}
  function init(){
    const state=window.state,supabase=window.supabase;
    if(!state||!supabase||!window.render||!window.go||!window.submitTeam||!window.start){setTimeout(init,100);return;}
    const currentFixture=id=>(state.fixtures||[]).find(f=>String(f.id)===String(id));
    window.openMatch=async function(id){const f=currentFixture(id);if(!f)return alert("Match not found.");state.selectedFixtures=[f];state.page="matchDetail";await window.render();};
    window.matchDetailPage=async function(){
      const f=state.selectedFixtures?.[0];if(!f)return `<div class="panel"><p class="muted">No match selected.</p><button class="primary" onclick="go('matches')">Back to matches</button></div>`;
      const clubs=[f.home_team,f.away_team].filter(Boolean);const {data,error}=await supabase.from("players").select("id,name,club,position").eq("active",true).in("club",clubs).order("club").order("name");
      const players=error?[]:(data||[]),byClub={};players.forEach(p=>(byClub[p.club]??=[]).push(p));
      return `<button class="back" onclick="go('matches')">← Back to upcoming matches</button><div class="section"><div><span class="badge">MATCH</span><h2>${esc(f.home_team)} vs ${esc(f.away_team)}</h2><p class="muted" style="margin:0">🕒 ${esc(fixtureTime(f))}</p></div><button class="primary" onclick="buildTeamForMatch('${esc(f.id)}')">Pick players for this match →</button></div><div class="notice"><b>Players for this match</b><br><span class="muted">Only active players from ${esc(f.home_team)} and ${esc(f.away_team)} are shown. Confirmed starting-XI data can replace this pool when the football-data provider supplies the lineup.</span></div><div class="two" style="margin-top:16px">${clubs.map(club=>`<div class="panel"><h3>${esc(club)}</h3>${(byClub[club]||[]).map(p=>`<div class="row"><div><b>${esc(p.name)}</b><div class="small">${esc(p.position)}</div></div><span class="badge">AVAILABLE</span></div>`).join("")||`<p class="muted">No active players found for this club yet.</p>`}</div>`).join("")}</div>`;
    };
    window.buildTeamForMatch=async function(id){const f=currentFixture(id);if(!f)return alert("Match not found.");state.selectedFixtures=[f];await window.start("league");};

    const originalRender=window.render,originalGo=window.go,originalStart=window.start,originalSubmitTeam=window.submitTeam;
    window.go=function(p){if(p==="matchDetail"||p==="matches"){state.page=p;state.menuOpen=false;return window.render();}return originalGo(p);};
    window.start=async function(m){await originalStart(m);if(state.page==="builder")await window.render();};
    window.render=async function(){
      if(state.page!=="matchDetail"){
        await originalRender();
        if(state.page==="matches"){
          const cards=document.querySelectorAll("main.wrap .grid > .card");
          (state.fixtures||[]).forEach((f,i)=>{const card=cards[i];if(!card||card.querySelector(".view-match-btn"))return;const b=document.createElement("button");b.className="secondary view-match-btn";b.style.marginTop="8px";b.textContent="View players for this match";b.onclick=()=>window.openMatch(f.id);card.appendChild(b);});
        }
        if(state.page==="builder"&&state.selectedFixtures?.length){const main=document.querySelector("main.wrap");if(main&&!main.querySelector(".selected-match-time")){const box=document.createElement("div");box.className="notice selected-match-time";box.style.marginBottom="16px";box.innerHTML=`<b>Selected match time:</b> ${state.selectedFixtures.map(f=>`${esc(f.home_team)} vs ${esc(f.away_team)} — ${esc(fixtureTime(f))}`).join("<br>")}`;main.prepend(box);}}
        return;
      }
      const page=await window.matchDetailPage();const old=state.page;state.page="home";await originalRender();state.page=old;const main=document.querySelector("main.wrap");if(main)main.innerHTML=page;
    };
    window.submitTeam=async function(){
      const fixtureIds=(state.selectedFixtures||[]).map(f=>f.id).filter(Boolean);await originalSubmitTeam();
      if(state.mode!=="league"||!state.user||!fixtureIds.length||state.page!=="leaderboard")return;
      const {data:round}=await supabase.from("rounds").select("id").eq("status","open").order("created_at",{ascending:false}).limit(1).maybeSingle();if(!round?.id)return;
      const {data:entry}=await supabase.from("entries").select("id").eq("round_id",round.id).eq("user_id",state.user.id).order("submitted_at",{ascending:false}).limit(1).maybeSingle();if(!entry?.id)return;
      await supabase.from("entry_fixtures").upsert(fixtureIds.map(fixture_id=>({entry_id:entry.id,fixture_id})),{onConflict:"entry_id,fixture_id"});
    };
  }
  init();
})();
