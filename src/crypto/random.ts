// All randomness from CSPRNG only. Math.random() MUST NOT be used here.
export function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

export function randomIV(): Uint8Array { return randomBytes(16); }   // CBC: 128-bit IV
export function randomNonce96(): Uint8Array { return randomBytes(12); } // CTR/GCM: 96-bit nonce
