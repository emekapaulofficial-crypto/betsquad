export const SUITS = ['circle', 'triangle', 'cross', 'square', 'star'];
export const DEFAULT_HAND_SIZE = 5;

export function createDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= 14; value += 1) cards.push({ suit, value });
  }
  return cards;
}

export function canPlay(card, topCard, declaredSuit = null) {
  if (!card || !topCard) return false;
  if (card.value === 20) return true; // Whot card; represented separately by value 20.
  if (declaredSuit && card.suit === declaredSuit) return true;
  return card.suit === topCard.suit || card.value === topCard.value;
}

export function validateWhotAction(state, playerId, cardIndex, declaredSuit = null) {
  if (state.status !== 'active') throw new Error('Match is not active');
  if (state.turnPlayerId !== playerId) throw new Error('Not this player\'s turn');
  const hand = state.hands?.[playerId];
  if (!Array.isArray(hand) || !hand[cardIndex]) throw new Error('Invalid card');
  const card = hand[cardIndex];
  if (!canPlay(card, state.topCard, state.declaredSuit)) throw new Error('Illegal move');
  if (card.value === 20 && !SUITS.includes(declaredSuit)) throw new Error('Whot requires a declared suit');
  return true;
}

export function nextPlayer(playerIds, currentPlayerId) {
  const index = playerIds.indexOf(currentPlayerId);
  if (index < 0) throw new Error('Unknown player');
  return playerIds[(index + 1) % playerIds.length];
}
