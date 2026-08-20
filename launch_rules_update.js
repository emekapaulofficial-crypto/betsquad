/* FootballPoints launch rules + reliable fast room matches */
(function(){
  'use strict';
  const TZ = 'Africa/Lagos';

  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>\"']/g, function(ch){
      if(ch === '&') return '&amp;';
      if(ch === '<') return '&lt;';
      if(ch === '>') return '&gt;';
      if(ch === '\"') return '&quot;';
      return '&#39;';
    });
  }

  function dayKey(value){
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(value));
  }

  function todayKey(){ return dayKey(new Date()); }
  function tomorrowKey(){ return dayKey(Date.now() + 86400000); }

  function timeLabel(value){
    return new Intl.DateTimeFormat('en-NG', {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(value));
  }

  function dateLabel(value){
    return new Intl.DateTimeFormat('en-NG', {
      timeZone: TZ,
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    }).format(new Date(value));
  }

  const oldGo = window.go;
  window.go = function(page){
    if(page === 'friendly') page = 'rooms';
    return oldGo ? oldGo(page) : undefined;
  };

  function hideFriendly(){
    document.querySelectorAll('.nav button, .mobile-menu button').forEach(function(button){
      if((button.textContent || '').trim().toLowerCase() === 'friendly') button.remove();
    });
  }

  async function getFixtures(){
    const result = await supabase
      .from('upcoming_fixtures')
      .select('id,home_team,away_team,kickoff_at,status')
      .order('kickoff_at')
      .limit(200);

    if(result.error) throw result.error;

    const today = todayKey();
    const tomorrow = tomorrowKey();

    return (result.data || []).filter(function(fixture){
      const key = dayKey(fixture.kickoff_at);
      return key === today || key === tomorrow;
    });
  }

  function roomObject(){
    return (window.roomFlow && window.roomFlow.room) ||
           (window.roomState && window.roomState.room) || null;
  }

  window.showFastRoomMatches = async function(){
    const room = roomObject();
    if(!room){
      alert('Please open a room first.');
      return;
    }

    const R = window.roomFlow || (window.roomFlow = {room:null, fixtures:[]});
    R.room = room;
    state.page = 'room_match';

    const main = document.querySelector('main.wrap');
    if(!main){
      if(typeof render === 'function') render();
      return;
    }

    main.innerHTML = '<button class="back" onclick="backToRoom()">← Back to room</button>' +
      '<div class="section"><div><span class="badge">MATCH SELECTION</span>' +
      '<h2>Choose today\'s or tomorrow\'s match</h2>' +
      '<p class="muted">Matches load directly from the FootballPoints fixture database. Times are Nigeria time.</p></div></div>' +
      '<div class="fp-fast-matches"><div class="notice">Loading today\'s and tomorrow\'s matches…</div></div>';

    function holder(){ return document.querySelector('.fp-fast-matches'); }

    function draw(fixtures){
      const target = holder();
      if(!target) return;

      const today = todayKey();
      const tomorrow = tomorrowKey();

      function group(key, title){
        const rows = fixtures.filter(function(f){ return dayKey(f.kickoff_at) === key; });
        if(!rows.length){
          return '<section class="fp-match-day"><h3>' + title + '</h3>' +
            '<div class="notice">No match stored for this day yet.</div></section>';
        }

        return '<section class="fp-match-day"><h3>' + title + '</h3>' +
          rows.map(function(f){
            return '<div class="fp-match-row">' +
              '<div><b>' + esc(f.home_team) + ' vs ' + esc(f.away_team) + '</b>' +
              '<div class="small">' + dateLabel(f.kickoff_at) + ' • ' + timeLabel(f.kickoff_at) + ' (Nigeria)</div></div>' +
              '<button class="primary" onclick="selectRoomFixture(\'' + esc(f.id) + '\')">SELECT MATCH</button>' +
              '</div>';
          }).join('') +
          '</section>';
      }

      target.innerHTML = group(today, "TODAY'S MATCHES") +
        group(tomorrow, "TOMORROW'S MATCHES") +
        '<button class="secondary" onclick="showFastRoomMatches()">↻ Refresh matches</button>';
    }

    try{
      const fixtures = await getFixtures();
      R.fixtures = fixtures;
      draw(fixtures);

      if(typeof window.syncFixtures === 'function'){
        Promise.resolve()
          .then(function(){ return window.syncFixtures(); })
          .then(async function(){
            try{
              const latest = await getFixtures();
              if(latest.length){
                R.fixtures = latest;
                draw(latest);
              }
            }catch(error){
              console.warn('Background fixture refresh failed', error);
            }
          })
          .catch(function(error){ console.warn('Background fixture sync failed', error); });
      }
    }catch(error){
      console.error('Fast fixture load failed', error);
      draw([]);
    }
  };

  window.startRoomMatch = window.showFastRoomMatches;

  function roomNotice(){
    if(!roomObject() || !state || state.page !== 'room') return;

    const panels = document.querySelectorAll('.panel');
    const target = panels[panels.length - 1];
    if(!target || target.querySelector('.fp-launch-rules')) return;

    const box = document.createElement('div');
    box.className = 'notice fp-launch-rules';
    box.innerHTML = '<b>🏆 Room competition rules</b><br>' +
      'Entry: <b>₦1,000</b> per staker. Only <b>1st and 2nd</b> receive the cash prize. ' +
      'FootballPoints keeps <b>16%</b>; the remaining 84% is split <b>60% to 1st / 40% to 2nd</b>.' +
      '<br><br><b>💎 Diamond:</b> only <b>3rd place</b> earns 1 Diamond. ' +
      'Each Diamond has <b>₦300 promotional entry value</b>. Three Diamonds = ₦900 value, ' +
      'so an eligible ₦1,000 entry can be completed with ₦900 Diamond value + ₦100 cash. ' +
      'Diamond value is not withdrawable cash.';
    target.appendChild(box);
  }

  setInterval(function(){
    hideFriendly();
    roomNotice();
  }, 700);

  window.FOOTBALLPOINTS_SQUAD_RULES = {
    GK: 1,
    DEF: 2,
    MID: 3,
    ST: 1,
    total: 7,
    diamondAwardPosition: 3,
    diamondValue: 300,
    entryFee: 1000,
    platformFeePercent: 16,
    firstPrizePercent: 60,
    secondPrizePercent: 40
  };
})();
