import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, canPlay, nextPlayer, SUITS } from '../src/games/whotEngine.js';
import { rollDice, resolveHighestTotal, createPigState, applyPigRoll, holdPigTurn, getPigTurn } from '../src/games/diceEngine.js';
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

test('Pig: safe rolls build temporary turn score and Hold banks it', () => {
  const state = createPigState(['a', 'b']);
  assert.equal(getPigTurn(state), 'a');
  assert.equal(applyPigRoll(state, 'a', [4, 5]).turnScore, 9);
  assert.equal(applyPigRoll(state, 'a', [2, 6]).turnScore, 17);
  const held = holdPigTurn(state, 'a');
  assert.equal(held.event, 'hold');
  assert.equal(state.scores.a, 17);
  assert.equal(state.turnScore, 0);
  assert.equal(getPigTurn(state), 'b');
});

test('Pig: rolling one loses only the current turn points', () => {
  const state = createPigState(['a', 'b']);
  state.scores.a = 40;
  applyPigRoll(state, 'a', [5, 4]);
  const result = applyPigRoll(state, 'a', [1, 6]);
  assert.equal(result.event, 'one_rolled');
  assert.equal(state.scores.a, 40);
  assert.equal(state.turnScore, 0);
  assert.equal(getPigTurn(state), 'b');
});

test('Pig: double ones reset permanent score to zero', () => {
  const state = createPigState(['a', 'b']);
  state.scores.a = 80;
  applyPigRoll(state, 'a', [6, 6]);
  const result = applyPigRoll(state, 'a', [1, 1]);
  assert.equal(result.event, 'snake_eyes');
  assert.equal(state.scores.a, 0);
  assert.equal(state.turnScore, 0);
  assert.equal(getPigTurn(state), 'b');
});

test('Pig: first permanent score reaching 100 wins', () => {
  const state = createPigState(['a', 'b']);
  state.scores.a = 95;
  applyPigRoll(state, 'a', [3, 2]);
  const result = holdPigTurn(state, 'a');
  assert.equal(result.event, 'winner');
  assert.equal(result.winner, 'a');
  assert.equal(state.scores.a, 100);
  assert.equal(state.status, 'finished');
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
