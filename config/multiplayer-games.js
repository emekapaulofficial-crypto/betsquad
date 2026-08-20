// FootballPoints Multiplayer Game Rules
// Shared configuration for Whot, Dice and Snooker

const multiplayerGames = {
  whot: {
    name: 'Whot',
    entryFee: 500,
    minPlayers: 2,
    botEnabled: false,
    botMinPlayers: 4
  },
  dice: {
    name: 'Dice',
    entryFee: 500,
    minPlayers: 2,
    botEnabled: false,
    botMinPlayers: 4
  },
  snooker: {
    name: 'Snooker',
    entryFee: 500,
    minPlayers: 2,
    botEnabled: false,
    botMinPlayers: 4
  }
};

function canUseBot(game, playerCount) {
  return multiplayerGames[game].botMinPlayers <= playerCount;
}

module.exports = {
  multiplayerGames,
  canUseBot
};
