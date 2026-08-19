/* FootballPoints launch rules + reliable fast room matches */
(function(){
  const TZ='Africa/Lagos';
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const dayKey=d=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d));
  const todayKey=()=>dayKey(new Date());
  const tomorrowKey=()=>dayKey(new Date(Date.now()+86400000));
  const time=d=>new Intl.DateTimeFormat('en-NG',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:true}).format(new Date(d));
  const dateLabel=d=>new Intl.DateTimeFormat('en-NG',{timeZone:TZ,weekday:'short',day:'numeric',month:'short'}).format(new Date(d));

  const oldGo=window.go;
  window.go=function(page){if(page==='friendly')page='rooms';return oldGo?oldGo(page):undefined;};
  const hideFriendly=()=>document.querySelectorAll('.nav button,.mobile-menu button').forEach(b=>{if((b.textContent||'').trim().toLowerCase()==='friendly')b.remove();});
  hideFriendly();setInterval(hideFriendly,1000);

  async function getFixtures(){
    const q=await supabase.from('upcoming_fixtures').select('id,home_team,away_team,kickoff_at,status').order('kickoff_at').limit(200);
    if(q.error)throw q.error;
    const t=todayKey(),tm=tomorrowKey();
    return (q.data||[]).filter(f=>{const k=dayKey(f.kickoff_at);return k===t||k===tm;});
  }

  function roomObject(){return window.roomFlow?.room||window.roomState?.room||null;}

  window.showFastRoomMatches=async function(){
    const room=roomObject();
    if(!room)return alert('Please open a room first.');
    const R=window.roomFlow||(window.roomFlow={room:null,fixtures:[]});
    R.room=room;
    state.page='room_match';
    const main=document.querySelector('main.wrap');
    if(!main){render();return;}
    main.innerHTML=`<button class="back" onclick="backToRoom()">← Back to room</button><div class="section"><div><span class="badge">MATCH SELECTION</span><h2>Choose today's or tomorrow's match</h2><p class="muted">Matches appear immediately from the FootballPoints fixture database. Times are Nigeria time.</p></div></div><div class="fp-fast-matches"><div class="notice">Loading today's and tomorrow's matches…</div></div>`;
    const holder=()=>document.querySelector('.fp-fast-matches');
    const draw=fs=>{const h=holder();if(!h)return;const t=todayKey(),tm=tomorrowKey();const group=(k,title)=>{const rows=fs.filter(f=>dayKey(f.kickoff_at)===k);return `<section class="fp-match-day"><h3>${title}</h3>${rows.length?rows.map(f=>`<div class="fp-match-row"><div><b>${esc(f.home_team)} vs ${esc(f.away_team)}</b><div class="small">${dateLabel(f.kickoff_at)} • ${time(f.kickoff_at)} (Nigeria)</div></div><button class="primary" onclick="selectRoomFixture('${esc(f.id)}')">SELECT MATCH</button></div>`).join(''):'<div class="notice">No match stored for this day yet.</div>'}</section>`;};h.innerHTML=`${group(t,"TODAY'S MATCHES")}${group(tm,"TOMORROW'S MATCHES")}<button class="secondary" onclick="showFastRoomMatches()">↻ Refresh matches</button>`;};
    try{
      const fs=await getFixtures();
      R.fixtures=fs;draw(fs);
      if(typeof window.syncFixtures==='function'){
        Promise.resolve().then(()=>window.syncFixtures()).then(async()=>{try{const latest=await getFixtures();if(latest.length){R.fixtures=latest;draw(latest);}}catch(e){console.warn('Background fixture refresh failed',e);}}).catch(e=>console.warn('Background fixture sync failed',e));
      }
    }catch(e){console.error('Fast fixture load failed',e);draw([]);}
  };

  window.startRoomMatch=window.showFastRoomMatches;

  function roomNotice(){
    if(!roomObject()||state.page!=='room')return;
    const panels=document.querySelectorAll('.panel');const target=panels[panels.length-1];if(!target||target.querySelector('.fp-launch-rules'))return;
    const box=document.createElement('div');box.className='notice fp-launch-rules';box.innerHTML=`<b>🏆 Room competition rules</b><br>Entry: <b>₦1,000</b> per staker. Only <b>1st and 2nd</b> receive the cash prize. FootballPoints keeps <b>16%</b>; the remaining 84% is split <b>60% to 1st / 40% to 2nd</b>.<br><br><b>💎 Diamond:</b> only <b>3rd place</b> earns 1 Diamond. Each Diamond has <b>₦300 promotional entry value</b>. Three Diamonds = ₦900 value, so an eligible ₦1,000 entry can be completed with ₦900 Diamond value + ₦100 cash. Diamond value is not withdrawable cash.`;target.appendChild(box);
  }
  setInterval(()=>{hideFriendly();roomNotice();},700);

  window.FOOTBALLPOINTS_SQUAD_RULES={GK:1,DEF:2,MID:3,ST:1,total:7,diamondAwardPosition:3,diamondValue:300,entryFee:1000,platformFeePercent:16,firstPrizePercent:60,secondPrizePercent:40};
})();