import { useState } from 'react';
import { BarChart3, CheckCircle2, XCircle, ArrowRight, ShieldCheck, ChevronRight, Play } from 'lucide-react';
import { type AESMode } from '../crypto/types';
import Term from '../components/Term';

interface ModeComparisonRow {
  property: string;
  ecb: string;
  cbc: string;
  ctr: string;
  gcm: string;
  category: 'core' | 'security' | 'perf';
}

const COMPARISON_ROWS: ModeComparisonRow[] = [
  { property: 'Full Name', ecb: 'Electronic Codebook', cbc: 'Cipher Block Chaining', ctr: 'Counter Mode', gcm: 'Galois/Counter Mode', category: 'core' },
  { property: 'Analogy', ecb: 'Direct codebook lookup', cbc: 'Welded chain links', ctr: 'Pseudo-random stream mask', gcm: 'Stream mask + tamper seal', category: 'core' },
  { property: 'IV / Nonce', ecb: 'None (critical weakness)', cbc: '16-byte random IV', ctr: 'Unique 12-byte nonce', gcm: 'Unique 12-byte nonce (NEVER reuse!)', category: 'security' },
  { property: 'Padding Required', ecb: 'Yes (PKCS#7 to 16 bytes)', cbc: 'Yes (PKCS#7 to 16 bytes)', ctr: 'None (stream cipher)', gcm: 'None (stream cipher)', category: 'core' },
  { property: 'Confidentiality', ecb: 'Poor (leaks patterns)', cbc: 'Yes (semantic security)', ctr: 'Yes (semantic security)', gcm: 'Yes (semantic security)', category: 'security' },
  { property: 'Integrity / Auth', ecb: 'No', cbc: 'No (needs separate MAC)', ctr: 'No (malleable)', gcm: 'Yes (128-bit GHASH tag)', category: 'security' },
  { property: 'Parallel Encrypt', ecb: 'Yes', cbc: 'No (sequential chain)', ctr: 'Yes', gcm: 'Yes', category: 'perf' },
  { property: 'Parallel Decrypt', ecb: 'Yes', cbc: 'Yes', ctr: 'Yes', gcm: 'Yes', category: 'perf' },
  { property: 'Tampering Effect', ecb: 'Corrupts 1 block', cbc: 'Garbles 1 block + flips next', ctr: 'Flips exact same plaintext bit', gcm: 'Rejected immediately! 0 plaintext', category: 'security' },
  { property: 'Recommended For', ecb: 'NEVER use in production', cbc: 'Legacy compatibility only', ctr: 'Custom authenticated setups', gcm: 'DEFAULT choice for all modern apps', category: 'core' },
];

