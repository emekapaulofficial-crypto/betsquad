/* Private wallet deposit instructions and payment notification control. */
(function(){
'use strict';
const ACCOUNT='9152926691',BANK='OPay';
async function notify(){
 const amount=prompt('Enter the amount you transferred:'); if(!amount||Number(amount)<=0)return;
 const reference=prompt('Enter your bank transfer reference (optional):')||'';
 const sb=window.supabaseClient||window.supabase||window._supabase;
 if(!sb?.rpc){alert('Wallet is still loading. Please try again in a moment.');return;}
 const {error}=await sb.rpc('create_deposit_request',{p_amount:Number(amount),p_method:'bank_transfer',p_reference:reference});
 if(error){alert(error.message||'Could not notify Admin.');return;}
 alert('Payment notification sent to Admin. Your payment is pending verification.');
}
function add(){
 if(!window.state?.user||window.state.page!=='wallet')return; const wrap=document.querySelector('main.wrap');if(!wrap)return;
 let box=document.getElementById('fpTransferInstructions');
 if(!box){box=document.createElement('section');box.id='fpTransferInstructions';box.className='panel';box.style.cssText='margin-top:14px;border:1px solid rgba(82,224,145,.35);';
 box.innerHTML='<span class="badge">BANK TRANSFER</span><h2 style="margin:8px 0">Deposit into your FootballPoints wallet</h2><p class="muted">Copy this account number, make the transfer from your own bank account, then tell Admin that you have paid.</p><div class="notice"><b>Bank:</b> '+BANK+'<br><b>Account number:</b> <span style="font-size:24px;font-weight:800;letter-spacing:1px">'+ACCOUNT+'</span><br><button class="secondary" id="fpCopyTransferAccount" style="margin-top:8px">COPY ACCOUNT NUMBER</button></div><ol style="line-height:1.7;padding-left:22px"><li>Copy the account number.</li><li>Make the transfer from your bank account.</li><li>Return here and press <b>TELL ADMIN I PAID</b>.</li><li>Enter the amount and transfer reference.</li><li>Wait for Admin to verify and accept the payment.</li></ol><button class="primary" id="fpTellAdminPaid" style="width:100%;margin-top:8px">TELL ADMIN I PAID</button><div class="notice" style="margin-top:10px"><b>After approval:</b> the approved deposit is credited to your personal wallet/dashboard. Your payment is private.</div>';
 wrap.insertBefore(box,wrap.firstChild.nextSibling||wrap.firstChild);
 box.querySelector('#fpCopyTransferAccount').onclick=async()=>{try{await navigator.clipboard.writeText(ACCOUNT);box.querySelector('#fpCopyTransferAccount').textContent='COPIED ✓'}catch(e){alert('Account number: '+ACCOUNT)}};
 box.querySelector('#fpTellAdminPaid').onclick=notify;
 }
}
setInterval(add,500);document.addEventListener('DOMContentLoaded',add);
})();
