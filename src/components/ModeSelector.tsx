import { type AESMode } from '../crypto/types'

const MODES: { mode: AESMode; color: string; badge: string; badgeColor: string; desc: string }[] = [
  { mode: 'ECB', color: 'border-ecb text-ecb bg-ecb/5', badge: 'Not for real use', badgeColor: 'bg-danger/10 text-danger border border-danger/20', desc: 'Simple codebook — same input = same output' },
  { mode: 'CBC', color: 'border-cbc text-cbc bg-cbc/5', badge: 'Legacy', badgeColor: 'bg-warning/10 text-warning border border-warning/20', desc: "Chain: each block XOR'd with previous" },
  { mode: 'CTR', color: 'border-ctr text-ctr bg-ctr/5', badge: 'Confidentiality only', badgeColor: 'bg-secondary/10 text-secondary border border-secondary/20', desc: 'Stream cipher from a counter+nonce keystream' },
  { mode: 'GCM', color: 'border-gcm text-gcm bg-gcm/5', badge: 'Recommended', badgeColor: 'bg-success/10 text-success border border-success/20', desc: 'CTR + authentication tag (tamper-evident)' },
]

interface Props {
  value: AESMode
  onChange: (m: AESMode) => void
}

export default function ModeSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {MODES.map(m => (
        <button
          key={m.mode}
          onClick={() => onChange(m.mode)}
          className={`p-3 rounded-card border-2 text-left transition-all ${
            value === m.mode ? m.color + ' shadow-sm' : 'border-border text-muted hover:border-primary/40'
          }`}
        >
          <div className="font-semibold text-sm mb-1">AES-{m.mode}</div>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${m.badgeColor}`}>{m.badge}</span>
          <p className="text-xs mt-1.5 text-muted leading-snug">{m.desc}</p>
        </button>
      ))}
    </div>
  )
}
