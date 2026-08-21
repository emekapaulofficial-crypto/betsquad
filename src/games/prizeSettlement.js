export const STAKE_NGN = 500;
export const ADMIN_FEE_RATE = 0.10;
export const WINNER_ONE_RATE = 0.65;
export const WINNER_TWO_RATE = 0.35;

/**
 * Calculates the settlement for a completed multiplayer game.
 * The admin fee is taken from the total stakes; the remaining pool
 * is split 65/35 between first and second place.
 */
export function calculateSettlement(playerCount, stake = STAKE_NGN) {
  if (!Number.isInteger(playerCount) || playerCount < 2) {
    throw new Error('A game requires at least 2 players.');
  }
  if (!Number.isFinite(stake) || stake <= 0) {
    throw new Error('Stake must be a positive number.');
  }

  const totalStake = playerCount * stake;
  const adminFee = totalStake * ADMIN_FEE_RATE;
  const prizePool = totalStake - adminFee;
  const winnerOnePrize = prizePool * WINNER_ONE_RATE;
  const winnerTwoPrize = prizePool * WINNER_TWO_RATE;

  return {
    playerCount,
    stake,
    totalStake,
    adminFee,
    prizePool,
    winnerOnePrize,
    winnerTwoPrize,
  };
}
