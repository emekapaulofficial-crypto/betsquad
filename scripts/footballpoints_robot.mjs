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
  if (!alertUrl) return false;
  try {
    const r = await fetch(alertUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: `FootballPoints admin warning: ${message}` }) });
    return r.ok;
  } catch (e) { console.error('Admin webhook failed:', e.message); return false; }
}

async function main() {
  const startedAt = new Date().toISOString();
  try {
    const result = await check(3);
    let changed = 0;
    for (const item of result.live) {
      const f = item.fixture;
      const status = f?.status?.short || 'UNK';
      const { data: existing } = await sb.from('fixtures').select('id').eq('provider_fixture_id', String(f.id)).maybeSingle();
      if (!existing?.id) continue;
      const { error } = await sb.from('fixtures').update({
        status,
        source_updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString()
      }).eq('id', existing.id);
      if (error) throw error;
      changed++;
    }
    await sb.from('football_robot_runs').insert({
      job_name: 'footballpoints-monitor', provider: 'api-football', started_at: startedAt,
      finished_at: new Date().toISOString(), success: true, attempt: result.attempts,
      fixtures_seen: result.live.length, fixtures_changed: changed,
      error_message: null, admin_warning_sent: false
    });
    console.log(`OK: monitored ${result.live.length} live matches; updated ${changed} existing fixtures`);
  } catch (e) {
    const message = String(e.message || e);
    const warned = await warn(message);
    await sb.from('football_robot_runs').insert({
      job_name: 'footballpoints-monitor', provider: 'api-football', started_at: startedAt,
      finished_at: new Date().toISOString(), success: false, attempt: 3,
      fixtures_seen: 0, fixtures_changed: 0, error_message: message, admin_warning_sent: warned
    });
    process.exitCode = 1;
  }
}
main();
