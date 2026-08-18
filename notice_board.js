/* FootballPoints Notice Board: simple user guide for every main section. */
(function(){
  'use strict';
  const sections=[
    ['🏠 Home','Your starting point. See announcements, the WhatsApp community, and important FootballPoints updates.'],
    ['🚪 Rooms','Create or join a private room with other stakers. Use the room chat to meet and plan together. The room leader chooses the match when the room is ready.'],
    ['⚔️ 1v1','Challenge another player. Both players make their selections and follow the stake/payment instructions. After the result is settled, check the Leaderboard for the result and payout.'],
    ['🏆 Rounds','Take part in scheduled FootballPoints rounds. Pick your players, submit your team before the deadline, and return to see your results after matches are settled.'],
    ['🤝 Friendly','Use Friendly for player-versus-player challenges. Follow the challenge instructions and check the Leaderboard after settlement.'],
    ['📊 Leaderboard','See staking/results information made available for the relevant competition, including participants, total stake/prize pool and winner positions when a stake has been settled.'],
    ['💳 Wallet','Deposit funds, view your own payment activity and manage your FootballPoints balance. Bank-transfer details are shown here. Never share your password, card PIN or security codes.'],
    ['🛠️ Admin','For authorized administrators only. Admin tools are used to manage fixtures, results, support and platform operations.'],
    ['💬 Customer Care','Use Customer Care when you need help with an account, payment, room or other FootballPoints issue.'],
    ['📢 WhatsApp Community','Join the FootballPoints WhatsApp group to chat with other stakers, meet people and discuss the platform.']
  ];
  function add(){
    const app=document.querySelector('#app'); if(!app||document.querySelector('#noticeBoard'))return;
    const nav=document.querySelector('nav')||app.querySelector('header');
    const board=document.createElement('section'); board.id='noticeBoard'; board.className='panel';
    board.style.cssText='margin:16px auto;max-width:1180px;border:1px solid rgba(82,224,145,.35);background:linear-gradient(135deg,rgba(8,28,45,.98),rgba(10,22,38,.98));box-shadow:0 10px 35px rgba(0,0,0,.22);';
    board.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><span class="badge">NOTICE BOARD</span><h2 style="margin:8px 0 4px">How FootballPoints works</h2><p class="muted" style="margin:0">New here? Read this quick guide before you stake.</p></div><button id="noticeToggle" class="primary">OPEN GUIDE</button></div><div id="noticeContent" style="display:none;margin-top:16px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px">'+sections.map(([title,text])=>'<article style="padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.025)"><h3 style="margin:0 0 6px">'+title+'</h3><p class="muted" style="margin:0;line-height:1.5">'+text+'</p></article>').join('')+'</div><div class="notice" style="margin-top:14px"><b>Responsible staking reminder:</b> Staking involves risk. Only stake money you can afford to lose. Never chase losses. A 15% maintenance fee is deducted from a settled winning pool before eligible winners are paid.</div></div>';
    if(nav&&nav.parentNode)nav.parentNode.insertBefore(board,nav.nextSibling); else app.insertBefore(board,app.firstChild);
    board.querySelector('#noticeToggle').addEventListener('click',()=>{const c=board.querySelector('#noticeContent');const open=c.style.display!=='none';c.style.display=open?'none':'block';board.querySelector('#noticeToggle').textContent=open?'OPEN GUIDE':'CLOSE GUIDE';});
  }
  function start(){add();new MutationObserver(()=>setTimeout(add,50)).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
