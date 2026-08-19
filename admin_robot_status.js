/* Admin-only live status panel for Pablo@OpenAI Developers. */
(function(){'use strict';
const STATUS_URL='https://raw.githubusercontent.com/emekapaulofficial-crypto/betsquad/main/robot_status.json';
let timer=null,tries=0,observer=null;
function esc(v){return String(v??'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));}
function fmt(v){if(!v)return '—';try{return new Date(v).toLocaleString();}catch{return v;}}
function nextExpected(){
  const now=new Date();
  const next=new Date(now);
  next.setMinutes(17,0,0);
  let h=next.getHours();
  let slot=Math.ceil((h+0.0001)/6)*6;
  if(h<6 && now.getHours()===h) slot=6;
  if(slot>=24){next.setDate(next.getDate()+1);slot=0;}
  next.setHours(slot);
  if(next<=now)next.setHours(next.getHours()+6);
  return next.toISOString();
}
function isAdminPage(){
  return !!window.state && state.page==='admin';
}
function ensurePanel(){
  if(!isAdminPage())return null;
  let panel=document.getElementById('fp-robot-status');
  if(!panel){
    panel=document.createElement('section');
    panel.id='fp-robot-status';
    panel.className='panel';
    panel.style.cssText='margin:16px 0 20px;border:1px solid #2f9e6f;border-radius:14px;padding:18px;background:#0b1b2d;position:relative;z-index:20;';
    const app=document.getElementById('app');
    if(!app)return null;
    app.insertBefore(panel,app.firstChild);
  }
  return panel;
}
async function refresh(){
  const panel=ensurePanel();
  if(!panel)return;
  try{
    const r=await fetch(STATUS_URL+'?t='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw new Error('Status file unavailable');
    const s=await r.json();
    const last=s.last_run_at?new Date(s.last_run_at):null;
    const hasRun=!!last;
    const stale=hasRun && ((Date.now()-last.getTime())>12*60*60*1000);
    const failed=hasRun && (s.status==='FAILED'||stale);
    const waiting=!hasRun || s.status==='UNKNOWN';
    const label=waiting?'WAITING':(failed?'FAILED':'ONLINE');
    const icon=waiting?'🟡':(failed?'🔴':'🟢');
    const expected=s.next_expected_at||nextExpected();
    panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">'+
      '<div><span class="badge">🤖 ROBOT STATUS</span><h2 style="margin:8px 0 4px">Pablo@OpenAI Developers</h2><p class="muted" style="margin:0">Automatic multi-league football research & fixture monitoring</p></div>'+ 
      '<div style="font-size:18px;font-weight:800">'+icon+' '+label+'</div></div>'+ 
      '<div class="grid" style="margin-top:14px">'+
      '<div class="card"><b>Last successful run</b><p class="muted">'+fmt(s.last_success_at)+'</p></div>'+ 
      '<div class="card"><b>Next expected run</b><p class="muted">'+fmt(expected)+'</p></div>'+ 
      '<div class="card"><b>Last run</b><p class="muted">'+fmt(s.last_run_at)+'</p></div>'+ 
      '<div class="card"><b>Current activity</b><p class="muted">'+esc(s.current_activity||'Waiting for robot activity.')+'</p></div></div>'+ 
      (s.last_error?'<div style="margin-top:12px;padding:10px 12px;border:1px solid #c0392b;border-radius:8px;color:#c0392b"><b>Last error:</b> '+esc(s.last_error)+'</div>':'')+
      '<p class="small muted" style="margin-top:12px">Read-only health monitor. Pablo runs independently while you are offline.</p>';
  }catch(e){
    panel.innerHTML='<span class="badge">🤖 ROBOT STATUS</span><h2 style="margin:8px 0 4px">Pablo@OpenAI Developers</h2><p class="muted">🟡 WAITING — the robot status record cannot be read yet. The monitor will retry automatically.</p>';
  }
}
function install(){
  if(!window.state||typeof window.render!=='function'){if(tries++<200)setTimeout(install,100);return;}
  if(window.__fpRobotStatusInstalled)return;
  window.__fpRobotStatusInstalled=true;
  const originalRender=window.render;
  window.render=function(){const r=originalRender.apply(this,arguments);setTimeout(refresh,20);return r;};
  observer=new MutationObserver(()=>{if(isAdminPage()&&!document.getElementById('fp-robot-status'))setTimeout(refresh,0);});
  const app=document.getElementById('app');if(app)observer.observe(app,{childList:true});
  timer=setInterval(refresh,60000);
  refresh();
}
install();
})();
