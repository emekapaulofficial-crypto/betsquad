/* Final user-flow stability layer. Keeps the existing matchmaking engine and fixes auth-page persistence. */
(function(){
'use strict';
let installed=false,signupBusy=false;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function normalize1v1Nav(){const state=window.state;if(!state)return;['.nav','.mobile-menu'].forEach(sel=>{const root=document.querySelector(sel);if(!root)return;[...root.querySelectorAll('button')].filter(b=>/^1v1$/i.test((b.textContent||'').trim())).forEach(b=>b.remove());const b=document.createElement('button');b.type='button';b.textContent='1v1';b.dataset.fpFinal1v1='1';b.className=state.page==='friendly'?'active':'';b.onclick=()=>{state.page='friendly';state.menuOpen=false;if(typeof window.render==='function')window.render()};const rooms=[...root.querySelectorAll('button')].find(x=>/^Rooms$/i.test((x.textContent||'').trim()));if(rooms)rooms.insertAdjacentElement('afterend',b);else root.appendChild(b)})}
async function forceHomeIfAuthenticated(){if(!window.state||!window.supabase||typeof window.render!=='function')return;try{const{data}=await window.supabase.auth.getSession();if(data?.session?.user&&window.state.page==='auth'){window.state.user=data.session.user;window.state.page='home';window.state.menuOpen=false;await window.render()}}catch(e){console.warn('auth session check:',e?.message||e)}}
/* NOTE: signUp is now owned exclusively by auth_fix.js (stableSignUp's retry logic
   was merged in there) to avoid a multi-file wrapping race. This file's own
   onAuthStateChange listener was removed for the same reason — auth_fix.js has the
   single authoritative listener now. normalize1v1Nav/forceHomeIfAuthenticated below
   are unrelated UI features and still run as before. */
function install(){if(installed)return;if(!window.state||!window.supabase||typeof window.render!=='function')return setTimeout(install,100);installed=true;setInterval(()=>{normalize1v1Nav();forceHomeIfAuthenticated()},600);setTimeout(()=>{normalize1v1Nav();forceHomeIfAuthenticated()},300)}
install();
})();
