export const ENTRY_FEE_NGN = 500;
export const ROOM_SIZE = 4;
export const MIN_HUMAN_PLAYERS = 2;
export const BOT_FILL_AFTER_HUMANS = 3;

export function canStartRoom(humanPlayers) {
  return humanPlayers >= MIN_HUMAN_PLAYERS;
}

export function shouldFillWithHouseAi(humanPlayers, roomFull = false) {
  return !roomFull && humanPlayers >= BOT_FILL_AFTER_HUMANS;
}

export function getRoomStatus(humanPlayers, totalPlayers) {
  if (totalPlayers >= ROOM_SIZE) return 'ready';
  if (humanPlayers >= MIN_HUMAN_PLAYERS) return 'waiting_for_players';
  return 'waiting_for_players';
}
