import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, canPlay, nextPlayer, SUITS } from '../src/games/whotEngine.js';
import { rollDice, resolveHighestTotal } from '../src/games/diceEngine.js';
import { createSnookerState, scorePot, applyFoul, finishSnooker } from '../src/games/snookerEngine.js';

 test('Whot deck contains special Whot cards and valid turn flow', () => {
  const deck = createDeck();
  assert.equal(deck.length, 75);
  assert.equal(deck.filter(card => card.value === 20).length, SUITS.length);
  assert.equal(canPlay({ suit: 'circle', value: 20 }, { suit: 'triangle', value: 3 }), true);
  assert.equal(nextPlayer(['a', 'b', 'c'], 'b'), 'c');
});

test('Dice rolls are in range and highest total resolves', () => {
  const roll = rollDice(2, 6);
  assert.equal(roll.values.length, 2);
  assert.ok(roll.values.every(v => v >= 1 && v <= 6));
  assert.equal(roll.total, roll.values[0] + roll.values[1]);
  const result = resolveHighestTotal([{ pid: 'a', total: 12 }, { pid: 'b', total: 9 }]);
  assert.equal(result.winners.length, 1);
  assert.equal(result.winners[0].pid, 'a');
});

test('Snooker scoring, fouls and winner calculation work', () => {
  const state = createSnookerState(['a', 'b']);
  scorePot(state, 'a', 'red');
  state.currentPlayerId = 'b';
  applyFoul(state, 'b', 4);
  const result = finishSnooker(state);
  assert.equal(result.winner, 'b');
  assert.equal(state.scores.b, 4);
});
