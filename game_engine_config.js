// FootballPoints Game Engine Configuration
// Shared rules for Whot, Dice and Snooker

const GAME_RULES = {
  WHOT: {
    name: 'Whot',
    entryFee: 500,
    minPlayers: 2,
    botMinimumPlayers: 4,
  },
  DICE: {
    name: 'Dice',
    entryFee: 500,
    minPlayers: 2,
    botMinimumPlayers: 4,
  },
  SNOOKER: {
    name: 'Snooker',
    entryFee: 500,
    minPlayers: 2,
    botMinimumPlayers: 4,
  },
};

const BOT_RULES = {
  name: 'Emeka',
  fixedStake: 500,
  maxLossStreak: 3,
  humanPriority: true,
  onlyFillMissingSlots: true,
};

module.exports = { GAME_RULES, BOT_RULES };
