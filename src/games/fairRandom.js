import { randomInt, randomBytes } from 'node:crypto';

export function secureInt(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new Error('Invalid random range');
  }
  return randomInt(min, max + 1);
}

export function secureToken(bytes = 16) {
  if (!Number.isInteger(bytes) || bytes < 8) throw new Error('Invalid token size');
  return randomBytes(bytes).toString('hex');
}
