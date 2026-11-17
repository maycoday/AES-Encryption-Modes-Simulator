export const GLOSSARY: Record<string, string> = {
  key: 'A secret value used by the AES algorithm. Only someone who knows the key can decrypt the data.',
  iv: 'Initialization Vector — a random value mixed with the first block so that encrypting the same plaintext twice gives different ciphertext. Must be unpredictable but not secret.',
  nonce: 'Number used once — a unique random value for each encryption operation. Reusing a nonce with the same key can be catastrophic.',
  block: 'AES always processes data in 16-byte (128-bit) chunks called blocks.',
  padding: 'Extra bytes added to make the plaintext a multiple of 16 bytes. PKCS#7 padding adds n bytes each with value n.',
  tag: 'An authentication tag computed by GCM mode. It detects any tampering with the ciphertext, IV, or additional data.',
  aad: 'Additional Authenticated Data — extra information (like a header) that is authenticated but not encrypted by GCM.',
  xor: 'XOR (exclusive-or) combines two bits: 0⊕0=0, 1⊕1=0, 0⊕1=1. Used in CBC chaining and CTR keystream application.',
  plaintext: 'The original, readable data before encryption.',
  ciphertext: 'The scrambled, encrypted data that is unreadable without the key.',
  authentication: 'Proof that the data has not been modified and came from someone who knows the key. GCM provides this; ECB, CBC, and CTR do not by themselves.',
  'key schedule': 'The process AES uses to derive round keys from the original key. AES-128 uses 10 rounds, AES-192 uses 12, and AES-256 uses 14.',
  'block cipher': 'A cipher that encrypts data in fixed-size chunks (blocks). AES always uses 128-bit (16-byte) blocks regardless of key size.',
  'stream cipher': 'A cipher that encrypts data one bit or byte at a time by XORing with a keystream. CTR mode turns AES into a stream cipher.',
  pkcs7: 'A padding scheme where n bytes of value n are appended. E.g., 3 bytes of 0x03 to reach a 16-byte boundary.',
  gcm: 'Galois/Counter Mode — combines CTR mode encryption with GHASH authentication, providing both confidentiality and integrity.',
  ecb: 'Electronic Codebook — the simplest AES mode; each block encrypted independently. Identical plaintext blocks produce identical ciphertext blocks, revealing patterns.',
  cbc: 'Cipher Block Chaining — each plaintext block is XORed with the previous ciphertext block before encryption, hiding patterns.',
  ctr: 'Counter Mode — encrypts a counter value XORed with a nonce to produce a keystream, then XORs that with the plaintext.',
}

export type GlossaryEntry = { term: string; definition: string }

export const GLOSSARY_ENTRIES: GlossaryEntry[] = Object.entries(GLOSSARY).map(([term, definition]) => ({
  term,
  definition,
}))
