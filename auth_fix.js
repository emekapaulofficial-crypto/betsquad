/* Authentication hardening layer + production runtime guard. */
(function(){
  window.addEventListener('error',function(e){
    if(e && e.message==='Script error.'){
      setTimeout(function(){document.getElementById('debugBanner')?.remove()},0);
      console.warn('Ignored non-diagnostic cross-origin Script error.');
    }
  },true);

  function ready(){
    const sb=window.supabase;
    if(!sb || !window.signUp || !window.signIn) return false;
    function msg(text,type='error'){ if(typeof window.showAuthMessage==='function') window.showAuthMessage(text,type); else alert(text); }
    function clear(){if(typeof window.clearAuthMessage==='function') window.clearAuthMessage();}
    function setBtn(id,text,disabled){const b=document.getElementById(id);if(b){b.textContent=text;b.disabled=disabled;}}
    window.signUp=async function(){
      clear(); const name=document.getElementById('name')?.value.trim(); const email=document.getElementById('email')?.value.trim().toLowerCase(); const password=document.getElementById('password')?.value||'';
      if(!name||!email||password.length<6){msg('Enter your name, a valid email, and a password of at least 6 characters.');return;} setBtn('signUpBtn','Creating account...',true);
      try{const referralCode=localStorage.getItem('fp_referral_code')||undefined;const {data,error}=await sb.auth.signUp({email,password,options:{data:{name,display_name:name,...(referralCode?{referral_code:referralCode}:{})}}});
        if(error){const code=error.code||'';const text=(error.message||'').toLowerCase();if(code==='email_exists'||code==='user_already_exists'||/already registered|already exists|already been registered/.test(text))msg('This email is already registered. Use Sign in or Forgot password.','error');else if(code==='signup_disabled')msg('New account creation is disabled in Supabase Authentication. Enable email/password signups.','error');else if(code==='email_not_confirmed')msg('This email is not confirmed yet. Check your inbox/spam folder.','error');else msg('Sign up failed ['+(code||'unknown')+']: '+(error.message||'Unknown Supabase error'),'error');return;}
        if(data?.user && !data?.session)msg('Account created successfully. Check your email/spam folder for the confirmation link, then use Sign in.','success');else if(data?.user){msg('Account created successfully. Your profile and wallet are ready.','success');window.state.user=data.user;if(typeof window.render==='function')window.render();}else msg('Supabase returned no user. Please try again.','error');
      }catch(e){msg('Connection error while creating the account: '+(e?.message||e),'error');}finally{setBtn('signUpBtn','Create account',false);}
    };
    window.signIn=async function(){
      clear();const email=document.getElementById('email')?.value.trim().toLowerCase();const password=document.getElementById('password')?.value||'';if(!email||!password){msg('Enter your email and password.');return;}setBtn('signInBtn','Signing in...',true);
      try{const {data,error}=await sb.auth.signInWithPassword({email,password});if(error){const code=error.code||'';if(code==='email_not_confirmed'||/confirm/i.test(error.message||''))msg('Your email is not confirmed yet. Check your inbox/spam folder.','error');else msg('Sign in failed ['+(code||'auth_error')+']: '+(error.message||'Incorrect email or password.'),'error');return;}window.state.user=data?.user||null;window.state.menuOpen=false;msg('Signed in successfully.','success');if(typeof window.render==='function')window.render();}catch(e){msg('Connection error while signing in: '+(e?.message||e),'error');}finally{setBtn('signInBtn','Sign in',false);}
    };
    window.resetPassword=async function(){const email=document.getElementById('email')?.value.trim().toLowerCase();if(!email)return msg('Enter your email first, then tap Forgot password.');try{const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;msg('Password reset email sent. Check your inbox and spam folder.','success');}catch(e){msg('Password reset failed: '+(e?.message||e),'error');}};
    if(!document.getElementById('fpForgotPassword')){const signInBtn=document.getElementById('signInBtn');if(signInBtn){const b=document.createElement('button');b.id='fpForgotPassword';b.type='button';b.className='secondary';b.textContent='Forgot password?';b.style.marginTop='8px';b.onclick=window.resetPassword;signInBtn.parentElement?.parentElement?.appendChild(b);}}
    window.__fpAuthFixInstalled=true;return true;
  }
  window.addEventListener('load',()=>{let n=0;const t=setInterval(()=>{if(ready()||++n>100)clearInterval(t)},100)});
  // Wallet/admin feature loader. The file is kept separate so the stable auth code remains untouched.
  window.addEventListener('load',()=>{if(!document.querySelector('script[data-wallet-features]')){const s=document.createElement('script');s.src='wallet_features.js?v=20260817a';s.dataset.walletFeatures='1';document.body.appendChild(s);}});
})();
