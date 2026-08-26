import { rollDice, createDiceState, applyDiceRoll, currentDicePlayer, DICE_ROUNDS, DICE_COUNT } from './src/games/diceEngine.js';

/* BetSquad Dice: one die, four rolls each, highest total wins. */
(function () {
  'use strict';

  const sb = () => window.supabase;
  const getState = () => window.state;
  const getPlayers = () => getState()?.gameRoomPlayers || [];
  const playerId = () => getState()?.user?.id || null;

  function playerName(id) {
    const player = getPlayers().find((x) => (x.user_id || x.id) === id);
    if (player?.display_name) return player.display_name;
    if (player?.is_bot) return 'Emeka';
    return 'Player';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (char) {
      if (char === '&') return '&amp;';
      if (char === '<') return '&lt;';
      if (char === '>') return '&gt;';
      if (char === '"') return '&quot;';
      return '&#39;';
    });
  }

  async function getRoom() {
    const id = getState()?.gameRoomId;
    if (!id || !sb()) return null;
    const result = await sb().from('game_rooms').select('*').eq('id', id).single();
    return result.error ? null : result.data;
  }

  async function ensureDiceState(room) {
    if (!room || room.game_type !== 'dice' || room.status !== 'active') return room;

    const state = room.state || {};
    if (state.dice?.playerIds?.length) return room;

    const ids = Array.isArray(state.order)
      ? state.order
      : getPlayers().map((p) => p.user_id || p.id).filter(Boolean);

    if (ids.length < 2) return room;

    const dice = createDiceState(ids, DICE_ROUNDS);
    const nextState = { ...state, dice, status: 'active', order: ids };

    const result = await sb()
      .from('game_rooms')
      .update({ state: nextState, status: 'active' })
      .eq('id', room.id)
      .eq('status', 'active')
      .select('*')
      .single();

    return result.error ? { ...room, state: nextState } : result.data;
  }

  async function saveDice(room, dice) {
    const nextState = {
      ...(room.state || {}),
      dice,
      order: dice.playerIds,
      status: dice.status
    };

    const status = dice.status === 'finished' ? 'finished' : 'active';

    const result = await sb()
      .from('game_rooms')
      .update({ state: nextState, status })
      .eq('id', room.id)
      .eq('status', 'active')
      .select('*')
      .single();

    return result.error ? null : result.data;
  }

  function host() {
    return document.querySelector('#app .wrap') || document.querySelector('#app') || document.body;
  }

  function rulesHtml() {
    return `
      <div class="notice">
        <b>🎲 How Dice works</b>
        <ul>
          <li>Each player rolls <b>one die, 4 times</b>.</li>
          <li>Each number rolled is added to the player's total.</li>
          <li>There is no Hold rule.</li>
          <li>After 4 rolls each, the player with the <b>highest total</b> wins.</li>
          <li>If both totals are equal, it is a <b>tie</b>.</li>
        </ul>
        <p class="small muted">Example: 6 + 4 + 5 + 3 = <b>18 points</b>.</p>
      </div>`;
  }

  function paint(room) {
    if (!room || room.game_type !== 'dice') return;

    let panel = document.getElementById('diceRulesHud');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'diceRulesHud';
      panel.className = 'panel';
      host().appendChild(panel);
    }

    const dice = room.state?.dice;

    if (!dice) {
      panel.innerHTML = `
        <span class="badge">🎲 DICE • ₦500</span>
        <h2>Dice — 1 Die × 4 Rolls</h2>
        ${rulesHtml()}
        <p><b>Players connected: ${getPlayers().length}/2</b></p>
        <p class="muted">The game starts automatically when 2 players are connected.</p>`;
      return;
    }

    const me = playerId();
    const turn = currentDicePlayer(dice);
    const isMyTurn = turn === me;

    const rows = dice.playerIds.map((id) => {
      const rolls = dice.rolls[id] || [];
      const history = rolls.length
        ? rolls.map((roll, index) => `R${index + 1}: 🎲 ${roll.values[0]}`).join(' • ')
        : 'No rolls yet';

      return `
        <div class="card" style="margin:8px 0">
          <div class="row">
            <b>${escapeHtml(playerName(id))}</b>
            <b>${Number(dice.totals[id] || 0)} pts</b>
          </div>
          <div class="small muted">${history}</div>
        </div>`;
    }).join('');

    let action = '';
    if (dice.status === 'playing') {
      if (isMyTurn) {
        const count = dice.rolls[me]?.length || 0;
        action = `
          <button type="button" class="primary" id="diceRollButton">🎲 ROLL DIE</button>
          <p class="small muted">Your roll ${count} of 4.</p>`;
      } else {
        action = `<p class="muted">Current turn: <b>${escapeHtml(playerName(turn))}</b></p>`;
      }
    }

    let finish = '';
    if (dice.status === 'finished') {
      if (dice.tie) {
        finish = `<div class="notice"><b>🤝 TIE GAME</b><br>Both players finished with the same total.</div>`;
      } else {
        finish = `<div class="notice"><b>🏆 ${escapeHtml(playerName(dice.winner))} WINS!</b><br>Final total: ${Number(dice.totals[dice.winner] || 0)} points after 4 rolls.</div>`;
      }
    }

    const last = dice.lastRoll
      ? `<div class="notice" style="margin-top:10px">Last roll: <b>${escapeHtml(playerName(dice.lastRoll.playerId))}</b> — 🎲 <b>${dice.lastRoll.values[0]}</b> (Round ${dice.lastRoll.round})</div>`
      : '';

    panel.innerHTML = `
      <span class="badge">🎲 DICE • 1 DIE • 4 ROLLS</span>
      <h2>Dice Game</h2>
      ${rulesHtml()}
      <p><b>Round ${Math.min(dice.currentRound, DICE_ROUNDS)} of ${DICE_ROUNDS}</b></p>
      ${rows}
      ${last}
      <div style="margin-top:14px">${action}</div>
      ${finish}
      <button type="button" class="secondary" style="margin-top:12px" onclick="leaveGameRoom()">Leave Room</button>`;

    const button = document.getElementById('diceRollButton');
    if (button) button.onclick = window.rollMyDice;
  }

  window.rollMyDice = async function () {
    const firstRoom = await getRoom();

    if (!firstRoom || firstRoom.game_type !== 'dice' || firstRoom.status !== 'active') {
      alert('Dice is still starting. Please wait for 2 players.');
      return;
    }

    const room = await ensureDiceState(firstRoom);
    const dice = room?.state?.dice;
    const me = playerId();

    if (!dice || dice.status !== 'playing') {
      alert('This Dice game is finished.');
      return;
    }

    if (currentDicePlayer(dice) !== me) {
      alert(`It is ${playerName(currentDicePlayer(dice))}'s turn. Please wait.`);
      return;
    }

    if ((dice.rolls[me] || []).length >= DICE_ROUNDS) {
      alert('You have completed all 4 rolls.');
      return;
    }

    try {
      const roll = rollDice(DICE_COUNT, 6);
      applyDiceRoll(dice, me, roll.values);
    } catch (error) {
      alert(error?.message || 'Could not roll die.');
      return;
    }

    const saved = await saveDice(room, dice);
    if (!saved) {
      alert('Your roll could not be saved. Please try again.');
      return;
    }

    getState().gameRoomCache = { room: saved, players: getPlayers() };
    paint(saved);

    if (dice.status === 'finished') {
      const winners = dice.tie ? [] : [dice.winner];
      alert(
        dice.tie
          ? '🤝 The game is a tie!'
          : `🏆 ${playerName(dice.winner)} wins with ${dice.totals[dice.winner]} points!`
      );

      await sb().rpc('game_settle_room', {
        p_room_id: saved.id,
        p_winner_ids: winners
      });
    }
  };

  async function tick() {
    if (getState()?.page !== 'game_room') {
      document.getElementById('diceRulesHud')?.remove();
      return;
    }

    const room = await getRoom();
    if (!room || room.game_type !== 'dice') {
      document.getElementById('diceRulesHud')?.remove();
      return;
    }

    if (room.status === 'waiting') {
      paint(room);
      return;
    }

    if (room.status === 'active') {
      const ready = await ensureDiceState(room);
      getState().gameRoomCache = { room: ready, players: getPlayers() };
      paint(ready);
      return;
    }

    paint(room);
  }

  setInterval(tick, 1200);
  tick();
})();
