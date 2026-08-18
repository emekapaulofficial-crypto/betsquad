/* Personal dashboard: private balance, deposit history, withdrawal history and withdrawal request. */
(function(){'use strict';
  let mounted=false;
  async function mount(){
    if(mounted||!window.state?.user||!window.supabase||window.state.page!=='wallet')return;
    const wrap=document.querySelector('main.wrap');if(!wrap)return setTimeout(mount,300);
    mounted=true;
    const uid=window.state.user.id;
    const [w,d,wd]=await Promise.all([
      window.supabase.from('game_wallets').select('cash_balance').eq('user_id',uid).maybeSingle(),
      window.supabase.from('deposit_requests').select('amount,status,reference,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(20),
      window.supabase.from('withdrawal_requests').select('amount,status,destination,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(20)
    ]);
    const bal=Number(w.data?.cash_balance||0);
    const box=document.createElement('section');box.id='fpPersonalDashboard';box.className='panel';
    box.style.cssText='margin:14px auto;border:1px solid rgba(82,224,145,.35);scroll-margin-top:90px';
    const deposits=d.data||[], withdrawals=wd.data||[];
    box.innerHTML='<span class="badge">MY PERSONAL DASHBOARD</span><h2 style="margin:8px 0">My wallet & history</h2><div class="notice"><div class="small muted">AVAILABLE BALANCE</div><div style="font-size:30px;font-weight:800">'+bal.toLocaleString()+'</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><button id="fpDashDeposit" class="secondary">MY DEPOSITS</button><button id="fpDashWithdraw" class="secondary">MY WITHDRAWALS</button></div><div id="fpDepositHistory"><h3>Deposit history</h3>'+((deposits.map(x=>'<div class="small" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07)">'+Number(x.amount).toLocaleString()+' — <b>'+x.status+'</b>'+ (x.reference?' — '+x.reference:'') +' — '+new Date(x.created_at).toLocaleString()+'</div>').join(''))||'<p class="muted">No deposits yet.</p>')+'</div><div id="fpWithdrawalHistory"><h3>Withdrawal history</h3>'+((withdrawals.map(x=>'<div class="small" style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.07)">'+Number(x.amount).toLocaleString()+' — <b>'+x.status+'</b> — '+new Date(x.created_at).toLocaleString()+'</div>').join(''))||'<p class="muted">No withdrawals yet.</p>')+'</div><h3>Request withdrawal</h3><p class="small muted">Enter the amount and bank/account destination for an approved payout.</p><input id="fpWithdrawAmount" type="number" min="1" step="0.01" placeholder="Amount"><input id="fpWithdrawDestination" placeholder="Bank + account number"><button id="fpWithdrawButton" class="primary" style="width:100%;margin-top:8px">REQUEST WITHDRAWAL</button>';
    wrap.insertBefore(box,wrap.firstChild);
    const scroll=()=>box.scrollIntoView({behavior:'smooth',block:'start'});
    box.querySelector('#fpDashDeposit').onclick=scroll;box.querySelector('#fpDashWithdraw').onclick=()=>{scroll();setTimeout(()=>box.querySelector('#fpWithdrawAmount')?.focus(),400)};
    box.querySelector('#fpWithdrawButton').onclick=async()=>{const amount=Number(box.querySelector('#fpWithdrawAmount').value);const destination=box.querySelector('#fpWithdrawDestination').value.trim();if(!amount||!destination){alert('Enter an amount and withdrawal destination.');return;}const r=await window.supabase.rpc('create_withdrawal_request',{p_amount:amount,p_destination:destination});if(r.error){alert(r.error.message);return;}alert('Withdrawal request submitted to Admin.');location.reload();};
  }
  function resetOnRoute(){mounted=false;if(window.state?.page==='wallet')setTimeout(mount,250);else setTimeout(resetOnRoute,500)}
  resetOnRoute();
})();
