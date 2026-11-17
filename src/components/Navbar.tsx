import { Link, useLocation } from 'react-router-dom'
import { Shield } from 'lucide-react'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/learn', label: 'Learn' },
  { to: '/text', label: 'Text Lab' },
  { to: '/image', label: 'Image Lab' },
  { to: '/compare', label: 'Compare' },
  { to: '/tamper', label: 'Tamper Lab' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/verify', label: 'Verify' },
]

export default function Navbar() {
  const { pathname } = useLocation()
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 font-semibold text-text">
            <Shield className="w-5 h-5 text-primary" />
            <span>CryptoLab</span>
          </Link>
          <div className="flex items-center gap-1 overflow-x-auto">
            {NAV_LINKS.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  pathname === l.to
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:text-text hover:bg-surface'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
