// AES encryption/decryption for all four modes.
// ECB uses @noble/ciphers (Web Crypto has no ECB support).
// CBC, CTR, GCM use Web Crypto API (crypto.subtle).
// Math.random() is NEVER used here.

import { ecb } from '@noble/ciphers/aes';
import { type AESMode, type KeySize, type EncryptResult, type DecryptResult } from './types';
import { randomIV, randomNonce96 } from './random';
import { chunkBytes } from './encoding';

// PKCS#7 padding
export function pkcs7Pad(data: Uint8Array, blockSize = 16): Uint8Array {
  const pad = blockSize - (data.length % blockSize);
  const padded = new Uint8Array(data.length + pad);
  padded.set(data);
  padded.fill(pad, data.length);
  return padded;
}

export function pkcs7Unpad(data: Uint8Array): Uint8Array {
  if (data.length === 0) throw new Error('Empty data');
  const pad = data[data.length - 1];
  if (pad === 0 || pad > 16) throw new Error('Invalid padding');
  for (let i = data.length - pad; i < data.length; i++) {
    if (data[i] !== pad) throw new Error('Invalid padding');
  }
  return data.slice(0, data.length - pad);
}

export function checkPkcs7Padding(data: Uint8Array): { valid: boolean; paddingBytes: number } {
  if (data.length === 0 || data.length % 16 !== 0) return { valid: false, paddingBytes: 0 };
  const pad = data[data.length - 1];
  if (pad < 1 || pad > 16) return { valid: false, paddingBytes: 0 };
  for (let i = data.length - pad; i < data.length; i++) {
    if (data[i] !== pad) return { valid: false, paddingBytes: 0 };
  }
  return { valid: true, paddingBytes: pad };
}

function getAlgoName(mode: Exclude<AESMode, 'ECB'>): string {
  if (mode === 'CBC') return 'AES-CBC';
  if (mode === 'CTR') return 'AES-CTR';
  return 'AES-GCM';
}

