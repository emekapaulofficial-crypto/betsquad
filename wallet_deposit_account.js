/* Prominent FootballPoints deposit account. */
(function(){
  const ACCOUNT='9152926691';
  function add(){
    if(!window.state?.user||window.state.page!=='wallet')return;
    const wrap=document.querySelector('main.wrap');if(!wrap)return;
    let box=document.getElementById('fpDepositAccount');
    if(!box){
      box=document.createElement('section');box.id='fpDepositAccount';box.className='panel';box.style.cssText='margin-top:16px;border:1px solid rgba(82,224,145,.45);box-shadow:0 8px 28px rgba(0,0,0,.22)';
      box.innerHTML='<span class="badge">FOOTBALLPOINTS DEPOSIT ACCOUNT</span><h2 style="margin:8px 0">Deposit money into your wallet</h2><p class="muted">Use this account for your FootballPoints bank transfer.</p><div class="notice" style="margin-top:10px"><span class="small">ACCOUNT NUMBER</span><div style="font-size:28px;font-weight:800;letter-spacing:2px;margin:5px 0">'+ACCOUNT+'</div><button class="secondary" onclick="navigator.clipboard?.writeText(\''+ACCOUNT+'\');this.textContent=\'Copied\'">Copy account number</button></div><p class="small muted" style="margin-top:10px">After transferring, submit the amount and transfer reference in the Deposit section. Your payment remains private to your account.</p>';
      wrap.insertBefore(box,wrap.firstChild);
    }
  }
  setInterval(add,500);
  document.addEventListener('DOMContentLoaded',add);
})();
