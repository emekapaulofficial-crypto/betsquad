/* FootballPoints launch rules + fast room matches */
(function(){
  const TZ='Africa/Lagos';
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function dayKey(d){return new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d));}
  function todayKey(){return dayKey(new Date());}
  function tomorrowKey(){const d=new Date();d.setDate(d.getDate()+1);return dayKey(d);}
  function time(d){return new Intl.DateTimeFormat('en-NG',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:true}).format(new Date(d));}
  function dateLabel(d){return new Intl.DateTimeFormat('en-NG',{timeZone:TZ,weekday:'short',day:'numeric',month:'short'}).format(new Date(d));}

  // Friendly is retired: rooms are now the only group competition entry point.
  const oldGo=window.go;
  window.go=function(page){ if(page==='friendly') page='rooms'; return oldGo ? oldGo(page) : undefined; };
  const hideFriendly=()=>document.querySelectorAll('.nav button').forEach(b=>{if((b.textContent||'').trim().toLowerCase()==='friendly'){b.remove();}});
  setInterval(hideFriendly,1000); hideFriendly();

  async function getFixtures(){
    const q=await supabase.from('upcoming_fixtures').select('id,home_team,away_team,kickoff_at,status').eq('status','scheduled').order('kickoff_at').limit(100);
    if(q.error) throw q.error;
    const t=todayKey(),tm=tomorrowKey();
    return (q.data||[]).filter(f=>{const k=dayKey(f.kickoff_at);return k===t||k===tm;});
  }

  window.showFastRoomMatches=async function(){
    if(!window.roomFlow?.room) return;
    const R=window.roomFlow;
    state.page='room_match'; render();
    const holder=()=>document.querySelector('.fp-fast-matches');
    try{
      let fs=await getFixtures();
      R.fixtures=fs;
      draw(fs);
      // Refresh in background. Existing stored fixtures remain visible while sync runs.
      if(typeof window.syncFixtures==='function'){
        Promise.resolve().then(()=>window.syncFixtures()).then(async()=>{
          try{ const latest=await getFixtures(); R.fixtures=latest; draw(latest); }catch(e){console.warn('Background fixture refresh failed',e);}
        }).catch(e=>console.warn('Background fixture sync failed',e));
      }
    }catch(e){console.error('Fast fixture load failed',e);draw([]);}
    function draw(fs){
      const h=holder(); if(!h)return;
      const t=todayKey(),tm=tomorrowKey();
      const group=(k,title)=>{
        const rows=fs.filter(f=>dayKey(f.kickoff_at)===k);
        return `<section class="fp-match-day"><h3>${title}</h3>${rows.length?rows.map(f=>`<div class="fp-match-row"><div><b>${esc(f.home_team)} vs ${esc(f.away_team)}</b><div class="small">${dateLabel(f.kickoff_at)} • ${time(f.kickoff_at)} (Nigeria)</div></div><button class="primary" onclick="selectRoomFixture('${esc(f.id)}')">SELECT MATCH</button></div>`).join(''):'<div class="notice">No scheduled matches currently available for this day.</div>'}</section>`;
      };
      h.innerHTML=`${group(t,"TODAY'S MATCHES")}${group(tm,"TOMORROW'S MATCHES")}<button class="secondary" onclick="showFastRoomMatches()">↻ Refresh matches</button>`;
    }
  };

  // Replace the slow room match action with the fast cached-first screen.
  window.startRoomMatch=window.showFastRoomMatches;

  // Add the launch rules/prize explanation to the room screen after each render.
  function roomNotice(){
    if(!window.roomFlow?.room || state.page!=='room')return;
    const panels=document.querySelectorAll('.panel');
    const target=panels[panels.length-1]; if(!target || target.querySelector('.fp-launch-rules'))return;
    const box=document.createElement('div'); box.className='notice fp-launch-rules'; box.innerHTML=`<b>🏆 Room competition rules</b><br>Entry: <b>₦1,000</b> per staker. Only <b>1st and 2nd</b> receive the cash prize. FootballPoints keeps <b>16%</b>; the remaining 84% is split <b>60% to 1st / 40% to 2nd</b>.<br><br><b>💎 Diamond:</b> only <b>3rd place</b> earns 1 Diamond. Each Diamond has <b>₦300 promotional entry value</b>. Three Diamonds = ₦900 value, so an eligible ₦1,000 entry can be completed with ₦900 Diamond value + ₦100 cash. Diamond value is not withdrawable cash.`; target.appendChild(box);
  }
  setInterval(()=>{hideFriendly();roomNotice();},700);

  // Expose the requested starting lineup rule for any compatible picker/UI.
  window.FOOTBALLPOINTS_SQUAD_RULES={GK:1,DEF:4,MID:3,ST:2,SUB:1,totalStarters:11,totalWithSub:12,diamondAwardPosition:3,diamondValue:300,entryFee:1000,platformFeePercent:16,firstPrizePercent:60,secondPrizePercent:40};
})();