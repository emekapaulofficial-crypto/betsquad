/* Authentication hardening layer + production runtime guard.
   THIS IS NOW THE SINGLE SOURCE OF TRUTH FOR window.signIn / window.signUp / window.signOut.
   Do not redefine these in other files — other *_fix.js files have been updated to stop
   doing so. This avoids the multi-file wrap race that caused sign-in/sign-up to break
   intermittently. */
(function(){
  window.addEventListener('error',function(e){
    if(e && e.message==='Script error.'){
      setTimeout(function(){document.getElementById('debugBanner')?.remove()},0);
      console.warn('Ignored non-diagnostic cross-origin Script error.');
    }
  },true);

  let signupBusy=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function ready(){
    const sb=window.supabase;
    if(!sb || !window.state || typeof window.render!=='function') return false;
    if(window.__fpAuthFixInstalled) return true;
    window.__fpAuthFixInstalled=true;

    function msg(text,type='error'){ if(typeof window.showAuthMessage==='function') window.showAuthMessage(text,type); else alert(text); }
    function clear(){if(typeof window.clearAuthMessage==='function') window.clearAuthMessage();}
    function setBtn(id,text,disabled){const b=document.getElementById(id);if(b){b.textContent=text;b.disabled=disabled;}}

    async function afterSignedIn(user){
      window.state.user=user;
      window.state.page='home';
      window.state.menuOpen=false;
      try{await window.render();}catch(e){console.error('post-login render failed',e);}
      if(typeof window.showImmediateMatches==='function'){
        try{await window.showImmediateMatches();}catch(e){console.warn('showImmediateMatches failed',e);}
      }
    }

    window.signUp=async function(){
      if(signupBusy)return;
      clear();
      const name=document.getElementById('name')?.value.trim()||'';
      const email=document.getElementById('email')?.value.trim().toLowerCase()||'';
      const password=document.getElementById('password')?.value||'';
      if(!name||!email||password.length<6){msg('Enter your name, a valid email, and a password of at least 6 characters.');return;}
      signupBusy=true; setBtn('signUpBtn','Creating account...',true);
      try{
        const referralCode=localStorage.getItem('fp_referral_code')||undefined;
        let result=null,lastError=null;
        for(let attempt=1;attempt<=3;attempt++){
          try{
            result=await sb.auth.signUp({email,password,options:{data:{name,display_name:name,...(referralCode?{referral_code:referralCode}:{})}}});
            lastError=result?.error||null;
            if(!lastError)break;
          }catch(e){lastError=e;}
          const m=String(lastError?.message||lastError||'');
          if(!/load failed|network|fetch|failed to fetch|timeout/i.test(m)||attempt===3)break;
          await sleep(700*attempt);
        }
        if(lastError){
          const code=lastError.code||'';
          const text=(lastError.message||'').toLowerCase();
          if(code==='email_exists'||code==='user_already_exists'||/already registered|already exists|already been registered/.test(text))msg('This email is already registered. Use Sign in or Forgot password.','error');
          else if(code==='signup_disabled')msg('New account creation is disabled in Supabase Authentication. Enable email/password signups.','error');
          else if(/load failed|network|fetch|failed to fetch/i.test(text))msg('Connection to the account service failed. Check your internet connection and tap Create account again.','error');
          else msg('Sign up failed ['+(code||'unknown')+']: '+(lastError.message||'Unknown Supabase error'),'error');
          return;
        }
        const data=result?.data;
        if(data?.user && !data?.session)msg('Account created successfully. Check your email/spam folder for the confirmation link, then use Sign in.','success');
        else if(data?.user){msg('Account created successfully. Your profile and wallet are ready.','success');await afterSignedIn(data.user);}
        else msg('Supabase returned no user. Please try again.','error');
      }catch(e){msg('Connection error while creating the account: '+(e?.message||e),'error');}
      finally{signupBusy=false; setBtn('signUpBtn','Create account',false);}
    };

    window.signIn=async function(){
      const btn=document.getElementById('signInBtn'); if(btn&&btn.disabled)return;
      clear();
      const email=document.getElementById('email')?.value.trim().toLowerCase()||'';
      const password=document.getElementById('password')?.value||'';
      if(!email||!password){msg('Enter your email and password.');return;}
      setBtn('signInBtn','Signing in...',true);
      try{
        const {data,error}=await sb.auth.signInWithPassword({email,password});
        if(error){
          const code=error.code||'';
          if(code==='email_not_confirmed'||/confirm/i.test(error.message||''))msg('Your email is not confirmed yet. Check your inbox/spam folder.','error');
          else if(/invalid login/i.test(error.message||''))msg('Incorrect email or password.','error');
          else msg('Sign in failed ['+(code||'auth_error')+']: '+(error.message||'Unknown error'),'error');
          return;
        }
        msg('Signed in successfully.','success');
        await afterSignedIn(data?.user||null);
      }catch(e){msg('Connection error while signing in: '+(e?.message||e),'error');}
      finally{setBtn('signInBtn','Sign in',false);}
    };

    window.signOut=async function(){
      try{
        const {error}=await sb.auth.signOut();
        if(error)throw error;
      }catch(e){
        console.error('Sign out failed:',e);
        alert('Sign out failed: '+(e?.message||e));
        return;
      }
      window.state.user=null;
      window.state.selected=[];
      window.state.menuOpen=false;
      window.state.page='home';
      await window.render();
    };

    window.resetPassword=async function(){
      const email=document.getElementById('email')?.value.trim().toLowerCase();
      if(!email)return msg('Enter your email first, then tap Forgot password.');
      try{
        const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
        if(error)throw error;
        msg('Password reset email sent. Check your inbox and spam folder.','success');
      }catch(e){msg('Password reset failed: '+(e?.message||e),'error');}
    };
    if(!document.getElementById('fpForgotPassword')){
      const signInBtn=document.getElementById('signInBtn');
      if(signInBtn){
        const b=document.createElement('button'); b.id='fpForgotPassword'; b.type='button'; b.className='secondary';
        b.textContent='Forgot password?'; b.style.marginTop='8px'; b.onclick=window.resetPassword;
        signInBtn.parentElement?.parentElement?.appendChild(b);
      }
    }

    // Single authoritative auth-state listener. Other files must not add their own.
    sb.auth.onAuthStateChange((event,session)=>{
      setTimeout(async()=>{
        if(event==='SIGNED_IN'&&session?.user){
          await afterSignedIn(session.user);
        }else if(event==='SIGNED_OUT'){
          window.state.user=null;
          window.state.selected=[];
          window.state.menuOpen=false;
          window.state.page='home';
          try{await window.render();}catch(e){console.error('post-logout render failed',e);}
        }
      },0);
    });

    return true;
  }

  // Poll until app.js has booted (window.state / window.render / window.supabase exist),
  // then install once. This no longer requires window.signIn/window.signUp to pre-exist,
  // which removes one source of race-timing dependence between files.
  let tries=0;
  const t=setInterval(()=>{ if(ready()||++tries>150) clearInterval(t); },100);

  // Wallet/admin feature loader. Kept separate so the stable auth code above stays untouched.
  window.addEventListener('load',()=>{
    if(!document.querySelector('script[data-wallet-features]')){
      const s=document.createElement('script'); s.src='wallet_features.js?v=20260817a'; s.dataset.walletFeatures='1';
      document.body.appendChild(s);
    }
  });
})();
