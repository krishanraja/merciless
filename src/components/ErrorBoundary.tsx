import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)
    return (
      <div className="min-h-screen bg-merciless-black text-merciless-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">Something broke.</h1>
          <p className="text-merciless-muted text-sm">
            The Oracle is silent. Reload the page, or return home.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-xs text-left bg-merciless-card p-3 rounded overflow-auto">
              {error.message}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={this.reset}
              className="px-4 py-2 border border-merciless-border rounded text-sm"
            >
              Try again
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-merciless-gold text-merciless-black rounded text-sm"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    )
  }
}
