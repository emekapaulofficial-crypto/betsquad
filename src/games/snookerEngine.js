export const BALL_VALUES = Object.freeze({
  red: 1,
  yellow: 2,
  green: 3,
  brown: 4,
  blue: 5,
  pink: 6,
  black: 7,
});

export function createSnookerState(playerIds) {
  if (!Array.isArray(playerIds) || playerIds.length !== 2) throw new Error('Snooker requires two players');
  return {
    status: 'active',
    playerIds: [...playerIds],
    scores: Object.fromEntries(playerIds.map(id => [id, 0])),
    currentPlayerId: playerIds[0],
    phase: 'reds',
    redsRemaining: 15,
    foulPointsPending: 0,
  };
}

export function scorePot(state, playerId, colour) {
  if (state.status !== 'active') throw new Error('Match is not active');
  if (state.currentPlayerId !== playerId) throw new Error('Not this player\'s turn');
  if (!Object.hasOwn(BALL_VALUES, colour)) throw new Error('Invalid ball');
  state.scores[playerId] += BALL_VALUES[colour];
  return state;
}

export function applyFoul(state, offenderId, points) {
  if (!Number.isInteger(points) || points < 4 || points > 7) throw new Error('Invalid foul points');
  const opponent = state.playerIds.find(id => id !== offenderId);
  state.scores[opponent] += points;
  return state;
}

export function finishSnooker(state) {
  const [a, b] = state.playerIds;
  if (state.scores[a] === state.scores[b]) return { winner: null, tie: true };
  return { winner: state.scores[a] > state.scores[b] ? a : b, tie: false };
}
