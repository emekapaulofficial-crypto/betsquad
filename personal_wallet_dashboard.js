/* Personal Wallet dashboard: inject only after the main app finishes rendering Wallet. */
(function(){
  'use strict';
  let wrapped=false;
  let lastRenderedUser=null;

  function dashboardHtml(){
    return '<section id="fpPersonalDashboard" class="panel" style="display:block!important;visibility:visible!important;opacity:1!important;position:relative;z-index:30;margin:16px auto;padding:18px;border:2px solid rgba(82,224,145,.45);background:#0b1d31;scroll-margin-top:90px">'+
      '<span class="badge">PRIVATE — MY DASHBOARD</span>'+ 
      '<h2 style="margin:8px 0">My Personal Dashboard</h2>'+ 
      '<p class="small muted">Only you can see your wallet, deposits, withdrawals and stake information.</p>'+ 
      '<div class="notice" style="margin-top:12px"><b>OPay deposit account</b><br>Account number: <strong style="font-size:22px;letter-spacing:1px">9152926691</strong><br><button id="fpDashCopyAccount" class="secondary" style="margin-top:8px">COPY ACCOUNT NUMBER</button></div>'+ 
      '<div id="fpDashBody" class="notice" style="margin-top:12px">Loading your personal account...</div>'+ 
      '<div class="notice" style="margin-top:12px"><h3 style="margin-top:0">Request Withdrawal</h3><p class="small muted">Enter the amount you want to withdraw and the bank/account where you want it sent.</p><input id="fpWithdrawAmount" type="number" min="1" step="0.01" placeholder="Amount"><input id="fpWithdrawDestination" placeholder="Bank + account number" style="margin-top:8px"><button id="fpWithdrawButton" class="primary" style="width:100%;margin-top:8px">REQUEST WITHDRAWAL</button></div>'+
    '</section>';
  }

  async function mount(){
    const s=window.state,sb=window.supabase;
    if(!s||!sb||!s.user||s.page!=='wallet')return;
    const host=document.querySelector('main.wrap');
    if(!host)return;
    const uid=s.user.id;
    const existing=document.getElementById('fpPersonalDashboard');
    if(existing && existing.parentElement===host && existing.dataset.uid===uid)return;
    if(existing)existing.remove();
    host.insertAdjacentHTML('afterbegin',dashboardHtml());
    const box=document.getElementById('fpPersonalDashboard');
    if(!box)return;
    box.dataset.uid=uid;
    const copy=box.querySelector('#fpDashCopyAccount');
    copy.onclick=async()=>{try{await navigator.clipboard.writeText('9152926691');copy.textContent='COPIED ✓';}catch(e){alert('Account number: 9152926691')}};
    box.querySelector('#fpWithdrawButton').onclick=async()=>{
      const amount=Number(box.querySelector('#fpWithdrawAmount').value);
      const destination=box.querySelector('#fpWithdrawDestination').value.trim();
      if(!amount||amount<=0)return alert('Enter a valid withdrawal amount.');
      if(!destination)return alert('Enter the bank/account destination.');
      const r=await sb.rpc('create_withdrawal_request',{p_amount:amount,p_destination:destination});
      if(r.error)return alert(r.error.message);
      alert('Withdrawal request sent to Admin.');
      await mount();
    };
    try{
      const [w,d,wd]=await Promise.all([
        sb.from('game_wallets').select('cash_balance,points,diamonds').eq('user_id',uid).maybeSingle(),
        sb.from('deposit_requests').select('amount,status,reference,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(50),
        sb.from('withdrawal_requests').select('amount,status,destination,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(50)
      ]);
      const deposits=d.data||[], withdrawals=wd.data||[];
      const fmt=n=>Number(n||0).toLocaleString();
      box.querySelector('#fpDashBody').innerHTML=
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">'+
        '<div><span class="small muted">CASH BALANCE</span><br><strong style="font-size:22px">'+fmt(w.data?.cash_balance)+'</strong></div>'+ 
        '<div><span class="small muted">POINTS</span><br><strong style="font-size:22px">'+fmt(w.data?.points)+'</strong></div>'+ 
        '<div><span class="small muted">DIAMONDS</span><br><strong style="font-size:22px">'+fmt(w.data?.diamonds)+'</strong></div></div>'+ 
        '<hr style="border:0;border-top:1px solid rgba(255,255,255,.1);margin:14px 0">'+
        '<h3>Deposit history</h3>'+ (deposits.length?deposits.map(x=>'<div class="row"><span>'+fmt(x.amount)+' — '+x.status+(x.reference?' — '+x.reference:'')+'</span><span class="small">'+new Date(x.created_at).toLocaleString()+'</span></div>').join(''):'<p class="muted">No deposits yet.</p>')+
        '<h3 style="margin-top:16px">Withdrawal history</h3>'+ (withdrawals.length?withdrawals.map(x=>'<div class="row"><span>'+fmt(x.amount)+' — '+x.status+'</span><span class="small">'+new Date(x.created_at).toLocaleString()+'</span></div>').join(''):'<p class="muted">No withdrawals yet.</p>');
    }catch(e){box.querySelector('#fpDashBody').innerHTML='<p class="muted">Your dashboard could not load the history right now. Your account remains protected. Please try again.</p>';console.error('FootballPoints dashboard',e);}
  }

  function install(){
    if(wrapped||typeof window.render!=='function')return false;
    const original=window.render;
    window.render=async function(){
      const result=await original.apply(this,arguments);
      if(window.state?.page==='wallet')setTimeout(mount,0);
      return result;
    };
    wrapped=true;
    mount();
    return true;
  }

  const timer=setInterval(()=>{if(install())clearInterval(timer);else if(window.state?.page==='wallet')mount();},100);
  new MutationObserver(()=>{if(window.state?.page==='wallet')setTimeout(mount,50)}).observe(document.body,{childList:true,subtree:true});
})();
