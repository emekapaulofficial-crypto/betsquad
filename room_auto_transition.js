/* When the room leader selects the match, all members currently in the lobby move to team selection. */
(function(){
  function watch(){
    if(!window.state||!window.roomFlow||typeof window.openRoomTeam!=="function")return setTimeout(watch,300);
    if(window.__roomAutoTransition)return;
    window.__roomAutoTransition=true;
    setInterval(async()=>{
      const r=window.roomFlow.room;
      if(!r||window.state.page!=="room"||!r.selected_fixture_id)return;
      window.state.page="room_team";
      try{await window.openRoomTeam();}catch(e){console.warn("room auto transition:",e);}
    },1000);
  }
  watch();
})();
