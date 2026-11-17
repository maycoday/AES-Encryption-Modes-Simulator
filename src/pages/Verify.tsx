import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, Terminal, Copy } from 'lucide-react';
import { runAllTests, type TestResult } from '../crypto/selftest';

export default function Verify() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  async function runTests() {
    setRunning(true);
    setDone(false);
    setResults([]);
    try {
      const r = await runAllTests();
      setResults(r);
    } finally {
      setRunning(false);
      setDone(true);
    }
  }

  function copyText(cmd: string, id: string) {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-success/10 text-success">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Verify Cryptographic Correctness</h1>
            <p className="text-sm text-muted">
              Every ciphertext in CryptoLab comes from real AES computations. Run official NIST and FIPS-197 Known-Answer Tests (KATs) right now in your browser.
            </p>
          </div>
        </div>
      </div>

      {/* Test Execution Panel */}
      <div className="p-6 rounded-card border border-border bg-card shadow-card space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-text">Official Test Vector Suite</h2>
          <p className="text-xs text-muted leading-relaxed">
            Tests against published NIST Special Publication 800-38A test vectors, FIPS-197 Appendix B vectors, bidirectional round-trip checks, and GCM 128-bit authentication tampering validation.
          </p>
        </div>

        <button
          onClick={runTests}
          disabled={running}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm text-xs"
        >
          {running && <Loader2 className="w-4 h-4 animate-spin" />}
          {running ? 'Executing Tests in Web Crypto & Noble…' : 'Run All Verification Tests'}
        </button>

        {done && (
          <div className={`p-4 rounded-xl border ${failed === 0 ? 'border-success/40 bg-success/5' : 'border-danger/40 bg-danger/5'}`}>
            <div className="flex items-center gap-2">
              {failed === 0 ? <CheckCircle2 className="w-5 h-5 text-success" /> : <XCircle className="w-5 h-5 text-danger" />}
              <span className="font-semibold text-text text-sm">
                {failed === 0 ? 'All cryptographic vectors passed with 100% precision!' : `${failed} test(s) failed.`}
              </span>
              <span className="text-xs text-muted ml-auto font-mono">{passed}/{results.length} passed</span>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2 pt-2">
            {results.map((r, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border text-xs ${r.passed ? 'border-success/20 bg-success/5' : 'border-danger/20 bg-danger/5'}`}>
                {r.passed
                  ? <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="font-semibold text-text">{r.name}</p>
                  {r.error && <p className="text-xs text-danger mt-0.5 font-mono break-all">{r.error}</p>}
                  {!r.passed && r.expected && (
                    <div className="text-[11px] text-muted mt-1 font-mono space-y-0.5">
                      <p>Expected: <span className="text-text font-bold">{r.expected}</span></p>
                      <p>Received: <span className="text-danger font-bold">{r.got}</span></p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reproduce with OpenSSL CLI */}
      <div className="p-6 rounded-card border border-border bg-card shadow-card space-y-4">
        <div className="flex items-center gap-2 text-text font-semibold text-sm">
          <Terminal className="w-4 h-4 text-primary" />
          Independent CLI Verification via OpenSSL
        </div>
        <p className="text-xs text-muted leading-relaxed">
          You can independently verify that our outputs match the industry-standard OpenSSL CLI using these commands:
        </p>

        <div className="space-y-3 font-mono text-xs">
          {/* ECB OpenSSL */}
          <div className="p-3 bg-surface rounded-lg border border-border space-y-1.5">
            <div className="flex justify-between items-center text-muted text-[11px]">
              <span className="font-semibold text-text">AES-128-ECB (FIPS-197 Appendix B):</span>
              <button
                onClick={() => copyText('echo -n -e "\\x00\\x11\\x22\\x33\\x44\\x55\\x66\\x77\\x88\\x99\\xaa\\xbb\\xcc\\xdd\\xee\\xff" | openssl enc -aes-128-ecb -K 000102030405060708090a0b0c0d0e0f -nopad | xxd -p', 'ecb')}
                className="hover:text-primary flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> {copiedCmd === 'ecb' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="p-2 bg-white rounded border border-border text-muted break-all">
              echo -n -e "\x00\x11\x22\x33\x44\x55\x66\x77\x88\x99\xaa\xbb\xcc\xdd\xee\xff" | openssl enc -aes-128-ecb -K 000102030405060708090a0b0c0d0e0f -nopad | xxd -p
            </div>
            <div className="text-[10px] text-success font-semibold">Expected output: 69c4e0d86a7b0430d8cdb78070b4c55a</div>
          </div>

          {/* CBC OpenSSL */}
          <div className="p-3 bg-surface rounded-lg border border-border space-y-1.5">
            <div className="flex justify-between items-center text-muted text-[11px]">
              <span className="font-semibold text-text">AES-128-CBC (NIST SP 800-38A F.2.1 Block 1):</span>
              <button
                onClick={() => copyText('echo -n -e "\\x6b\\xc1\\xbe\\xe2\\x2e\\x40\\x9f\\x96\\xe9\\x3d\\x7e\\x11\\x73\\x93\\x17\\x2a" | openssl enc -aes-128-cbc -K 2b7e151628aed2a6abf7158809cf4f3c -iv 000102030405060708090a0b0c0d0e0f -nopad | xxd -p', 'cbc')}
                className="hover:text-primary flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> {copiedCmd === 'cbc' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="p-2 bg-white rounded border border-border text-muted break-all">
              echo -n -e "\x6b\xc1\xbe\xe2\x2e\x40\x9f\x96\xe9\x3d\x7e\x11\x73\x93\x17\x2a" | openssl enc -aes-128-cbc -K 2b7e151628aed2a6abf7158809cf4f3c -iv 000102030405060708090a0b0c0d0e0f -nopad | xxd -p
            </div>
            <div className="text-[10px] text-success font-semibold">Expected output: 7649abac8119b246cee98e9b12e9197d</div>
          </div>
        </div>

        <p className="text-[11px] text-muted leading-relaxed">
          <em>Note:</em> Standard OpenSSL <code>enc</code> does not support AEAD modes like GCM via the command line because AEAD requires streaming tag handling and AAD inputs; GCM is validated here directly against Web Crypto API and NIST SP 800-38D test vectors.
        </p>
      </div>
    </div>
  );
}
