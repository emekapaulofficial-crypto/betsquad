// FootballPoints House Bot Engine
// Shared controller for Whot, Dice and Snooker

export const BOT_CONFIG = {
  defaultStake: 1000,
  maxLossStreak: 3,
  resetAfterWin: true
};

export function nextStake(bot) {
  if (bot.lossStreak <= 0) return BOT_CONFIG.defaultStake;
  if (bot.lossStreak === 1) return 2000;
  if (bot.lossStreak === 2) return 3000;
  return null; // pause bot after third consecutive loss
}

export function recordResult(bot, result) {
  if (result === 'win') {
    return {
      ...bot,
      lossStreak: 0,
      currentStake: BOT_CONFIG.defaultStake,
      status: 'active'
    };
  }

  const lossStreak = bot.lossStreak + 1;
  return {
    ...bot,
    lossStreak,
    currentStake: nextStake({lossStreak}),
    status: lossStreak >= BOT_CONFIG.maxLossStreak ? 'paused' : 'active'
  };
}

// Game engines should provide fair RNG and legal moves.
// This controller only manages bot availability and staking behaviour.