export async function generateKey(keySize: KeySize): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: keySize },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportKeyBytes(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

export async function importKeyForMode(keyBytes: Uint8Array, mode: Exclude<AESMode, 'ECB'>): Promise<CryptoKey> {
  const name = getAlgoName(mode);
  return crypto.subtle.importKey('raw', keyBytes, { name }, false, ['encrypt', 'decrypt']);
}

// Raw single block AES encrypt E_K(block) using fresh noble instance
export function rawAesBlockEncrypt(keyBytes: Uint8Array, block16: Uint8Array): Uint8Array {
  return ecb(keyBytes, { disablePadding: true }).encrypt(block16);
}

// Raw single block AES decrypt D_K(block) using fresh noble instance
export function rawAesBlockDecrypt(keyBytes: Uint8Array, block16: Uint8Array): Uint8Array {
  return ecb(keyBytes, { disablePadding: true }).decrypt(block16);
}

// Raw decryption without padding removal (for Tamper Lab education)
export function rawDecryptNoPadding(
  mode: 'ECB' | 'CBC',
  keyBytes: Uint8Array,
  ciphertext: Uint8Array,
  iv?: Uint8Array
): Uint8Array {
  if (ciphertext.length === 0 || ciphertext.length % 16 !== 0) {
    return new Uint8Array(0);
  }

  if (mode === 'ECB') {
    return ecb(keyBytes, { disablePadding: true }).decrypt(ciphertext);
  }

  // CBC raw decrypt: P_1 = D_K(C_1) ^ IV, P_i = D_K(C_i) ^ C_{i-1}
  if (!iv || iv.length !== 16) throw new Error('IV (16 bytes) required for CBC raw decrypt');
  const blocks = chunkBytes(ciphertext, 16);
  const out = new Uint8Array(ciphertext.length);
  let prevBlock = iv;

  for (let i = 0; i < blocks.length; i++) {
    const decryptedBlock = ecb(keyBytes, { disablePadding: true }).decrypt(blocks[i]);
    for (let b = 0; b < 16; b++) {
      out[i * 16 + b] = decryptedBlock[b] ^ prevBlock[b];
    }
    prevBlock = blocks[i];
  }
  return out;
}

// Encrypt raw key bytes for ECB using noble
function ecbEncrypt(keyBytes: Uint8Array, plaintext: Uint8Array): { ciphertext: Uint8Array; paddingBytes: number; blocks: Uint8Array[] } {
  const padded = pkcs7Pad(plaintext);
  const paddingBytes = padded.length - plaintext.length;
  const ciphertext = ecb(keyBytes, { disablePadding: true }).encrypt(padded);
  const blocks = chunkBytes(ciphertext);
  return { ciphertext, paddingBytes, blocks };
}

function ecbDecrypt(keyBytes: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  if (ciphertext.length % 16 !== 0) throw new Error('Ciphertext length must be a multiple of 16');
  const padded = ecb(keyBytes, { disablePadding: true }).decrypt(ciphertext);
  return pkcs7Unpad(padded);
}

export async function aesEncrypt(
  mode: AESMode,
  keyBytes: Uint8Array,
  plaintext: Uint8Array,
  aad?: Uint8Array
): Promise<EncryptResult> {
  const keySize = (keyBytes.length * 8) as KeySize;

  if (mode === 'ECB') {
    const { ciphertext, paddingBytes, blocks } = ecbEncrypt(keyBytes, plaintext);
    return { ciphertext, paddingBytes, blocks, mode, keySize };
  }

  if (mode === 'CBC') {
    const iv = randomIV();
    const key = await importKeyForMode(keyBytes, 'CBC');
    const ctBuf = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, plaintext);
    const ciphertext = new Uint8Array(ctBuf);
    const paddingBytes = ciphertext.length - plaintext.length;
    return { ciphertext, iv, paddingBytes, blocks: chunkBytes(ciphertext), mode, keySize };
  }

  if (mode === 'CTR') {
    const nonce = randomNonce96();
    const counterBlock = new Uint8Array(16);
    counterBlock.set(nonce, 0);
    const key = await importKeyForMode(keyBytes, 'CTR');
    const ctBuf = await crypto.subtle.encrypt(
      { name: 'AES-CTR', counter: counterBlock, length: 32 },
      key,
      plaintext
    );
    const ciphertext = new Uint8Array(ctBuf);
    return { ciphertext, nonce, paddingBytes: 0, blocks: chunkBytes(ciphertext), mode, keySize };
  }

  // GCM
  const nonce = randomNonce96();
  const key = await importKeyForMode(keyBytes, 'GCM');
  const gcmParams: AesGcmParams = {
    name: 'AES-GCM',
    iv: nonce,
    tagLength: 128,
  };
  if (aad && aad.byteLength > 0) {
    gcmParams.additionalData = aad;
  }
  const ctBuf = await crypto.subtle.encrypt(
    gcmParams,
    key,
    plaintext
  );
  const full = new Uint8Array(ctBuf);
  const tag = full.slice(full.length - 16);
  const ciphertext = full.slice(0, full.length - 16);
  return { ciphertext, nonce, tag, paddingBytes: 0, blocks: chunkBytes(ciphertext), mode, keySize };
}

export async function aesDecrypt(
  mode: AESMode,
  keyBytes: Uint8Array,
  ciphertext: Uint8Array,
  options?: { iv?: Uint8Array; nonce?: Uint8Array; tag?: Uint8Array; aad?: Uint8Array }
): Promise<DecryptResult> {
  try {
    if (mode === 'ECB') {
      const plaintext = ecbDecrypt(keyBytes, ciphertext);
      return { plaintext, valid: true };
    }

    if (mode === 'CBC') {
      if (!options?.iv) throw new Error('IV required for CBC');
      const key = await importKeyForMode(keyBytes, 'CBC');
      const ptBuf = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: options.iv }, key, ciphertext);
      return { plaintext: new Uint8Array(ptBuf), valid: true };
    }

    if (mode === 'CTR') {
      if (!options?.nonce) throw new Error('Nonce required for CTR');
      const counterBlock = new Uint8Array(16);
      counterBlock.set(options.nonce, 0);
      const key = await importKeyForMode(keyBytes, 'CTR');
      const ptBuf = await crypto.subtle.decrypt(
        { name: 'AES-CTR', counter: counterBlock, length: 32 },
        key,
        ciphertext
      );
      return { plaintext: new Uint8Array(ptBuf), valid: true };
    }

    // GCM: reassemble ciphertext+tag
    if (!options?.nonce || !options?.tag) throw new Error('Nonce and tag required for GCM');
    const full = new Uint8Array(ciphertext.length + 16);
    full.set(ciphertext);
    full.set(options.tag, ciphertext.length);
    const key = await importKeyForMode(keyBytes, 'GCM');
    try {
      const gcmParams: AesGcmParams = {
        name: 'AES-GCM',
        iv: options.nonce,
        tagLength: 128,
      };
      if (options?.aad && options.aad.byteLength > 0) {
        gcmParams.additionalData = options.aad;
      }
      const ptBuf = await crypto.subtle.decrypt(
        gcmParams,
        key,
        full
      );
      return { plaintext: new Uint8Array(ptBuf), valid: true };
    } catch {
      return { plaintext: new Uint8Array(0), valid: false, error: 'Authentication failed: this data was changed or the key is wrong. No plaintext released.' };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('padding') || msg.includes('Padding') || msg.includes('pad')) {
      return { plaintext: new Uint8Array(0), valid: false, error: 'Invalid padding' };
    }
    return { plaintext: new Uint8Array(0), valid: false, error: msg };
  }
}

