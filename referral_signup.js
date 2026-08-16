// Pass the referral code into Supabase Auth metadata so the database trigger can award diamonds.
(function(){
  function install(){
    if(window.__fpReferralSignupInstalled || typeof window.signUp!=='function' || !window.supabase)return;
    const original=window.signUp;
    window.signUp=async function(){
      const code=localStorage.getItem('fp_referral_code');
      if(!code){return original();}
      const auth=window.supabase.auth;
      const originalSignUp=auth.signUp.bind(auth);
      auth.signUp=async function(args){
        const options={...(args?.options||{}),data:{...((args?.options||{}).data||{}),referral_code:code}};
        return originalSignUp({...args,options});
      };
      try{return await original();}finally{auth.signUp=originalSignUp;}
    };
    window.__fpReferralSignupInstalled=true;
  }
  const timer=setInterval(()=>{if(typeof window.signUp==='function'){clearInterval(timer);install()}},100);
  setTimeout(()=>clearInterval(timer),10000);
})();
