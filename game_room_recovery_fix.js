/* BetSquad game-room recovery fix.
   Prevents an abandoned waiting room from locking a player out of Whot/Dice/Snooker.
   Only refunds a waiting room automatically when the current player is its only member.
*/
(function () {
  'use strict';

  const WAITING = 'waiting';
  let installed = false;

  const sb = () => window.supabase;
  const state = () => window.state;
  const me = () => state()?.user?.id;

  async function recoverMyRooms() {
    const client = sb(), userId = me();
    if (!client || !userId) return null;

    const { data: mine, error } = await client
      .from('game_room_players')
      .select('id,room_id,user_id,display_name,stake_amount,is_bot')
      .eq('user_id', userId)
      .eq('is_bot', false);

    if (error || !mine?.length) return null;

    const roomIds = [...new Set(mine.map(p => p.room_id).filter(Boolean))];
    const { data: rooms, error: roomError } = await client
      .from('game_rooms')
      .select('id,game_type,status,stake,capacity,created_at')
      .in('id', roomIds);

    if (roomError || !rooms?.length) return null;

    for (const room of rooms) {
      if (!room || !room.id) continue;

      const { data: members, error: membersError } = await client
        .from('game_room_players')
        .select('id,user_id,is_bot,stake_amount')
        .eq('room_id', room.id);

      if (membersError) continue;

      const humans = (members || []).filter(p => !p.is_bot);
      const mineHere = humans.some(p => p.user_id === userId);

      if (!mineHere) continue;

      /* A waiting room with only this player is an abandoned/unfinished stake.
         Refund it and remove the membership so the player can start another game. */
      if (room.status === WAITING && humans.length === 1 && (members || []).length === 1) {
        const { error: refundError } = await client.rpc('game_refund_stake', {
          p_room_id: room.id
        });

        if (refundError) {
          console.warn('BetSquad recovery refund failed:', refundError);
          continue;
        }

        await client
          .from('game_room_players')
          .delete()
          .eq('room_id', room.id)
          .eq('user_id', userId);

        const s = state();
        if (s?.gameRoomId === room.id) {
          s.gameRoomId = null;
          s.gameRoomCache = null;
          s.gameSettlement = null;
          s.gameRoomPlayers = [];
        }

        continue;
      }

      /* If the player is already in a legitimate room, recover the local UI
         instead of telling them they are already in a room they cannot find. */
      if (room.status === WAITING || room.status === 'active') {
        const s = state();
        if (s) {
          s.gameType = room.game_type;
          s.gameRoomId = room.id;
          s.gameWaitStarted = s.gameWaitStarted || Date.now();
          s.gameRoomCache = null;
          s.gameSettlement = null;
          s.page = 'game_room';
        }
        return room;
      }
    }

    return null;
  }

  async function install() {
    if (installed || !window.playGame) return;
    installed = true;

    const originalPlayGame = window.playGame;

    window.playGame = async function (type) {
      const s = state();
      if (s?.gameStarting) return;

      try {
        const existing = await recoverMyRooms();

        /* A valid active/waiting room was found. Show it rather than creating
           another room or reporting a false duplicate-room error. */
        if (existing && s?.gameRoomId === existing.id) {
          if (typeof window.render === 'function') window.render();
          if (typeof window.startGamePolling === 'function') window.startGamePolling();
          return;
        }
      } catch (e) {
        console.warn('BetSquad game-room recovery failed:', e);
      }

      return originalPlayGame.call(this, type);
    };

    /* Also recover on login/page refresh, so an abandoned stake cannot remain
       locked simply because the player closed the browser. */
    try { await recoverMyRooms(); } catch (e) { console.warn(e); }
  }

  const timer = setInterval(() => {
    if (window.playGame && window.supabase && window.state) {
      clearInterval(timer);
      install();
    }
  }, 100);

  setTimeout(() => clearInterval(timer), 30000);
})();
