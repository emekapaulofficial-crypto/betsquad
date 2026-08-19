/* Admin-only automation and AI cost/status panel. */
(function(){'use strict';
const STATUS_URL='https://raw.githubusercontent.com/emekapaulofficial-crypto/betsquad/main/robot_status.json';
let timer=null,tries=0,observer=null;
const robots=[
 ['🤖 Pablo@OpenAI Developers','Multi-league fixture research, lineups, player points and leaderboard preparation','GitHub Actions / public web sources','FREE-TIER TARGET'],
 ['⚽ FootballPoints Robot','Automatic fixture/status monitoring and retries','GitHub Actions + Supabase','FREE-TIER TARGET'],
 ['🧹 Finished Fixtures Robot','Clears completed/finished fixture data according to project rules','GitHub Actions + Supabase','FREE-TIER TARGET'],
 ['🛡️ Football Security Robot','Automated security/health checks','GitHub Actions','FREE-TIER TARGET'],
 ['❤️ Football Health Monitor','Checks football automation health and reports failures','GitHub Actions','FREE-TIER TARGET'],
 ['🏁 Settlement Robot','Settles completed fixtures and updates results','GitHub Actions + Supabase','FREE-TIER TARGET'],
 ['📅 Daily Fixture Sync','Keeps daily fixture data refreshed','GitHub Actions + Supabase','FREE-TIER TARGET']
];
function esc(v){return String(v??'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));}
function fmt(v){if(!v)return '—';try{return new Date(v).toLocaleString();}catch{return v;}}
function nextExpected(){const now=new Date();const n=new Date(now);n.setMinutes(17,0,0);let h=n.getHours();let slot=Math.ceil((h+.0001)/6)*6;if(slot>=24){n.setDate(n.getDate()+1);slot=0;}n.setHours(slot);if(n<=now)n.setHours(n.getHours()+6);return n.toISOString();}
function isAdminPage(){return !!window.state&&state.page==='admin';}
function ensurePanel(){
 if(!isAdminPage())return null;
 let panel=document.getElementById('fp-robot-status');
 if(!panel){panel=document.createElement('section');panel.id='fp-robot-status';panel.className='panel';panel.style.cssText='margin:16px 0 20px;border:1px solid #2f9e6f;border-radius:14px;padding:18px;background:#0b1b2d;position:relative;z-index:20;';const app=document.getElementById('app');if(!app)return null;app.insertBefore(panel,app.firstChild);}
 return panel;
}
function buildRobotList(){return robots.map(r=>'<div class="card" style="padding:12px;margin:6px 0"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>'+r[0]+'</b><span class="badge">'+r[3]+'</span></div><div class="small muted" style="margin-top:4px">'+r[1]+'</div><div class="small muted">Engine: '+r[2]+'</div></div>').join('');}
async function refresh(){
 const panel=ensurePanel();if(!panel)return;
 try{
  const r=await fetch(STATUS_URL+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Status file unavailable');const s=await r.json();
  const last=s.last_run_at?new Date(s.last_run_at):null;const hasRun=!!last;const stale=hasRun&&((Date.now()-last.getTime())>12*60*60*1000);const failed=hasRun&&(s.status==='FAILED'||stale);const waiting=!hasRun||s.status==='UNKNOWN';const label=waiting?'WAITING':(failed?'FAILED':'ONLINE');const icon=waiting?'🟡':(failed?'🔴':'🟢');
  const expected=s.next_expected_at||nextExpected();
  panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><span class="badge">🤖 AUTOMATION & AI CONTROL</span><h2 style="margin:8px 0 4px">All FootballPoints Robots</h2><p class="muted" style="margin:0">Admin-only status and cost policy for every automation/AI component.</p></div><div style="font-size:18px;font-weight:800">'+icon+' Pablo '+label+'</div></div>'+
   '<div class="grid" style="margin-top:14px"><div class="card"><b>Last successful Pablo run</b><p class="muted">'+fmt(s.last_success_at)+'</p></div><div class="card"><b>Next expected Pablo run</b><p class="muted">'+fmt(expected)+'</p></div><div class="card"><b>Last run</b><p class="muted">'+fmt(s.last_run_at)+'</p></div><div class="card"><b>Current activity</b><p class="muted">'+esc(s.current_activity||'Waiting for robot activity.')+'</p></div></div>'+
   '<div style="margin-top:16px"><h3 style="margin-bottom:8px">All automation / AI services</h3>'+buildRobotList()+'</div>'+
   '<div style="margin-top:14px;padding:12px;border:1px solid #2f9e6f;border-radius:10px"><b>💰 Cost policy</b><p class="small muted" style="margin:6px 0 0">No robot or AI service is approved to add a paid subscription or paid API automatically. If a future provider requires payment, it must be approved by the Primary Admin first. Current robot workflows are designed around GitHub Actions, Supabase and public/free web sources.</p></div>'+
   (s.last_error?'<div style="margin-top:12px;padding:10px 12px;border:1px solid #c0392b;border-radius:8px;color:#c0392b"><b>Last error:</b> '+esc(s.last_error)+'</div>':'')+
   '<p class="small muted" style="margin-top:12px">Read-only monitoring. Robots continue running while the Admin is offline.</p>';
 }catch(e){
  panel.innerHTML='<span class="badge">🤖 AUTOMATION & AI CONTROL</span><h2 style="margin:8px 0 4px">All FootballPoints Robots</h2><p class="muted">🟡 WAITING — the robot status record cannot be read yet. The monitor will retry automatically.</p><div style="margin-top:16px"><h3>Configured automation</h3>'+buildRobotList()+'</div><div style="margin-top:14px;padding:12px;border:1px solid #2f9e6f;border-radius:10px"><b>💰 Cost policy</b><p class="small muted">No paid subscription or paid API may be added without Primary Admin approval.</p></div>';
 }
}
function install(){
 if(!window.state||typeof window.render!=='function'){if(tries++<200)setTimeout(install,100);return;}
 if(window.__fpRobotStatusInstalled){refresh();return;}
 window.__fpRobotStatusInstalled=true;const originalRender=window.render;window.render=function(){const r=originalRender.apply(this,arguments);setTimeout(refresh,20);return r;};
 observer=new MutationObserver(()=>{if(isAdminPage()&&!document.getElementById('fp-robot-status'))setTimeout(refresh,0);});const app=document.getElementById('app');if(app)observer.observe(app,{childList:true});timer=setInterval(refresh,60000);refresh();
}
install();
})();
