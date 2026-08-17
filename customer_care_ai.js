/* FootballPoints customer-care structure. This is a safe routing layer, not a fake human agent. */
(function(){
  const routes = [
    {key:'wallet', words:['deposit','withdraw','withdrawal','cash','wallet','payment','fund'], reply:'I can guide you through wallet, deposit and withdrawal steps. Never share your password or OTP.'},
    {key:'account', words:['login','sign in','signup','register','password','email','account'], reply:'I can help with registration, login, email confirmation and password recovery.'},
    {key:'football', words:['match','fixture','player','team','points','kickoff','league'], reply:'I can help with real fixtures, teams, players, kickoff times and FootballPoints scoring.'},
    {key:'security', words:['hack','hacked','suspicious','stolen','security','unknown login'], reply:'This is a security issue. Do not share credentials. I will route it for admin review.'}
  ];
  function classify(text){
    const t=String(text||'').toLowerCase();
    const hit=routes.find(r=>r.words.some(w=>t.includes(w)));
    return hit?.key||'general';
  }
  async function escalate(category, subject, message){
    const sb=window.supabase, user=window.state?.user;
    if(!sb||!user) throw new Error('Please sign in before escalating a support request.');
    const {data,error}=await sb.from('fp_support_escalations').insert({user_id:user.id,category,subject,message}).select('id').single();
    if(error) throw error;
    return data.id;
  }
  window.footballPointsSupport={
    routes,
    classify,
    reply(text){ const k=classify(text); return routes.find(r=>r.key===k)?.reply || 'I can help with account, football, wallet or security questions. If the issue is unresolved, I can escalate it to an admin.'; },
    escalate
  };
})();
