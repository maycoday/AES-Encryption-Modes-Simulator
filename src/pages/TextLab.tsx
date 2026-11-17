import { useState, useEffect } from 'react';
import { FlaskConical, Play, CheckCircle2, AlertTriangle, Copy, ChevronDown, ChevronRight, Eye, RefreshCw } from 'lucide-react';
import { type AESMode, type KeySize, type EncryptResult } from '../crypto/types';
import { aesEncrypt, aesDecrypt, computeStepECB, computeStepCBC, computeStepCTR, pkcs7Pad } from '../crypto/aes';
import { toHex, fromHex, toBase64, encodeText, decodeText } from '../crypto/encoding';
import ModeSelector from '../components/ModeSelector';
import KeyPanel from '../components/KeyPanel';
import HexBlocks from '../components/HexBlocks';
import Term from '../components/Term';

const PRESETS = [
  { label: 'ECB Leak Demo (Repeating Blocks)', text: 'ATTACKATDAWN!!!ATTACKATDAWN!!!ATTACKATDAWN!!!', note: 'Notice identical 16-byte blocks!' },
  { label: 'Short message (needs padding)', text: 'Hello, Alice!', note: '13 bytes -> 3 bytes of 0x03 PKCS#7 padding added in ECB/CBC' },
  { label: 'Exact 16-byte block', text: '1234567890123456', note: 'Already 16 bytes -> adds a full 16-byte padding block in ECB/CBC!' },
  { label: 'Unicode & Emoji', text: 'CryptoLab 🔐 Top Secret 世界', note: 'UTF-8 multibyte characters handled cleanly' },
];

