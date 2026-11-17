// Known-answer tests (KATs) using official NIST/FIPS vectors.
// All vectors cited from their official sources in comments.
// DO NOT invent vectors — only use officially published values.

import { fromHex } from './encoding';
import { aesEncrypt, aesDecrypt, importKeyForMode } from './aes';
import { ecb } from '@noble/ciphers/aes';

export interface TestResult {
  name: string;
  passed: boolean;
  expected?: string;
  got?: string;
  error?: string;
}

function hexEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// FIPS 197 Appendix B — AES-128 single-block ECB
// Key:       000102030405060708090a0b0c0d0e0f
// Plaintext: 00112233445566778899aabbccddeeff
// Ciphertext:69c4e0d86a7b0430d8cdb78070b4c55a
async function testFIPS197(): Promise<TestResult> {
  try {
    const key = fromHex('000102030405060708090a0b0c0d0e0f');
    const pt  = fromHex('00112233445566778899aabbccddeeff');
    const expected = fromHex('69c4e0d86a7b0430d8cdb78070b4c55a');
    const cipher = ecb(key, { disablePadding: true });
    const ct = cipher.encrypt(pt);
    const passed = hexEqual(ct, expected);
    return { name: 'FIPS-197 AES-128 ECB (Appendix B)', passed, expected: '69c4e0d86a7b0430d8cdb78070b4c55a', got: Array.from(ct).map(b=>b.toString(16).padStart(2,'0')).join('') };
  } catch(e) {
    return { name: 'FIPS-197 AES-128 ECB', passed: false, error: String(e) };
  }
}

// NIST SP 800-38A — F.1.1 ECB-AES128.Encrypt — Block 1
// Key: 2b7e151628aed2a6abf7158809cf4f3c
// PT:  6bc1bee22e409f96e93d7e117393172a
// CT:  3ad77bb40d7a3660a89ecaf32466ef97
async function testNIST_ECB_CBC(): Promise<TestResult> {
  try {
    const key = fromHex('2b7e151628aed2a6abf7158809cf4f3c');
    const pt  = fromHex('6bc1bee22e409f96e93d7e117393172a');
    const expected = fromHex('3ad77bb40d7a3660a89ecaf32466ef97');
    const cipher = ecb(key, { disablePadding: true });
    const ct = cipher.encrypt(pt);
    const passed = hexEqual(ct, expected);
    return { name: 'NIST SP 800-38A F.1.1 ECB-AES128 Block 1', passed, expected: '3ad77bb40d7a3660a89ecaf32466ef97', got: Array.from(ct).map(b=>b.toString(16).padStart(2,'0')).join('') };
  } catch(e) {
    return { name: 'NIST SP 800-38A ECB', passed: false, error: String(e) };
  }
}

// NIST SP 800-38A — F.2.1 CBC-AES128.Encrypt — Block 1
// Key: 2b7e151628aed2a6abf7158809cf4f3c
// IV:  000102030405060708090a0b0c0d0e0f
// PT:  6bc1bee22e409f96e93d7e117393172a
// CT (block 1): 7649abac8119b246cee98e9b12e9197d
async function testNIST_CBC(): Promise<TestResult> {
  try {
    const keyBytes = fromHex('2b7e151628aed2a6abf7158809cf4f3c');
    const iv = fromHex('000102030405060708090a0b0c0d0e0f');
    const pt = fromHex('6bc1bee22e409f96e93d7e117393172a');
    const expected = fromHex('7649abac8119b246cee98e9b12e9197d');
    const key = await importKeyForMode(keyBytes, 'CBC');
    // Encrypt single block — Web Crypto will add PKCS7 pad (1 extra block)
    const ctBuf = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, pt);
    const ct = new Uint8Array(ctBuf);
    const block1 = ct.slice(0, 16);
    const passed = hexEqual(block1, expected);
    return { name: 'NIST SP 800-38A F.2.1 CBC-AES128 Block 1', passed, expected: '7649abac8119b246cee98e9b12e9197d', got: Array.from(block1).map(b=>b.toString(16).padStart(2,'0')).join('') };
  } catch(e) {
    return { name: 'NIST SP 800-38A CBC', passed: false, error: String(e) };
  }
}

