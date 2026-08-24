(() => {
  'use strict';
  const KEY='betsquad.quickMenu.position.v1';
  function findMenu(){return document.querySelector('#quickMenu,.quick-menu,[data-quick-menu]')}
  function enable(menu){if(!menu||menu.dataset.dragReady==='1')return;menu.dataset.dragReady='1';menu.style.touchAction='none';menu.style.cursor='grab';menu.style.position='fixed';menu.style.zIndex='99998';const saved=localStorage.getItem(KEY);if(saved){try{const p=JSON.parse(saved);if(Number.isFinite(p.x)&&Number.isFinite(p.y)){menu.style.left=Math.max(0,Math.min(innerWidth-menu.offsetWidth,p.x))+'px';menu.style.top=Math.max(0,Math.min(innerHeight-menu.offsetHeight,p.y))+'px';menu.style.right='auto';menu.style.bottom='auto'}}catch(_){}}
    let dragging=false,startX=0,startY=0,origX=0,origY=0;
    const point=e=>e.touches?.[0]||e;
    const down=e=>{const p=point(e);if(e.target.closest('button,a,input,select,textarea'))return;const r=menu.getBoundingClientRect();dragging=true;startX=p.clientX;startY=p.clientY;origX=r.left;origY=r.top;menu.style.cursor='grabbing';menu.setPointerCapture?.(e.pointerId);e.preventDefault()};
    const move=e=>{if(!dragging)return;const p=point(e);const x=Math.max(0,Math.min(innerWidth-menu.offsetWidth,origX+p.clientX-startX));const y=Math.max(0,Math.min(innerHeight-menu.offsetHeight,origY+p.clientY-startY));menu.style.left=x+'px';menu.style.top=y+'px';menu.style.right='auto';menu.style.bottom='auto';e.preventDefault()};
    const up=e=>{if(!dragging)return;dragging=false;menu.style.cursor='grab';const r=menu.getBoundingClientRect();localStorage.setItem(KEY,JSON.stringify({x:r.left,y:r.top}));try{menu.releasePointerCapture?.(e.pointerId)}catch(_) {}};
    menu.addEventListener('pointerdown',down,{passive:false});window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up,{passive:false});window.addEventListener('pointercancel',up,{passive:false});
    window.addEventListener('resize',()=>{const r=menu.getBoundingClientRect();const x=Math.max(0,Math.min(innerWidth-menu.offsetWidth,r.left));const y=Math.max(0,Math.min(innerHeight-menu.offsetHeight,r.top));menu.style.left=x+'px';menu.style.top=y+'px';menu.style.right='auto';menu.style.bottom='auto';localStorage.setItem(KEY,JSON.stringify({x,y}))});
  }
  const scan=()=>enable(findMenu());
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
  window.resetQuickMenuPosition=()=>{localStorage.removeItem(KEY);const m=findMenu();if(m){m.style.left='16px';m.style.top='80px';m.style.right='auto';m.style.bottom='auto'}};
})();