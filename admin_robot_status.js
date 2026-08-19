/* Admin-only live status panel for Pablo@OpenAI Developers. */
(function(){'use strict';
const STATUS_URL='https://raw.githubusercontent.com/emekapaulofficial-crypto/betsquad/main/robot_status.json';
let timer=null,tries=0;
function esc(v){return String(v??'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));}
function fmt(v){if(!v)return '—';try{return new Date(v).toLocaleString();}catch{return v;}}
function nextExpected(lastRun){
  const now=new Date();
  const next=new Date(now); next.setMinutes(17,0,0);
  const h=next.getHours();
  const slot=Math.ceil(h/6)*6;
  if(slot>=24){next.setDate(next.getDate()+1);next.setHours(0);}else next.setHours(slot);
  if(next<=now)next.setHours(next.getHours()+6);
  return next.toISOString();
}
async function load(){
 if(!window.state||typeof window.render!=='function'){if(tries++<150)setTimeout(load,100);return;}
 if(window.__fpRobotStatusInstalled)return;window.__fpRobotStatusInstalled=true;
 async function refresh(){
   if(state.page!=='admin'||!state.isAdmin){clearInterval(timer);timer=null;return;}
   let panel=document.getElementById('fp-robot-status');
   if(!panel){
     panel=document.createElement('section');panel.id='fp-robot-status';panel.className='panel';panel.style.marginTop='16px';
     const app=document.getElementById('app');if(app)app.appendChild(panel);
   }
   try{
     const r=await fetch(STATUS_URL+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Status file unavailable');
     const s=await r.json();
     const last=s.last_run_at?new Date(s.last_run_at):null;
     const stale=!last||((Date.now()-last.getTime())>12*60*60*1000);
     const failed=s.status==='FAILED'||stale;
     const label=failed?'FAILED':'ONLINE';
     const icon=failed?'🔴':'🟢';
     const expected=s.next_expected_at||nextExpected(s.last_run_at);
     panel.innerHTML=`<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><span class="badge">🤖 ROBOT MONITOR</span><h2 style="margin:8px 0 4px">Pablo@OpenAI Developers</h2><p class="muted" style="margin:0">Automatic football research and fixture monitoring</p></div><div style="font-size:18px;font-weight:800">${icon} ${label}</div></div><div class="grid" style="margin-top:14px"><div class="card"><b>Last successful run</b><p class="muted">${fmt(s.last_success_at)}</p></div><div class="card"><b>Next expected run</b><p class="muted">${fmt(expected)}</p></div><div class="card"><b>Last run</b><p class="muted">${fmt(s.last_run_at)}</p></div><div class="card"><b>Current activity</b><p class="muted">${esc(s.current_activity||'No activity reported.')}</p></div></div>${s.last_error?`<div style="margin-top:12px;padding:10px 12px;border:1px solid #c0392b;border-radius:8px;color:#c0392b"><b>Last error:</b> ${esc(s.last_error)}</div>`:''}<p class="small muted" style="margin-top:12px">The panel is read-only. It reports the robot's latest GitHub Actions health record.</p>`;
   }catch(e){panel.innerHTML='<span class="badge">🤖 ROBOT MONITOR</span><h3>Pablo@OpenAI Developers</h3><p class="muted">Unable to read robot status right now. The status monitor will retry automatically.</p>';}
 }
 const originalRender=window.render;
 window.render=function(){const r=originalRender.apply(this,arguments);setTimeout(refresh,0);return r;};
 timer=setInterval(refresh,60000);refresh();
}
load();
})();
