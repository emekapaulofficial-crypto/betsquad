/* Final user-flow stability layer. Keeps the existing 1v1 engine and fixes auth-page persistence. */
(function(){
  'use strict';
  let installed=false,signupBusy=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function add1v1Nav(){
    const state=window.state;
    if(!state)return;
    const nav=document.querySelector('.nav');
    if(nav&&!nav.querySelector('[data-fp-final-1v1]')){
      const b=document.createElement('button');
      b.type='button'; b.dataset.fpFinal1v1='1'; b.textContent='1v1';
      b.className=state.page==='onevone'?'active':'';
      b.onclick=()=>{state.page='onevone';state.menuOpen=false;if(typeof window.render==='function')window.render();};
      const rooms=[...nav.querySelectorAll('button')].find(x=>/^Rooms$/i.test(x.textContent.trim()));
      if(rooms)rooms.insertAdjacentElement('afterend',b);else nav.appendChild(b);
    }
    const mobile=document.querySelector('.mobile-menu');
    if(mobile&&!mobile.querySelector('[data-fp-final-1v1]')){
      const b=document.createElement('button');
      b.type='button'; b.dataset.fpFinal1v1='1'; b.textContent='1v1';
      b.className=state.page==='onevone'?'active':'';
      b.onclick=()=>{state.page='onevone';state.menuOpen=false;if(typeof window.render==='function')window.render();};
      const rooms=[...mobile.querySelectorAll('button')].find(x=>/^Rooms$/i.test(x.textContent.trim()));
      if(rooms)rooms.insertAdjacentElement('afterend',b);else mobile.appendChild(b);
    }
  }

  async function forceHomeIfAuthenticated(){
    if(!window.state||!window.supabase||typeof window.render!=='function')return;
    try{
      const {data}=await window.supabase.auth.getSession();
      if(data?.session?.user && window.state.page==='auth'){
        window.state.user=data.session.user;
        window.state.page='home';
        window.state.menuOpen=false;
        await window.render();
      }
    }catch(e){console.warn('auth session check:',e?.message||e)}
  }

  async function stableSignUp(){
    if(signupBusy)return;
    const name=document.querySelector('#name')?.value.trim()||'';
    const email=document.querySelector('#email')?.value.trim()||'';
    const password=document.querySelector('#password')?.value||'';
    const btn=document.querySelector('#signUpBtn');
    if(!name||!email||password.length<6){window.showAuthMessage?.('Enter name, email and a password of at least 6 characters.','error');return;}
    signupBusy=true;if(btn){btn.disabled=true;btn.textContent='Creating account...'}
    try{
      let result=null,lastError=null;
      for(let attempt=1;attempt<=3;attempt++){
        try{
          result=await window.supabase.auth.signUp({email,password,options:{data:{name}}});
          lastError=result?.error||null;
          if(!lastError)break;
        }catch(e){lastError=e}
        const msg=String(lastError?.message||lastError||'');
        if(!/load failed|network|fetch|failed to fetch|timeout/i.test(msg)||attempt===3)break;
        await sleep(700*attempt);
      }
      if(lastError){
        const msg=String(lastError.message||lastError);
        if(/already registered|already exists|already been registered/i.test(msg))window.showAuthMessage?.('An account with this email already exists. Please use Sign in.','error');
        else if(/load failed|network|fetch|failed to fetch/i.test(msg))window.showAuthMessage?.('Connection to the account service failed. Please check your internet connection and tap Create account again.','error');
        else window.showAuthMessage?.('Sign up failed: '+msg,'error');
        return;
      }
      const {data}=await window.supabase.auth.getSession();
      if(data?.session?.user){
        window.state.user=data.session.user;window.state.page='home';window.state.menuOpen=false;await window.render();return;
      }
      window.showAuthMessage?.('Account created. Check your email to confirm the account, then sign in.','success');
    }finally{signupBusy=false;if(btn){btn.disabled=false;btn.textContent='Create account'}}
  }

  function install(){
    if(installed)return;
    if(!window.state||!window.supabase||typeof window.render!=='function')return setTimeout(install,100);
    installed=true;

    const originalSignUp=window.signUp;
    window.signUp=stableSignUp;

    window.supabase.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_IN'&&session?.user){
        setTimeout(async()=>{window.state.user=session.user;window.state.page='home';window.state.menuOpen=false;try{await window.render()}catch(e){console.warn('login render:',e)}},0);
      }
      if(event==='SIGNED_OUT'){
        setTimeout(async()=>{window.state.user=null;window.state.selected=[];window.state.page='home';window.state.menuOpen=false;try{await window.render()}catch(e){}},0);
      }
    });

    setInterval(()=>{
      add1v1Nav();
      forceHomeIfAuthenticated();
    },600);

    setTimeout(()=>{add1v1Nav();forceHomeIfAuthenticated()},300);
  }
  install();
})();
