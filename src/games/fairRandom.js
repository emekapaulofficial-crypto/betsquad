// Fair randomness using the Web Crypto API (globalThis.crypto). This API is
// available in all browsers and in Node.js 19+ without any import, so this
// file works unmodified both in the browser (loaded via ESM <script type="module">)
// and under `node --test` for the existing unit tests.
function cryptoObj() {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new Error('Secure random number generation is not available in this environment.');
  }
  return c;
}

export function secureInt(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
    throw new Error('Invalid random range');
  }
  const range = max - min + 1;
  const c = cryptoObj();
  const maxUint32 = 0xFFFFFFFF;
  // Rejection sampling avoids modulo bias.
  const limit = Math.floor((maxUint32 + 1) / range) * range;
  const buf = new Uint32Array(1);
  let value;
  do {
    c.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return min + (value % range);
}

export function secureToken(bytes = 16) {
  if (!Number.isInteger(bytes) || bytes < 8) throw new Error('Invalid token size');
  const c = cryptoObj();
  const arr = new Uint8Array(bytes);
  c.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}
