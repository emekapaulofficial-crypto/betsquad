import { createClient } from '@supabase/supabase-js';
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Missing Supabase secrets');
const sb=createClient(url,key,{auth:{persistSession:false}});

async function main(){
  const {data:teams,error:te}=await sb.from('fp_teams').select('id,provider_team_id,name');if(te)throw te;
  const teamById=Object.fromEntries((teams||[]).map(t=>[t.id,t]));
  const {data:players,error:pe}=await sb.from('fp_players').select('provider_player_id,name,position,photo_url,active,team_id');
  if(pe)throw pe;
  for(const p of (players||[])){
    const team=teamById[p.team_id];
    if(!team)continue;
    const row={external_player_id:p.provider_player_id,name:p.name,club:team.name,position:p.position||'MID',photo_url:p.photo_url||null,active:p.active};
    const r=await sb.from('players').upsert(row,{onConflict:'external_player_id'});if(r.error&&r.error.code!=='42P01')throw r.error;
  }

  const {data:fx,error:fe}=await sb.from('fp_fixtures').select('id,provider_fixture_id,kickoff_at,status_code,home_team_id,away_team_id');if(fe)throw fe;
  for(const f of (fx||[])){
    const h=teamById[f.home_team_id],a=teamById[f.away_team_id];if(!h||!a)continue;
    const row={external_id:String(f.provider_fixture_id),home_team:h.name,away_team:a.name,kickoff_at:f.kickoff_at,status:f.status_code==='NS'?'scheduled':f.status_code,status_code:f.status_code,home_team_provider_id:h.provider_team_id,away_team_provider_id:a.provider_team_id,last_synced_at:new Date().toISOString()};
    const r=await sb.from('fixtures').upsert(row,{onConflict:'external_id'});if(r.error&&r.error.code!=='42P01')throw r.error;
  }
  console.log(`Compatibility sync complete: ${players?.length||0} players, ${fx?.length||0} fixtures processed.`);
}
main().catch(e=>{console.error(e);process.exit(1)});
