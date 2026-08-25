/* Stable Admin room/game controls. Server-authoritative through Supabase RPC. */
(function(){'use strict';

let busy=false;

function esc(v){
  return String(v??'').replace(/[<>&"]/g,'');
}

async function loadRooms(){
  const box=document.getElementById('bsRoomsList');
  if(!box || !window.supabase) return;

  box.innerHTML='<p class="muted">Loading rooms...</p>';

  const r=await window.supabase
    .from('game_rooms')
    .select('id,name,status,game_type,created_at')
    .order('created_at',{ascending:false})
    .limit(100);

  if(r.error){
    box.textContent='Unable to load rooms: '+r.error.message;
    return;
  }

  if(!r.data?.length){
    box.innerHTML='<p class="muted">No rooms found.</p>';
    return;
  }

  box.innerHTML=r.data.map(x=>
    '<div class="notice bsRoomRow" data-room="'+esc(x.id)+'">'+
      '<b>'+esc(x.name||x.id)+'</b><br>'+
      esc(x.game_type||'game')+' • '+esc(x.status||'unknown')+
      '<br>'+
      '<button type="button" class="primary bsCloseRoom" data-room="'+esc(x.id)+'">'+
        '🛑 CLOSE GAME / ROOM'+
      '</button> '+
      '<button type="button" class="secondary bsClearRoom" data-room="'+esc(x.id)+'">'+
        '🗑️ CLEAR ROOM'+
      '</button> '+
      '<button type="button" class="secondary bsHistoryRoom" data-room="'+esc(x.id)+'">'+
        '📜 HISTORY'+
      '</button>'+
    '</div>'
  ).join('');

  bind();
}

function bind(){

  document.querySelectorAll(
    '#bsAdminRoomControls .bsCloseRoom'
  ).forEach(btn=>{

    btn.onclick=async()=>{

      if(
        btn.disabled ||
        !confirm('Close this game/room?')
      ) return;

      btn.disabled=true;

      const q=await window.supabase.rpc(
        'admin_close_game_room',
        {
          p_room_id:btn.dataset.room,
          p_reason:'Closed by Admin'
        }
      );

      if(q.error){
        btn.disabled=false;
        alert(q.error.message);
        return;
      }

      await loadRooms();
    };
  });


  document.querySelectorAll(
    '#bsAdminRoomControls .bsClearRoom'
  ).forEach(btn=>{

    btn.onclick=async()=>{

      if(
        btn.disabled ||
        !confirm(
          'Clear this room completely? Use this after closing.'
        )
      ) return;

      btn.disabled=true;

      const q=await window.supabase.rpc(
        'admin_clear_game_room',
        {
          p_room_id:btn.dataset.room
        }
      );

      if(q.error){
        btn.disabled=false;
        alert(q.error.message);
        return;
      }

      await loadRooms();
    };
  });


  document.querySelectorAll(
    '#bsAdminRoomControls .bsHistoryRoom'
  ).forEach(btn=>{

    btn.onclick=async()=>{

      const q=await window.supabase
        .from('game_rooms')
        .select('*')
        .eq('id',btn.dataset.room)
        .maybeSingle();

      if(q.error){
        alert(q.error.message);
        return;
      }

      alert(
        'ROOM HISTORY\n\n'+
        JSON.stringify(q.data||{},null,2)
      );
    };
  });
}


async function mount(){

  if(
    window.state?.page!=='admin' ||
    !window.supabase
  ) return;

  let el=document.getElementById(
    'bsAdminRoomControls'
  );

  if(!el){

    const host=
      document.querySelector('main.wrap') ||
      document.getElementById('app');

    if(!host) return;

    el=document.createElement('section');

    el.id='bsAdminRoomControls';
    el.className='panel';

    el.innerHTML=
      '<span class="badge">'+
        'ADMIN • ROOMS & GAMES'+
      '</span>'+
      '<h2>Room Management</h2>'+
      '<p class="small muted">'+
        'Close, clear and inspect rooms. '+
        'Actions are protected by Supabase authorization.'+
      '</p>'+
      '<div id="bsRoomsList">'+
        'Loading rooms...'+
      '</div>';

    host.appendChild(el);
  }

  if(busy) return;

  busy=true;

  try{
    await loadRooms();
  }finally{
    busy=false;
  }
}


setInterval(()=>{

  if(window.state?.page==='admin'){
    mount();
  }else{
    document
      .getElementById('bsAdminRoomControls')
      ?.remove();
  }

},1000);

})();
