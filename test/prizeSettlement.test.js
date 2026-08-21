import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSettlement } from '../src/games/prizeSettlement.js';

test('four-player settlement is 10/65/35', () => {
  const s = calculateSettlement(4, 500);
  assert.equal(s.totalStake, 2000);
  assert.equal(s.adminFee, 200);
  assert.equal(s.prizePool, 1800);
  assert.equal(s.winnerOnePrize, 1170);
  assert.equal(s.winnerTwoPrize, 630);
});

test('two-player settlement remains balanced', () => {
  const s = calculateSettlement(2, 500);
  assert.equal(s.totalStake, 1000);
  assert.equal(s.adminFee, 100);
  assert.equal(s.prizePool, 900);
  assert.equal(s.winnerOnePrize + s.winnerTwoPrize, 900);
});
