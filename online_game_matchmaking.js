/* Live game matchmaking: every online player sees open play requests.
   The first player who accepts wins the request; everyone else gets the room result.
   This uses broadcast for instant delivery and the database for durable requests. */
(() => {
  'use strict';
  const LOBBY = 'betsquad-online-games-v2';
  let channel = null;
  let currentRoomId = null;
  let currentChallenge = null;
  const sb = () => window.supabase;
  const me = () => window.state?.user?.id;
  const displayName = () => window.state?.user?.user_metadata?.name || window.state?.user?.email?.split('@')[0] || 'Player';
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

  function ensure() {
    if (!sb() || !me()) return null;
    if (channel && channel.__betsquadLobby) return channel;
    if (channel) sb().removeChannel(channel);
    channel = sb().channel(LOBBY, { config: { presence: { key: me() }, broadcast: { self: false } } });
    channel.__betsquadLobby = true;
    channel.on('presence', { event: 'sync' }, () => renderOnline());
    channel.on('presence', { event: 'join' }, () => renderOnline());
    channel.on('presence', { event: 'leave' }, () => renderOnline());
    channel.on('broadcast', { event: 'game-request' }, async ({ payload }) => {
      if (!payload || payload.from === me()) return;
      await showPublicChallenge(payload);
    });
    channel.on('broadcast', { event: 'challenge-result' }, ({ payload }) => {
      if (!payload) return;
      if (payload.to && payload.to !== me()) return;
      if (payload.status === 'rejected') alert(`${payload.fromName || 'A player'} declined the game request.`);
      if (payload.status === 'accepted' && payload.roomId) {
        if (window.state?.gameRoomId !== payload.roomId) enterRoom(payload.roomId, payload.gameType);
      }
      if (payload.status === 'taken' && payload.challengeId) removeChallengeCard(payload.challengeId);
    });
    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        try { await channel.track({ user_id: me(), display_name: displayName(), online_at: new Date().toISOString() }); } catch (e) { console.warn('Presence track failed', e); }
        renderOnline();
      }
    });
    return channel;
  }

  function peers() {
    const c = ensure();
    if (!c) return [];
    const all = c.presenceState(), out = [];
    Object.keys(all).forEach(k => {
      if (k === me()) return;
      const p = all[k]?.[0];
      if (p?.user_id) out.push(p);
    });
    return out;
  }

  function renderOnline() {
    const box = document.querySelector('#onlineGamePlayers');
    if (!box) return;
    const ps = peers();
    box.innerHTML = ps.length
      ? ps.map(p => `<div class="online-player"><span><i></i>${esc(p.display_name || 'Player')}</span><button data-user="${esc(p.user_id)}" data-name="${esc(p.display_name || 'Player')}" class="request-player">Request to play</button></div>`).join('')
      : '<p class="muted">No other players are online right now.</p>';
    box.querySelectorAll('.request-player').forEach(b => b.onclick = () => sendPublicRequest(b.dataset.user, b.dataset.name));
  }

  async function sendPublicRequest(to, toName) {
    const s = window.state;
    if (!s.gameRoomId) return alert('Find a room first.');
    const { data: room, error } = await sb().from('game_rooms').select('id,game_type,stake,status,capacity').eq('id', s.gameRoomId).single();
    if (error || !room || room.status !== 'waiting') return alert('Your game room is no longer waiting.');
    const stake = Number(room.stake || 500);
    const { data, error: ce } = await sb().from('game_challenges').insert({
      game_type: room.game_type, stake, challenger_id: me(), challenged_id: to,
      status: 'pending', room_id: room.id
    }).select().single();
    if (ce) return alert('Request failed: ' + ce.message);
    ensure()?.send({ type: 'broadcast', event: 'game-request', payload: {
      challengeId: data.id, from: me(), fromName: displayName(), to, toName,
      gameType: room.game_type, stake, roomId: room.id
    }});
    alert(`Game request sent for ₦${stake}. Everyone online can now see the request.`);
  }

  async function showPublicChallenge(p) {
    if (!p.challengeId || p.from === me()) return;
    if (document.querySelector(`[data-challenge-card="${p.challengeId}"]`)) return;
    const host = document.querySelector('#onlineGameRequests');
    if (!host) return;
    const card = document.createElement('div');
    card.className = 'game-request-card';
    card.dataset.challengeCard = p.challengeId;
    card.innerHTML = `<div><b>🎮 ${esc(p.fromName || 'Player')} wants to play ${esc(p.gameType)}</b><div class="small">Stake: ₦${Number(p.stake || 500)}</div></div><button class="primary join-request">Join game</button>`;
    host.prepend(card);
    card.querySelector('.join-request').onclick = () => acceptPublicChallenge(p, card);
  }

  async function acceptPublicChallenge(p, card) {
    if (currentChallenge) return;
    currentChallenge = p.challengeId;
    const button = card?.querySelector('button');
    if (button) button.disabled = true;
    try {
      const { data: challenge, error } = await sb().from('game_challenges').update({
        status: 'accepted', responded_at: new Date().toISOString()
      }).eq('id', p.challengeId).eq('status', 'pending').select().single();
      if (error || !challenge) {
        if (button) button.disabled = false;
        return alert('Another player has already joined this request.');
      }
      const { data: room, error: re } = await sb().from('game_rooms').select('id,game_type,stake,status,capacity').eq('id', p.roomId).single();
      if (re || !room || room.status !== 'waiting') {
        await sb().from('game_challenges').update({ status: 'cancelled' }).eq('id', p.challengeId);
        return alert('The game room is no longer available.');
      }
      const debit = await sb().rpc('game_debit_stake', { p_amount: Number(room.stake || 500) });
      if (debit.error || !debit.data) {
        await sb().from('game_challenges').update({ status: 'pending' }).eq('id', p.challengeId).eq('status', 'accepted');
        return alert(`You need ₦${Number(room.stake || 500)} available in your wallet to join.`);
      }
      const displayNameValue = displayName();
      const { error: je } = await sb().from('game_room_players').insert({
        room_id: room.id, user_id: me(), display_name: displayNameValue,
        stake_amount: Number(room.stake || 500), is_bot: false
      });
      if (je) {
        await sb().rpc('game_refund_stake', { p_room_id: room.id });
        await sb().from('game_challenges').update({ status: 'pending' }).eq('id', p.challengeId).eq('status', 'accepted');
        return alert('Could not join the game: ' + je.message);
      }
      ensure()?.send({ type: 'broadcast', event: 'challenge-result', payload: {
        to: p.from, status: 'accepted', roomId: room.id, gameType: room.game_type,
        challengeId: p.challengeId
      }});
      enterRoom(room.id, room.game_type);
    } finally {
      currentChallenge = null;
      card?.remove();
    }
  }

  function removeChallengeCard(id) { document.querySelector(`[data-challenge-card="${id}"]`)?.remove(); }

  function enterRoom(roomId, type) {
    window.state.gameType = type;
    window.state.gameRoomId = roomId;
    window.state.gameWaitStarted = Date.now();
    window.state.gameRoomCache = null;
    window.state.gameSettlement = null;
    window.state.page = 'game_room';
    window.render();
  }

  function mountWaiting() {
    const s = window.state, app = document.querySelector('#app');
    if (!app || s?.page !== 'game_room' || !s.gameRoomId || !me()) return;
    const room = s.gameRoomCache?.room;
    if (!room || room.status !== 'waiting') return;
    if (document.querySelector('#findOnlineGameButton')) return;
    const leave = document.querySelector('[onclick*="leaveGameRoom"]');
    const host = leave?.parentElement || app.querySelector('.actions') || app.querySelector('.wrap');
    if (!host) return;
    const b = document.createElement('button');
    b.id = 'findOnlineGameButton'; b.className = 'primary'; b.textContent = '🟢 Find an online player'; b.style.marginLeft = '8px';
    b.onclick = () => { ensure(); showOnlinePicker(room); };
    host.appendChild(b);
  }

  function showOnlinePicker(room) {
    let modal = document.querySelector('#onlineGamePicker');
    if (modal) modal.remove();
    modal = document.createElement('div'); modal.id = 'onlineGamePicker';
    modal.style.cssText = 'position:fixed;inset:0;z-index:100010;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:16px';
    modal.innerHTML = `<div style="width:min(560px,100%);max-height:82vh;overflow:auto;background:#0d1b2e;color:#fff;border:1px solid #29415c;border-radius:16px;padding:18px"><h3 style="margin-top:0">🟢 Players online</h3><p class="muted">Game: ${esc(room.game_type)} · Stake: ₦${Number(room.stake || 500)}</p><div id="onlineGamePlayers"></div><hr><h3>📣 Open game requests</h3><div id="onlineGameRequests"><p class="muted">Waiting for requests…</p></div><button class="secondary" id="closeOnlinePicker" style="margin-top:12px;width:100%">Close</button></div>`;
    document.body.appendChild(modal);
    modal.querySelector('#closeOnlinePicker').onclick = () => modal.remove();
    renderOnline();
    loadOpenRequests();
  }

  async function loadOpenRequests() {
    const host = document.querySelector('#onlineGameRequests');
    if (!host) return;
    const { data, error } = await sb().from('game_challenges').select('id,game_type,stake,challenger_id,room_id,status').eq('status','pending').order('created_at',{ascending:false}).limit(30);
    if (error) return;
    host.innerHTML = '';
    if (!data?.length) { host.innerHTML = '<p class="muted">No open requests yet.</p>'; return; }
    data.filter(x => x.challenger_id !== me()).forEach(x => showPublicChallenge({ challengeId:x.id, from:x.challenger_id, fromName:'A player', gameType:x.game_type, stake:x.stake, roomId:x.room_id }));
  }

  function gamesHub() {
    const app = document.querySelector('#app');
    if (!app || window.state?.page !== 'games' || !me()) return;
    ensure();
    let box = document.querySelector('#onlineGameMatchmaking');
    if (box) return;
    box = document.createElement('div'); box.id = 'onlineGameMatchmaking'; box.className = 'panel';
    box.innerHTML = '<h3>🟢 Players online</h3><p class="muted">Choose a player to request a game. Open requests are visible to everyone online.</p><div id="onlineGamePlayers"></div>';
    app.appendChild(box); renderOnline();
  }

  function run() { ensure(); gamesHub(); mountWaiting(); }
  new MutationObserver(run).observe(document.documentElement, { childList:true, subtree:true });
  setInterval(run, 1000); run();
})();