// Step-by-step intermediate block computations for Text Lab
export interface StepECBBlock {
  index: number;
  ptBlock: Uint8Array;
  ctBlock: Uint8Array;
}

export function computeStepECB(keyBytes: Uint8Array, paddedPlaintext: Uint8Array): StepECBBlock[] {
  const blocks = chunkBytes(paddedPlaintext, 16);
  return blocks.map((ptBlock, index) => {
    // Fresh noble cipher per block to avoid "cannot encrypt() twice with same key" restriction
    const ctBlock = ecb(keyBytes, { disablePadding: true }).encrypt(ptBlock);
    return { index: index + 1, ptBlock, ctBlock };
  });
}

export interface StepCBCBlock {
  index: number;
  ptBlock: Uint8Array;
  xorSource: string;
  xorSourceBytes: Uint8Array;
  xorResult: Uint8Array;
  ctBlock: Uint8Array;
}

export function computeStepCBC(keyBytes: Uint8Array, iv: Uint8Array, paddedPlaintext: Uint8Array): StepCBCBlock[] {
  const blocks = chunkBytes(paddedPlaintext, 16);
  const result: StepCBCBlock[] = [];
  let prevBlock = iv;

  for (let i = 0; i < blocks.length; i++) {
    const ptBlock = blocks[i];
    const xorResult = new Uint8Array(16);
    for (let b = 0; b < 16; b++) {
      xorResult[b] = ptBlock[b] ^ prevBlock[b];
    }
    const ctBlock = ecb(keyBytes, { disablePadding: true }).encrypt(xorResult);
    result.push({
      index: i + 1,
      ptBlock,
      xorSource: i === 0 ? 'IV' : `C${i}`,
      xorSourceBytes: prevBlock,
      xorResult,
      ctBlock,
    });
    prevBlock = ctBlock;
  }
  return result;
}

export interface StepCTRBlock {
  index: number;
  counterBlock: Uint8Array;
  counterValue: number;
  keystreamBlock: Uint8Array;
  ptBlock: Uint8Array;
  ctBlock: Uint8Array;
}

export function computeStepCTR(keyBytes: Uint8Array, nonce: Uint8Array, plaintext: Uint8Array): StepCTRBlock[] {
  const blocks = chunkBytes(plaintext, 16);
  const result: StepCTRBlock[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const counterBlock = new Uint8Array(16);
    counterBlock.set(nonce, 0);
    // 32-bit big-endian counter starting at 0
    const view = new DataView(counterBlock.buffer);
    view.setUint32(12, i, false);

    const keystreamBlock = ecb(keyBytes, { disablePadding: true }).encrypt(counterBlock);
    const ptBlock = blocks[i];
    const ctBlock = new Uint8Array(ptBlock.length);
    for (let b = 0; b < ptBlock.length; b++) {
      ctBlock[b] = ptBlock[b] ^ keystreamBlock[b];
    }

    result.push({
      index: i + 1,
      counterBlock,
      counterValue: i,
      keystreamBlock,
      ptBlock,
      ctBlock,
    });
  }
  return result;
}
