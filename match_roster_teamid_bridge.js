/* Match roster bridge: use the canonical football_teams table to seed Pablo when fp_teams is missing. */
(function(){
  'use strict';
  let installed=false;
  function install(){
    if(installed)return;
    const state=window.state,supabase=window.supabase,open=window.openMatch;
    if(!state||!supabase||typeof open!=='function'){setTimeout(install,150);return;}
    installed=true;
    window.openMatch=async function(id){
      const f=(state.fixtures||[]).find(x=>String(x.id)===String(id));
      if(!f)return open(id);
      try{
        const raw=String(f.external_id||'');
        const m=raw.match(/^espn:([^:]+):/i);
        const league=m?.[1]||'';
        if(league){
          const names=[f.home_team,f.away_team].filter(Boolean);
          const q=await supabase.from('football_teams').select('name,external_id,logo_url').in('name',names);
          const rows=q.data||[];
          const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]/g,'');
          const ids={};
          for(const n of names){
            const hit=rows.find(t=>norm(t.name)===norm(n)||norm(t.name).includes(norm(n))||norm(n).includes(norm(t.name)));
            if(hit?.external_id)ids[n===f.home_team?'home':'away']=Number(hit.external_id);
          }
          if(ids.home||ids.away){
            const result=await supabase.functions.invoke('pablo-roster-sync',{body:{league,home_team:f.home_team,away_team:f.away_team,provider_team_ids:ids}});
            if(result?.error)console.warn('Pablo roster bridge:',result.error.message||result.error);
          }
        }
      }catch(e){console.warn('Roster bridge failed:',e?.message||e)}
      return open(id);
    };
  }
  install();
})();
