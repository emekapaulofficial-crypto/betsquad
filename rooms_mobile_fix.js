/* FootballPoints Rooms mobile repair.
   Additive safety layer: keeps existing room creation/join/open-room logic,
   removes the broken Rooms error screen, and never invents fixtures. */
(function(){
  'use strict';
  let installed=false;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

  function css(){
    if(document.getElementById('fpRoomsMobileFixCss'))return;
    const s=document.createElement('style');s.id='fpRoomsMobileFixCss';
    s.textContent=`
      .fp-rooms-status{margin:0 0 14px}
      .fp-rooms-fixtures{display:grid;gap:8px;max-height:430px;overflow:auto;margin-top:12px}
      .fp-rooms-fixture{display:flex;gap:10px;align-items:flex-start;padding:11px;border:1px solid #203751;border-radius:10px;background:#091626}
      .fp-rooms-fixture input{width:20px;height:20px;flex:0 0 auto;margin-top:2px}
      .fp-rooms-fixture span{min-width:0;line-height:1.35}
      .fp-rooms-fixture small{display:block;color:#8197b1;margin-top:3px}
      @media(max-width:520px){.fp-rooms-fixtures{max-height:none}.fp-rooms-fixture{padding:13px}.fp-rooms-fixture input{width:22px;height:22px}}
    `;document.head.appendChild(s);
  }

  async function loadRoomsSafely(){
    if(!window.prepareRoomsPage||!window.roomsPage)return false;
    try{
      await window.prepareRoomsPage();
      return true;
    }catch(e){
      console.error('Rooms fixture load failed:',e);
      return false;
    }
  }

  function renderRoomsMarkup(){
    const main=document.querySelector('main.wrap');
    if(!main)return;
    const html=window.roomsPage();
    main.innerHTML=html;
    const fixtures=roomState?.availableFixtures||[];
    const holder=main.querySelector('.panel-inner');
    if(holder){
      const title=holder.querySelector('b');
      if(title)title.textContent='Choose real matches';
      if(!fixtures.length){
        const old=holder.querySelector('.muted');
        if(old)old.textContent='No confirmed scheduled fixtures are available right now. The robot will add real fixtures when the verified feed syncs. No fake matches are created.';
      }
    }
  }

  async function showRooms(){
    if(!window.state||!window.render)return;
    state.page='rooms';state.menuOpen=false;
    const originalRender=window.render;
    try{await originalRender()}catch(e){console.warn('Legacy Rooms renderer failed; using safe Rooms renderer:',e)}
    const ok=await loadRoomsSafely();
    const main=document.querySelector('main.wrap');
    if(!main)return;
    if(!ok){
      main.innerHTML=`<div class="panel"><span class="badge">MATCH LOBBY</span><h2>Rooms</h2><p class="muted fp-rooms-status">The Rooms fixture service could not be reached. No match has been invented.</p><button class="primary" onclick="window.showFootballPointsRooms()">Retry Rooms</button></div>`;
      return;
    }
    renderRoomsMarkup();
    if(window.FootballPointsLogo?.loading)window.FootballPointsLogo.loading('LOADING ROOMS…');
  }

  function install(){
    if(installed)return;
    if(!window.state||!window.go||!window.render||!window.roomsPage){setTimeout(install,100);return}
    installed=true;css();
    const oldGo=window.go;
    window.showFootballPointsRooms=showRooms;
    window.go=function(page){
      if(page==='rooms'){showRooms();return;}
      return oldGo(page);
    };
    const oldRender=window.render;
    window.render=async function(){
      const r=await oldRender();
      if(state.page==='rooms'){
        // The Rooms page is fetched again only when navigation enters Rooms;
        // this keeps other pages untouched.
        if(!document.querySelector('.fp-rooms-status') && !document.querySelector('#roomName')){
          // leave an already rendered room lobby alone
        }
      }
      return r;
    };
  }
  install();
})();
