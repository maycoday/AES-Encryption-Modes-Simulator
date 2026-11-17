import { useState, useEffect } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Zap,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { type AESMode, type KeySize, type EncryptResult } from '../crypto/types';
import { aesEncrypt, aesDecrypt, rawDecryptNoPadding, checkPkcs7Padding } from '../crypto/aes';
import { toHex, fromHex, encodeText, decodeText } from '../crypto/encoding';
import KeyPanel from '../components/KeyPanel';
import Term from '../components/Term';

const DEFAULT_PLAINTEXT = 'Transfer Rs 100 to Alice. Ref: 12345678';

interface ModeState {
  mode: AESMode;
  originalCiphertext: Uint8Array;
  tamperedCiphertext: Uint8Array;
  iv?: Uint8Array;
  nonce?: Uint8Array;
  tag?: Uint8Array;
  tamperedTag?: Uint8Array;
  tamperedIvNonce?: Uint8Array;
  tamperedByteIndices: Set<number>;
  realDecryptResult?: { text: string; success: boolean; error?: string };
  rawDecryptResult?: { bytes: Uint8Array; text: string; paddingValid: boolean };
}

export default function TamperLab() {
  const [keySize, setKeySize] = useState<KeySize>(128);
  const [keyBytes, setKeyBytes] = useState<Uint8Array>(() => {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return b;
  });

  const [plaintext, setPlaintext] = useState(DEFAULT_PLAINTEXT);
  const [aadText, setAadText] = useState('TransactionHeader-v1');
  const [tamperedAad, setTamperedAad] = useState(false);

  const [activeTab, setActiveTab] = useState<AESMode>('CTR');
  const [modeStates, setModeStates] = useState<Record<AESMode, ModeState> | null>(null);

  // Attacker mode state
  const [attackerOldText, setAttackerOldText] = useState('100');
  const [attackerNewText, setAttackerNewText] = useState('900');
  const [attackerSuccessMsg, setAttackerSuccessMsg] = useState('');

  // Initial encryption setup
  useEffect(() => {
    encryptAll();
  }, [keyBytes, plaintext]);

  async function encryptAll() {
    const pt = encodeText(plaintext);
    const modes: AESMode[] = ['ECB', 'CBC', 'CTR', 'GCM'];
    const newStates: Partial<Record<AESMode, ModeState>> = {};

    for (const m of modes) {
      const aadBytes = m === 'GCM' && aadText ? encodeText(aadText) : undefined;
      const enc = await aesEncrypt(m, keyBytes, pt, aadBytes);

      newStates[m] = {
        mode: m,
        originalCiphertext: enc.ciphertext,
        tamperedCiphertext: new Uint8Array(enc.ciphertext),
        iv: enc.iv,
        nonce: enc.nonce,
        tag: enc.tag,
        tamperedTag: enc.tag ? new Uint8Array(enc.tag) : undefined,
        tamperedIvNonce: enc.iv ? new Uint8Array(enc.iv) : enc.nonce ? new Uint8Array(enc.nonce) : undefined,
        tamperedByteIndices: new Set<number>(),
      };
    }

    setModeStates(newStates as Record<AESMode, ModeState>);
    setTamperedAad(false);
  }

  // Toggle single bit in ciphertext byte
  function flipByte(mode: AESMode, byteIdx: number) {
    if (!modeStates) return;
    const current = modeStates[mode];
    const newCt = new Uint8Array(current.tamperedCiphertext);
    const newIndices = new Set(current.tamperedByteIndices);

    // Flip lowest bit
    newCt[byteIdx] ^= 0x01;

    if (newCt[byteIdx] === current.originalCiphertext[byteIdx]) {
      newIndices.delete(byteIdx);
    } else {
      newIndices.add(byteIdx);
    }

    setModeStates({
      ...modeStates,
      [mode]: {
        ...current,
        tamperedCiphertext: newCt,
        tamperedByteIndices: newIndices,
        realDecryptResult: undefined,
        rawDecryptResult: undefined,
      },
    });
  }

  // Reset tampering for current mode
  function resetTampering(mode: AESMode) {
    if (!modeStates) return;
    const current = modeStates[mode];
    setModeStates({
      ...modeStates,
      [mode]: {
        ...current,
        tamperedCiphertext: new Uint8Array(current.originalCiphertext),
        tamperedTag: current.tag ? new Uint8Array(current.tag) : undefined,
        tamperedByteIndices: new Set<number>(),
        realDecryptResult: undefined,
        rawDecryptResult: undefined,
      },
    });
  }

  // Run decryption on tampered ciphertext
  async function runDecrypt(mode: AESMode) {
    if (!modeStates) return;
    const current = modeStates[mode];
    const aadToUse = mode === 'GCM'
      ? encodeText(tamperedAad ? aadText + '-tampered' : aadText)
      : undefined;

    // 1. Standard application decrypt
    const realDec = await aesDecrypt(mode, keyBytes, current.tamperedCiphertext, {
      iv: current.iv,
      nonce: current.nonce,
      tag: current.tamperedTag,
      aad: aadToUse,
    });

    let realResult: { text: string; success: boolean; error?: string };
    if (realDec.valid) {
      realResult = { text: decodeText(realDec.plaintext), success: true };
    } else {
      realResult = { text: '', success: false, error: realDec.error || 'Decryption rejected' };
    }

    // 2. Raw learning decrypt (for ECB and CBC)
    let rawResult: { bytes: Uint8Array; text: string; paddingValid: boolean } | undefined;
    if (mode === 'ECB' || mode === 'CBC') {
      const rawBytes = rawDecryptNoPadding(mode, keyBytes, current.tamperedCiphertext, current.iv);
      const padCheck = checkPkcs7Padding(rawBytes);
      // Clean string representation replacing unprintable ASCII with replacement char
      let safeStr = '';
      for (let i = 0; i < rawBytes.length; i++) {
        const b = rawBytes[i];
        safeStr += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '';
      }
      rawResult = { bytes: rawBytes, text: safeStr, paddingValid: padCheck.valid };
    }

    setModeStates({
      ...modeStates,
      [mode]: {
        ...current,
        realDecryptResult: realResult,
        rawDecryptResult: rawResult,
      },
    });
  }

  // CTR Attacker Mode: malleability forge without the key!
  function executeAttackerForge() {
    if (!modeStates) return;
    const origPtStr = plaintext;
    const targetIdx = origPtStr.indexOf(attackerOldText);
    if (targetIdx === -1) {
      alert(`Text "${attackerOldText}" not found in current plaintext.`);
      return;
    }
    if (attackerOldText.length !== attackerNewText.length) {
      alert('Replacement text must be the exact same length to demonstrate bit-flip forgery.');
      return;
    }

    const current = modeStates['CTR'];
    const forgedCt = new Uint8Array(current.tamperedCiphertext);
    const newIndices = new Set(current.tamperedByteIndices);

    // XOR mask: old XOR new
    const oldBytes = encodeText(attackerOldText);
    const newBytes = encodeText(attackerNewText);

    for (let i = 0; i < oldBytes.length; i++) {
      const byteOffset = targetIdx + i;
      const mask = oldBytes[i] ^ newBytes[i];
      forgedCt[byteOffset] ^= mask;
      newIndices.add(byteOffset);
    }

    setModeStates({
      ...modeStates,
      CTR: {
        ...current,
        tamperedCiphertext: forgedCt,
        tamperedByteIndices: newIndices,
      },
    });

    setAttackerSuccessMsg(`XOR mask applied to bytes ${targetIdx}..${targetIdx + oldBytes.length - 1} without knowing the AES key! Click "Decrypt" to see the forged text.`);
  }

  const activeState = modeStates ? modeStates[activeTab] : null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-danger/10 text-danger">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Ciphertext Tampering Lab</h1>
            <p className="text-sm text-muted">
              What you'll learn: Encryption alone does NOT protect integrity! See how bit-flipping garbles ECB, creates predictable modifications in CBC/CTR, and why GCM is the only mode that catches tampering.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Plaintext & Key */}
      <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">1. Plaintext Message</label>
          <input
            type="text"
            value={plaintext}
            onChange={e => setPlaintext(e.target.value)}
            className="w-full font-mono text-xs border border-border rounded-lg p-2.5 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="pt-2 border-t border-border">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">2. Shared Secret Key</label>
          <KeyPanel
            keyBytes={keyBytes}
            keySize={keySize}
            onKeyChange={setKeyBytes}
            onKeySizeChange={setKeySize}
          />
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-border gap-2">
        {(['CTR', 'CBC', 'ECB', 'GCM'] as AESMode[]).map(m => (
          <button
            key={m}
            onClick={() => setActiveTab(m)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === m
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            AES-{m} {m === 'GCM' && '🛡️ (AEAD)'}
          </button>
        ))}
      </div>

      {activeState && (
        <div className="space-y-6">
          {/* Attacker Mode Banner (Featured on CTR and GCM) */}
          {activeTab === 'CTR' && (
            <div className="p-4 rounded-card border-2 border-secondary bg-secondary/5 space-y-3">
              <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                <Zap className="w-5 h-5" />
                Featured: "Attacker Mode" — CTR Bit-Flipping Forgery (No Key Needed!)
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Because CTR mode is a stream cipher that simple XORs keystream with plaintext (C = P ⊕ K), an attacker who knows the message format can change any character by flipping bits in the ciphertext (C' = C ⊕ (P_old ⊕ P_new)) without knowing the AES key!
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-muted">Change:</span>
                <input
                  type="text"
                  value={attackerOldText}
                  onChange={e => setAttackerOldText(e.target.value)}
                  className="w-20 px-2 py-1 text-xs font-mono border border-border rounded bg-white text-center"
                />
                <span className="text-xs text-muted">to:</span>
                <input
                  type="text"
                  value={attackerNewText}
                  onChange={e => setAttackerNewText(e.target.value)}
                  className="w-20 px-2 py-1 text-xs font-mono border border-border rounded bg-white text-center font-bold text-danger"
                />
                <button
                  onClick={executeAttackerForge}
                  className="px-3 py-1 bg-secondary text-white rounded text-xs font-medium hover:bg-secondary/90 transition-colors"
                >
                  Apply Forgery Mask
                </button>
              </div>
              {attackerSuccessMsg && (
                <div className="text-xs text-secondary font-medium pt-1">
                  ✓ {attackerSuccessMsg}
                </div>
              )}
            </div>
          )}

          {activeTab === 'GCM' && (
            <div className="p-4 rounded-card border-2 border-success bg-success/5 space-y-2">
              <div className="flex items-center gap-2 text-success font-bold text-sm">
                <ShieldAlert className="w-5 h-5" />
                GCM Tamper-Proofing Guarantee
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Any modification to the ciphertext, authentication tag, nonce, or AAD causes GCM decryption to fail immediately. No corrupted plaintext is ever released to the application!
              </p>
              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={() => {
                    if (activeState.tamperedTag) {
                      const t = new Uint8Array(activeState.tamperedTag);
                      t[0] ^= 0x01;
                      setModeStates({
                        ...modeStates!,
                        GCM: { ...activeState, tamperedTag: t },
                      });
                    }
                  }}
                  className="text-xs px-2.5 py-1 bg-white border border-border rounded hover:bg-surface text-danger font-medium"
                >
                  Tamper with Auth Tag
                </button>

                <button
                  onClick={() => setTamperedAad(v => !v)}
                  className={`text-xs px-2.5 py-1 border rounded font-medium ${tamperedAad ? 'bg-danger text-white border-danger' : 'bg-white border-border text-muted'}`}
                >
                  {tamperedAad ? 'AAD is Tampered!' : 'Tamper with AAD Header'}
                </button>
              </div>
            </div>
          )}

          {/* Interactive Clickable Ciphertext Byte Grid */}
          <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text">
                  Click any byte below to flip its bits (tampering demo)
                </h3>
                <span className="text-xs text-muted">
                  Tampered bytes turn <strong className="text-danger">RED</strong>. Click again to restore.
                </span>
              </div>
              <button
                onClick={() => resetTampering(activeTab)}
                className="text-xs px-2.5 py-1 rounded border border-border hover:bg-surface text-muted flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Hex Grid */}
            <div className="p-3 bg-surface rounded-lg border border-border font-mono text-xs flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {Array.from(activeState.tamperedCiphertext).map((byte, idx) => {
                const isTampered = activeState.tamperedByteIndices.has(idx);
                const blockNum = Math.floor(idx / 16) + 1;
                return (
                  <button
                    key={idx}
                    onClick={() => flipByte(activeTab, idx)}
                    title={`Byte ${idx} (Block #${blockNum}). Click to flip bit.`}
                    className={`w-7 h-7 flex items-center justify-center rounded font-bold transition-all ${
                      isTampered
                        ? 'bg-danger text-white scale-110 shadow-sm'
                        : 'bg-card border border-border text-text hover:border-primary'
                    }`}
                  >
                    {byte.toString(16).padStart(2, '0')}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => runDecrypt(activeTab)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Decrypt Tampered Data with AES-{activeTab}
            </button>
          </div>

          {/* Decryption Comparison: Real Application vs Raw Decrypted Bytes */}
          {activeState.realDecryptResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Real Application View */}
              <div className="p-4 bg-card border border-border rounded-card shadow-card space-y-2">
                <span className="text-xs font-semibold text-muted uppercase block">
                  1. Real Application Output (Web Crypto API)
                </span>
                {activeState.realDecryptResult.success ? (
                  <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 text-xs font-mono break-all space-y-1">
                    <div className="text-warning font-bold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Message accepted without error!
                    </div>
                    <div className="text-text pt-1">{activeState.realDecryptResult.text}</div>
                    <p className="text-[11px] text-muted font-sans pt-1">
                      Notice: The application has NO idea this ciphertext was tampered with!
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-danger/30 bg-danger/5 text-xs font-mono space-y-1">
                    <div className="text-danger font-bold flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Decryption Rejected!
                    </div>
                    <div className="text-danger">{activeState.realDecryptResult.error}</div>
                    <p className="text-[11px] text-muted font-sans pt-1">
                      {activeTab === 'GCM'
                        ? 'GCM detected the modification and refused to release any plaintext.'
                        : 'Padding error: corrupted bytes in the last block produced an illegal PKCS#7 pad.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Raw Bytes Learning View (For ECB and CBC) */}
              {activeState.rawDecryptResult && (
                <div className="p-4 bg-card border border-border rounded-card shadow-card space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted uppercase">
                      2. Raw Decrypted Bytes (Educational view)
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeState.rawDecryptResult.paddingValid ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      Padding: {activeState.rawDecryptResult.paddingValid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-surface text-xs font-mono break-all space-y-1">
                    <div className="text-muted text-[10px]">What actually arrived at the cipher core:</div>
                    <div className="text-text font-bold pt-1">{activeState.rawDecryptResult.text}</div>
                  </div>
                  <p className="text-[11px] text-muted leading-tight">
                    {activeTab === 'ECB' && 'In ECB, flipping a bit corrupts ONLY that single 16-byte block into random garbage. Other blocks are unaffected.'}
                    {activeTab === 'CBC' && 'In CBC, flipping a bit in block N completely scrambles block N, AND causes the EXACT same bit to flip in block N+1 (controlled corruption)!'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Educational Summary Card */}
          <div className="p-5 bg-surface border border-border rounded-card space-y-2 text-xs text-muted leading-relaxed">
            <strong className="text-text block font-medium">Expected Security Behaviors Summary:</strong>
            <ul className="space-y-1.5 list-disc list-inside">
              <li><strong>ECB:</strong> Tampering one block scrambles that block only. No error is thrown if padding isn't broken.</li>
              <li><strong>CBC:</strong> Bit flips in block C[i] scramble P[i] into garbage and predictably flip the same bit in P[i+1]. Vulnerable to padding-oracle attacks!</li>
              <li><strong>CTR:</strong> Bit flips in C[i] flip the EXACT bit in P[i] with zero collateral damage. Highly malleable — easily forged without the key!</li>
              <li><strong>GCM:</strong> 100% tamper-evident. The 128-bit authentication tag mathematically guarantees both integrity and authenticity.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
