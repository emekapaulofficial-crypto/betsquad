/* Clear bank-transfer instructions for the Wallet. Does not expose other users' payments. */
(function(){
  'use strict';
  const ACCOUNT='9152926691';
  const BANK='OPay';
  function add(){
    if(!window.state?.user||window.state.page!=='wallet')return;
    const wrap=document.querySelector('main.wrap'); if(!wrap)return;
    let box=document.getElementById('fpTransferInstructions');
    if(!box){
      box=document.createElement('section');
      box.id='fpTransferInstructions'; box.className='panel';
      box.style.cssText='margin-top:14px;border:1px solid rgba(82,224,145,.35);';
      box.innerHTML='<span class="badge">BANK TRANSFER</span><h2 style="margin:8px 0">How to deposit</h2><ol style="line-height:1.7;padding-left:22px"><li>Copy the FootballPoints account number below.</li><li>Open your bank app or visit your bank and make the transfer to the account shown.</li><li>Return to FootballPoints and submit your payment amount and transfer reference in the Deposit section.</li><li>Use <b>Tell Admin I Paid</b> to notify the administrator that you have completed the transfer.</li><li>Wait for the administrator to verify the transfer. <b>Do not send the same payment again while it is pending.</b></li></ol><div class="notice"><b>Bank:</b> '+BANK+'<br><b>Account number:</b> <span style="font-size:20px;font-weight:800;letter-spacing:1px">'+ACCOUNT+'</span><br><button class="secondary" id="fpCopyTransferAccount" style="margin-top:8px">COPY ACCOUNT NUMBER</button></div><div class="notice" style="margin-top:10px"><b>Payment status</b><br><span class="small muted">Your payment is private to your account. Once the admin accepts the transfer, the approved deposit can appear on your dashboard/wallet balance.</span></div>';
      wrap.insertBefore(box,wrap.firstChild.nextSibling||wrap.firstChild);
      box.querySelector('#fpCopyTransferAccount').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(ACCOUNT);box.querySelector('#fpCopyTransferAccount').textContent='COPIED ✓';}catch(e){alert('Account number: '+ACCOUNT)}});
    }
  }
  setInterval(add,500); document.addEventListener('DOMContentLoaded',add);
})();
