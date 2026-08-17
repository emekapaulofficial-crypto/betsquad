/* Reliable real-fixture display layer.
   Uses the database populated by sync-fixtures; never creates or guesses fixtures. */
(function(){
  const WAIT=100;
  let refreshTimer=null;
  let patched=false;
  const esc=v=>String(v??"").replace(/[&<>\"]/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;"}[s]));
  function localDateKey(iso){const d=new Date(iso);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
  function dateLabel(key){const d=new Date(`${key}T12:00:00`);return d.toLocaleDateString([], {weekday:"long",day:"numeric",month:"long",year:"numeric"});}
  function kickoff(iso){return new Date(iso).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});}
  async function getFixtures(){
    const sb=window.supabase;
    if(!sb)return [];
    // Trigger the authoritative sync first. If it fails, do not invent fallback matches.
    const sync=await sb.functions.invoke("sync-fixtures");
    if(sync.error) console.warn("Fixture sync failed; displaying last verified database data:",sync.error.message);
    const now=new Date().toISOString();
    const {data,error}=await sb.from("fixtures").select("id,external_id,home_team,away_team,kickoff_at,status").gte("kickoff_at",now).order("kickoff_at",{ascending:true}).limit(100);
    if(error) throw error;
    return (data||[]).filter(f=>f.status==="scheduled"&&f.kickoff_at);
  }
  function renderRealMatches(fixtures){
    const s=window.state;
    const grouped={};
    fixtures.forEach(f=>{const k=localDateKey(f.kickoff_at);(grouped[k]??=[]).push(f);});
    const days=Object.keys(grouped).sort();
    const selected=s.selectedFixtures||[];
    return `<div class="section"><h2>Upcoming real matches</h2></div>
      <p class="muted" style="margin-top:-8px">Automatically updated from the verified Premier League fixture feed. No guessed or fake matches are created.</p>
      ${!days.length?`<div class="panel"><h3>No upcoming Premier League fixture is currently confirmed in the database.</h3><p class="muted">The system will keep checking automatically. When the official fixture feed publishes the next match, it will appear here without you adding it manually.</p></div>`:
      days.slice(0,14).map(day=>`<section style="margin-top:22px"><h3 style="margin-bottom:10px">${esc(dateLabel(day))}</h3><div class="grid">${grouped[day].map(f=>{const picked=selected.some(x=>String(x.id)===String(f.id));return `<div class="card ${picked?"filled":""}"><span class="badge">KICKOFF ${esc(kickoff(f.kickoff_at))}</span><h3>${esc(f.home_team)} vs ${esc(f.away_team)}</h3><p class="muted">Real fixture • ${esc(new Date(f.kickoff_at).toLocaleString([], {timeZoneName:"short"}))}</p><button class="secondary" onclick="openMatch('${esc(f.id)}')">View players for this match</button><button class="${picked?"primary":"secondary"}" style="margin-top:8px" onclick="toggleFixture('${esc(f.id)}')">${picked?"✓ Selected":"Select this match"}</button></div>`}).join("")}</div></section>`).join("")}
      ${selected.length?`<div class="notice" style="margin-top:16px;display:flex;justify-content:space-between;align-items:center"><span>${selected.length} match${selected.length>1?"es":""} selected</span><span><button class="secondary" onclick="clearFixtures()">Clear</button> <button class="primary" onclick="buildTeamForSelectedFixtures()">Build team →</button></span></div>`:""}`;
  }
  async function showMatches(){
    const s=window.state;
    s.page="matches";s.loadingFixtures=true;
    if(window.render) await window.render();
    try{
      const fixtures=await getFixtures();s.fixtures=fixtures;s.loadingFixtures=false;
      const main=document.querySelector("main.wrap");if(main)main.innerHTML=renderRealMatches(fixtures);
    }catch(e){
      console.error(e);s.loadingFixtures=false;
      const main=document.querySelector("main.wrap");if(main)main.innerHTML=`<div class="panel"><h3>Live fixture sync could not be completed.</h3><p class="muted">No fixture has been invented. Please try again in a moment. ${esc(e.message||e)}</p><button class="primary" onclick="go('matches')">Retry sync</button></div>`;
    }
  }
  function install(){
    if(patched)return;
    if(!window.state||!window.go||!window.render||!window.supabase){setTimeout(install,WAIT);return;}
    patched=true;
    const oldGo=window.go;
    window.go=function(page){if(page==="matches"){showMatches();return;}return oldGo(page);};
    const oldOpen=window.openMatch;
    // match_features.js owns openMatch; keep it when available.
    if(!oldOpen)console.warn("match detail handler is not ready yet");
    document.addEventListener("visibilitychange",()=>{if(document.hidden&&refreshTimer){clearInterval(refreshTimer);refreshTimer=null;}else if(!document.hidden&&window.state?.page==="matches")startTimer();});
    startTimer();
  }
  function startTimer(){
    if(refreshTimer)clearInterval(refreshTimer);
    refreshTimer=setInterval(()=>{if(window.state?.page==="matches")showMatches();},5*60*1000);
  }
  install();
})();
