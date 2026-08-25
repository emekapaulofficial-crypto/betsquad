/* BetSquad: one Quick Menu, closed by default, opens/closes with one button. */
(function(){
  'use strict';
  const ID='betsquad-quick-final';
  const PANEL=ID+'-panel';
  const BTN=ID+'-button';
  const labels=[['Home','home'],['Games','games'],['Football','matches'],['Rooms','rooms'],['Wallet','wallet'],['Leaderboard','leaderboard']];
  function nav(page){
    try{
      if(typeof window.go==='function'){window.go(page);return;}
      if(window.state&&typeof window.render==='function'){window.state.page=page;window.state.menuOpen=false;window.render();}
    }catch(e){console.error('Quick Menu navigation failed',e);}
  }
  function hideOld(){
    document.querySelectorAll('#quickMenu,.quick-menu,[data-quick-menu]').forEach(el=>{
      if(el.id===PANEL||el.id===BTN||el.closest('#'+ID))return;
      el.style.setProperty('display','none','important');
      el.setAttribute('aria-hidden','true');
    });
  }
  function mount(){
    if(!document.body)return;
    hideOld();
    let b=document.getElementById(BTN),p=document.getElementById(PANEL);
    if(!b){
      b=document.createElement('button');b.id=BTN;b.type='button';b.textContent='☰ Quick Menu';
      b.setAttribute('aria-expanded','false');
      b.style.cssText='position:fixed;right:16px;bottom:16px;z-index:2147483000;padding:11px 16px;border:1px solid rgba(255,255,255,.22);border-radius:12px;background:#102238;color:#fff;font-weight:800;cursor:pointer;touch-action:manipulation;box-shadow:0 8px 25px rgba(0,0,0,.35);';
      document.body.appendChild(b);
    }
    if(!p){
      p=document.createElement('div');p.id=PANEL;p.setAttribute('aria-hidden','true');
      p.style.cssText='display:none;position:fixed;right:16px;bottom:68px;z-index:2147482999;width:220px;padding:10px;background:#0b1728;border:1px solid rgba(255,255,255,.2);border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.5);';
      const title=document.createElement('div');title.textContent='Quick Menu';title.style.cssText='color:#fff;font-weight:800;padding:6px 8px 10px;';p.appendChild(title);
      labels.forEach(([text,page])=>{
        const x=document.createElement('button');x.type='button';x.textContent=text;x.style.cssText='display:block;width:100%;margin:5px 0;padding:11px;border:0;border-radius:9px;background:#f4f4f4;color:#111;font-weight:700;cursor:pointer;touch-action:manipulation;';
        x.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();close();nav(page);});p.appendChild(x);
      });
      document.body.appendChild(p);
    }
    if(!b.dataset.bound){
      b.dataset.bound='1';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();p.style.display=p.style.display==='none'?'block':'none';const open=p.style.display!=='none';b.textContent=open?'✕ Close Menu':'☰ Quick Menu';b.setAttribute('aria-expanded',String(open));p.setAttribute('aria-hidden',String(!open));});
    }
  }
  function close(){const p=document.getElementById(PANEL),b=document.getElementById(BTN);if(p)p.style.display='none';if(b){b.textContent='☰ Quick Menu';b.setAttribute('aria-expanded','false');}if(p)p.setAttribute('aria-hidden','true');}
  document.addEventListener('DOMContentLoaded',mount);
  new MutationObserver(()=>{if(!document.getElementById(BTN)||!document.getElementById(PANEL))mount();hideOld();}).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(mount,300);setTimeout(mount,1200);setTimeout(mount,3000);
})();