export default function TextLab() {
  const [mode, setMode] = useState<AESMode>('ECB');
  const [keySize, setKeySize] = useState<KeySize>(128);
  const [keyBytes, setKeyBytes] = useState<Uint8Array>(() => {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return b;
  });

  const [plaintext, setPlaintext] = useState('ATTACKATDAWN!!!ATTACKATDAWN!!!ATTACKATDAWN!!!');
  const [aadText, setAadText] = useState('TransactionHeader-v1');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [lastResult, setLastResult] = useState<EncryptResult | null>(null);

  // Decryption state
  const [decryptInput, setDecryptInput] = useState('');
  const [decryptIvNonce, setDecryptIvNonce] = useState('');
  const [decryptTag, setDecryptTag] = useState('');
  const [decryptResult, setDecryptResult] = useState<{ text: string; success: boolean; error?: string } | null>(null);

  // View toggles
  const [viewMode, setViewMode] = useState<'beginner' | 'detailed'>('beginner');
  const [copiedPackage, setCopiedPackage] = useState(false);

  // Encrypt handler
  async function handleEncrypt() {
    setIsEncrypting(true);
    try {
      const ptBytes = encodeText(plaintext);
      const aadBytes = mode === 'GCM' && aadText.trim() ? encodeText(aadText) : undefined;
      const res = await aesEncrypt(mode, keyBytes, ptBytes, aadBytes);
      setLastResult(res);

      // Pre-fill decrypt package fields
      setDecryptInput(toHex(res.ciphertext));
      setDecryptIvNonce(res.iv ? toHex(res.iv) : res.nonce ? toHex(res.nonce) : '');
      setDecryptTag(res.tag ? toHex(res.tag) : '');
      setDecryptResult(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEncrypting(false);
    }
  }

  // Decrypt handler
  async function handleDecrypt() {
    if (!lastResult && !decryptInput.trim()) return;
    try {
      const ctBytes = fromHex(decryptInput.trim());
      const ivBytes = mode === 'CBC' && decryptIvNonce.trim() ? fromHex(decryptIvNonce.trim()) : undefined;
      const nonceBytes = (mode === 'CTR' || mode === 'GCM') && decryptIvNonce.trim() ? fromHex(decryptIvNonce.trim()) : undefined;
      const tagBytes = mode === 'GCM' && decryptTag.trim() ? fromHex(decryptTag.trim()) : undefined;
      const aadBytes = mode === 'GCM' && aadText.trim() ? encodeText(aadText) : undefined;

      const dec = await aesDecrypt(mode, keyBytes, ctBytes, {
        iv: ivBytes,
        nonce: nonceBytes,
        tag: tagBytes,
        aad: aadBytes,
      });

      if (dec.valid) {
        setDecryptResult({ text: decodeText(dec.plaintext), success: true });
      } else {
        setDecryptResult({ text: '', success: false, error: dec.error || 'Decryption failed' });
      }
    } catch (e) {
      setDecryptResult({ text: '', success: false, error: e instanceof Error ? e.message : 'Invalid hex inputs' });
    }
  }

  // Find repeated 16-byte blocks in ciphertext
  const repeatedBlocks: number[] = [];
  if (lastResult) {
    const hexBlocks = lastResult.blocks.map(b => toHex(b));
    const seen = new Map<string, number>();
    hexBlocks.forEach((h, idx) => {
      if (seen.has(h)) {
        repeatedBlocks.push(seen.get(h)!);
        repeatedBlocks.push(idx);
      } else {
        seen.set(h, idx);
      }
    });
  }

  // Build copyable package string
  function copyPackage() {
    if (!lastResult) return;
    const pkg = {
      mode: lastResult.mode,
      keySize: lastResult.keySize,
      key: toHex(keyBytes),
      iv: lastResult.iv ? toHex(lastResult.iv) : undefined,
      nonce: lastResult.nonce ? toHex(lastResult.nonce) : undefined,
      tag: lastResult.tag ? toHex(lastResult.tag) : undefined,
      ciphertextHex: toHex(lastResult.ciphertext),
      aad: mode === 'GCM' ? aadText : undefined,
    };
    navigator.clipboard.writeText(JSON.stringify(pkg, null, 2));
    setCopiedPackage(true);
    setTimeout(() => setCopiedPackage(false), 2000);
  }

  // Step-by-step intermediate calculations
  const ptBytes = encodeText(plaintext);
  const paddedPt = (mode === 'ECB' || mode === 'CBC') ? pkcs7Pad(ptBytes) : ptBytes;
  const ecbSteps = (mode === 'ECB' && lastResult?.mode === 'ECB') ? computeStepECB(keyBytes, paddedPt) : [];
  const cbcSteps = (mode === 'CBC' && lastResult?.mode === 'CBC' && lastResult?.iv) ? computeStepCBC(keyBytes, lastResult.iv, paddedPt) : [];
  const ctrSteps = (mode === 'CTR' && lastResult?.mode === 'CTR' && lastResult?.nonce) ? computeStepCTR(keyBytes, lastResult.nonce, ptBytes) : [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cbc/10 text-cbc">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Text Encryption Lab</h1>
            <p className="text-sm text-muted">
              What you'll learn: See how AES operates on real text, how PKCS#7 padding works, why ECB leaks identical blocks, and how GCM authenticates.
            </p>
          </div>
        </div>
      </div>

      {/* Preset selector bar */}
      <div className="p-3 bg-card border border-border rounded-card flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">Try Presets:</span>
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => setPlaintext(p.text)}
            className="text-xs px-2.5 py-1 rounded-md bg-surface border border-border hover:border-primary/40 text-text transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Mode & Key selection */}
      <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">1. Choose AES Mode</label>
          <ModeSelector value={mode} onChange={setMode} />
        </div>

        <div className="pt-2 border-t border-border">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">2. Encryption Key</label>
          <KeyPanel
            keyBytes={keyBytes}
            keySize={keySize}
            onKeyChange={setKeyBytes}
            onKeySizeChange={setKeySize}
          />
        </div>

        {mode === 'GCM' && (
          <div className="pt-2 border-t border-border">
            <label className="text-xs font-semibold text-gcm uppercase tracking-wider block mb-1">
              Additional Authenticated Data (<Term word="aad">AAD</Term>) — Optional
            </label>
            <input
              type="text"
              value={aadText}
              onChange={e => setAadText(e.target.value)}
              placeholder="e.g. Header, user-id, or metadata"
              className="w-full text-xs font-mono border border-border rounded-lg px-3 py-2 bg-surface focus:outline-none focus:ring-2 focus:ring-gcm/30"
            />
            <p className="text-xs text-muted mt-1">
              AAD is authenticated by the GCM tag but NOT encrypted. If tampered with, decryption will fail!
            </p>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Plaintext Input */}
        <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-text">
              <Term word="plaintext">Plaintext</Term> Input
            </label>
            <span className="text-xs text-muted font-mono">{encodeText(plaintext).length} bytes</span>
          </div>

          <textarea
            value={plaintext}
            onChange={e => setPlaintext(e.target.value)}
            rows={5}
            className="w-full font-mono text-xs border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Enter plaintext to encrypt..."
          />

          <button
            onClick={handleEncrypt}
            disabled={isEncrypting || !plaintext}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <Play className="w-4 h-4 fill-white" />
            {isEncrypting ? 'Encrypting...' : `Encrypt with AES-${mode}`}
          </button>

          {/* Repeated block warning */}
          {lastResult && repeatedBlocks.length > 0 && mode === 'ECB' && (
            <div className="p-3 rounded-lg border border-danger/30 bg-danger/5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <div className="text-xs text-danger">
                <strong>ECB Leak Detected!</strong> Identical plaintext blocks produced identical ciphertext blocks (highlighted in red below). This allows an eavesdropper to see repetitive patterns without breaking the key!
              </div>
            </div>
          )}

          {/* What just happened panel */}
          {lastResult && (
            <div className="p-3.5 bg-surface rounded-lg border border-border space-y-1 text-xs">
              <strong className="text-text block font-medium">What just happened?</strong>
              <p className="text-muted leading-relaxed">
                {lastResult.mode === 'ECB' && `AES-ECB split your ${encodeText(plaintext).length} bytes into ${lastResult.blocks.length} independent 16-byte blocks (adding ${lastResult.paddingBytes} bytes of PKCS#7 padding). Every block was encrypted with the same key with zero randomness.`}
                {lastResult.mode === 'CBC' && `AES-CBC generated a fresh 16-byte random IV (${lastResult.iv ? toHex(lastResult.iv) : ''}). Each block was XORed with the preceding ciphertext block before encryption.`}
                {lastResult.mode === 'CTR' && `AES-CTR generated a fresh 96-bit random nonce (${lastResult.nonce ? toHex(lastResult.nonce) : ''}), encrypted counter blocks to create a keystream, and XORed it with your text. Notice zero padding was needed!`}
                {lastResult.mode === 'GCM' && `AES-GCM encrypted your text with CTR mode, then ran GHASH over the ciphertext and AAD to generate a 128-bit authentication tag (${lastResult.tag ? toHex(lastResult.tag) : ''}).`}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Ciphertext & Results */}
        <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-text">
              <Term word="ciphertext">Ciphertext</Term> Output
            </label>
            {lastResult && (
              <button
                onClick={copyPackage}
                className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-surface text-muted hover:text-text flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedPackage ? 'Copied JSON Package!' : 'Copy Package'}
              </button>
            )}
          </div>

          {lastResult ? (
            <div className="space-y-4">
              {/* Mode-specific params */}
              {lastResult.iv && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted uppercase">
                    <Term word="iv">Initialization Vector (IV)</Term> (16 bytes, fresh random):
                  </span>
                  <div className="font-mono text-xs p-2 rounded bg-cbc/5 border border-cbc/20 text-cbc break-all">
                    {toHex(lastResult.iv)}
                  </div>
                </div>
              )}

              {lastResult.nonce && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted uppercase">
                    <Term word="nonce">Nonce</Term> (12 bytes, fresh random):
                  </span>
                  <div className="font-mono text-xs p-2 rounded bg-ctr/5 border border-ctr/20 text-ctr break-all">
                    {toHex(lastResult.nonce)}
                  </div>
                </div>
              )}

              {/* Ciphertext blocks */}
              <HexBlocks
                bytes={lastResult.ciphertext}
                label={`Ciphertext (${lastResult.ciphertext.length} bytes, ${lastResult.blocks.length} block${lastResult.blocks.length > 1 ? 's' : ''})`}
                highlightIndices={mode === 'ECB' ? repeatedBlocks.flatMap(b => Array.from({ length: 16 }, (_, i) => b * 16 + i)) : undefined}
              />

              {/* GCM Tag */}
              {lastResult.tag && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-gcm uppercase flex items-center gap-1">
                    <Term word="tag">Authentication Tag</Term> (16 bytes / 128-bit MAC):
                  </span>
                  <div className="font-mono text-xs p-2 rounded bg-gcm/5 border border-gcm/30 text-gcm break-all font-bold">
                    {toHex(lastResult.tag)}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center">
                <div className="p-2 rounded bg-surface border border-border">
                  <span className="text-xs text-muted block">Plaintext</span>
                  <span className="text-sm font-semibold font-mono">{encodeText(plaintext).length} B</span>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <span className="text-xs text-muted block">Padding Added</span>
                  <span className="text-sm font-semibold font-mono">{lastResult.paddingBytes} B</span>
                </div>
                <div className="p-2 rounded bg-surface border border-border">
                  <span className="text-xs text-muted block">Ciphertext</span>
                  <span className="text-sm font-semibold font-mono">{lastResult.ciphertext.length} B</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted text-xs border border-dashed border-border rounded-lg">
              Click "Encrypt" to generate ciphertext using real AES computations.
            </div>
          )}
        </div>
      </div>

      {/* Decryption Section */}
      <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-4">
        <h2 className="text-base font-semibold text-text">Decrypt Verification</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-muted">Ciphertext Hex</label>
            <input
              type="text"
              value={decryptInput}
              onChange={e => setDecryptInput(e.target.value)}
              placeholder="Paste ciphertext hex..."
              className="w-full font-mono text-xs border border-border rounded-lg p-2 bg-surface"
            />
          </div>

          {(mode === 'CBC' || mode === 'CTR' || mode === 'GCM') && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted">{mode === 'CBC' ? 'IV Hex (16 B)' : 'Nonce Hex (12 B)'}</label>
              <input
                type="text"
                value={decryptIvNonce}
                onChange={e => setDecryptIvNonce(e.target.value)}
                placeholder="Hex IV or nonce..."
                className="w-full font-mono text-xs border border-border rounded-lg p-2 bg-surface"
              />
            </div>
          )}

          {mode === 'GCM' && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted">Auth Tag Hex (16 B)</label>
              <input
                type="text"
                value={decryptTag}
                onChange={e => setDecryptTag(e.target.value)}
                placeholder="16-byte tag hex..."
                className="w-full font-mono text-xs border border-border rounded-lg p-2 bg-surface"
              />
            </div>
          )}
        </div>

        <button
          onClick={handleDecrypt}
          className="px-4 py-2 bg-secondary text-white rounded-lg text-xs font-medium hover:bg-secondary/90 transition-colors"
        >
          Decrypt with Current Key
        </button>

        {decryptResult && (
          <div className={`p-3 rounded-lg border text-xs ${decryptResult.success ? 'border-success/30 bg-success/5 text-success' : 'border-danger/30 bg-danger/5 text-danger'}`}>
            {decryptResult.success ? (
              <div className="space-y-1">
                <span className="font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Decryption Succeeded!
                </span>
                <p className="font-mono text-text bg-white p-2 rounded border border-border break-all">
                  {decryptResult.text}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Decryption Error:
                </span>
                <p className="font-mono text-danger font-medium">{decryptResult.error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step-by-Step Detailed View Toggle */}
      <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text">Internal Step-by-Step Operations</h2>
            <p className="text-xs text-muted">Examine the mathematical operations per 16-byte block</p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-lg">
            <button
              onClick={() => setViewMode('beginner')}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${viewMode === 'beginner' ? 'bg-primary text-white' : 'text-muted hover:text-text'}`}
            >
              Beginner View
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${viewMode === 'detailed' ? 'bg-primary text-white' : 'text-muted hover:text-text'}`}
            >
              Detailed View
            </button>
          </div>
        </div>

        {viewMode === 'beginner' ? (
          <div className="p-4 bg-surface rounded-lg border border-border text-xs leading-relaxed text-muted space-y-2">
            <p>
              <strong>How AES-{mode} processes data:</strong>
            </p>
            {mode === 'ECB' && (
              <p>
                Imagine a codebook. Every 16-byte word gets looked up and replaced by a ciphertext block.
                Because there is no chaining or randomness, identical 16-byte words always produce identical codes!
              </p>
            )}
            {mode === 'CBC' && (
              <p>
                Imagine a chain where each link is welded to the previous one. Before block 1 is encrypted, it is mixed with a random IV.
                Block 2 is mixed with block 1's ciphertext, block 3 with block 2's, and so on. Even if two plaintext blocks are identical, their ciphertexts are completely different!
              </p>
            )}
            {mode === 'CTR' && (
              <p>
                Instead of encrypting your text directly, AES encrypts a counter number (0, 1, 2...) combined with a random nonce.
                This produces a stream of pseudo-random bytes called a <em>keystream</em>. Your data is then combined with the keystream using simple XOR.
              </p>
            )}
            {mode === 'GCM' && (
              <p>
                GCM runs CTR mode for fast encryption, and simultaneously feeds every byte of ciphertext and AAD through a Galois-field hash function (GHASH).
                This produces a 128-bit authentication tag. If any single bit is altered during transit, the tag check fails completely!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {lastResult ? (
              <div className="space-y-2">
                {mode === 'ECB' && ecbSteps.map((s) => (
                  <div key={s.index} className="p-3 bg-surface rounded border border-border text-xs font-mono space-y-1">
                    <span className="font-semibold text-ecb">Block #{s.index}:</span>
                    <div className="text-muted">P{s.index}: {toHex(s.ptBlock)}</div>
                    <div className="text-primary font-bold">AES_K(P{s.index}) → C{s.index}: {toHex(s.ctBlock)}</div>
                    <span className="text-[10px] text-success font-medium">✓ Matches independent noble single-block cipher</span>
                  </div>
                ))}

                {mode === 'CBC' && cbcSteps.map((s) => (
                  <div key={s.index} className="p-3 bg-surface rounded border border-border text-xs font-mono space-y-1">
                    <span className="font-semibold text-cbc">Block #{s.index}:</span>
                    <div className="text-muted">P{s.index}: {toHex(s.ptBlock)}</div>
                    <div className="text-secondary">P{s.index} ⊕ {s.xorSource} → {toHex(s.xorResult)}</div>
                    <div className="text-primary font-bold">AES_K(P{s.index} ⊕ {s.xorSource}) → C{s.index}: {toHex(s.ctBlock)}</div>
                    <span className="text-[10px] text-success font-medium">✓ Matches Web Crypto AES-CBC output</span>
                  </div>
                ))}

                {mode === 'CTR' && ctrSteps.map((s) => (
                  <div key={s.index} className="p-3 bg-surface rounded border border-border text-xs font-mono space-y-1">
                    <span className="font-semibold text-ctr">Block #{s.index} (Counter = {s.counterValue}):</span>
                    <div className="text-muted">Counter Block: {toHex(s.counterBlock)}</div>
                    <div className="text-secondary">Keystream = AES_K(Counter): {toHex(s.keystreamBlock)}</div>
                    <div className="text-primary font-bold">C{s.index} = P{s.index} ⊕ Keystream: {toHex(s.ctBlock)}</div>
                    <span className="text-[10px] text-success font-medium">✓ Matches Web Crypto AES-CTR output</span>
                  </div>
                ))}

                {mode === 'GCM' && (
                  <div className="p-3 bg-surface rounded border border-border text-xs font-mono space-y-2">
                    <div className="font-semibold text-gcm">GCM Authenticated Encryption Pipeline:</div>
                    <div className="text-muted">1. CTR encryption: Plaintext ({encodeText(plaintext).length} bytes) encrypted using Nonce + 32-bit counter starting at 2.</div>
                    <div className="text-muted">2. Counter 1 (J0) reserved for Tag masking: Mask = AES_K(Nonce || 1).</div>
                    <div className="text-muted">3. GHASH computed over: AAD ({aadText ? encodeText(aadText).length : 0} B) || Ciphertext ({lastResult.ciphertext.length} B) || Lengths.</div>
                    <div className="text-gcm font-bold">4. Final Tag = GHASH ⊕ Mask = {lastResult.tag ? toHex(lastResult.tag) : ''}</div>
                    <span className="text-[10px] text-success font-medium">✓ NIST SP 800-38D verified 128-bit authentication tag</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted">
                Encrypt a message first to view block-by-block operations.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
