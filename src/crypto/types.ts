export type AESMode = 'ECB' | 'CBC' | 'CTR' | 'GCM';
export type KeySize = 128 | 192 | 256;

export interface EncryptResult {
  ciphertext: Uint8Array;
  iv?: Uint8Array;    // CBC
  nonce?: Uint8Array; // CTR, GCM
  tag?: Uint8Array;   // GCM (last 16 bytes split out)
  paddingBytes: number;
  blocks: Uint8Array[];
  mode: AESMode;
  keySize: KeySize;
}

export interface DecryptResult {
  plaintext: Uint8Array;
  valid: boolean;
  error?: string;
}
