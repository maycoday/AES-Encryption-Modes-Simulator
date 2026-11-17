import { useState, useEffect } from 'react';
import { Shield, BookOpen, FlaskConical, ImageIcon, BarChart3, Wrench, HelpCircle, CheckCircle2, ArrowRight, Lightbulb, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const DID_YOU_KNOW_FACTS = [
  'AES is based on the Rijndael cipher created by Belgian cryptographers Joan Daemen and Vincent Rijmen.',
  'AES was officially standardized by the US NIST in 2001 under Federal Information Processing Standard 197 (FIPS 197).',
  'Regardless of key size (128, 192, or 256 bits), the AES block size is ALWAYS exactly 128 bits (16 bytes).',
  'AES-128 performs 10 transformation rounds, AES-192 performs 12 rounds, and AES-256 performs 14 rounds.',
  'In ECB mode, identical 16-byte plaintext blocks always produce identical ciphertext blocks, famously leaking image silhouettes.',
  'CTR mode turns the AES block cipher into a stream cipher by encrypting successive counter values instead of plaintext.',
  'AES-GCM combines CTR mode encryption with GHASH over the Galois field GF(2¹²⁸) to provide authenticated encryption (AEAD).',
];

const GUIDED_STEPS = [
  { step: 1, title: 'Learn', desc: 'Core concepts & padding', to: '/learn', icon: BookOpen },
  { step: 2, title: 'Text Lab', desc: 'Real AES text encryption', to: '/text', icon: FlaskConical },
  { step: 3, title: 'Image Lab', desc: 'See ECB leak patterns', to: '/image', icon: ImageIcon },
  { step: 4, title: 'Tamper Lab', desc: 'Bit flips & forgery attacks', to: '/tamper', icon: Wrench },
  { step: 5, title: 'Quiz', desc: 'Test your knowledge', to: '/quiz', icon: HelpCircle },
];

export default function Home() {
  const [factIndex, setFactIndex] = useState(0);

  const bestQuizScore = localStorage.getItem('cryptolab_quiz_best') || '0';
  const totalQuizAttempts = localStorage.getItem('cryptolab_quiz_attempts') || '0';

  useEffect(() => {
    const timer = setInterval(() => {
      setFactIndex(i => (i + 1) % DID_YOU_KNOW_FACTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-6 max-w-3xl mx-auto">
        <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-2 shadow-sm">
          <Shield className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold text-text tracking-tight sm:text-5xl">
          See how AES really protects <br className="hidden sm:inline" />
          <span className="text-primary">(and fails to protect)</span> your data.
        </h1>
        <p className="text-base text-muted max-w-2xl mx-auto leading-relaxed">
          
        </p>

        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <Link
            to="/learn"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-sm"
          >
            Start Guided Path <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/verify"
            className="flex items-center gap-2 px-6 py-3 bg-white border border-border text-muted hover:text-text rounded-xl font-semibold hover:border-primary/40 transition-all shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-success" /> Run Self-Tests
          </Link>
        </div>
      </div>

      {/* Guided Learning Path */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text">Recommended Learning Path</h2>
          <span className="text-xs text-muted">Follow steps 1 to 5 for complete mastery</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {GUIDED_STEPS.map((s) => (
            <Link
              key={s.step}
              to={s.to}
              className="p-4 rounded-card border border-border bg-card shadow-card hover:border-primary/50 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                    Step {s.step}
                  </span>
                  <s.icon className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-semibold text-sm text-text mb-1 group-hover:text-primary transition-colors">
                  {s.title}
                </h3>
                <p className="text-xs text-muted leading-snug">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Mode Quick Reference Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-text">The 4 AES Modes at a Glance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { mode: 'ECB', color: 'border-ecb', badge: 'Avoid in Real Use', badgeClass: 'bg-danger/10 text-danger border border-danger/20', analogy: 'Direct codebook lookup', desc: 'Encrypts each 16-byte block independently. Zero randomness. Identical inputs produce identical outputs.' },
            { mode: 'CBC', color: 'border-cbc', badge: 'Legacy (Needs MAC)', badgeClass: 'bg-warning/10 text-warning border border-warning/20', analogy: 'Welded chain of blocks', desc: 'Chains blocks with random IV via XOR. Sequential encrypt. Vulnerable to padding-oracle attacks if used alone.' },
            { mode: 'CTR', color: 'border-ctr', badge: 'Stream (Confidentiality)', badgeClass: 'bg-secondary/10 text-secondary border border-secondary/20', analogy: 'Counter keystream XOR', desc: 'Encrypts counter + nonce to produce a keystream. Zero padding needed. Highly malleable if not authenticated.' },
            { mode: 'GCM', color: 'border-gcm', badge: '✓ Default Recommended', badgeClass: 'bg-success/10 text-success border border-success/20', analogy: 'Stream + tamper seal', desc: 'Combines CTR encryption with GHASH authentication. Tamper-evident AEAD standard used across TLS 1.3.' },
          ].map(m => (
            <div key={m.mode} className={`p-5 rounded-card border-2 ${m.color} bg-card shadow-card space-y-2 flex flex-col justify-between`}>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-text">AES-{m.mode}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${m.badgeClass}`}>{m.badge}</span>
                </div>
                <div className="text-xs font-semibold text-primary">Analogy: {m.analogy}</div>
                <p className="text-xs text-muted leading-relaxed">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust & Did You Know Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rotating Did You Know Card */}
        <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Did you know?
          </div>
          <p className="text-xs text-muted leading-relaxed min-h-[40px]">
            {DID_YOU_KNOW_FACTS[factIndex]}
          </p>
          <div className="flex gap-1 pt-1">
            {DID_YOU_KNOW_FACTS.map((_, i) => (
              <button
                key={i}
                onClick={() => setFactIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${factIndex === i ? 'bg-primary w-4' : 'bg-border'}`}
              />
            ))}
          </div>
        </div>

        {/* Browser Sandbox Trust Note & Stats */}
        <div className="p-5 bg-card border border-border rounded-card shadow-card space-y-2">
          <div className="flex items-center gap-2 text-success font-bold text-xs uppercase tracking-wider">
            <Lock className="w-4 h-4 text-success" />
            100% Client-Side Trust Guarantee
          </div>
          <p className="text-xs text-muted leading-relaxed">
            All cryptographic operations occur entirely in your local browser using the native Web Crypto API and audited @noble/ciphers. Keys are held in volatile RAM only. No backend, no APIs, and zero network calls.
          </p>
          <div className="flex items-center gap-4 pt-1 text-xs text-muted font-mono">
            <span>Best Quiz Score: <strong className="text-primary">{bestQuizScore}/10</strong></span>
            <span>Attempts: <strong className="text-text">{totalQuizAttempts}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
