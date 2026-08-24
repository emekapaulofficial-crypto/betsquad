(() => {
  'use strict';
  const POS_KEY='betsquad.quickMenu.position.v2';
  const voiceKey='betsquad.voice.position.v1';
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  function quickMenu(){
    let m=document.querySelector('#quickMenu,.quick-menu,[data-quick-menu]');
    if(!m){
      m=document.createElement('div'); m.id='quickMenu'; m.className='quick-menu recovery-quick-menu';
      m.innerHTML='<div class="qm-head"><b>☰ Quick Menu</b><span class="qm-drag">Drag</span></div><div class="qm-grid"><button data-q="home">Home</button><button data-q="games">Games</button><button data-q="matches">Football</button><button data-q="rooms">Rooms</button><button data-q="wallet">Wallet</button><button data-q="leaderboard">Leaderboard</button></div>';
      document.body.appendChild(m);
    }
    if(m.dataset.ready==='1')return;
    m.dataset.ready='1';
    const css=document.createElement('style');css.textContent=`.recovery-quick-menu{position:fixed;left:14px;top:86px;z-index:100000;width:min(245px,calc(100vw - 28px));background:rgba(12,18,24,.97);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:9px;box-shadow:0 10px 35px #0008;font:14px system-ui;touch-action:none}.qm-head{display:flex;justify-content:space-between;align-items:center;padding:7px 6px 10px;cursor:grab}.qm-drag{font-size:11px;opacity:.55}.qm-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.qm-grid button{min-height:40px;border:0;border-radius:9px;background:#fff;color:#111;font-weight:700;cursor:pointer;touch-action:manipulation}@media(max-width:520px){.recovery-quick-menu{width:205px;padding:7px}.qm-grid button{min-height:36px;font-size:12px}}`;document.head.appendChild(css);
    try{const p=JSON.parse(localStorage.getItem(POS_KEY)||'null');if(p)m.style.left=clamp(p.x,0,innerWidth-m.offsetWidth)+'px',m.style.top=clamp(p.y,0,innerHeight-m.offsetHeight)+'px'}catch(_){ }
    m.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const p=b.dataset.q;if(typeof window.go==='function')window.go(p)}));
    let drag=false,sx=0,sy=0,ox=0,oy=0;const head=m.querySelector('.qm-head');
    head.addEventListener('pointerdown',e=>{drag=true;sx=e.clientX;sy=e.clientY;const r=m.getBoundingClientRect();ox=r.left;oy=r.top;head.setPointerCapture?.(e.pointerId);e.preventDefault()});
    head.addEventListener('pointermove',e=>{if(!drag)return;m.style.left=clamp(ox+e.clientX-sx,0,innerWidth-m.offsetWidth)+'px';m.style.top=clamp(oy+e.clientY-sy,0,innerHeight-m.offsetHeight)+'px';e.preventDefault()});
    head.addEventListener('pointerup',e=>{if(!drag)return;drag=false;const r=m.getBoundingClientRect();localStorage.setItem(POS_KEY,JSON.stringify({x:r.left,y:r.top}));try{head.releasePointerCapture?.(e.pointerId)}catch(_){}});
  }

  function chat(){const wrap=document.querySelector('#gameChat');if(!wrap)return;wrap.style.position='relative';wrap.style.zIndex='100001';wrap.style.pointerEvents='auto';const input=wrap.querySelector('#gameChatInput'),form=wrap.querySelector('#gameChatForm'),button=form?.querySelector('button');if(input){input.disabled=false;input.readOnly=false;input.style.pointerEvents='auto';input.style.position='relative';input.style.zIndex='100002';input.setAttribute('autocomplete','off');input.setAttribute('inputmode','text');input.onclick=e=>e.stopPropagation();input.onpointerdown=e=>e.stopPropagation();input.onkeydown=e=>e.stopPropagation()}if(button){button.style.pointerEvents='auto';button.style.position='relative';button.style.zIndex='100002';button.onclick=e=>{e.stopPropagation()}}if(form)form.style.pointerEvents='auto'}

  function voice(){const v=document.querySelector('#voiceChatBox');if(!v||v.dataset.dragReady==='1')return;if(window.innerWidth<=600){v.style.width='190px';v.style.padding='8px';v.style.borderRadius='12px';v.querySelectorAll('button').forEach(b=>{b.style.minHeight='36px';b.style.fontSize='12px';b.style.padding='6px'})}v.style.touchAction='none';v.style.cursor='grab';const head=v.querySelector('.voice-chat-title')||v;let drag=false,sx=0,sy=0,ox=0,oy=0;head.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag=true;sx=e.clientX;sy=e.clientY;const r=v.getBoundingClientRect();ox=r.left;oy=r.top;head.setPointerCapture?.(e.pointerId);e.preventDefault()});head.addEventListener('pointermove',e=>{if(!drag)return;v.style.left=clamp(ox+e.clientX-sx,0,innerWidth-v.offsetWidth)+'px';v.style.top=clamp(oy+e.clientY-sy,0,innerHeight-v.offsetHeight)+'px';v.style.right='auto';v.style.bottom='auto';e.preventDefault()});head.addEventListener('pointerup',e=>{if(!drag)return;drag=false;const r=v.getBoundingClientRect();localStorage.setItem(voiceKey,JSON.stringify({x:r.left,y:r.top}));try{head.releasePointerCapture?.(e.pointerId)}catch(_){}});v.dataset.dragReady='1'}
  function restoreVoicePos(){const v=document.querySelector('#voiceChatBox');if(!v)return;try{const p=JSON.parse(localStorage.getItem(voiceKey)||'null');if(p){v.style.left=clamp(p.x,0,innerWidth-v.offsetWidth)+'px';v.style.top=clamp(p.y,0,innerHeight-v.offsetHeight)+'px';v.style.right='auto';v.style.bottom='auto'}}catch(_){}voice()}
  function run(){quickMenu();chat();restoreVoicePos()}
  new MutationObserver(run).observe(document.documentElement,{childList:true,subtree:true});setInterval(run,1000);run();
})();