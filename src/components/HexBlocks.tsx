import { useState } from 'react'
import { Copy } from 'lucide-react'
import { toHex, toBase64 } from '../crypto/encoding'

const BLOCK_COLORS = [
  'bg-blue-50 border-blue-200',
  'bg-violet-50 border-violet-200',
  'bg-emerald-50 border-emerald-200',
  'bg-orange-50 border-orange-200',
  'bg-pink-50 border-pink-200',
  'bg-teal-50 border-teal-200',
]

interface Props {
  bytes: Uint8Array
  label?: string
  highlightIndices?: number[]  // byte indices to highlight red (tampering)
  className?: string
}

export default function HexBlocks({ bytes, label, highlightIndices, className }: Props) {
  const [format, setFormat] = useState<'hex' | 'base64'>('hex')
  const [copied, setCopied] = useState(false)

  const display = format === 'hex' ? toHex(bytes) : toBase64(bytes)

  function copy() {
    navigator.clipboard.writeText(display)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Split into 16-byte blocks for hex display
  const blocks: Uint8Array[] = []
  for (let i = 0; i < bytes.length; i += 16) blocks.push(bytes.slice(i, i + 16))

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text">{label}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setFormat('hex')} className={`text-xs px-2 py-0.5 rounded-full border ${format === 'hex' ? 'bg-primary text-white border-primary' : 'border-border text-muted'}`}>Hex</button>
            <button onClick={() => setFormat('base64')} className={`text-xs px-2 py-0.5 rounded-full border ${format === 'base64' ? 'bg-primary text-white border-primary' : 'border-border text-muted'}`}>Base64</button>
            <button onClick={copy} className="p-1 rounded hover:bg-surface transition-colors">
              <Copy className="w-3.5 h-3.5 text-muted" />
            </button>
            {copied && <span className="text-xs text-success">Copied!</span>}
          </div>
        </div>
      )}
      {format === 'hex' ? (
        <div className="space-y-1">
          {blocks.map((block, bi) => (
            <div key={bi} className={`flex items-center gap-2 px-2 py-1 rounded border font-mono text-xs ${BLOCK_COLORS[bi % BLOCK_COLORS.length]}`}>
              <span className="text-muted w-6 text-right shrink-0">#{bi + 1}</span>
              <span className="break-all">
                {Array.from(block).map((byte, i) => {
                  const globalIdx = bi * 16 + i
                  const isHighlighted = highlightIndices?.includes(globalIdx)
                  return (
                    <span key={i} className={isHighlighted ? 'text-danger font-bold' : ''}>
                      {byte.toString(16).padStart(2, '0')}{' '}
                    </span>
                  )
                })}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="font-mono text-xs bg-surface border border-border rounded-lg px-3 py-2 break-all text-muted">
          {display}
        </div>
      )}
    </div>
  )
}
