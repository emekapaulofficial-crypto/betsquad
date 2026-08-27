import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../admin_navigation_guard.js', import.meta.url), 'utf8');

test('admin navigation guard requires a recent explicit authorization', () => {
  assert.match(source, /explicitUntil/);
  assert.match(source, /Date\.now\(\)\+1500/);
  assert.match(source, /Date\.now\(\)<=explicitUntil/);
});

test('admin navigation guard consumes authorization before calling the original loader', () => {
  const consumeIndex = source.indexOf('consumeExplicit()');
  const originalIndex = source.indexOf('original.apply(this,arguments)');
  assert.notEqual(consumeIndex, -1);
  assert.notEqual(originalIndex, -1);
  assert.ok(consumeIndex < originalIndex);
});

test('admin navigation guard blocks unsolicited navigation', () => {
  assert.match(source, /blocked unsolicited Admin dashboard navigation/);
  assert.match(source, /return Promise\.resolve\(false\)/);
});