export default function Compare() {
  const [filterCategory, setFilterCategory] = useState<'all' | 'core' | 'security' | 'perf'>('all');
  const [selectedDiagramMode, setSelectedDiagramMode] = useState<AESMode>('GCM');
  const [diagramStep, setDiagramStep] = useState<number>(1);

  // Decision helper state
  const [decisionAnswers, setDecisionAnswers] = useState<{
    integrityNeeded?: boolean;
    legacySystem?: boolean;
    streamNeeded?: boolean;
  }>({});

  const filteredRows = filterCategory === 'all'
    ? COMPARISON_ROWS
    : COMPARISON_ROWS.filter(r => r.category === filterCategory);

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gcm/10 text-gcm">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">AES Modes Comparison</h1>
            <p className="text-sm text-muted">
              Compare ECB, CBC, CTR, and GCM side-by-side across security guarantees, performance characteristics, and real-world vulnerabilities.
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text">Feature Matrix</h2>
          <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg text-xs">
            {(['all', 'core', 'security', 'perf'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded capitalize font-medium transition-colors ${filterCategory === cat ? 'bg-primary text-white' : 'text-muted hover:text-text'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface text-muted">
                <th className="p-3 font-semibold">Property</th>
                <th className="p-3 font-semibold text-ecb">AES-ECB</th>
                <th className="p-3 font-semibold text-cbc">AES-CBC</th>
                <th className="p-3 font-semibold text-ctr">AES-CTR</th>
                <th className="p-3 font-semibold text-gcm">AES-GCM (AEAD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.map((r, i) => (
                <tr key={i} className="hover:bg-surface/50 transition-colors">
                  <td className="p-3 font-medium text-text">{r.property}</td>
                  <td className="p-3 text-muted">{r.ecb}</td>
                  <td className="p-3 text-muted">{r.cbc}</td>
                  <td className="p-3 text-muted">{r.ctr}</td>
                  <td className="p-3 font-semibold text-gcm">{r.gcm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Mode Diagram */}
      <div className="p-6 bg-card border border-border rounded-card shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-text">Interactive Encryption Flow Diagrams</h2>
            <p className="text-xs text-muted">Step through blocks 1, 2, and 3 to see how data flows through the cipher</p>
          </div>
          <div className="flex gap-1">
            {(['ECB', 'CBC', 'CTR', 'GCM'] as AESMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setSelectedDiagramMode(m); setDiagramStep(1); }}
                className={`px-3 py-1.5 rounded text-xs font-semibold border ${selectedDiagramMode === m ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-muted'}`}
              >
                AES-{m}
              </button>
            ))}
          </div>
        </div>

        {/* Step-through control */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-xs font-medium text-muted">Step through block:</span>
          {[1, 2, 3].map(step => (
            <button
              key={step}
              onClick={() => setDiagramStep(step)}
              className={`w-7 h-7 rounded text-xs font-bold ${diagramStep === step ? 'bg-primary text-white' : 'bg-surface border border-border text-muted hover:text-text'}`}
            >
              #{step}
            </button>
          ))}
        </div>

        {/* SVG Diagram Canvas */}
        <div className="p-4 bg-surface rounded-xl border border-border flex flex-col items-center justify-center">
          <svg className="w-full max-w-xl h-44" viewBox="0 0 600 180">
            {/* Diagram for ECB */}
            {selectedDiagramMode === 'ECB' && (
              <g>
                <rect x="50" y="20" width="120" height="35" rx="6" fill="#EA580C" fillOpacity="0.1" stroke="#EA580C" strokeWidth="2" />
                <text x="110" y="42" textAnchor="middle" fill="#0F172A" fontSize="12" fontWeight="600">Plaintext P{diagramStep}</text>

                <line x1="110" y1="55" x2="110" y2="85" stroke="#EA580C" strokeWidth="2" markerEnd="url(#arrow)" />

                <rect x="50" y="85" width="120" height="40" rx="6" fill="#FFFFFF" stroke="#EA580C" strokeWidth="2" />
                <text x="110" y="105" textAnchor="middle" fill="#EA580C" fontSize="12" fontWeight="bold">AES Encrypt (K)</text>
                <text x="110" y="118" textAnchor="middle" fill="#64748B" fontSize="9">Direct Codebook</text>

                <line x1="110" y1="125" x2="110" y2="155" stroke="#EA580C" strokeWidth="2" />

                <rect x="50" y="155" width="120" height="35" rx="6" fill="#EA580C" fillOpacity="0.1" stroke="#EA580C" strokeWidth="2" />
                <text x="110" y="177" textAnchor="middle" fill="#0F172A" fontSize="12" fontWeight="600">Ciphertext C{diagramStep}</text>

                {/* Explanatory callout */}
                <rect x="230" y="40" width="320" height="100" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
                <text x="250" y="65" fill="#EA580C" fontSize="13" fontWeight="bold">ECB Step {diagramStep}: Independent Block</text>
                <text x="250" y="90" fill="#475569" fontSize="11">C{diagramStep} = AES_K(P{diagramStep})</text>
                <text x="250" y="110" fill="#64748B" fontSize="10">Zero IV, zero chaining. Identical blocks output identical ciphertext.</text>
              </g>
            )}

            {/* Diagram for CBC */}
            {selectedDiagramMode === 'CBC' && (
              <g>
                <rect x="40" y="20" width="100" height="30" rx="6" fill="#2563EB" fillOpacity="0.1" stroke="#2563EB" strokeWidth="1.5" />
                <text x="90" y="40" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="600">Plaintext P{diagramStep}</text>

                <line x1="90" y1="50" x2="90" y2="70" stroke="#2563EB" strokeWidth="1.5" />

                {/* XOR Circle */}
                <circle cx="90" cy="80" r="12" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2" />
                <text x="90" y="85" textAnchor="middle" fill="#2563EB" fontSize="14" fontWeight="bold">⊕</text>

                {/* IV or previous block input */}
                <line x1="10" y1="80" x2="78" y2="80" stroke="#2563EB" strokeWidth="1.5" />
                <text x="40" y="73" textAnchor="middle" fill="#2563EB" fontSize="10" fontWeight="600">{diagramStep === 1 ? 'IV' : `C${diagramStep - 1}`}</text>

                <line x1="90" y1="92" x2="90" y2="110" stroke="#2563EB" strokeWidth="1.5" />

                <rect x="35" y="110" width="110" height="30" rx="6" fill="#FFFFFF" stroke="#2563EB" strokeWidth="1.5" />
                <text x="90" y="129" textAnchor="middle" fill="#2563EB" fontSize="11" fontWeight="bold">AES Encrypt (K)</text>

                <line x1="90" y1="140" x2="90" y2="155" stroke="#2563EB" strokeWidth="1.5" />

                <rect x="40" y="155" width="100" height="30" rx="6" fill="#2563EB" fillOpacity="0.1" stroke="#2563EB" strokeWidth="1.5" />
                <text x="90" y="174" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="600">Ciphertext C{diagramStep}</text>

                {/* Explanatory callout */}
                <rect x="220" y="40" width="340" height="100" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
                <text x="240" y="65" fill="#2563EB" fontSize="13" fontWeight="bold">CBC Step {diagramStep}: Chaining with {diagramStep === 1 ? 'Random IV' : `Previous Block C${diagramStep - 1}`}</text>
                <text x="240" y="90" fill="#475569" fontSize="11">C{diagramStep} = AES_K(P{diagramStep} ⊕ {diagramStep === 1 ? 'IV' : `C${diagramStep - 1}`})</text>
                <text x="240" y="110" fill="#64748B" fontSize="10">Sequential encryption. Every block depends on all prior blocks.</text>
              </g>
            )}

            {/* Diagram for CTR */}
            {selectedDiagramMode === 'CTR' && (
              <g>
                <rect x="30" y="20" width="130" height="30" rx="6" fill="#7C3AED" fillOpacity="0.1" stroke="#7C3AED" strokeWidth="1.5" />
                <text x="95" y="40" textAnchor="middle" fill="#0F172A" fontSize="10" fontWeight="600">Nonce || Counter ({diagramStep - 1})</text>

                <line x1="95" y1="50" x2="95" y2="70" stroke="#7C3AED" strokeWidth="1.5" />

                <rect x="40" y="70" width="110" height="30" rx="6" fill="#FFFFFF" stroke="#7C3AED" strokeWidth="1.5" />
                <text x="95" y="89" textAnchor="middle" fill="#7C3AED" fontSize="11" fontWeight="bold">AES Encrypt (K)</text>

                <line x1="95" y1="100" x2="95" y2="120" stroke="#7C3AED" strokeWidth="1.5" />

                {/* XOR with Plaintext */}
                <circle cx="95" cy="130" r="12" fill="#FFFFFF" stroke="#7C3AED" strokeWidth="2" />
                <text x="95" y="135" textAnchor="middle" fill="#7C3AED" fontSize="14" fontWeight="bold">⊕</text>

                <line x1="10" y1="130" x2="83" y2="130" stroke="#7C3AED" strokeWidth="1.5" />
                <text x="45" y="123" textAnchor="middle" fill="#0F172A" fontSize="10" fontWeight="600">Plaintext P{diagramStep}</text>

                <line x1="95" y1="142" x2="95" y2="155" stroke="#7C3AED" strokeWidth="1.5" />

                <rect x="40" y="155" width="110" height="30" rx="6" fill="#7C3AED" fillOpacity="0.1" stroke="#7C3AED" strokeWidth="1.5" />
                <text x="95" y="174" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="600">Ciphertext C{diagramStep}</text>

                {/* Explanatory callout */}
                <rect x="220" y="40" width="340" height="100" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
                <text x="240" y="65" fill="#7C3AED" fontSize="13" fontWeight="bold">CTR Step {diagramStep}: Keystream Generation</text>
                <text x="240" y="90" fill="#475569" fontSize="11">Keystream = AES_K(Nonce || {diagramStep - 1})</text>
                <text x="240" y="110" fill="#64748B" fontSize="10">C{diagramStep} = P{diagramStep} ⊕ Keystream. Fast, parallelizable stream mode.</text>
              </g>
            )}

            {/* Diagram for GCM */}
            {selectedDiagramMode === 'GCM' && (
              <g>
                <rect x="30" y="20" width="120" height="30" rx="6" fill="#059669" fillOpacity="0.1" stroke="#059669" strokeWidth="1.5" />
                <text x="90" y="39" textAnchor="middle" fill="#0F172A" fontSize="10" fontWeight="600">CTR Encryption (Nonce)</text>

                <line x1="90" y1="50" x2="90" y2="80" stroke="#059669" strokeWidth="1.5" />

                <rect x="30" y="80" width="120" height="30" rx="6" fill="#059669" fillOpacity="0.1" stroke="#059669" strokeWidth="1.5" />
                <text x="90" y="99" textAnchor="middle" fill="#0F172A" fontSize="10" fontWeight="600">Ciphertext C{diagramStep}</text>

                <line x1="150" y1="95" x2="200" y2="95" stroke="#059669" strokeWidth="1.5" />

                <rect x="200" y="80" width="140" height="30" rx="6" fill="#FFFFFF" stroke="#059669" strokeWidth="1.5" />
                <text x="270" y="99" textAnchor="middle" fill="#059669" fontSize="10" fontWeight="bold">GHASH (GF(2¹²⁸))</text>

                <line x1="270" y1="110" x2="270" y2="140" stroke="#059669" strokeWidth="1.5" />

                <rect x="200" y="140" width="140" height="30" rx="6" fill="#059669" fillOpacity="0.2" stroke="#059669" strokeWidth="2" />
                <text x="270" y="159" textAnchor="middle" fill="#059669" fontSize="11" fontWeight="bold">128-bit Tag 🛡️</text>

                {/* Explanatory callout */}
                <rect x="370" y="30" width="210" height="120" rx="8" fill="#FFFFFF" stroke="#E2E8F0" />
                <text x="385" y="55" fill="#059669" fontSize="12" fontWeight="bold">GCM AEAD Flow</text>
                <text x="385" y="75" fill="#475569" fontSize="10">1. CTR encrypts P{diagramStep}</text>
                <text x="385" y="95" fill="#475569" fontSize="10">2. Ciphertext fed to GHASH</text>
                <text x="385" y="115" fill="#475569" fontSize="10">3. Tag seals message integrity</text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Decision Helper: Which mode should I use? */}
      <div className="p-6 bg-card border border-border rounded-card shadow-card space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-base">
          <ShieldCheck className="w-5 h-5" />
          Interactive Helper: "Which AES mode should I use?"
        </div>
        <p className="text-xs text-muted leading-relaxed">
          Answer two simple questions to receive an authoritative cryptographic recommendation:
        </p>

        <div className="space-y-3 pt-2">
          <div className="p-3 bg-surface rounded-lg border border-border flex items-center justify-between">
            <span className="text-xs font-medium text-text">Do you need to protect against tampering and data modification?</span>
            <div className="flex gap-2">
              <button
                onClick={() => setDecisionAnswers({ ...decisionAnswers, integrityNeeded: true })}
                className={`text-xs px-3 py-1 rounded font-medium border ${decisionAnswers.integrityNeeded === true ? 'bg-primary text-white border-primary' : 'bg-white border-border text-muted'}`}
              >
                Yes (Almost always!)
              </button>
              <button
                onClick={() => setDecisionAnswers({ ...decisionAnswers, integrityNeeded: false })}
                className={`text-xs px-3 py-1 rounded font-medium border ${decisionAnswers.integrityNeeded === false ? 'bg-primary text-white border-primary' : 'bg-white border-border text-muted'}`}
              >
                No
              </button>
            </div>
          </div>

          <div className="p-3 bg-surface rounded-lg border border-border flex items-center justify-between">
            <span className="text-xs font-medium text-text">Are you constrained by legacy protocols (e.g. old TLS 1.0 or hardware)?</span>
            <div className="flex gap-2">
              <button
                onClick={() => setDecisionAnswers({ ...decisionAnswers, legacySystem: true })}
                className={`text-xs px-3 py-1 rounded font-medium border ${decisionAnswers.legacySystem === true ? 'bg-primary text-white border-primary' : 'bg-white border-border text-muted'}`}
              >
                Yes
              </button>
              <button
                onClick={() => setDecisionAnswers({ ...decisionAnswers, legacySystem: false })}
                className={`text-xs px-3 py-1 rounded font-medium border ${decisionAnswers.legacySystem === false ? 'bg-primary text-white border-primary' : 'bg-white border-border text-muted'}`}
              >
                No (Modern stack)
              </button>
            </div>
          </div>
        </div>

        {/* Result banner */}
        <div className="p-4 rounded-xl border border-success/30 bg-success/5 space-y-2">
          <div className="flex items-center gap-2 text-success font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            Recommendation: {decisionAnswers.legacySystem ? 'AES-CBC with HMAC-SHA256 (Encrypt-then-MAC)' : 'AES-GCM (Authenticated Encryption)'}
          </div>
          <p className="text-xs text-muted leading-relaxed">
            {decisionAnswers.legacySystem
              ? 'If legacy systems force you to use CBC mode, you MUST implement an Encrypt-then-MAC construction (such as HMAC-SHA256) to prevent padding-oracle attacks. Never use CBC alone!'
              : 'AES-GCM is the gold standard for modern cryptographic protocols (TLS 1.3, SSH, WebCrypto). It provides both confidentiality and authentication in a single, high-performance algorithm.'}
          </p>
        </div>
      </div>
    </div>
  );
}
