import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { spawn } from 'node:child_process';

const roots = ['.', 'scripts', 'src', 'test', 'tests'];
const ignored = new Set(['node_modules', '.git']);
const files = new Set();

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\.(?:js|mjs|cjs)$/.test(entry.name)) files.add(path);
  }
}

for (const root of roots) await walk(root);

const ordered = [...files].sort();
let failed = false;

for (const file of ordered) {
  const ok = await new Promise((resolve) => {
    const child = spawn(process.execPath, ['--check', file], { stdio: 'inherit' });
    child.on('error', (error) => {
      console.error(`Syntax audit could not start for ${relative('.', file)}: ${error.message}`);
      resolve(false);
    });
    child.on('exit', (code, signal) => {
      if (signal) {
        console.error(`Syntax audit terminated for ${relative('.', file)} by ${signal}`);
        resolve(false);
      } else {
        resolve(code === 0);
      }
    });
  });
  if (!ok) failed = true;
}

console.log(`Syntax audit checked ${ordered.length} JavaScript files.`);
if (failed) process.exitCode = 1;
