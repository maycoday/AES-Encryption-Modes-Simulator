import { useState } from 'react'

const GLOSSARY: Record<string, string> = {
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
}

export default function Term({ word, children }: { word: string; children?: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const def = GLOSSARY[word.toLowerCase()]

  return (
    <span className="relative inline-block">
      <span
        className="underline decoration-dotted decoration-primary cursor-help text-primary"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        tabIndex={0}
      >
        {children ?? word}
      </span>
      {show && def && (
        <span className="absolute bottom-full left-0 z-50 w-64 p-3 bg-text text-white text-xs rounded-lg shadow-xl leading-relaxed mb-1">
          <strong className="block mb-1 capitalize">{word}</strong>
          {def}
        </span>
      )}
    </span>
  )
}
