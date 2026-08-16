import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main(){
  const { data: result, error } = await sb.rpc('settle_fixture_points');
  if(error) throw error;
  console.log(JSON.stringify(result || {ok:true}));
}
main().catch(e=>{ console.error(e); process.exit(1); });
