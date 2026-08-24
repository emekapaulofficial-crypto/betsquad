// FootballPoints Game Engine Configuration
// Shared rules for Whot, Dice and Snooker.
//
// Previously this file used `module.exports`, which is CommonJS/Node syntax
// and cannot run in a browser <script> tag — that's one reason the games
// were never actually wired into the live site. Converted to a plain ES
// module export so it can be imported directly from games_page.js in the
// browser (and still works fine under Node, since package.json sets
// "type": "module").
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
    capacity: 4,
    botMinimumPlayers: 4,
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
