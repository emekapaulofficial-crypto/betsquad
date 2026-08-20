// FootballPoints House Bot Controller
// Shared by Whot, Dice and Snooker

export const HOUSE_BOT_CONFIG = {
  fixedStake: 1000,
  maxLossStreak: 3,
  resetStakeAfterWin: true,
  games: [
    'whot',
    'dice',
    'snooker'
  ]
};

export function updateBotState(state, result) {
  const next = { ...state };

  if (result === 'win') {
    next.lossStreak = 0;
    next.currentStake = HOUSE_BOT_CONFIG.fixedStake;
  }

  if (result === 'loss') {
    next.lossStreak = (next.lossStreak || 0) + 1;
    next.currentStake = HOUSE_BOT_CONFIG.fixedStake;
  }

  if (next.lossStreak >= HOUSE_BOT_CONFIG.maxLossStreak) {
    next.status = 'paused';
  }

  return next;
}
