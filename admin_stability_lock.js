/* BetSquad Admin Stability Lock. Loaded last. */
(function(){'use strict';
 const style=document.createElement('style');style.textContent='.admin-stable,.admin-stable *{animation:none!important}.admin-stable .panel,.admin-stable .admin-row{transition:none!important}';document.head.appendChild(style);
 let wrapped=false;
 function stabilize(){const app=document.getElementById('app');if(!app)return;if(window.state?.page==='admin')app.classList.add('admin-stable');else app.classList.remove('admin-stable');}
 const timer=setInterval(()=>{if(!wrapped&&typeof window.go==='function'){const original=window.go;const w=function(page){return original.apply(this,arguments)};w.__adminStableWrapped=true;window.go=w;wrapped=true}stabilize()},250);
 new MutationObserver(stabilize).observe(document.body,{childList:true,subtree:true});
 setTimeout(()=>clearInterval(timer),15000);
})();
