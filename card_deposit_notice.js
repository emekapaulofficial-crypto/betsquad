/* Card deposits require a PCI-compliant payment processor. This UI exposes the option only when a configured checkout URL exists. */
(function(){
  const CHECKOUT_URL=window.FP_CARD_CHECKOUT_URL||'';
  window.startCardDeposit=function(){
    if(!CHECKOUT_URL){alert('Card deposits are being configured. Please use bank transfer for now.');return;}
    window.open(CHECKOUT_URL,'_blank','noopener,noreferrer');
  };
  function add(){
    if(!window.state?.user||window.state.page!=='wallet')return;
    if(document.getElementById('cardDepositOption'))return;
    const panel=document.getElementById('privateAccountPanel');if(!panel)return;
    const box=document.createElement('div');box.id='cardDepositOption';box.className='notice';box.style.marginTop='12px';
    box.innerHTML='<b>Deposit with ATM/debit card</b><br><span class="small">Use our secure payment checkout. Card details are entered on the payment provider, not stored by FootballPoints.</span><br><button class="primary" style="margin-top:8px" onclick="startCardDeposit()">Deposit with card</button>';
    panel.appendChild(box);
  }
  setInterval(add,500);
})();
