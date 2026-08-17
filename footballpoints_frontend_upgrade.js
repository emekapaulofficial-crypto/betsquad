/* FootballPoints frontend upgrade: reads verified multi-league football data from the existing schema. */
(function(){
  const WAIT=100;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[s]));
  const fmt=iso=>new Date(iso).toLocaleString([], {weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const finishedCodes=new Set(['FT','AET','PEN','CANC','ABD','AWD','WO','PST']);
  let installed=false;

  async function fixtures(){
    const sb=window.supabase;if(!sb)throw new Error('Supabase client is not available');
    const now=new Date().toISOString();
    const {data:rows,error}=await sb.from('fixtures')
      .select('id,external_id,home_team,away_team,kickoff_at,status,league_id,home_team_id,away_team_id')
      .gte('kickoff_at',now)
      .order('kickoff_at',{ascending:true})
      .limit(100);
    if(error)throw error;

    const leagueIds=[...new Set((rows||[]).map(x=>x.league_id).filter(Boolean))];
    const teamIds=[...new Set((rows||[]).flatMap(x=>[x.home_team_id,x.away_team_id]).filter(Boolean))];
    const [{data:leagues,error:le},{data:teams,error:te}]=await Promise.all([
      leagueIds.length?sb.from('football_leagues').select('id,name,country,logo_url').in('id',leagueIds):Promise.resolve({data:[],error:null}),
      teamIds.length?sb.from('football_teams').select('id,name,logo_url').in('id',teamIds):Promise.resolve({data:[],error:null})
    ]);
    if(le)throw le;if(te)throw te;

    const lm=Object.fromEntries((leagues||[]).map(x=>[x.id,x]));
    const tm=Object.fromEntries((teams||[]).map(x=>[x.id,x]));
    return (rows||[])
      .filter(f=>!finishedCodes.has(String(f.status||'').toUpperCase()))
      .map(f=>({...f,league:lm[f.league_id]||{},home:tm[f.home_team_id]||{},away:tm[f.away_team_id]||{}}));
  }

  async function showMatches(){
    const s=window.state;s.page='matches';s.loadingFixtures=true;
    if(window.render)await window.render();
    try{
      const fs=await fixtures();
      s.fixtures=fs;s.loadingFixtures=false;
      const main=document.querySelector('main.wrap');if(!main)return;
      const grouped={};
      fs.forEach(f=>{const k=f.league?.name||'Other leagues';(grouped[k]??=[]).push(f)});
      main.innerHTML=`<div class="section"><div><span class="badge">REAL FIXTURES</span><h2>Football matches</h2><p class="muted">Premier League, LaLiga and other configured leagues • verified provider data • automatic robot updates • no fake matches.</p></div></div>${Object.entries(grouped).map(([league,items])=>`<section style="margin-top:22px"><div class="section"><h3>${esc(league)}</h3></div><div class="grid">${items.map(f=>`<div class="card"><span class="badge">${esc(f.status_label||'Scheduled')}</span><h3>${esc(f.home.name||f.home_team||'Home')} vs ${esc(f.away.name||f.away_team||'Away')}</h3><p class="muted">${esc(fmt(f.kickoff_at))}</p><p class="small">${esc(f.league?.country||'')}</p><button class="secondary" onclick="openFootballPointsMatch('${esc(f.id)}')">View players</button><button class="primary" style="margin-top:8px" onclick="selectFootballPointsMatch('${esc(f.id)}')">Select match</button></div>`).join('')}</div></section>`).join('')||'<div class="panel"><h3>No verified upcoming fixtures</h3><p class="muted">The football robot has not populated the next fixtures yet. No match is invented.</p><button class="primary" onclick="go(\'matches\')">Retry</button></div>'}`;
    }catch(e){
      s.loadingFixtures=false;
      const main=document.querySelector('main.wrap');
      if(main)main.innerHTML=`<div class="panel"><h3>Fixture service unavailable</h3><p class="muted">The live fixture database could not be read. No fixture was invented. ${esc(e.message||e)}</p><button class="primary" onclick="go('matches')">Retry</button></div>`;
      console.error('FootballPoints fixture load failed:',e);
    }
  }

  async function openMatch(id){
    const f=(window.state.fixtures||[]).find(x=>String(x.id)===String(id));if(!f)return;
    const sb=window.supabase;
    const ids=[f.home_team_id,f.away_team_id].filter(Boolean);
    if(!ids.length){alert('Verified team links are not available for this fixture yet.');return;}
    const [{data:players,error},{data:teams,error:teamError}]=await Promise.all([
      sb.from('players').select('id,name,position,photo_url,team_id').in('team_id',ids).eq('active',true).order('name'),
      sb.from('football_teams').select('id,name,logo_url').in('id',ids)
    ]);
    if(error)throw error;if(teamError)throw teamError;
    const tm=Object.fromEntries((teams||[]).map(x=>[x.id,x]));
    const groups={};(players||[]).forEach(p=>(groups[p.team_id]??=[]).push(p));
    window.state.page='matchDetail';window.state.selectedFixtures=[f];await window.render();
    const main=document.querySelector('main.wrap');if(!main)return;
    main.innerHTML=`<button class="back" onclick="go('matches')">← Back to matches</button><div class="section"><div><span class="badge">${esc(f.league?.name||'MATCH')}</span><h2>${esc(f.home.name||f.home_team||'Home')} vs ${esc(f.away.name||f.away_team||'Away')}</h2><p class="muted">Kickoff: ${esc(fmt(f.kickoff_at))}</p></div><button class="primary" onclick="selectFootballPointsMatch('${esc(f.id)}')">Pick players for this match →</button></div><div class="notice"><b>Only players from these two teams are shown.</b><br><span class="muted">Player names and profile pictures come from the verified football provider when synced.</span></div><div class="two" style="margin-top:16px">${ids.map(tid=>`<div class="panel"><h3>${esc(tm[tid]?.name||'Team')}</h3>${(groups[tid]||[]).map(p=>`<div class="row"><div style="display:flex;gap:10px;align-items:center">${p.photo_url?`<img src="${esc(p.photo_url)}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover" loading="lazy">`:''}<div><b>${esc(p.name)}</b><div class="small">${esc(p.position||'')}</div></div></div></div>`).join('')||'<p class="muted">No verified players are currently synced for this team.</p>'}</div>`).join('')}</div>`;
  }

  function selectMatch(id){
    const f=(window.state.fixtures||[]).find(x=>String(x.id)===String(id));if(!f)return;
    window.state.selectedFixtures=[f];
    if(window.state.user)window.start('league');else window.go('auth');
  }

  function install(){
    if(installed)return;
    if(!window.state||!window.supabase||!window.render||!window.go){setTimeout(install,WAIT);return;}
    installed=true;
    const oldGo=window.go;
    window.go=function(p){if(p==='matches'){showMatches();return;}return oldGo(p);};
    window.openFootballPointsMatch=openMatch;
    window.selectFootballPointsMatch=selectMatch;
    window.footballPointsFixtures={refresh:showMatches,load:fixtures};
  }
  install();
})();
