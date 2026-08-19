const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log('Pablo roster sync skipped: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.');
  process.exit(0);
}

const leagues = ['eng.1','esp.1','ita.1','ger.1','fra.1','ned.1','por.1','usa.1','uefa.champions','uefa.europa'];
const base = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const headers = { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };

async function espn(path) {
  const r = await fetch(`${base}/${path}`);
  if (!r.ok) throw new Error(`ESPN ${r.status} ${path}`);
  return r.json();
}

async function sb(path, options = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {...options, headers:{...headers,...(options.headers||{})}});
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

function position(a) {
  const v = String(a?.position?.abbreviation || a?.position?.name || a?.position?.displayName || a?.position || '').toUpperCase();
  if (/^(GK|G|GOAL|GOALKEEP)/.test(v)) return 'GK';
  if (/^(D|DF|DEF|BACK|DEFENDER)/.test(v)) return 'DEF';
  if (/^(M|MF|MID|WING|MIDFIELDER)/.test(v)) return 'MID';
  if (/^(F|FW|ST|FORWARD|ATT|ATTACKER)/.test(v)) return 'ST';
  return null;
}

function flattenAthletes(data) {
  const out=[];
  for (const item of (data?.athletes||[])) {
    if (Array.isArray(item?.items)) out.push(...item.items);
    else if (item?.id || item?.displayName || item?.fullName) out.push(item);
  }
  return out;
}

async function getRoster(league, teamId) {
  // ESPN's roster-enabled team endpoint is more complete for soccer than the legacy /roster route.
  const team = await espn(`${league}/teams/${teamId}?enable=roster`).catch(()=>null);
  let athletes = flattenAthletes(team);
  if (!athletes.length) {
    const roster = await espn(`${league}/teams/${teamId}/roster?limit=100`).catch(()=>null);
    athletes = flattenAthletes(roster);
  }
  return athletes;
}

async function upsertTeam(team) {
  const rows = await sb(`fp_teams?provider=eq.espn&provider_team_id=eq.${encodeURIComponent(team.id)}&select=id`);
  const body={provider:'espn',provider_team_id:Number(team.id),name:team.name,country:team.location||null,logo_url:team.logo||null,updated_at:new Date().toISOString()};
  if(rows?.[0]?.id){await sb(`fp_teams?id=eq.${rows[0].id}`,{method:'PATCH',body:JSON.stringify(body),headers:{Prefer:'return=minimal'}});return rows[0].id;}
  const created=await sb('fp_teams',{method:'POST',body:JSON.stringify(body),headers:{Prefer:'return=representation'}});return created?.[0]?.id;
}

async function upsertPlayer(p,team){
  const teamId=await upsertTeam(team); if(!teamId||!p?.id)return false;
  const pos=position(p); if(!pos)return false;
  const body={provider:'espn',provider_player_id:Number(p.id),team_id:teamId,name:p.displayName||p.fullName||p.shortName||'Unknown player',position:pos,number:p.jersey?Number(p.jersey):null,photo_url:p.headshot?.href||null,active:true,updated_at:new Date().toISOString()};
  const existing=await sb(`fp_players?provider=eq.espn&provider_player_id=eq.${Number(p.id)}&team_id=eq.${teamId}&select=id`,{method:'GET'});
  if(existing?.[0]?.id) await sb(`fp_players?id=eq.${existing[0].id}`,{method:'PATCH',body:JSON.stringify(body),headers:{Prefer:'return=minimal'}});
  else await sb('fp_players',{method:'POST',body:JSON.stringify(body),headers:{Prefer:'return=minimal'}});

  const old=await sb(`players?external_player_id=eq.${Number(p.id)}&select=id`,{method:'GET'}).catch(()=>[]);
  const appBody={name:body.name,club:team.name,position:pos,photo_url:body.photo_url,active:true,external_player_id:Number(p.id),team_provider_id:Number(team.id)};
  if(old?.[0]?.id) await sb(`players?id=eq.${old[0].id}`,{method:'PATCH',body:JSON.stringify(appBody),headers:{Prefer:'return=minimal'}}).catch(()=>{});
  else await sb('players',{method:'POST',body:JSON.stringify(appBody),headers:{Prefer:'return=minimal'}}).catch(()=>{});
  return true;
}

async function main(){
  let fixtures=0,teams=0,players=0;
  for(const league of leagues){
    try{
      const data=await espn(`${league}/scoreboard?limit=100`);
      for(const event of (data.events||[])){
        fixtures++;
        for(const comp of (event.competitions?.[0]?.competitors||[])){
          const t=comp.team;if(!t?.id)continue;
          const team={id:t.id,name:t.displayName||t.shortDisplayName||t.name,location:t.location,logo:t.logo||t.logos?.[0]?.href};
          const roster=await getRoster(league,t.id); for(const p of roster) if(await upsertPlayer(p,team))players++;
          teams++;
        }
      }
    }catch(e){console.warn(`Pablo could not research ${league}: ${e.message}`);}
  }
  console.log(JSON.stringify({ok:true,fixtures,teams,players,source:'ESPN public soccer pages',timestamp:new Date().toISOString()}));
}
main().catch(e=>{console.error(e);process.exit(1)});
