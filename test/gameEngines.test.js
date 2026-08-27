import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, canPlay, nextPlayer, SUITS } from '../src/games/whotEngine.js';
import { rollDice, resolveHighestTotal, createDiceState, applyDiceRoll, currentDicePlayer, DICE_ROUNDS } from '../src/games/diceEngine.js';
import { createSnookerState, scorePot, applyFoul, finishSnooker } from '../src/games/snookerEngine.js';

test('Whot deck contains special Whot cards and valid turn flow', () => {
  const deck = createDeck();
  assert.equal(deck.length, 75);
  assert.equal(deck.filter(card => card.value === 20).length, SUITS.length);
  assert.equal(canPlay({ suit: 'circle', value: 20 }, { suit: 'triangle', value: 3 }), true);
  assert.equal(nextPlayer(['a', 'b', 'c'], 'b'), 'c');
});

test('Dice rolls are in range and highest total resolves', () => {
  const roll = rollDice(1, 6);
  assert.equal(roll.values.length, 1);
  assert.ok(roll.values.every(v => v >= 1 && v <= 6));
  assert.equal(roll.total, roll.values[0]);
  const result = resolveHighestTotal([{ pid: 'a', total: 12 }, { pid: 'b', total: 9 }]);
  assert.equal(result.winners.length, 1);
  assert.equal(result.winners[0].pid, 'a');
});

test('Dice: two players alternate for four rounds and cumulative total wins', () => {
  const state = createDiceState(['a', 'b'], DICE_ROUNDS);
  assert.equal(currentDicePlayer(state), 'a');
  assert.equal(applyDiceRoll(state, 'a', [4]).event, 'roll');
  assert.equal(currentDicePlayer(state), 'b');
  assert.equal(applyDiceRoll(state, 'b', [5]).event, 'roll');
  assert.equal(applyDiceRoll(state, 'a', [6]).event, 'roll');
  assert.equal(applyDiceRoll(state, 'b', [2]).event, 'roll');
  assert.equal(state.totals.a, 10);
  assert.equal(state.totals.b, 7);
  assert.equal(state.status, 'playing');
});

test('Dice: each roll must contain exactly one six-sided die', () => {
  const state = createDiceState(['a', 'b']);
  assert.throws(() => applyDiceRoll(state, 'a', [2, 4]), /exactly one six-sided die/);
  assert.throws(() => applyDiceRoll(state, 'a', [7]), /exactly one six-sided die/);
  assert.throws(() => applyDiceRoll(state, 'b', [3]), /Not this player's turn/);
});

test('Dice: fourth round produces a winner from cumulative totals', () => {
  const state = createDiceState(['a', 'b'], 2);
  applyDiceRoll(state, 'a', [6]);
  applyDiceRoll(state, 'b', [2]);
  applyDiceRoll(state, 'a', [5]);
  const result = applyDiceRoll(state, 'b', [4]);
  assert.equal(result.event, 'winner');
  assert.equal(result.winner, 'a');
  assert.equal(state.totals.a, 11);
  assert.equal(state.totals.b, 6);
  assert.equal(state.status, 'finished');
});

test('Dice: equal cumulative totals produce a tie', () => {
  const state = createDiceState(['a', 'b'], 1);
  applyDiceRoll(state, 'a', [4]);
  const result = applyDiceRoll(state, 'b', [4]);
  assert.equal(result.event, 'tie');
  assert.equal(result.winner, null);
  assert.equal(state.tie, true);
  assert.equal(state.status, 'finished');
});

test('Snooker scoring, fouls and winner calculation work', () => {
  const state = createSnookerState(['a', 'b']);
  scorePot(state, 'a', 'red');
  state.currentPlayerId = 'b';
  applyFoul(state, 'b', 4);
  const result = finishSnooker(state);
  assert.equal(result.winner, 'a');
  assert.equal(state.scores.a, 5);
  assert.equal(state.scores.b, 0);
});
