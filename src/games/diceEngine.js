import { secureInt } from './fairRandom.js';

export function rollDice(count = 2, sides = 6) {
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error('Invalid dice count');
  if (!Number.isInteger(sides) || sides < 2 || sides > 100) throw new Error('Invalid dice sides');
  const values = Array.from({ length: count }, () => secureInt(1, sides));
  return { values, total: values.reduce((sum, value) => sum + value, 0) };
}

export function resolveHighestTotal(results) {
  if (!Array.isArray(results) || results.length < 2) throw new Error('At least two results required');
  const sorted = [...results].sort((a, b) => b.total - a.total);
  const top = sorted[0].total;
  const winners = sorted.filter(r => r.total === top);
  return { winners, tie: winners.length > 1 };
}