// NIST SP 800-38A — F.5.1 CTR-AES128.Encrypt — Block 1
// Key: 2b7e151628aed2a6abf7158809cf4f3c
// Counter (IC): f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff
// PT block 1: 6bc1bee22e409f96e93d7e117393172a
// CT block 1: 874d6191b620e3261bef6864990db6ce
async function testNIST_CTR(): Promise<TestResult> {
  try {
    const keyBytes = fromHex('2b7e151628aed2a6abf7158809cf4f3c');
    const counter = fromHex('f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff');
    const pt = fromHex('6bc1bee22e409f96e93d7e117393172a');
    const expected = fromHex('874d6191b620e3261bef6864990db6ce');
    const key = await importKeyForMode(keyBytes, 'CTR');
    const ctBuf = await crypto.subtle.encrypt(
      { name: 'AES-CTR', counter, length: 32 },
      key, pt
    );
    const ct = new Uint8Array(ctBuf);
    const passed = hexEqual(ct, expected);
    return { name: 'NIST SP 800-38A F.5.1 CTR-AES128 Block 1', passed, expected: '874d6191b620e3261bef6864990db6ce', got: Array.from(ct).map(b=>b.toString(16).padStart(2,'0')).join('') };
  } catch(e) {
    return { name: 'NIST SP 800-38A CTR', passed: false, error: String(e) };
  }
}

// Round-trip tests for all four modes
async function testRoundTrips(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const keyBytes = new Uint8Array(16);
  crypto.getRandomValues(keyBytes);
  
  const testCases = [
    { label: 'empty', data: new Uint8Array(0) },
    { label: '1 byte', data: new Uint8Array([0x41]) },
    { label: '15 bytes', data: new Uint8Array(15).fill(0x61) },
    { label: '16 bytes', data: new Uint8Array(16).fill(0x62) },
    { label: '17 bytes', data: new Uint8Array(17).fill(0x63) },
    { label: 'unicode', data: new TextEncoder().encode('Hello, 世界! 🔐') },
  ];

  const modes = ['ECB', 'CBC', 'CTR', 'GCM'] as const;

  for (const mode of modes) {
    for (const tc of testCases) {
      // ECB doesn't support empty input cleanly, skip empty for ECB
      if (mode === 'ECB' && tc.data.length === 0) continue;
      try {
        const enc = await aesEncrypt(mode, keyBytes, tc.data);
        const dec = await aesDecrypt(mode, keyBytes, enc.ciphertext, { iv: enc.iv, nonce: enc.nonce, tag: enc.tag });
        const match = dec.valid && hexEqual(dec.plaintext, tc.data);
        results.push({ name: `Round-trip ${mode} ${tc.label}`, passed: match, error: dec.error });
      } catch(e) {
        results.push({ name: `Round-trip ${mode} ${tc.label}`, passed: false, error: String(e) });
      }
    }
  }
  return results;
}

// GCM tamper test: flipping any ciphertext byte or tag byte must cause auth failure
async function testGCMTamper(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const keyBytes = new Uint8Array(16);
  crypto.getRandomValues(keyBytes);
  const pt = new TextEncoder().encode('Hello GCM tamper test');
  const enc = await aesEncrypt('GCM', keyBytes, pt);
  
  // Flip first ciphertext byte
  const tamperCT = enc.ciphertext.slice();
  tamperCT[0] ^= 0x01;
  const r1 = await aesDecrypt('GCM', keyBytes, tamperCT, { nonce: enc.nonce, tag: enc.tag });
  results.push({ name: 'GCM rejects tampered ciphertext byte', passed: !r1.valid });

  // Flip first tag byte
  const tamperTag = enc.tag!.slice();
  tamperTag[0] ^= 0x01;
  const r2 = await aesDecrypt('GCM', keyBytes, enc.ciphertext, { nonce: enc.nonce, tag: tamperTag });
  results.push({ name: 'GCM rejects tampered tag byte', passed: !r2.valid });

  return results;
}

export async function runAllTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  results.push(await testFIPS197());
  results.push(await testNIST_ECB_CBC());
  results.push(await testNIST_CBC());
  results.push(await testNIST_CTR());
  results.push(...await testRoundTrips());
  results.push(...await testGCMTamper());
  return results;
}
