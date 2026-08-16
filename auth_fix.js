/* Authentication hardening layer.
   Runs after the page loads so it can safely replace the UI handlers
   created by app.js. It does NOT use the old referral monkey-patch.
*/
(function(){
  function ready(){
    const sb=window.supabase;
    if(!sb || !window.signUp || !window.signIn) return false;

    function msg(text,type='error'){
      if(typeof window.showAuthMessage==='function') window.showAuthMessage(text,type);
      else alert(text);
    }
    function clear(){if(typeof window.clearAuthMessage==='function') window.clearAuthMessage();}
    function setBtn(id,text,disabled){const b=document.getElementById(id);if(b){b.textContent=text;b.disabled=disabled;}}

    window.signUp=async function(){
      clear();
      const name=document.getElementById('name')?.value.trim();
      const email=document.getElementById('email')?.value.trim().toLowerCase();
      const password=document.getElementById('password')?.value||'';
      if(!name||!email||password.length<6){msg('Enter your name, a valid email, and a password of at least 6 characters.');return;}
      setBtn('signUpBtn','Creating account...',true);
      try{
        const referralCode=localStorage.getItem('fp_referral_code')||undefined;
        const {data,error}=await sb.auth.signUp({
          email,
          password,
          options:{data:{name,display_name:name,...(referralCode?{referral_code:referralCode}:{})}}
        });
        if(error){
          const code=error.code||'';
          const text=(error.message||'').toLowerCase();
          if(code==='email_exists'||code==='user_already_exists'||/already registered|already exists|already been registered/.test(text)){
            msg('Supabase says this email is already registered. This is an Auth account check — it is not checking your profile table. Please use Sign in, or use Forgot password if you own this email. If you are certain this is a brand-new email, send me the exact email you tested and we will check the Auth configuration next.','error');
          }else if(code==='signup_disabled'){
            msg('New account creation is disabled in Supabase Authentication. Enable email/password signups in Supabase → Authentication → Providers.','error');
          }else if(code==='email_not_confirmed'){
            msg('This email is not confirmed yet. Check the inbox/spam folder for the confirmation email.','error');
          }else{
            msg('Sign up failed ['+(code||'unknown')+']: '+(error.message||'Unknown Supabase error'),'error');
          }
          return;
        }
        if(data?.user && !data?.session){
          msg('Account created successfully. Supabase requires email confirmation. Check your inbox/spam folder, then use Sign in.','success');
        }else if(data?.user){
          msg('Account created successfully. Your profile and wallet are being prepared. You can now continue.','success');
          if(typeof window.session==='function') await window.session();
          window.state.user=data.user;
          if(typeof window.render==='function') window.render();
        }else{
          msg('Supabase returned no user. Please try again and check the exact error shown.','error');
        }
      }catch(e){
        msg('Connection error while creating the account: '+(e?.message||e),'error');
      }finally{setBtn('signUpBtn','Create account',false)}
    };

    window.signIn=async function(){
      clear();
      const email=document.getElementById('email')?.value.trim().toLowerCase();
      const password=document.getElementById('password')?.value||'';
      if(!email||!password){msg('Enter your email and password.');return;}
      setBtn('signInBtn','Signing in...',true);
      try{
        const {data,error}=await sb.auth.signInWithPassword({email,password});
        if(error){
          const code=error.code||'';
          if(code==='email_not_confirmed'||/confirm/i.test(error.message||'')) msg('Your email is not confirmed yet. Check your inbox/spam folder and click the confirmation link.','error');
          else msg('Sign in failed ['+(code||'auth_error')+']: '+(error.message||'Incorrect email or password.'),'error');
          return;
        }
        window.state.user=data?.user||null;
        window.state.menuOpen=false;
        msg('Signed in successfully.','success');
        if(typeof window.render==='function') window.render();
      }catch(e){msg('Connection error while signing in: '+(e?.message||e),'error');}
      finally{setBtn('signInBtn','Sign in',false)}
    };

    window.resetPassword=async function(){
      const email=document.getElementById('email')?.value.trim().toLowerCase();
      if(!email)return msg('Enter your email first, then tap Forgot password.');
      try{
        const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
        if(error)throw error;
        msg('Password reset email sent. Check your inbox and spam folder.','success');
      }catch(e){msg('Password reset failed: '+(e?.message||e),'error')}
    };
    window.__fpAuthFixInstalled=true;
    return true;
  }
  window.addEventListener('load',()=>{let n=0;const t=setInterval(()=>{if(ready()||++n>100)clearInterval(t)},100)});
})();
