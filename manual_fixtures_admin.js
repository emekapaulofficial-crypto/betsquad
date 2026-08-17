/* Manual fixture manager: no external football API required. */
(function(){
  let wrapped=false;
  const esc=v=>String(v??'').replace(/[&<>\"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[s]));
  const fmt=iso=>iso?new Date(iso).toLocaleString([], {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
  const statusLabel=s=>({scheduled:'Scheduled',live:'Live',finished:'Finished',postponed:'Postponed',cancelled:'Cancelled'}[s]||s);

  async function loadManualFixtures(){
    const {data,error}=await supabase.from('fixtures').select('id,home_team,away_team,kickoff_at,status,provider,league_id').eq('provider','manual').order('kickoff_at',{ascending:true}).limit(200);
    if(error) throw error;
    const ids=[...new Set((data||[]).map(x=>x.league_id).filter(Boolean))];
    let leagues=[];
    if(ids.length){const q=await supabase.from('football_leagues').select('id,name,country').in('id',ids);if(q.error)throw q.error;leagues=q.data||[];}
    const lm=Object.fromEntries(leagues.map(x=>[x.id,x]));
    return (data||[]).map(x=>({...x,league:lm[x.league_id]||{name:'Other',country:''}}));
  }

  async function saveManualFixture(id){
    const g=n=>document.querySelector('#mf-'+n);
    const league=g('league').value.trim(),country=g('country').value.trim(),home=g('home').value.trim(),away=g('away').value.trim(),kickoff=g('kickoff').value,status=g('status').value;
    if(!league||!home||!away||!kickoff)return alert('League, home team, away team and kickoff time are required.');
    const iso=new Date(kickoff).toISOString();
    const {error}=await supabase.rpc('admin_upsert_manual_fixture',{p_fixture_id:id||null,p_league_name:league,p_country:country||null,p_home_team:home,p_away_team:away,p_kickoff_at:iso,p_status:status});
    if(error)return alert(error.message);
    alert(id?'Fixture updated.':'Fixture added.');
    await renderManualPanel();
  }

  async function deleteManualFixture(id){
    if(!confirm('Delete this manually entered fixture?'))return;
    const {error}=await supabase.rpc('admin_delete_manual_fixture',{p_fixture_id:id});
    if(error)return alert(error.message);
    await renderManualPanel();
  }

  function formHtml(){
    const local=new Date(Date.now()+60*60*1000).toISOString().slice(0,16);
    return `<div class="panel" id="manualFixturesPanel"><div class="section"><div><span class="badge">MANUAL FIXTURES</span><h3>Football match manager</h3><p class="muted">No API is required. Enter real fixtures yourself. These are the fixtures shown to players.</p></div><button class="secondary" onclick="manualFixturesRefresh()">Refresh</button></div><div class="two"><div><label>League</label><input id="mf-league" placeholder="Premier League / LaLiga"><label>Country</label><input id="mf-country" placeholder="England / Spain"><label>Home team</label><input id="mf-home" placeholder="Arsenal"></div><div><label>Away team</label><input id="mf-away" placeholder="Chelsea"><label>Kickoff</label><input id="mf-kickoff" type="datetime-local" value="${local}"><label>Status</label><select id="mf-status"><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="finished">Finished</option><option value="postponed">Postponed</option><option value="cancelled">Cancelled</option></select></div></div><div class="actions" style="margin-top:12px"><button class="primary" onclick="manualFixtureSave()">Add fixture</button><button class="secondary" onclick="manualFixtureClear()">Clear</button></div><div id="manualFixtureList" style="margin-top:18px"><p class="muted">Loading manual fixtures...</p></div></div>`;
  }

  function rowHtml(f){
    return `<div class="admin-row"><div><b>${esc(f.home_team)} vs ${esc(f.away_team)}</b><div class="small">${esc(f.league?.name||'Other')} ${f.league?.country?'• '+esc(f.league.country):''}</div></div><div><b>${esc(fmt(f.kickoff_at))}</b><div class="small">${esc(statusLabel(f.status))}</div></div><div class="admin-actions"><button class="secondary" onclick="manualFixtureEdit('${esc(f.id)}')">Edit</button><button class="danger" onclick="manualFixtureDelete('${esc(f.id)}')">Delete</button></div></div>`;
  }

  async function renderManualPanel(){
    const old=document.querySelector('#manualFixturesPanel');
    if(!old)return;
    const list=old.querySelector('#manualFixtureList');
    try{const fs=await loadManualFixtures();list.innerHTML=fs.length?fs.map(rowHtml).join(''):'<p class="muted">No manually entered fixtures yet.</p>';}catch(e){list.innerHTML=`<p class="muted">Could not load manual fixtures: ${esc(e.message||e)}</p>`;}
  }

  async function manualFixtureEdit(id){
    const fs=await loadManualFixtures(),f=fs.find(x=>String(x.id)===String(id));if(!f)return;
    document.querySelector('#mf-league').value=f.league?.name||'';document.querySelector('#mf-country').value=f.league?.country||'';document.querySelector('#mf-home').value=f.home_team;document.querySelector('#mf-away').value=f.away_team;document.querySelector('#mf-kickoff').value=new Date(f.kickoff_at).toISOString().slice(0,16);document.querySelector('#mf-status').value=f.status;
    const b=document.querySelector('#manualFixturesPanel button.primary');b.textContent='Update fixture';b.onclick=()=>saveManualFixture(id);document.querySelector('#manualFixturesPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function wrapAdmin(){
    if(wrapped||typeof window.loadAdmin!=='function')return;
    wrapped=true;const original=window.loadAdmin;
    window.loadAdmin=async function(){await original();setTimeout(async()=>{const main=document.querySelector('main.wrap');if(!main||document.querySelector('#manualFixturesPanel'))return;main.insertAdjacentHTML('afterbegin',formHtml());await renderManualPanel();},0);};
  }

  window.manualFixtureSave=()=>saveManualFixture(null);
  window.manualFixtureClear=()=>{['league','country','home','away'].forEach(x=>{const e=document.querySelector('#mf-'+x);if(e)e.value='';});};
  window.manualFixturesRefresh=renderManualPanel;
  window.manualFixtureDelete=deleteManualFixture;
  window.manualFixtureEdit=manualFixtureEdit;
  const timer=setInterval(()=>{if(typeof window.loadAdmin==='function'){clearInterval(timer);wrapAdmin();}},50);
})();
