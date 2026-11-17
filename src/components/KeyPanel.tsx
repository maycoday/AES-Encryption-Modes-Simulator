import { useState } from 'react'
import { Copy, RefreshCw, ChevronDown } from 'lucide-react'
import { type KeySize } from '../crypto/types'
import { toHex, fromHex } from '../crypto/encoding'

interface Props {
  keyBytes: Uint8Array
  keySize: KeySize
  onKeyChange: (k: Uint8Array) => void
  onKeySizeChange: (s: KeySize) => void
}

export default function KeyPanel({ keyBytes, keySize, onKeyChange, onKeySizeChange }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [customHex, setCustomHex] = useState('')
  const [hexError, setHexError] = useState('')
  const [copied, setCopied] = useState(false)

  function generateKey() {
    const bytes = new Uint8Array(keySize / 8)
    crypto.getRandomValues(bytes)
    onKeyChange(bytes)
  }

  function copyKey() {
    navigator.clipboard.writeText(toHex(keyBytes))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function applyCustomKey() {
    try {
      const bytes = fromHex(customHex.trim())
      const validSizes = [16, 24, 32]
      if (!validSizes.includes(bytes.length)) {
        setHexError(`Key must be 16, 24, or 32 bytes (got ${bytes.length})`)
        return
      }
      setHexError('')
      onKeyChange(bytes)
    } catch (e) {
      setHexError('Invalid hex string')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-text">Key Size</label>
        {([128, 192, 256] as KeySize[]).map(s => (
          <button
            key={s}
            onClick={() => { onKeySizeChange(s); const b = new Uint8Array(s/8); crypto.getRandomValues(b); onKeyChange(b) }}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${keySize === s ? 'bg-primary text-white' : 'bg-surface border border-border text-muted hover:border-primary/40'}`}
          >
            {s}-bit
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 font-mono text-xs bg-surface border border-border rounded-lg px-3 py-2 truncate text-muted">
          {toHex(keyBytes)}
        </div>
        <button onClick={copyKey} className="p-2 rounded-lg border border-border hover:bg-surface transition-colors" title="Copy key">
          <Copy className="w-4 h-4 text-muted" />
        </button>
        <button onClick={generateKey} className="p-2 rounded-lg border border-border hover:bg-surface transition-colors" title="Generate new key">
          <RefreshCw className="w-4 h-4 text-muted" />
        </button>
        {copied && <span className="text-xs text-success font-medium">Copied!</span>}
      </div>

      <button
        onClick={() => setShowAdvanced(v => !v)}
        className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        Advanced: paste own key
      </button>

      {showAdvanced && (
        <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 space-y-2">
          <p className="text-xs text-warning font-medium">⚠️ For learning only — never use a key you expose on screen to protect real data.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste hex key (32/48/64 hex chars)"
              value={customHex}
              onChange={e => setCustomHex(e.target.value)}
              className="flex-1 font-mono text-xs border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button onClick={applyCustomKey} className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90">
              Apply
            </button>
          </div>
          {hexError && <p className="text-xs text-danger">{hexError}</p>}
        </div>
      )}
    </div>
  )
}
