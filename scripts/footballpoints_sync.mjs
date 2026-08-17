import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = (process.env.FOOTBALL_API_BASE_URL || 'https://v3.football.api-sports.io').replace(/\/$/, '');
const LEAGUE_IDS = (process.env.FOOTBALL_LEAGUE_IDS || '39,140,2,78,61').split(',').map(x => Number(x.trim())).filter(Boolean);
const SEASON = Number(process.env.FOOTBALL_SEASON || new Date().getUTCFullYear());
const DAYS_AHEAD = Number(process.env.FOOTBALL_DAYS_AHEAD || 14);
const SYNC_SQUADS = process.env.SYNC_SQUADS === 'true';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
if (!FOOTBALL_API_KEY) throw new Error('Missing FOOTBALL_API_KEY');

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
function dateOnly(d) { return d.toISOString().slice(0, 10); }
function mapStatus(s) {
  const code = s?.short || 'UNK';
  const live = ['1H','HT','2H','ET','BT','P','LIVE'].includes(code);
  if (['FT','AET','PEN'].includes(code)) return { code, label: 'Finished' };
  if (['PST','CANC','ABD','AWD','WO'].includes(code)) return { code, label: s?.long || 'Not playable' };
  if (live) return { code, label: s?.long || 'Live' };
  return { code, label: s?.long || 'Scheduled' };
}

async function api(path, params = {}, retries = 3) {
  const url = new URL(`${API_BASE}/${path.replace(/^\//, '')}`);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, String(v)));
  let last;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'x-apisports-key': FOOTBALL_API_KEY, Accept: 'application/json' } });
      const remaining = res.headers.get('x-ratelimit-requests-remaining');
      if (remaining) console.log(`API quota remaining: ${remaining}`);
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const json = await res.json();
      if (json.errors && Object.keys(json.errors).length) throw new Error(JSON.stringify(json.errors));
      return json.response || [];
    } catch (e) {
      last = e;
      if (attempt < retries) await sleep(1000 * attempt * attempt);
    }
  }
  throw last;
}

async function upsertFixture(item) {
  const f = item.fixture, l = item.league, h = item.teams?.home, a = item.teams?.away;
  if (!f?.id || !l?.id || !h?.id || !a?.id) throw new Error('Provider returned an incomplete fixture record');
  const status = mapStatus(f.status);

  const { data: league, error: le } = await sb.from('football_leagues').upsert({
    provider: 'api-football', external_id: String(l.id), name: l.name,
    country: l.country, logo_url: l.logo, active: true, updated_at: new Date().toISOString()
  }, { onConflict: 'provider,external_id' }).select('id').single();
  if (le) throw le;

  const teamIds = {};
  for (const t of [h, a]) {
    const { data, error } = await sb.from('football_teams').upsert({
      provider: 'api-football', external_id: String(t.id), league_id: league.id,
      name: t.name, short_name: t.name, country: l.country, logo_url: t.logo,
      active: true, updated_at: new Date().toISOString()
    }, { onConflict: 'provider,external_id' }).select('id').single();
    if (error) throw error;
    teamIds[t.id] = data.id;
  }

  const fixturePayload = {
    external_id: `api-football:${f.id}`,
    provider: 'api-football', provider_fixture_id: String(f.id), league_id: league.id,
    home_team_id: teamIds[h.id], away_team_id: teamIds[a.id],
    home_team: h.name, away_team: a.name, kickoff_at: f.date,
    status: status.code, source_updated_at: new Date().toISOString(), last_synced_at: new Date().toISOString()
  };
  const { data: existing } = await sb.from('fixtures').select('id').eq('provider_fixture_id', String(f.id)).maybeSingle();
  let result;
  if (existing?.id) {
    result = await sb.from('fixtures').update(fixturePayload).eq('id', existing.id).select('id').single();
  } else {
    result = await sb.from('fixtures').upsert(fixturePayload, { onConflict: 'external_id' }).select('id').single();
  }
  if (result.error) throw result.error;
  return { id: result.data.id, changed: true, homeTeam: h.id, awayTeam: a.id };
}

async function syncUpcoming() {
  const from = dateOnly(new Date());
  const toDate = new Date(); toDate.setUTCDate(toDate.getUTCDate() + DAYS_AHEAD);
  const to = dateOnly(toDate);
  let seen = 0, changed = 0, teams = new Set();
  for (const leagueId of LEAGUE_IDS) {
    const fixtures = await api('fixtures', { league: leagueId, season: SEASON, from, to });
    console.log(`League ${leagueId}: ${fixtures.length} real fixtures`);
    for (const item of fixtures) {
      const r = await upsertFixture(item); seen++; changed += r.changed ? 1 : 0;
      if (r.homeTeam) teams.add(r.homeTeam); if (r.awayTeam) teams.add(r.awayTeam);
    }
  }
  if (SYNC_SQUADS) await syncSquads([...teams]);
  return { seen, changed };
}

async function syncSquads(teamIds) {
  for (const teamId of teamIds) {
    const squad = await api('players/squads', { team: teamId });
    const players = squad[0]?.players || [];
    const team = squad[0]?.team;
    if (!team) continue;
    const { data: dbTeam, error: te } = await sb.from('football_teams').upsert({
      provider: 'api-football', external_id: String(team.id), name: team.name,
      short_name: team.name, logo_url: team.logo, active: true, updated_at: new Date().toISOString()
    }, { onConflict: 'provider,external_id' }).select('id').single();
    if (te) throw te;
    for (const p of players) {
      const externalId = `api-football:${p.id}`;
      const payload = {
        external_id: externalId, provider: 'api-football', provider_player_id: String(p.id),
        team_id: dbTeam.id, name: p.name, real_name: p.name,
        club: team.name, position: p.position || null, photo_url: p.photo || null,
        active: true, source_updated_at: new Date().toISOString()
      };
      const { data: existing } = await sb.from('players').select('id').eq('external_id', externalId).maybeSingle();
      const result = existing?.id
        ? await sb.from('players').update(payload).eq('id', existing.id)
        : await sb.from('players').upsert(payload, { onConflict: 'external_id' });
      if (result.error) throw result.error;
    }
    await sleep(250);
  }
}

async function main() {
  const started = Date.now();
  const startedAt = new Date().toISOString();
  try {
    const result = await syncUpcoming();
    await sb.from('football_robot_runs').insert({
      job_name: 'footballpoints-sync', provider: 'api-football', started_at: startedAt,
      finished_at: new Date().toISOString(), success: true, attempt: 1,
      fixtures_seen: result.seen, fixtures_changed: result.changed, error_message: null, admin_warning_sent: false
    });
    console.log(JSON.stringify({ ok: true, ...result, duration_ms: Date.now() - started }));
  } catch (e) {
    await sb.from('football_robot_runs').insert({
      job_name: 'footballpoints-sync', provider: 'api-football', started_at: startedAt,
      finished_at: new Date().toISOString(), success: false, attempt: 1,
      fixtures_seen: 0, fixtures_changed: 0, error_message: String(e.message || e), admin_warning_sent: false
    });
    throw e;
  }
}

main().catch(e => { console.error(e); process.exit(1); });
