/* Critical entry flow: matches must be visible immediately after login and inside Rooms. */
(function(){
  'use strict';
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const ngDay=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d));
  const ngTime=d=>new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:true}).format(new Date(d));
  async function loadVisibleFixtures(){
    if(!window.supabase)return [];
    const now=Date.now();
    const start=new Date(now-2*3600000).toISOString();
    const end=new Date(now+36*3600000).toISOString();
    const q=await supabase.from('upcoming_fixtures').select('id,home_team,away_team,kickoff_at,status').gte('kickoff_at',start).lte('kickoff_at',end).order('kickoff_at',{ascending:true}).limit(100);
    if(q.error){console.error('Match loading failed:',q.error);return []}
    return q.data||[];
  }
  function matchPanel(){
    const s=window.state||{}, fs=s.fixtures||[], today=ngDay(new Date()), tomorrow=ngDay(Date.now()+86400000);
    const section=(key,title)=>{const rows=fs.filter(f=>ngDay(f.kickoff_at)===key);return `<section class="panel" style="margin-bottom:16px"><span class="badge">${title}</span><div style="margin-top:10px">${rows.length?rows.map(f=>`<div class="fixture-card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin:8px 0"><div><b>${esc(f.home_team)} vs ${esc(f.away_team)}</b><div class="small">${ngTime(f.kickoff_at)} • Nigeria time</div></div><button class="primary" onclick="selectCriticalFixture('${esc(f.id)}')">SELECT MATCH</button></div>`).join(''):`<p class="muted">No match available for this day.</p>`}</div></section>`};
    return `<div class="wrap"><div class="section"><div><span class="badge">STAKE A MATCH</span><h2>Choose a match</h2><p class="muted">Matches are shown immediately. Select one to build your 7-player team.</p></div></div>${section(today,"TODAY'S MATCHES")}${section(tomorrow,"TOMORROW'S MATCHES")}<button class="secondary" onclick="openCriticalMatches(true)">↻ Refresh matches</button></div>`;
  }
  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
  async function openCriticalMatches(refresh){
    const s=window.state;if(!s)return;
    s.page='matches';s.loadingFixtures=true;if(typeof window.render==='function')window.render();
    const fs=await loadVisibleFixtures();s.fixtures=fs;s.loadingFixtures=false;if(typeof window.render==='function')window.render();
  }
  window.openCriticalMatches=openCriticalMatches;
  window.selectCriticalFixture=function(id){
    const s=window.state;if(!s)return;
    const f=(s.fixtures||[]).find(x=>String(x.id)===String(id));if(!f)return alert('Match is no longer available. Press Refresh matches.');
    s.selectedFixtures=[f];
    s.page='builder';
    if(typeof window.start==='function')window.start('league');
    else if(typeof window.render==='function')window.render();
  };
  async function roomsMatches(){
    const fs=await loadVisibleFixtures();
    if(window.roomState)window.roomState.availableFixtures=fs;
    if(window.state)window.state.fixtures=fs;
  }
  async function install(){
    for(let i=0;i<100;i++){if(window.state&&typeof window.render==='function')break;await wait(100)}
    if(!window.state)return;
    const originalGo=window.go;
    if(typeof originalGo==='function'&&!originalGo.__criticalWrapped){
      const wrapped=async function(page){
        if(page==='rooms'||page==='matches'){
          window.state.page=page;window.state.menuOpen=false;window.state.loadingFixtures=true;window.render();
          await roomsMatches();window.state.loadingFixtures=false;window.render();return;
        }
        return originalGo(page);
      };
      wrapped.__criticalWrapped=true;window.go=wrapped;
    }
    const originalSignIn=window.signIn;
    if(typeof originalSignIn==='function'&&!originalSignIn.__criticalWrapped){
      const wrappedSignIn=async function(){await originalSignIn();if(window.state?.user){await openCriticalMatches(false)}};
      wrappedSignIn.__criticalWrapped=true;window.signIn=wrappedSignIn;
    }
    // If the app already has a signed-in session, show matches immediately.
    if(window.state.user)await openCriticalMatches(false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
