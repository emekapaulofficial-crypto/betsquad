/* Lightweight security telemetry. Never records passwords, OTPs or tokens. */
(function(){
  let failCount=0, windowStart=Date.now();
  function reset(){if(Date.now()-windowStart>10*60*1000){failCount=0;windowStart=Date.now();}}
  async function log(eventType,metadata={}){
    try{
      const sb=window.supabase,user=window.state?.user;
      if(!sb)return;
      const safe={...metadata};
      delete safe.password; delete safe.otp; delete safe.token; delete safe.access_token; delete safe.refresh_token;
      await sb.from('fp_security_events').insert({user_id:user?.id||null,event_type:eventType,metadata:safe});
    }catch(e){console.warn('Security event logging unavailable:',e.message);}
  }
  window.footballPointsSecurity={log,recordLoginFailure(){reset();failCount++;log('login_failure',{count_in_window:failCount});if(failCount>=5)log('suspicious_login_activity',{count_in_window:failCount});},recordLoginSuccess(){reset();failCount=0;log('login_success');}};
  function install(){
    if(!window.supabase){setTimeout(install,250);return;}
    const {data}=window.supabase.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_IN') window.footballPointsSecurity.recordLoginSuccess();
      if(event==='SIGNED_OUT') log('logout');
      if(event==='PASSWORD_RECOVERY') log('password_recovery');
    });
    window.addEventListener('pagehide',()=>data?.subscription?.unsubscribe?.(),{once:true});
  }
  install();
})();
