/* Verified room roster fallback.
   A roster is NOT considered ready just because it has many rows.
   It must contain the positions needed for FootballPoints: GK, DEF, MID and ST.
*/
(function(){
  function pos(v){const p=String(v||'').toUpperCase().trim();if(['GK','G','GKP','GOALKEEPER','KEEPER'].includes(p))return 'GK';if(['DEF','DF','D','DEFENDER','BACK'].includes(p))return 'DEF';if(['MID','MF','M','MIDFIELDER','CM','DM','AM'].includes(p))return 'MID';if(['ST','FW','F','CF','FORWARD','STRIKER','ATTACKER'].includes(p))return 'ST';return p;}
  function rosterReady(players){const have=new Set((players||[]).map(p=>pos(p.position)));return ['GK','DEF','MID','ST'].every(x=>have.has(x));}
  function install(){
    if(!window.supabase||!window.roomFlow||!window.openRoomTeam)return setTimeout(install,150);
    if(window.__pabloRoomRosterFallback)return;
    window.__pabloRoomRosterFallback=true;
    const original=window.openRoomTeam;
    window.openRoomTeam=async function(){
      await original();
      const R=window.roomFlow;if(!R?.fixture)return;
      const existing=R.players||[];
      /* Never trust row count alone: the old roster could contain 11+ goalkeepers and no striker. */
      if(rosterReady(existing))return;
      const clubs=[R.fixture.home_team,R.fixture.away_team].filter(Boolean);
      try{
        const fx=await window.supabase.from('upcoming_fixtures').select('league_name,external_id').eq('id',R.room.selected_fixture_id).maybeSingle();
        const league=fx.data?.league_name||'';
        if(league)await window.supabase.functions.invoke('pablo-roster-sync',{body:{league,home_team:R.fixture.home_team,away_team:R.fixture.away_team}});
        const teams=await window.supabase.from('fp_teams').select('id,name,logo_url').in('name',clubs);
        const ids=(teams.data||[]).map(t=>t.id).filter(Boolean);
        if(!ids.length)return;
        const q=await window.supabase.from('fp_players').select('id,name,position,photo_url,team_id,fp_teams(name,logo_url)').eq('active',true).in('team_id',ids).order('name');
        if(q.error)return;
        const seen=new Set((R.players||[]).map(p=>`${String(p.name).toLowerCase()}|${String(p.club).toLowerCase()}|${pos(p.position)}`));
        for(const p of (q.data||[])){
          const club=p.fp_teams?.name||'';const position=pos(p.position);const key=`${String(p.name).toLowerCase()}|${String(club).toLowerCase()}|${position}`;
          if(!['GK','DEF','MID','ST'].includes(position)||seen.has(key))continue;
          R.players.push({id:p.id,name:p.name,club,position,photo_url:p.photo_url});seen.add(key);
        }
        if(window.state?.page==='room_team')window.render();
      }catch(e){console.warn('Verified room roster fallback:',e.message)}
    };
  }
  install();
})();
