import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.FOOTBALL_API_KEY;
const apiBase = (process.env.FOOTBALL_API_BASE_URL || 'https://v3.football.api-sports.io').replace(/\/$/, '');
const leagueIds = (process.env.FOOTBALL_LEAGUE_IDS || '39,140,2,78,61').split(',').map(Number).filter(Boolean);
const alertUrl = process.env.ADMIN_ALERT_WEBHOOK_URL || '';
if (!url || !key || !apiKey) throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or FOOTBALL_API_KEY');
const sb = createClient(url, key, { auth: { persistSession: false } });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function check(attempts = 3) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      const u = new URL(`${apiBase}/fixtures`);
      u.searchParams.set('live', leagueIds.join('-'));
      const r = await fetch(u, { headers: { 'x-apisports-key': apiKey, Accept: 'application/json' } });
      if (!r.ok) throw new Error(`Provider HTTP ${r.status}: ${await r.text()}`);
      const body = await r.json();
      if (body.errors && Object.keys(body.errors).length) throw new Error(JSON.stringify(body.errors));
      return { live: body.response || [], attempts: i };
    } catch (e) {
      last = e;
      if (i < attempts) await sleep(i * i * 1000);
    }
  }
  throw last;
}

async function warn(message) {
  console.error(`ADMIN WARNING: ${message}`);
  if (!alertUrl) return;
  try {
    await fetch(alertUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: `FootballPoints admin warning: ${message}` }) });
  } catch (e) { console.error('Admin webhook failed:', e.message); }
}

async function main() {
  try {
    const result = await check(3);
    for (const item of result.live) {
      const f = item.fixture, status = f.status?.short || 'UNK';
      await sb.from('fp_fixtures').update({
        status_code: status,
        status_label: f.status?.long || null,
        home_score: item.goals?.home ?? null,
        away_score: item.goals?.away ?? null,
        last_provider_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('provider_fixture_id', f.id);
    }
    await sb.from('fp_robot_runs').insert({ job_name: 'footballpoints-monitor', ok: true, message: `Live status check: ${result.live.length} matches`, attempts: result.attempts, fixtures_seen: result.live.length, fixtures_changed: result.live.length });
    console.log(`OK: monitored ${result.live.length} live matches`);
  } catch (e) {
    const message = String(e.message || e);
    await sb.from('fp_robot_runs').insert({ job_name: 'footballpoints-monitor', ok: false, message, attempts: 3 });
    await warn(message);
    process.exitCode = 1;
  }
}
main();
