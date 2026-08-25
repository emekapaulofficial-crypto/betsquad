/* Stable Admin robot monitor. No render wrapper, no mutation-render loop. */
(function(){'use strict';
const robots=[
 ['🤖 Pablo','Football research / fixture preparation','GitHub Actions','ONLINE'],
 ['⚽ FootballPoints Robot','Fixture/status monitoring','GitHub Actions + Supabase','ACTIVE'],
 ['🧹 Finished Fixtures Robot','Finished-fixture cleanup','GitHub Actions + Supabase','ACTIVE'],
 ['🛡️ Football Security Robot','Security/health checks','GitHub Actions','ACTIVE'],
 ['❤️ Football Health Monitor','Automation health monitoring','GitHub Actions','ACTIVE'],
 ['🏁 Settlement Robot','Completed-fixture settlement','GitHub Actions + Supabase','ACTIVE'],
 ['📅 Daily Fixture Sync','Daily fixture refresh','GitHub Actions + Supabase','ACTIVE']
];
let lastPage='';let timer=null;
function admin(){return window.state?.page==='admin'}
function esc(x){return String(x??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function draw(){if(!admin())return;const app=document.getElementById('app');if(!app)return;let p=document.getElementById('stable-robot-panel');if(!p){p=document.createElement('section');p.id='stable-robot-panel';p.className='panel';p.style.cssText='margin:12px 0;padding:16px;border:1px solid #2f9e6f;border-radius:14px;';app.insertBefore(p,app.firstChild)}
fetch('https://raw.githubusercontent.com/emekapaulofficial-crypto/betsquad/main/robot_status.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(s=>{p.innerHTML='<h2>🤖 Active Robots</h2><p class="small muted">Robot monitoring is read-only and does not navigate the Admin panel.</p>'+robots.map((r,i)=>'<div class="card" style="padding:10px;margin:6px 0"><b>'+r[0]+'</b> <span class="badge">'+r[3]+'</span><div class="small muted">'+r[1]+' · '+r[2]+'</div>'+(i===0?'<div class="small">Last run: '+esc(s.last_run_at||'—')+'<br>Activity: '+esc(s.current_activity||'—')+'</div>':'')+'</div>').join('')}).catch(()=>{p.innerHTML='<h2>🤖 Active Robots</h2>'+robots.map(r=>'<div class="card" style="padding:10px;margin:6px 0"><b>'+r[0]+'</b> <span class="badge">'+r[3]+'</span><div class="small muted">'+r[1]+'</div></div>').join('')})}
function tick(){const page=window.state?.page||'';if(page!==lastPage){lastPage=page;if(page==='admin')setTimeout(draw,0);else document.getElementById('stable-robot-panel')?.remove()}}
setInterval(tick,500);timer=setInterval(()=>{if(admin())draw()},60000);tick();
})();
