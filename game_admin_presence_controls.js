/* BetSquad game controls: admin close button + live disconnect notices. */
(() => {
  'use strict';
  const ROOM_CHANNEL_PREFIX = 'betsquad-game-room-v1:';
  let channel = null;
  let boundRoom = null;
  let lastPlayerIds = new Set();
  let noticeTimer = null;

  const sb = () => window.supabase;
  const me = () => window.state?.user?.id;
  const roomId = () => window.state?.gameRoomId;
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

  function toast(message, type = 'info') {
    let el = document.querySelector('#betsquadGameNotice');
    if (!el) {
      el = document.createElement('div');
      el.id = 'betsquadGameNotice';
      el.style.cssText = 'position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:100020;max-width:min(92vw,560px);padding:12px 16px;border-radius:12px;background:#10243a;color:#fff;border:1px solid #3b5874;box-shadow:0 10px 30px rgba(0,0,0,.35);font-weight:600;text-align:center';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.borderColor = type === 'danger' ? '#e5a400' : '#3b5874';
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => el.remove(), 6500);
  }

  function renderAdminButton() {
    const id = roomId();
    const existing = document.querySelector('#adminCloseGameButton');
    if (!id || window.state?.page !== 'game_room' || !window.state?.isAdmin) {
      existing?.remove();
      return;
    }
    if (existing) return;
    const host = document.querySelector('.game-room-actions') || document.querySelector('.actions') || document.querySelector('.wrap');
    if (!host) return;
    const b = document.createElement('button');
    b.id = 'adminCloseGameButton';
    b.type = 'button';
    b.textContent = '🔒 Close Game';
    b.style.cssText = 'margin:8px 0;padding:10px 14px;border-radius:10px;border:1px solid #e5a400;background:#2a1f05;color:#ffd66b;font-weight:700;cursor:pointer';
    b.onclick = closeGame;
    host.appendChild(b);
  }

  async function closeGame() {
    if (!window.state?.isAdmin || !roomId() || !sb()) return;
    if (!confirm('Close this game for everyone? Players will be notified.')) return;
    const id = roomId();
    const b = document.querySelector('#adminCloseGameButton');
    if (b) { b.disabled = true; b.textContent = 'Closing…'; }

    let result = await sb().from('game_rooms').update({ status: 'closed' }).eq('id', id).in('status', ['waiting','active']);
    if (result.error) {
      // Some deployments only permit the existing finished status.
      result = await sb().from('game_rooms').update({ status: 'finished' }).eq('id', id).in('status', ['waiting','active']);
    }
    if (result.error) {
      if (b) { b.disabled = false; b.textContent = '🔒 Close Game'; }
      return alert('Could not close this game: ' + result.error.message);
    }

    try { await sb().rpc('game_refund_stake', { p_room_id: id }); } catch (e) { console.warn('Close-game refund unavailable', e); }
    try { await channel?.send({ type:'broadcast', event:'game-closed', payload:{ roomId:id, message:'The admin has closed this game.' } }); } catch (e) {}
    toast('Game closed. Players have been notified.', 'danger');
    setTimeout(() => { if (window.state?.gameRoomId === id) { window.state.gameRoomId = null; window.state.gameRoomCache = null; window.state.page = 'games'; window.render?.(); } }, 900);
  }

  function disconnectNotice(payload) {
    if (!payload || payload.user_id === me()) return;
    const name = payload.display_name || 'A player';
    toast(`⚠️ ${name} has left the game. They may have logged out or lost connection.`, 'danger');
  }

  async function bindRoom() {
    const id = roomId();
    if (!sb() || !me() || !id || window.state?.page !== 'game_room') {
      if (channel) { try { sb()?.removeChannel(channel); } catch(e){} }
      channel = null; boundRoom = null; lastPlayerIds = new Set();
      renderAdminButton();
      return;
    }
    renderAdminButton();
    if (boundRoom === id && channel) return;
    if (channel) { try { sb().removeChannel(channel); } catch(e){} }
    boundRoom = id;
    lastPlayerIds = new Set();
    channel = sb().channel(ROOM_CHANNEL_PREFIX + id, { config: { presence: { key: me() }, broadcast: { self: false } } });
    channel.on('presence', { event:'sync' }, () => {
      const state = channel.presenceState();
      const now = new Set();
      Object.keys(state).forEach(k => { const p = state[k]?.[0]; if (p?.user_id) now.add(p.user_id); });
      if (lastPlayerIds.size) {
        lastPlayerIds.forEach(id2 => { if (!now.has(id2)) {
          const old = [...(channel.presenceState()[id2] || [])][0];
          disconnectNotice({ user_id:id2, display_name:old?.display_name });
        }});
      }
      lastPlayerIds = now;
    });
    channel.on('presence', { event:'leave' }, ({ key, leftPresences }) => {
      const p = leftPresences?.[0] || {};
      disconnectNotice({ user_id:p.user_id || key, display_name:p.display_name });
    });
    channel.on('broadcast', { event:'game-closed' }, ({ payload }) => {
      if (payload?.roomId !== id) return;
      toast(payload.message || 'The admin has closed this game.', 'danger');
      setTimeout(() => { if (window.state?.gameRoomId === id) { window.state.gameRoomId = null; window.state.gameRoomCache = null; window.state.page = 'games'; window.render?.(); } }, 1200);
    });
    channel.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        try { await channel.track({ user_id:me(), display_name:window.state?.user?.user_metadata?.name || window.state?.user?.email?.split('@')[0] || 'Player', online_at:new Date().toISOString() }); } catch(e) { console.warn('Room presence track failed', e); }
      }
    });
  }

  function run() { bindRoom(); }
  new MutationObserver(run).observe(document.documentElement, { childList:true, subtree:true });
  setInterval(run, 1200);
  run();
})();
