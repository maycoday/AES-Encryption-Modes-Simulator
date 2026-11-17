import { useState } from 'react';
import { BookOpen, Layers, Shield, Key, Lock, HelpCircle, CheckCircle2 } from 'lucide-react';
import { encodeText } from '../crypto/encoding';
import { pkcs7Pad, checkPkcs7Padding } from '../crypto/aes';
import { GLOSSARY_ENTRIES } from '../data/glossary';
import Term from '../components/Term';

export default function Learn() {
  const [paddingInput, setPaddingInput] = useState('Hello CryptoLab!');
  const [activeTab, setActiveTab] = useState<'concepts' | 'padding' | 'rounds' | 'glossary'>('concepts');

  // Padding visualizer calculations
  const inputBytes = encodeText(paddingInput);
  const paddedBytes = pkcs7Pad(inputBytes);
  const padInfo = checkPkcs7Padding(paddedBytes);

  // Group into 16-byte blocks
  const blocks: Array<{ index: number; bytes: Array<{ val: number; isPad: boolean }> }> = [];
  for (let i = 0; i < paddedBytes.length; i += 16) {
    const chunk = paddedBytes.slice(i, i + 16);
    const blockBytes: Array<{ val: number; isPad: boolean }> = [];
    for (let b = 0; b < chunk.length; b++) {
      const globalIdx = i + b;
      blockBytes.push({
        val: chunk[b],
        isPad: globalIdx >= inputBytes.length,
      });
    }
    blocks.push({ index: i / 16 + 1, bytes: blockBytes });
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">AES Learning Center</h1>
            <p className="text-sm text-muted">
              Master the essentials of the Advanced Encryption Standard (AES) — from block ciphers and key sizes to PKCS#7 padding and AEAD.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        {[
          { id: 'concepts', label: '1. Core Concepts' },
          { id: 'padding', label: '2. PKCS#7 Padding Visualizer' },
          { id: 'rounds', label: '3. AES Round Structure' },
          { id: 'glossary', label: '4. Glossary of Terms' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Core Concepts */}
      {activeTab === 'concepts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Shield className="w-4 h-4" />
              What is AES?
            </div>
            <p className="text-xs text-muted leading-relaxed">
              AES (Advanced Encryption Standard) was designed by Belgian cryptographers Joan Daemen and Vincent Rijmen (under the name <strong>Rijndael</strong>) and selected by the US NIST in 2001 (FIPS 197). It is the world's most scrutinized and widely deployed symmetric block cipher.
            </p>
          </div>

          <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Key className="w-4 h-4" />
              Fixed 128-bit Block Size
            </div>
            <p className="text-xs text-muted leading-relaxed">
              A common misconception: regardless of whether you choose a 128-bit, 192-bit, or 256-bit key, <strong>the AES block size is ALWAYS 128 bits (16 bytes)</strong>! The key size affects only the number of internal transformation rounds:
            </p>
            <ul className="text-xs text-muted space-y-1 list-disc list-inside">
              <li>AES-128: 10 rounds</li>
              <li>AES-192: 12 rounds</li>
              <li>AES-256: 14 rounds</li>
            </ul>
          </div>

          <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Layers className="w-4 h-4" />
              Why do we need "Modes of Operation"?
            </div>
            <p className="text-xs text-muted leading-relaxed">
              AES itself can encrypt ONLY a single 16-byte block. Real files, messages, and streams are much longer. Modes of operation define the mathematical rules for repeatedly applying the block cipher to arbitrary lengths of data.
            </p>
          </div>

          <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Lock className="w-4 h-4" />
              Confidentiality vs Integrity vs Authenticity
            </div>
            <p className="text-xs text-muted leading-relaxed">
              <strong>Confidentiality:</strong> Hides the message from unauthorized readers (ECB, CBC, CTR).<br />
              <strong>Integrity:</strong> Detects if the ciphertext was modified in transit.<br />
              <strong>Authenticity:</strong> Proves who created the ciphertext.<br />
              <em>Only AEAD modes like <strong>AES-GCM</strong> provide all three simultaneously!</em>
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Interactive PKCS#7 Padding Visualizer */}
      {activeTab === 'padding' && (
        <div className="p-6 bg-card border border-border rounded-card shadow-card space-y-6">
          <div>
            <h2 className="text-base font-semibold text-text">Interactive PKCS#7 Padding Visualizer</h2>
            <p className="text-xs text-muted">
              Because block ciphers like ECB and CBC operate on strict 16-byte blocks, messages must be padded. PKCS#7 appends N bytes each having the numeric value N.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Type any text to see real-time block splitting & padding:</label>
            <input
              type="text"
              value={paddingInput}
              onChange={e => setPaddingInput(e.target.value)}
              className="w-full text-xs font-mono border border-border rounded-lg p-3 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Type anything..."
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-surface border border-border rounded-lg">
              <span className="text-muted block">Input Bytes</span>
              <span className="font-mono font-bold text-sm">{inputBytes.length} B</span>
            </div>
            <div className="p-2.5 bg-surface border border-border rounded-lg">
              <span className="text-muted block">Padding Bytes Added</span>
              <span className="font-mono font-bold text-sm text-primary">{padInfo.paddingBytes} B</span>
            </div>
            <div className="p-2.5 bg-surface border border-border rounded-lg">
              <span className="text-muted block">Padded Total</span>
              <span className="font-mono font-bold text-sm">{paddedBytes.length} B ({blocks.length} blocks)</span>
            </div>
          </div>

          {/* Block Visualizer Grid */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-semibold text-text block">16-Byte Block Division:</span>
            {blocks.map(b => (
              <div key={b.index} className="p-3 bg-surface rounded-xl border border-border space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-primary">Block #{b.index}</span>
                  <span className="text-muted font-mono">16 Bytes</span>
                </div>
                <div className="gap-1 font-mono text-center" style={{ display: 'grid', gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
                  {b.bytes.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-1 rounded text-xs border ${
                        item.isPad
                          ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                          : 'bg-white border-border text-text'
                      }`}
                      title={item.isPad ? `Padding byte value: 0x${item.val.toString(16).padStart(2, '0')}` : `Char: '${String.fromCharCode(item.val)}' (0x${item.val.toString(16).padStart(2, '0')})`}
                    >
                      <div className="text-[10px] text-muted">{item.val.toString(16).padStart(2, '0')}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            <strong>Key rule:</strong> Even if a message is ALREADY an exact multiple of 16 bytes, a full 16-byte padding block (16 bytes of 0x10) is ALWAYS appended. This ensures the receiver can never confuse data bytes with padding bytes!
          </div>
        </div>
      )}

      {/* Tab 3: AES Round Structure Static Diagram */}
      {activeTab === 'rounds' && (
        <div className="p-6 bg-card border border-border rounded-card shadow-card space-y-6">
          <div>
            <h2 className="text-base font-semibold text-text">Inside the AES Block Cipher (Substitution-Permutation Network)</h2>
            <p className="text-xs text-muted">
              Every 16-byte block is arranged as a 4 × 4 byte state matrix and passed through repeating transformation rounds.
            </p>
          </div>

          {/* Static SVG Diagram */}
          <div className="p-4 bg-surface rounded-xl border border-border flex justify-center">
            <svg className="w-full max-w-md h-72" viewBox="0 0 400 300">
              <rect x="130" y="10" width="140" height="28" rx="6" fill="#2563EB" fillOpacity="0.1" stroke="#2563EB" strokeWidth="1.5" />
              <text x="200" y="28" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="bold">Input State (16 Bytes)</text>

              <line x1="200" y1="38" x2="200" y2="55" stroke="#2563EB" strokeWidth="1.5" />

              <rect x="100" y="55" width="200" height="26" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
              <text x="200" y="72" textAnchor="middle" fill="#475569" fontSize="11">Initial AddRoundKey (K₀)</text>

              <line x1="200" y1="81" x2="200" y2="100" stroke="#2563EB" strokeWidth="1.5" />

              {/* Rounds Box */}
              <rect x="70" y="100" width="260" height="120" rx="8" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" strokeDasharray="4 4" />
              <text x="200" y="118" textAnchor="middle" fill="#2563EB" fontSize="11" fontWeight="bold">Repeating Rounds (10/12/14 rounds)</text>

              <rect x="90" y="128" width="105" height="24" rx="4" fill="#EFF6FF" stroke="#93C5FD" />
              <text x="142" y="144" textAnchor="middle" fill="#1E40AF" fontSize="10">1. SubBytes (S-Box)</text>

              <rect x="205" y="128" width="105" height="24" rx="4" fill="#EFF6FF" stroke="#93C5FD" />
              <text x="257" y="144" textAnchor="middle" fill="#1E40AF" fontSize="10">2. ShiftRows</text>

              <rect x="90" y="160" width="105" height="24" rx="4" fill="#EFF6FF" stroke="#93C5FD" />
              <text x="142" y="176" textAnchor="middle" fill="#1E40AF" fontSize="10">3. MixColumns*</text>

              <rect x="205" y="160" width="105" height="24" rx="4" fill="#EFF6FF" stroke="#93C5FD" />
              <text x="257" y="176" textAnchor="middle" fill="#1E40AF" fontSize="10">4. AddRoundKey</text>

              <text x="200" y="208" textAnchor="middle" fill="#94A3B8" fontSize="9">*MixColumns is omitted in the final round</text>

              <line x1="200" y1="220" x2="200" y2="245" stroke="#2563EB" strokeWidth="1.5" />

              <rect x="130" y="245" width="140" height="28" rx="6" fill="#2563EB" fillOpacity="0.1" stroke="#2563EB" strokeWidth="1.5" />
              <text x="200" y="263" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="bold">Output Ciphertext (16 B)</text>
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-muted">
            <div className="p-3 bg-surface rounded-lg border border-border">
              <strong className="text-text block mb-1">SubBytes:</strong> Non-linear byte substitution using the Rijndael S-box; provides confusion.
            </div>
            <div className="p-3 bg-surface rounded-lg border border-border">
              <strong className="text-text block mb-1">ShiftRows:</strong> Circular byte shift of rows 1, 2, and 3; provides diffusion across columns.
            </div>
            <div className="p-3 bg-surface rounded-lg border border-border">
              <strong className="text-text block mb-1">MixColumns:</strong> Matrix multiplication in GF(2⁸); provides high linear diffusion.
            </div>
            <div className="p-3 bg-surface rounded-lg border border-border">
              <strong className="text-text block mb-1">AddRoundKey:</strong> XORs the state matrix with the derived round key.
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Glossary */}
      {activeTab === 'glossary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {GLOSSARY_ENTRIES.map((entry, idx) => (
              <div key={idx} className="p-4 bg-card border border-border rounded-card shadow-card space-y-1">
                <span className="font-bold text-sm text-primary uppercase">{entry.term}</span>
                <p className="text-xs text-muted leading-relaxed">{entry.definition}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
