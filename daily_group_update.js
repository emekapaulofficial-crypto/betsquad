/* Daily football group: show 12 featured fixtures for today/tomorrow and 11-player rosters. */
(function(){
  'use strict';
  const TARGET=12;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const same=(a,b)=>{const x=norm(a),y=norm(b);return x===y||x.includes(y)||y.includes(x)};
  const leagueFor=f=>same(f.home_team,'Atlético Madrid')||same(f.away_team,'Málaga')?'laliga':'mls';
  const posOrder={GK:0,DEF:1,MID:2,ST:3};
  const esc=v=>String(v??'').replace(/[&<>\"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[s]||s));
  function nigeriaTime(iso){try{return new Intl.DateTimeFormat('en-NG',{timeZone:'Africa/Lagos',weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true}).format(new Date(iso))}catch{return new Date(iso).toLocaleString()}}
  async function roster(f){
    const clubs=[f.home_team,f.away_team];
    try{
      const t=await window.supabase.from('football_teams').select('id,name,external_id').in('name',clubs);
      const teams=t.data||[]; const ids={};
      for(const c of clubs){const hit=teams.find(x=>same(x.name,c));if(hit?.external_id)ids[same(c,f.home_team)?'home':'away']=Number(hit.external_id)}
      await window.supabase.functions.invoke('pablo-roster-sync',{body:{league:leagueFor(f),home_team:f.home_team,away_team:f.away_team,provider_team_ids:ids}});
      await sleep(700);
      const q=await window.supabase.from('fp_players').select('id,name,position,number,team_id').eq('active',true).in('team_id',teams.map(x=>x.id));
      let rows=q.data||[];
      const out={};
      for(const c of clubs){const team=teams.find(x=>same(x.name,c));let arr=rows.filter(p=>team&&String(p.team_id)===String(team.id));arr.sort((a,b)=>(posOrder[a.position]??9)-(posOrder[b.position]??9)||String(a.name).localeCompare(String(b.name)));out[c]=arr.slice(0,11)}
      // Legacy fallback if the provider roster is not available yet.
      if(!Object.values(out).every(a=>a.length>=11)){
        const l=await window.supabase.from('players').select('id,name,club,position').eq('active',true).in('club',clubs);
        for(const c of clubs){if((out[c]||[]).length>=11)continue;let arr=(l.data||[]).filter(p=>same(p.club,c));arr.sort((a,b)=>(posOrder[a.position]??9)-(posOrder[b.position]??9)||String(a.name).localeCompare(String(b.name)));out[c]=arr.slice(0,11)}
      }
      return out;
    }catch(e){console.warn('Daily roster load failed',e);return {}};
  }
  function pickFixtures(){
    const now=new Date();const start=new Date(now);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+2);
    return (window.state?.fixtures||[]).filter(f=>{const d=new Date(f.kickoff_at);return d>=start&&d<end}).sort((a,b)=>new Date(a.kickoff_at)-new Date(b.kickoff_at)).slice(0,TARGET);
  }
  function renderCard(f){
    const card=document.createElement('div');card.className='card daily-group-match';card.dataset.fixtureId=f.id;
    card.innerHTML=`<span class="badge">${esc(nigeriaTime(f.kickoff_at))} • Nigeria</span><h3>${esc(f.home_team)} vs ${esc(f.away_team)}</h3><button class="secondary daily-roster-btn">Show 11 players each</button><div class="daily-roster" style="display:none;margin-top:12px"></div>`;
    card.querySelector('.daily-roster-btn').onclick=async()=>{const btn=card.querySelector('.daily-roster-btn'),box=card.querySelector('.daily-roster');btn.disabled=true;btn.textContent='Loading 11-player rosters…';box.style.display='block';box.innerHTML='<p class="muted">Syncing the latest provider roster…</p>';const data=await roster(f);box.innerHTML=[f.home_team,f.away_team].map(c=>{const arr=data[c]||[];return `<div class="panel" style="margin-top:10px"><b>${esc(c)}</b>${arr.length?arr.map((p,i)=>`<div class="row"><span>${i+1}. ${esc(p.name)}</span><span class="badge">${esc(p.position||'')}</span></div>`).join(''):'<p class="muted">Roster is still syncing. Open this match again in a few seconds.</p>'}</div>`}).join('');btn.textContent=arrCount(data)>=22?'✓ 22 players loaded':'Refresh rosters';btn.disabled=false;};
    return card;
  }
  function arrCount(data){return Object.values(data||{}).reduce((n,a)=>n+(a?.length||0),0)}
  function inject(){
    if(window.state?.page!=='matches')return;
    const main=document.querySelector('main.wrap');if(!main)return;
    const fixtures=pickFixtures();if(!fixtures.length)return;
    let grid=main.querySelector('.daily-group-grid');
    if(!grid){
      const section=document.createElement('section');section.className='panel daily-group-panel';section.style.marginBottom='18px';
      section.innerHTML='<span class="badge">DAILY GROUP UPDATE</span><h2 style="margin-bottom:6px">Today + Tomorrow Football</h2><p class="muted" style="margin-top:0">12 featured matches • Nigeria time • each match has a manual 11-player list powered by the verified roster sync.</p><div class="grid daily-group-grid"></div>';
      main.insertBefore(section,main.firstElementChild||null);grid=section.querySelector('.daily-group-grid');
    }
    const ids=fixtures.map(f=>String(f.id));
    [...grid.children].forEach(el=>{if(!ids.includes(String(el.dataset.fixtureId)))el.remove()});
    for(const f of fixtures){if(!grid.querySelector(`[data-fixture-id="${CSS.escape(String(f.id))}"]`))grid.appendChild(renderCard(f))}
  }
  function install(){if(window.__dailyGroupUpdate)return;if(!window.state||!window.supabase||typeof window.render!=='function'){setTimeout(install,150);return}window.__dailyGroupUpdate=true;const original=window.render;window.render=function(){const r=original.apply(this,arguments);setTimeout(inject,50);setTimeout(inject,400);return r};new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});setInterval(inject,1500);inject()}
  install();
})();
