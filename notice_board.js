/* Small movable FootballPoints quick-navigation notice board. */
(function(){'use strict';
const sections=[
 ['🏠 Home','Home','Updates, community and announcements.'],
 ['🎮 Games','Games','Play Whot, Dice or Snooker against other stakers.'],
 ['🚪 Rooms','rooms','Join/create rooms, chat and prepare a group stake.'],
 ['⚔️ 1v1','1v1','Challenge one player, select players and stake.'],
 ['🏆 Rounds','rounds','Choose players for scheduled rounds and check results.'],
 ['🤝 Friendly','friendly','Play a friendly player challenge.'],
 ['📊 Leaderboard','leaderboard','See settled participants, prize pool and winners.'],
 ['💳 Wallet','wallet','Deposit, view your private balance/payments and request withdrawals.'],
 ['🛠️ Admin','admin','Authorized admin controls only.'],
 ['💬 Customer Care','customer-care','Get help with accounts, payments and games.'],
 ['📢 WhatsApp','whatsapp','Join the community and chat with other stakers.']
];
function go(key){
 const candidates=[...document.querySelectorAll('button,a,[role="button"]')];
 const text=key.toLowerCase();
 let el=candidates.find(x=>x.textContent.trim().toLowerCase()===text)||candidates.find(x=>x.textContent.trim().toLowerCase().includes(text));
 if(el){el.click();return true;}
 if(window.state){window.state.page=key;window.render?.();return true;}
 return false;
}
function add(){
 const app=document.querySelector('#app');if(!app||document.getElementById('noticeBoard'))return;
 const b=document.createElement('aside');b.id='noticeBoard';
 b.style.cssText='position:fixed;right:10px;bottom:12px;width:min(250px,calc(100vw - 20px));max-height:58px;overflow:hidden;z-index:99980;background:rgba(7,24,42,.97);border:1px solid rgba(82,224,145,.45);border-radius:12px;box-shadow:0 10px 28px rgba(0,0,0,.35);padding:8px;cursor:move;touch-action:none;';
 b.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:6px"><b>📌 Quick Menu</b><button id="noticeToggle" class="secondary">OPEN</button></div><div id="noticeContent" style="display:none;margin-top:7px;max-height:52vh;overflow:auto">'+sections.map((x,i)=>'<button class="noticeNav" data-key="'+x[1]+'" style="display:block;width:100%;text-align:left;padding:8px;margin:3px 0;border:0;border-radius:8px;background:rgba(255,255,255,.05);color:inherit;cursor:pointer"><b>'+x[0]+'</b><span class="small muted" style="display:block">'+x[2]+'</span></button>').join('')+'<div class="small" style="margin-top:8px"><b>Responsible staking:</b> Only stake what you can afford to lose. A 15% maintenance fee is deducted from a settled winning pool.</div></div>';
 document.body.appendChild(b);
 b.querySelector('#noticeToggle').onclick=e=>{e.stopPropagation();const c=b.querySelector('#noticeContent');const open=c.style.display!=='none';c.style.display=open?'none':'block';b.style.maxHeight=open?'58px':'62vh';b.querySelector('#noticeToggle').textContent=open?'OPEN':'CLOSE'};
 b.querySelectorAll('.noticeNav').forEach(x=>x.onclick=e=>{e.stopPropagation();go(x.dataset.key)});
 let sx,sy,ox,oy;const down=e=>{if(e.target.closest('button'))return;const p=e.touches?e.touches[0]:e;sx=p.clientX;sy=p.clientY;const r=b.getBoundingClientRect();ox=r.left;oy=r.top;b.style.right='auto';b.style.bottom='auto';b.setPointerCapture?.(e.pointerId)};const move=e=>{if(sx==null)return;const p=e.touches?e.touches[0]:e;b.style.left=Math.max(4,Math.min(innerWidth-b.offsetWidth-4,ox+p.clientX-sx))+'px';b.style.top=Math.max(4,Math.min(innerHeight-b.offsetHeight-4,oy+p.clientY-sy))+'px'};const up=()=>{sx=sy=null};b.addEventListener('pointerdown',down);b.addEventListener('pointermove',move);b.addEventListener('pointerup',up);
}
function start(){add()}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
