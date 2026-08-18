/* Reliable private Wallet dashboard. Mounts after the app module is ready and on every Wallet render. */
(function(){
 'use strict';
 let lastUserId=null;
 async function mount(){
   const s=window.state, sb=window.supabase;
   if(!s||!sb||!s.user||s.page!=='wallet')return;
   const uid=s.user.id;
   const existing=document.getElementById('fpPersonalDashboard');
   if(existing&&lastUserId===uid)return;
   if(existing)existing.remove();
   const host=document.querySelector('main.wrap')||document.getElementById('app');
   if(!host)return;
   lastUserId=uid;
   const box=document.createElement('section');
   box.id='fpPersonalDashboard'; box.className='panel';
   box.style.cssText='display:block!important;visibility:visible!important;opacity:1!important;position:relative;z-index:20;margin:16px auto;padding:16px;border:2px solid rgba(82,224,145,.45);scroll-margin-top:90px;background:rgba(8,28,45,.98)';
   box.innerHTML='<span class="badge">PRIVATE — MY DASHBOARD</span><h2 style="margin:8px 0">My Personal Dashboard</h2><p class="small muted">Only you can see your wallet, deposits, withdrawals and stake history.</p><div id="fpDashLoading" class="notice">Loading your account...</div>';
   host.insertBefore(box,host.firstChild);
   try{
     const [w,d,wd]=await Promise.all([
       sb.from('game_wallets').select('cash_balance').eq('user_id',uid).maybeSingle(),
       sb.from('deposit_requests').select('amount,status,reference,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(50),
       sb.from('withdrawal_requests').select('amount,status,destination,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(50)
     ]);
     const bal=Number(w.data?.cash_balance||0), deposits=d.data||[], withdrawals=wd.data||[];
     const fmt=n=>Number(n||0).toLocaleString();
     box.innerHTML='<span class="badge">PRIVATE — MY DASHBOARD</span><h2 style="margin:8px 0">My Personal Dashboard</h2><div class="notice"><div class="small muted">AVAILABLE BALANCE</div><div style="font-size:30px;font-weight:800">'+fmt(bal)+'</div></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:14px"><div class="notice"><h3 style="margin-top:0">Deposit History</h3>'+(deposits.length?deposits.map(x=>'<div class="small" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)"><b>'+fmt(x.amount)+'</b> — '+x.status+(x.reference?' — '+x.reference:'')+'<br><span class="muted">'+new Date(x.created_at).toLocaleString()+'</span></div>').join(''):'<p class="muted">No deposits yet.</p>')+'</div><div class="notice"><h3 style="margin-top:0">Withdrawal History</h3>'+(withdrawals.length?withdrawals.map(x=>'<div class="small" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)"><b>'+fmt(x.amount)+'</b> — '+x.status+'<br><span class="muted">'+new Date(x.created_at).toLocaleString()+'</span></div>').join(''):'<p class="muted">No withdrawals yet.</p>')+'</div></div><div class="notice" style="margin-top:12px"><h3 style="margin-top:0">Request Withdrawal</h3><p class="small muted">Request a withdrawal from your available balance. Your request will be reviewed by Admin.</p><input id="fpWithdrawAmount" type="number" min="1" step="0.01" placeholder="Amount"><input id="fpWithdrawDestination" placeholder="Bank + account number"><button id="fpWithdrawButton" class="primary" style="width:100%;margin-top:8px">REQUEST WITHDRAWAL</button></div>';
     box.querySelector('#fpWithdrawButton').onclick=async()=>{const amount=Number(box.querySelector('#fpWithdrawAmount').value),destination=box.querySelector('#fpWithdrawDestination').value.trim();if(!amount||!destination){alert('Enter an amount and withdrawal destination.');return;}const r=await sb.rpc('create_withdrawal_request',{p_amount:amount,p_destination:destination});if(r.error){alert(r.error.message);return;}alert('Withdrawal request sent to Admin.');mount();};
   }catch(e){box.innerHTML='<span class="badge">PRIVATE — MY DASHBOARD</span><h2>My Personal Dashboard</h2><div class="notice">We could not load your dashboard right now. Please refresh and try again.</div>';console.error('Personal dashboard:',e);}
 }
 function watch(){
   mount();
   if(window.__fpDashWatcher)return;window.__fpDashWatcher=true;
   new MutationObserver(()=>{if(window.state?.page==='wallet')setTimeout(mount,80)}).observe(document.body,{childList:true,subtree:true});
   setInterval(()=>{if(window.state?.page==='wallet')mount();else lastUserId=null},500);
 }
 const boot=()=>{watch()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
