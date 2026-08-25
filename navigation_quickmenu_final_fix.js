/* BetSquad final navigation + Quick Menu recovery. */
(function(){
  'use strict';
  const navMap={home:'home',games:'games',rooms:'rooms',rounds:'rounds',friendly:'friendly',leaderboard:'leaderboard',wallet:'wallet',admin:'admin',football:'matches'};
  let open=false;
  function navigate(page){
    try{if(typeof window.go==='function'){window.go(page);return true;}if(window.state){window.state.page=page;window.state.menuOpen=false;if(typeof window.render==='function'){window.render();return true;}}}catch(e){console.error('Navigation failed',page,e)}
    return false;
  }
  function cleanOld(){
    document.querySelectorAll('[data-bs-quick-old="1"]').forEach(e=>e.remove());
    [...document.querySelectorAll('body *')].forEach(el=>{if(el.id==='betsquad-final-quick-launcher'||el.id==='betsquad-final-quick-panel')return;const t=(el.textContent||'').replace(/\s+/g,' ').trim();if(/^quick menu\s*$/i.test(t)||/^quick menu\s+drag$/i.test(t)){if(!el.querySelector('button,a,input')){el.dataset.bsQuickOld='1';el.style.setProperty('display','none','important')}}});
  }
  function make(){
    if(!document.body)return;cleanOld();
    let launcher=document.getElementById('betsquad-final-quick-launcher'),panel=document.getElementById('betsquad-final-quick-panel');
    if(!launcher){
      launcher=document.createElement('button');launcher.id='betsquad-final-quick-launcher';launcher.type='button';launcher.textContent='☰ Quick Menu';launcher.style.cssText='position:fixed;right:16px;bottom:16px;z-index:100001;border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:12px 16px;background:#102238;color:#fff;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.3);touch-action:manipulation;';document.body.appendChild(launcher);
      launcher.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();open=!open;panel.style.display=open?'block':'none';launcher.textContent=open?'✕ Close Menu':'☰ Quick Menu';});
    }
    if(!panel){
      panel=document.createElement('div');panel.id='betsquad-final-quick-panel';panel.style.cssText='display:none;position:fixed;right:16px;bottom:68px;z-index:100000;width:220px;background:#0b1728;border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:10px;box-shadow:0 12px 35px rgba(0,0,0,.45);';
      const title=document.createElement('div');title.textContent='Quick Menu';title.style.cssText='color:#fff;font-weight:800;padding:8px 10px 10px';panel.appendChild(title);
      [['Home','home'],['Games','games'],['Football','matches'],['Rooms','rooms'],['Wallet','wallet'],['Leaderboard','leaderboard']].forEach(([label,page])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='display:block;width:100%;margin:5px 0;padding:11px 12px;border:0;border-radius:9px;background:#f4f4f4;color:#111;font-weight:700;cursor:pointer;touch-action:manipulation;';b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();open=false;panel.style.display='none';launcher.textContent='☰ Quick Menu';navigate(page)});panel.appendChild(b)});
      document.body.appendChild(panel);
    }
  }
  document.addEventListener('click',function(e){const el=e.target.closest('button,a');if(!el)return;if(el.id==='betsquad-final-quick-launcher'||el.closest('#betsquad-final-quick-panel'))return;const label=(el.textContent||'').trim().toLowerCase();const page=Object.keys(navMap).find(k=>label===k||label.startsWith(k+' '));if(page){e.preventDefault();e.stopImmediatePropagation();navigate(navMap[page]);}},true);
  document.addEventListener('DOMContentLoaded',make);new MutationObserver(()=>{if(document.body&&!document.getElementById('betsquad-final-quick-launcher'))make()}).observe(document.documentElement,{childList:true,subtree:true});setTimeout(make,500);setTimeout(make,1500);setTimeout(make,3000);
})();
