import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const files = [
  'app.js',
  'games_page.js',
  'game_engine_config.js',
  'src/games/diceEngine.js',
  'src/games/fairRandom.js',
  'src/games/multiplayerRules.js',
  'src/games/prizeSettlement.js',
  'src/games/roomRules.js',
  'src/games/snookerEngine.js',
  'src/games/whotEngine.js',
];

test('browser game modules have valid JavaScript syntax', () => {
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', resolve(file)], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${file}: ${result.stderr || result.stdout}`);
  }
});
