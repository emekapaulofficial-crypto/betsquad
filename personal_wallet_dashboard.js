/* Personal dashboard: private balance, deposits, withdrawals and winner payout requests. */
(function(){'use strict';
async function add(){
 if(!window.state?.user||!window.supabase)return;
 const wrap=document.querySelector('main.wrap');if(!wrap||document.getElementById('fpPersonalDashboard'))return;
 const uid=window.state.user.id;
 const [w,d,wd]=await Promise.all([window.supabase.from('game_wallets').select('cash_balance').eq('user_id',uid).maybeSingle(),window.supabase.from('deposit_requests').select('amount,status,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(10),window.supabase.from('withdrawal_requests').select('amount,status,destination,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(10)]);
 const bal=Number(w.data?.cash_balance||0);
 const box=document.createElement('section');box.id='fpPersonalDashboard';box.className='panel';box.style.cssText='margin:14px auto;border:1px solid rgba(82,224,145,.35)';
 box.innerHTML='<span class="badge">MY PERSONAL DASHBOARD</span><h2 style="margin:8px 0">My wallet</h2><div class="notice"><div class="small muted">AVAILABLE BALANCE</div><div style="font-size:30px;font-weight:800">'+bal.toLocaleString()+'</div></div><h3>My payments</h3><div id="fpMyPayments">'+((d.data||[]).map(x=>'<div class="small" style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07)">'+Number(x.amount).toLocaleString()+' — <b>'+x.status+'</b> — '+new Date(x.created_at).toLocaleDateString()+'</div>').join('')||'<p class="muted">No payments yet.</p>')+'</div><h3>Request withdrawal</h3><p class="small muted">Enter the amount and the bank/account destination where you want your approved winnings paid.</p><input id="fpWithdrawAmount" type="number" min="1" step="0.01" placeholder="Amount"><input id="fpWithdrawDestination" placeholder="Bank + account number"><button id="fpWithdrawButton" class="primary" style="width:100%;margin-top:8px">REQUEST WITHDRAWAL</button><h3>My withdrawal requests</h3><div>'+((wd.data||[]).map(x=>'<div class="small" style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07)">'+Number(x.amount).toLocaleString()+' — <b>'+x.status+'</b></div>').join('')||'<p class="muted">No withdrawal requests yet.</p>')+'</div>';
 wrap.insertBefore(box,wrap.firstChild);
 box.querySelector('#fpWithdrawButton').onclick=async()=>{const amount=Number(box.querySelector('#fpWithdrawAmount').value);const destination=box.querySelector('#fpWithdrawDestination').value.trim();if(!amount||!destination){alert('Enter an amount and withdrawal destination.');return;}const r=await window.supabase.rpc('create_withdrawal_request',{p_amount:amount,p_destination:destination});if(r.error){alert(r.error.message);return;}alert('Withdrawal request submitted to Admin.');location.reload();};
}
function wait(){if(window.state?.page==='wallet'&&window.supabase)add();else setTimeout(wait,700)}wait();
})();
