/* Reliable navigation layer for Admin and quick-menu buttons. */
(function(){
  'use strict';
  let installed=false;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
  function install(){
    if(installed||!window.state||typeof window.render!=='function')return;
    installed=true;

    window.openAdmin=async function(){
      const s=window.state;
      if(!s.user){s.page='auth';s.menuOpen=false;window.render();return false;}
      try{
        if(typeof window.refreshAdminStatus==='function'){
          const ok=await window.refreshAdminStatus();
          if(!ok){alert('Admin access is not enabled for this account.');return false;}
        } else if(window.supabase){
          const {data,error}=await window.supabase.rpc('is_admin');
          if(error||data!==true){alert('Admin access is not enabled for this account.');return false;}
          s.isAdmin=true;
        }
        s.page='admin';s.menuOpen=false;window.render();return true;
      }catch(e){console.error('Admin navigation failed',e);alert('Unable to open Admin: '+(e?.message||e));return false;}
    };

    document.addEventListener('click',async function(e){
      const b=e.target?.closest?.('button,a');
      if(!b)return;
      const label=clean(b.textContent);
      if(label==='admin'){
        e.preventDefault();e.stopImmediatePropagation();
        await window.openAdmin();
        return;
      }
      /* Recover buttons whose inline onclick was rendered but did not fire. */
      const raw=b.getAttribute('onclick')||'';
      const m=raw.match(/^\s*(?:window\.)?go\(['"]([^'"]+)['"]\)\s*;?\s*$/);
      if(m&&typeof window.go==='function'){
        e.preventDefault();e.stopImmediatePropagation();
        window.go(m[1]);
        return;
      }
      const gm=raw.match(/^\s*(?:window\.)?playGame\(['"](whot|dice|snooker)['"]\)\s*;?\s*$/i);
      if(gm&&typeof window.playGame==='function'){
        e.preventDefault();e.stopImmediatePropagation();
        window.playGame(gm[1].toLowerCase());
      }
    },true);

    const normalizeAdminButtons=()=>document.querySelectorAll('nav button,.mobile-menu button').forEach(b=>{
      if(clean(b.textContent)==='admin')b.onclick=null;
    });
    const oldRender=window.render;
    window.render=function(){const r=oldRender.apply(this,arguments);setTimeout(normalizeAdminButtons,0);return r;};
    normalizeAdminButtons();
  }
  const timer=setInterval(()=>{if(window.state&&typeof window.render==='function'){clearInterval(timer);install();}},100);
  setTimeout(()=>clearInterval(timer),30000);
})();
