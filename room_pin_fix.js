/* 4-digit room PIN compatibility + duplicate membership protection. */
(function(){
  const originalRoomsPage = window.roomsPage;

  async function ensureRoomMember(roomId, userId){
    const existing = await supabase.from('room_members').select('user_id').eq('room_id', roomId).eq('user_id', userId).maybeSingle();
    if (existing.error) return existing;
    if (existing.data) return { data: existing.data, error: null, alreadyMember: true };

    const inserted = await supabase.from('room_members').insert({ room_id: roomId, user_id: userId }).select('user_id').maybeSingle();
    if (inserted.error) {
      const msg = String(inserted.error.message || '').toLowerCase();
      if (inserted.error.code === '23505' || msg.includes('duplicate') || msg.includes('conflict')) {
        const retry = await supabase.from('room_members').select('user_id').eq('room_id', roomId).eq('user_id', userId).maybeSingle();
        if (retry.data) return { data: retry.data, error: null, alreadyMember: true };
      }
    }
    return inserted;
  }

  window.makeRoomCode = function(){
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  window.createRoom = async function(){
    if (!state.user) return go('auth');
    let code = makeRoomCode();
    for(let i=0;i<10;i++){
      const check = await supabase.from('match_rooms').select('id').eq('code', code).maybeSingle();
      if(!check.data) break;
      code = makeRoomCode();
    }
    const q = await supabase.from('match_rooms').insert({
      code,
      name: document.querySelector('#roomName')?.value.trim() || 'Stakers Room',
      visibility: document.querySelector('#roomVisibility')?.value || 'private',
      game_mode: document.querySelector('#roomMode')?.value || 'quick6',
      max_players: Math.max(2, Math.min(1000, +(document.querySelector('#roomMax')?.value || 10))),
      entry_fee: Math.max(0, Number(document.querySelector('#roomEntryFee')?.value || 0)),
      creator_id: state.user.id,
      status: 'lobby'
    }).select().single();
    if(q.error) return alert(q.error.message);
    const member = await ensureRoomMember(q.data.id, state.user.id);
    if(member.error) return alert(member.error.message);
    await openRoom(q.data.id);
  };

  window.joinRoomByCode = async function(){
    if (!state.user) return go('auth');
    const input = document.querySelector('#joinCode');
    const code = (input?.value || '').trim();
    if(!/^\d{4}$/.test(code)) return alert('Enter the 4-digit room PIN.');

    const room = await supabase.from('match_rooms').select('*').eq('code', code).eq('status','lobby').maybeSingle();
    if(room.error || !room.data) return alert('Room not found or closed. Check the 4-digit PIN.');

    const existing = await supabase.from('room_members').select('user_id').eq('room_id', room.data.id).eq('user_id', state.user.id).maybeSingle();
    if(existing.error) return alert(existing.error.message);

    if(!existing.data){
      const count = await supabase.from('room_members').select('user_id',{count:'exact',head:true}).eq('room_id',room.data.id);
      if(count.error) return alert(count.error.message);
      if((count.count || 0) >= room.data.max_players) return alert('This room is full.');
    }

    const member = await ensureRoomMember(room.data.id, state.user.id);
    if(member.error) return alert(member.error.message);
    await openRoom(room.data.id);
  };

  window.joinRoomByCodePrefill = async function(code){
    const input = document.querySelector('#joinCode');
    if(input) input.value = String(code).replace(/\D/g,'').slice(0,4);
    await joinRoomByCode();
  };

  window.prepareRoomsPage = window.prepareRoomsPage || (async function(){
    const q = await supabase.from('match_rooms').select('*').eq('status','lobby').order('created_at',{ascending:false});
    if(window.roomFlow) window.roomFlow.rooms = q.data || [];
  });

  /* Patch the existing Rooms page labels/input without replacing its room UI. */
  window.addEventListener('load', function(){
    const input = document.querySelector('#joinCode');
    if(input){
      input.setAttribute('inputmode','numeric');
      input.setAttribute('maxlength','4');
      input.setAttribute('placeholder','4827');
    }
  });
})();