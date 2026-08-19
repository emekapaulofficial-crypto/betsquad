/* Pablo roster fallback for rooms: use verified fp_players when the legacy players table is incomplete. */
(function(){
  function install(){
    if(!window.supabase||!window.roomFlow||!window.openRoomTeam)return setTimeout(install,150);
    if(window.__pabloRoomRosterFallback)return;
    window.__pabloRoomRosterFallback=true;
    const original=window.openRoomTeam;
    window.openRoomTeam=async function(){
      await original();
      const R=window.roomFlow;
      if(!R?.fixture)return;
      if((R.players||[]).length>=6)return;
      const clubs=[R.fixture.home_team,R.fixture.away_team].filter(Boolean);
      try{
        const teams=await window.supabase.from('fp_teams').select('id,name,logo_url').in('name',clubs);
        const ids=(teams.data||[]).map(t=>t.id).filter(Boolean);
        if(!ids.length)return;
        const q=await window.supabase.from('fp_players').select('id,name,position,photo_url,team_id,fp_teams(name,logo_url)').eq('active',true).in('team_id',ids).order('name');
        if(q.error)return;
        const seen=new Set((R.players||[]).map(p=>`${String(p.name).toLowerCase()}|${String(p.club).toLowerCase()}`));
        for(const p of (q.data||[])){
          const club=p.fp_teams?.name||'';
          const key=`${String(p.name).toLowerCase()}|${String(club).toLowerCase()}`;
          if(seen.has(key))continue;
          R.players.push({id:p.id,name:p.name,club,position:p.position,photo_url:p.photo_url});
          seen.add(key);
        }
        if(window.state?.page==='room_team')window.render();
      }catch(e){console.warn('Pablo room roster fallback:',e.message)}
    };
  }
  install();
})();
