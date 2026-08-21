export const MIN_PLAYERS = 2;
export const BOT_FILL_THRESHOLD = 4;
export const BOT_IDENTITY = 'Emeka';
export const BOT_STAKE_NGN = 500;
export const BOT_MAX_CONSECUTIVE_LOSSES = 3;

/**
 * Human players always have priority. The house AI may fill a room only
 * when a 4-player room is otherwise incomplete after the configured wait.
 */
export function shouldOfferBot({ humanPlayers, roomCapacity, waitExpired }) {
  if (humanPlayers < BOT_FILL_THRESHOLD) return false;
  if (humanPlayers >= roomCapacity) return false;
  return Boolean(waitExpired);
}

export function rankingFor(playerResults) {
  return [...playerResults].sort((a, b) => b.score - a.score);
}
