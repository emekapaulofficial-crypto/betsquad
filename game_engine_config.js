// FootballPoints Game Engine Configuration
// Shared rules for Whot, Dice and Snooker.
export const GAME_RULES = {
  WHOT: {
    name: 'Whot',
    entryFee: 500,
    minPlayers: 2,
    capacity: 4,
    botMinimumPlayers: 4,
  },
  DICE: {
    name: 'Dice',
    entryFee: 500,
    minPlayers: 2,
    capacity: 2,
    botMinimumPlayers: 99,
  },
  SNOOKER: {
    name: 'Snooker',
    entryFee: 500,
    minPlayers: 2,
    capacity: 2,
    botMinimumPlayers: 2,
  },
};

export const BOT_RULES = {
  name: 'Emeka',
  fixedStake: 500,
  maxLossStreak: 3,
  humanPriority: true,
  onlyFillMissingSlots: true,
};
