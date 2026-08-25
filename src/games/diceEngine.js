import { secureInt } from './fairRandom.js';

export const PIG_TARGET_SCORE = 100;

export function rollDice(count = 2, sides = 6) {
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('Invalid dice count');
  if (!Number.isInteger(sides) || sides < 2 || sides > 100) throw new Error('Invalid dice sides');
  const values = Array.from({ length: count }, () => secureInt(1, sides));
  return { values, total: values.reduce((sum, value) => sum + value, 0) };
}

/** Create the state for Pig / Classic 2-Dice Greed. */
export function createPigState(playerIds, target = PIG_TARGET_SCORE) {
  if (!Array.isArray(playerIds) || playerIds.length < 2) throw new Error('At least two players required');
  if (new Set(playerIds).size !== playerIds.length) throw new Error('Player IDs must be unique');
  if (!Number.isInteger(target) || target < 1) throw new Error('Invalid target score');
  return {
    playerIds: [...playerIds],
    scores: Object.fromEntries(playerIds.map(id => [id, 0])),
    turnScore: 0,
    currentPlayerIndex: 0,
    status: 'playing',
    winner: null,
    lastRoll: null,
    target
  };
}

function currentPlayer(state) {
  return state.playerIds[state.currentPlayerIndex];
}

function assertActiveTurn(state, playerId) {
  if (!state || state.status !== 'playing') throw new Error('Game is finished');
  if (currentPlayer(state) !== playerId) throw new Error('Not this player\'s turn');
}

function advanceTurn(state) {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.playerIds.length;
  state.turnScore = 0;
}

/**
 * Resolve one two-dice roll.
 * - Any single 1: turn ends, turn points are lost, saved score stays unchanged.
 * - Double 1 (snake eyes): turn ends and the player's saved score resets to 0.
 * - Otherwise both dice are added to the temporary turn score.
 * The temporary score is never permanent until holdPigTurn is called.
 */
export function applyPigRoll(state, playerId, values) {
  assertActiveTurn(state, playerId);
  if (!Array.isArray(values) || values.length !== 2 || values.some(v => !Number.isInteger(v) || v < 1 || v > 6)) {
    throw new Error('Pig requires exactly two six-sided dice');
  }

  const [die1, die2] = values;
  const total = die1 + die2;
  state.lastRoll = { playerId, values: [die1, die2], total };

  if (die1 === 1 && die2 === 1) {
    state.scores[playerId] = 0;
    state.turnScore = 0;
    advanceTurn(state);
    return { event: 'snake_eyes', turnEnded: true, turnScore: 0, score: 0 };
  }

  if (die1 === 1 || die2 === 1) {
    state.turnScore = 0;
    const score = state.scores[playerId];
    advanceTurn(state);
    return { event: 'one_rolled', turnEnded: true, turnScore: 0, score };
  }

  state.turnScore += total;
  return { event: 'safe_roll', turnEnded: false, turnScore: state.turnScore, score: state.scores[playerId] };
}

/** Bank the current turn score. First player whose permanent score reaches target wins. */
export function holdPigTurn(state, playerId) {
  assertActiveTurn(state, playerId);
  state.scores[playerId] += state.turnScore;
  const banked = state.turnScore;
  state.turnScore = 0;

  if (state.scores[playerId] >= state.target) {
    state.status = 'finished';
    state.winner = playerId;
    return { event: 'winner', winner: playerId, banked, score: state.scores[playerId], turnEnded: true };
  }

  advanceTurn(state);
  return { event: 'hold', winner: null, banked, score: state.scores[playerId], turnEnded: true };
}

export function getPigTurn(state) {
  if (!state || !Array.isArray(state.playerIds)) throw new Error('Invalid Pig state');
  return state.playerIds[state.currentPlayerIndex];
}

export function rankPigPlayers(state) {
  if (!state || !state.scores) throw new Error('Invalid Pig state');
  return [...state.playerIds]
    .map(pid => ({ pid, score: state.scores[pid] }))
    .sort((a, b) => b.score - a.score);
}

// Kept for compatibility with the earlier generic dice engine API.
export function resolveHighestTotal(results) {
  if (!Array.isArray(results) || results.length < 2) throw new Error('At least two results required');
  const sorted = [...results].sort((a, b) => b.total - a.total);
  const top = sorted[0].total;
  const winners = sorted.filter(r => r.total === top);
  return { winners, tie: winners.length > 1 };
}
