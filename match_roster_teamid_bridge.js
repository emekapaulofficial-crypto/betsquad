/* Match roster recovery: trigger Pablo, then read the verified provider roster first. */
(function(){
  'use strict';
  let installed=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=v=>String(v??'').replace(/[&<>\"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[s]||s));
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const same=(a,b)=>{const x=norm(a),y=norm(b);return x===y||x.includes(y)||y.includes(x)};
  function leagueCode(f){const raw=String(f?.external_id||'');const m=raw.match(/^espn:([^:]+):/i);return m?.[1]||'';}
  async function triggerPablo(f){
    try{
      const names=[f.home_team,f.away_team].filter(Boolean);
      const q=await window.supabase.from('football_teams').select('name,external_id,logo_url').in('name',names);
      const ids={};
      for(const n of names){const hit=(q.data||[]).find(t=>same(t.name,n));if(hit?.external_id)ids[n===f.home_team?'home':'away']=Number(hit.external_id);}
      const league=leagueCode(f)||String(f.league_name||f.league||'');
      if(!league)return;
      const r=await window.supabase.functions.invoke('pablo-roster-sync',{body:{league,home_team:f.home_team,away_team:f.away_team,provider_team_ids:ids}});
      if(r?.error)console.warn('Pablo roster trigger:',r.error.message||r.error);
    }catch(e){console.warn('Pablo roster trigger failed:',e?.message||e)}
  }
  async function loadVerified(clubs){
    let players=[]; let teams=[];
    try{
      const t=await window.supabase.from('fp_teams').select('id,name,provider_team_id,logo_url').order('name');
      teams=(t.data||[]).filter(x=>clubs.some(c=>same(x.name,c)));
      const ids=teams.map(x=>x.id).filter(Boolean);
      if(ids.length){
        const q=await window.supabase.from('fp_players').select('id,name,position,photo_url,team_id,number').eq('active',true).in('team_id',ids).order('name');
        if(!q.error){
          const teamName=new Map(teams.map(x=>[String(x.id),x.name]));
          players=(q.data||[]).map(p=>({id:p.id,name:p.name,club:teamName.get(String(p.team_id))||'',position:p.position,photo_url:p.photo_url,number:p.number}));
        }
      }
      // Legacy players are used only when the verified provider roster is genuinely empty.
      if(players.length===0){
        const q=await window.supabase.from('players').select('id,name,club,position,photo_url,team_provider_id').eq('active',true).order('club').order('name');
        if(!q.error)players=(q.data||[]).filter(p=>clubs.some(c=>same(p.club,c)));
      }
    }catch(e){console.warn('Verified roster read failed:',e?.message||e)}
    return {players,teams};
  }
  function draw(clubs,players,teams){
    const main=document.querySelector('main.wrap');if(!main)return;
    for(const club of clubs){
      const panel=[...main.querySelectorAll('.panel')].find(p=>p.querySelector('h3')&&same(p.querySelector('h3').textContent,club));
      if(!panel)continue;
      const rows=players.filter(p=>same(p.club,club));
      const team=teams.find(t=>same(t.name,club)&&t.logo_url)||teams.find(t=>same(t.name,club));
      const logo=team?.logo_url?`<img src="${esc(team.logo_url)}" alt="" style="width:34px;height:34px;object-fit:contain;vertical-align:middle;margin-right:8px">`:'';
      const html=`<div style="display:flex;align-items:center;margin-bottom:10px">${logo}<b>${esc(club)}</b><span class="badge" style="margin-left:8px">${rows.length} players</span></div>`+
        (rows.length?rows.map(p=>`<button type="button" class="row" style="width:100%;text-align:left;cursor:pointer;background:transparent;border:1px solid rgba(120,150,190,.25);margin-bottom:8px" onclick="toggleMatchPlayer('${esc(p.id)}')">${p.photo_url?`<img src="${esc(p.photo_url)}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;margin-right:10px">`:`<span style="display:inline-flex;width:36px;height:36px;border-radius:50%;align-items:center;justify-content:center;background:#16304b;margin-right:10px">⚽</span>`}<div style="flex:1"><b>${esc(p.name)}</b><div class="small">${esc(p.position||'Player')}${p.number?` · #${esc(p.number)}`:''}</div></div><span class="badge">${(window.state.selected||[]).some(x=>String(x.id)===String(p.id))?'✓ PICKED':'PICK'}</span></button>`).join(''):`<p class="muted">Pablo is still syncing the verified roster for this team. Please refresh this match shortly.</p>`);
      const old=[...panel.children].filter(x=>x.tagName!=='H3');
      old.forEach(x=>x.remove());
      panel.insertAdjacentHTML('beforeend',html);
    }
  }
  function install(){
    if(installed)return;
    const state=window.state,supabase=window.supabase,open=window.openMatch;
    if(!state||!supabase||typeof open!=='function'){setTimeout(install,150);return;}
    installed=true;
    window.openMatch=async function(id){
      const f=(state.fixtures||[]).find(x=>String(x.id)===String(id));
      if(!f)return open(id);
      await triggerPablo(f);
      const result=await loadVerified([f.home_team,f.away_team]);
      await open(id);
      await sleep(100);
      state.matchPlayers=result.players;
      draw([f.home_team,f.away_team],result.players,result.teams);
      if(result.players.length===0){
        await sleep(1500);
        const again=await loadVerified([f.home_team,f.away_team]);
        state.matchPlayers=again.players;
        draw([f.home_team,f.away_team],again.players,again.teams);
      }
    };
  }
  install();
})();
