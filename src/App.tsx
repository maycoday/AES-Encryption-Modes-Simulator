import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Learn from './pages/Learn'
import TextLab from './pages/TextLab'
import ImageLab from './pages/ImageLab'
import Compare from './pages/Compare'
import TamperLab from './pages/TamperLab'
import Quiz from './pages/Quiz'
import Verify from './pages/Verify'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CryptoLab UI Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-card border border-danger/30 shadow-card text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-danger/10 text-danger flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-text">Something went wrong in this module</h2>
          <p className="text-xs font-mono text-danger bg-danger/5 p-3 rounded border border-danger/20 break-all text-left">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined })
                window.location.reload()
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reload Page
            </button>
            <Link
              to="/"
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 border border-border text-text rounded-lg text-xs font-semibold hover:bg-surface"
            >
              Return Home
            </Link>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function CryptoUnavailableBanner() {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return (
      <div className="bg-danger/10 border-b border-danger/30 text-danger px-4 py-3 text-xs font-medium text-center">
        ⚠️ Web Crypto API is not available in an insecure context. Please ensure you are viewing this app over https:// or http://localhost.
      </div>
    )
  }
  return null
}

export default function App() {
  return (
    <div className="min-h-screen bg-surface">
      <CryptoUnavailableBanner />
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/text" element={<TextLab />} />
            <Route path="/image" element={<ImageLab />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/tamper" element={<TamperLab />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/verify" element={<Verify />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}
