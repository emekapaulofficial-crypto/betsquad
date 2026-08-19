import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const LEAGUES = [
  ['eng.1','Premier League','England'], ['esp.1','LaLiga','Spain'], ['ita.1','Serie A','Italy'],
  ['ger.1','Bundesliga','Germany'], ['fra.1','Ligue 1','France'], ['ned.1','Eredivisie','Netherlands'],
  ['por.1','Primeira Liga','Portugal'], ['usa.1','MLS','United States'],
  ['uefa.champions','UEFA Champions League','Europe'], ['uefa.europa','UEFA Europa League','Europe']
];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => new Date().toISOString();

function statusOf(event) {
  const s = event?.status?.type?.name || '';
  if (/postpon/i.test(s)) return 'postponed';
  if (/cancel/i.test(s)) return 'cancelled';
  if (event?.status?.type?.completed) return 'finished';
  if (event?.status?.type?.state === 'in') return 'live';
  return 'scheduled';
}
async function getJson(endpoint, attempts = 3) {
  let last;
  for (let i=1;i<=attempts;i++) {
    try {
      const r = await fetch(endpoint, {headers:{'User-Agent':'FootballPoints/1.0','Accept':'application/json'}});
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch(e) { last=e; if(i<attempts) await sleep(i*1500); }
  }
  throw last;
}
async function leagueId(code,name,country) {
  const {data,error}=await sb.from('football_leagues').upsert({provider:'espn-public',external_id:code,name,country,active:true,updated_at:now()},{onConflict:'provider,external_id'}).select('id').single();
  if(error) throw error; return data.id;
}
async function teamId(lid,team) {
  const logo=team.logos?.[0]?.href || team.logo || null;
  const {data,error}=await sb.from('football_teams').upsert({provider:'espn-public',external_id:String(team.id),league_id:lid,name:team.displayName||team.name||String(team.id),short_name:team.abbreviation||team.shortDisplayName||team.name||String(team.id),country:team.location||null,logo_url:logo,active:true,updated_at:now()},{onConflict:'provider,external_id'}).select('id').single();
  if(error) throw error; return data.id;
}
async function syncLeague(code,name,country) {
  const lid=await leagueId(code,name,country);
  const body=await getJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?limit=1000`);
  const events=Array.isArray(body.events)?body.events:[]; let synced=0;
  for(const event of events){
    const c=event.competitions?.[0], teams=c?.competitors||[];
    const h=teams.find(x=>x.homeAway==='home'), a=teams.find(x=>x.homeAway==='away');
    if(!h?.team?.id||!a?.team?.id||!event.date) continue;
    const hid=await teamId(lid,h.team), aid=await teamId(lid,a.team);
    const {error}=await sb.from('fixtures').upsert({external_id:`espn:${code}:${event.id}`,provider:'espn-public',provider_fixture_id:String(event.id),league_id:lid,home_team_id:hid,away_team_id:aid,home_team:h.team.displayName||h.team.name,away_team:a.team.displayName||a.team.name,kickoff_at:event.date,status:statusOf(event),source_updated_at:now(),last_synced_at:now()},{onConflict:'external_id'});
    if(error) throw error; synced++;
  }
  return {league:name,code,events:events.length,synced};
}
async function main(){
  const started=now(), results=[]; let total=0;
  for(const l of LEAGUES){try{const r=await syncLeague(...l);results.push(r);total+=r.synced;}catch(e){results.push({league:l[1],code:l[0],error:String(e.message||e)});}}
  const failures=results.filter(r=>r.error);
  await sb.from('football_robot_runs').insert({job_name:'footballpoints-multi-league-engine',provider:'espn-public',started_at:started,finished_at:now(),success:failures.length<results.length,attempt:1,fixtures_seen:total,fixtures_changed:total,error_message:failures.length?JSON.stringify(failures):null,admin_warning_sent:false});
  console.log(JSON.stringify({ok:failures.length<results.length,total_synced:total,results}));
  if(failures.length===results.length) process.exitCode=1;
}
main().catch(async e=>{await sb.from('football_robot_runs').insert({job_name:'footballpoints-multi-league-engine',provider:'espn-public',started_at:now(),finished_at:now(),success:false,attempt:1,fixtures_seen:0,fixtures_changed:0,error_message:String(e.message||e),admin_warning_sent:false});console.error(e);process.exit(1);});
