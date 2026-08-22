import test from 'node:test';
import assert from 'node:assert/strict';
import { canStartRoom, shouldFillWithHouseAi, getRoomStatus } from '../src/games/roomRules.js';

test('two humans can start a match', () => assert.equal(canStartRoom(2), true));
test('AI can fill a four-seat room after three humans', () => assert.equal(shouldFillWithHouseAi(3, false), true));
test('AI is not added to a full room', () => assert.equal(shouldFillWithHouseAi(3, true), false));
test('full room is ready', () => assert.equal(getRoomStatus(4, 4), 'ready'));
