/* Final roster display fix.
   The previous roster bridge was drawing its own ungrouped list after the
   7-player picker rendered, which is why the screen could show repeated GK
   rows. This file makes the final picker the only visible match roster UI.
   Required: 1 GK + 2 DEF + 3 MID + 1 ST = 7.
*/
(function(){
  'use strict';
  const FORM={GK:1,DEF:2,MID:3,ST:1};
  const TOTAL=7;
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const same=(a,b)=>{const x=norm(a),y=norm(b);return !!x&&!!y&&(x===y||x.includes(y)||y.includes(x));};
  const pos=v=>{const p=String(v||'').toUpperCase().trim();if(['GK','G','GKP','GOALKEEPER','KEEPER'].includes(p))return 'GK';if(['DEF','DF','D','DEFENDER','BACK'].includes(p))return 'DEF';if(['MID','MF','M','MIDFIELDER','CM','DM','AM','WING'].includes(p))return 'MID';if(['ST','FW','F','CF','FORWARD','STRIKER','ATTACKER'].includes(p))return 'ST';return null;};
  function dedupe(list){const seen=new Set(),out=[];for(const p of list||[]){const pp=pos(p.position);if(!pp)continue;const key=norm(p.name)+'|'+norm(p.club)+'|'+pp;if(seen.has(key))continue;seen.add(key);out.push({...p,position:pp});}return out;}
  async function loadPlayers(f){
    const clubs=[f.home_team,f.away_team].filter(Boolean);let rows=[];
    const q=await supabase.from('players').select('id,name,club,position,photo_url,number,team_provider_id').eq('active',true).order('name');
    if(!q.error)rows=(q.data||[]).filter(p=>clubs.some(c=>same(p.club,c)));
    const t=await supabase.from('fp_teams').select('id,name,provider_team_id').limit(500);
    const teams=(t.data||[]).filter(x=>clubs.some(c=>same(x.name,c)));
    const ids=teams.map(x=>x.id).filter(Boolean);
    if(ids.length){
      const p=await supabase.from('fp_players').select('id,name,position,photo_url,team_id,number').eq('active',true).in('team_id',ids).order('name');
      if(!p.error){const names=new Map(teams.map(x=>[String(x.id),x.name]));for(const r of (p.data||[]))rows.push({...r,club:names.get(String(r.team_id))||''});}
    }
    return dedupe(rows).sort((a,b)=>['GK','DEF','MID','ST'].indexOf(a.position)-['GK','DEF','MID','ST'].indexOf(b.position)||String(a.name).localeCompare(String(b.name)));
  }
  function install(){
    if(!window.state||!window.supabase||!window.render||!window.matchDetailPage){setTimeout(install,100);return;}
    const originalOpen=window.openMatch;
    if(typeof originalOpen==='function' && !originalOpen.__fpFinalRosterFix){
      const wrapped=async function(id){
        const result=await originalOpen(id);
        /* The older bridge may have drawn its own list. Render the final picker again. */
        if(state.page==='matchDetail') await window.render();
        return result;
      };
      wrapped.__fpFinalRosterFix=true;
      window.openMatch=wrapped;
    }
    const originalDetail=window.matchDetailPage;
    window.matchDetailPage=async function(){
      const f=state.selectedFixtures?.[0];
      if(!f)return originalDetail();
      const players=await loadPlayers(f);
      state.matchPlayers=players;
      const selected=state.selected||[];
      const count=k=>selected.filter(p=>pos(p.position)===k).length;
      const complete=Object.keys(FORM).every(k=>count(k)===FORM[k]);
      const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
      const titles={GK:'🧤 Goalkeepers',DEF:'🛡️ Defenders',MID:'⚙️ Midfielders',ST:'⚽ Strikers'};
      const cards=Object.keys(FORM).map(k=>{
        const rows=players.filter(p=>pos(p.position)===k);
        return `<div class="panel"><div style="display:flex;justify-content:space-between;align-items:center"><h3>${titles[k]}</h3><span class="badge">${count(k)}/${FORM[k]}</span></div>${rows.map(p=>{const picked=selected.some(x=>String(x.id)===String(p.id));const full=!picked&&count(k)>=FORM[k];return `<button type="button" class="row" style="width:100%;display:flex;align-items:center;text-align:left;cursor:${full?'not-allowed':'pointer'};opacity:${full?'.45':'1'};background:${picked?'rgba(80,214,143,.12)':'transparent'};border:1px solid ${picked?'rgba(80,214,143,.55)':'rgba(120,150,190,.25)'};margin-bottom:8px" onclick="toggleMatchPlayer('${esc(p.id)}')" ${full?'disabled':''}><div style="flex:1"><b>${esc(p.name)}</b><div class="small">${esc(p.club||'Team')}</div></div><span class="badge">${picked?'✓ UNPICK':full?'FULL':'PICK'}</span></button>`;}).join('')||`<div class="notice">No ${titles[k].replace(/^\S+ /,'').toLowerCase()} available yet. Roster refresh is running in the background.</div>`}</div>`;
      }).join('');
      return `<button class="back" onclick="go('matches')">← Back to matches</button><div class="section"><div><span class="badge">7-PLAYER MATCH</span><h2>${esc(f.home_team)} vs ${esc(f.away_team)}</h2><p class="muted">Pick exactly 1 goalkeeper + 2 defenders + 3 midfielders + 1 striker.</p></div><button class="primary" onclick="submitMatchTeam()" ${complete?'':'disabled'}>${complete?'Save 7 players →':`Pick ${TOTAL-selected.length} more`}</button></div><div class="notice"><b>Your team: ${selected.length}/${TOTAL}</b><br><span class="muted">1 GK + 2 DEF + 3 MID + 1 ST. PICK or UNPICK players at any time before submission.</span></div><div class="two" style="margin-top:16px">${cards}</div>`;
    };
    /* Keep the public formation configuration consistent with the actual picker. */
    window.FOOTBALLPOINTS_SQUAD_RULES={GK:1,DEF:2,MID:3,ST:1,SUB:0,totalStarters:7,totalWithSub:7};
  }
  install();
})();