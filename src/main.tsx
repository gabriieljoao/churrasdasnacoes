import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Root error boundary — prevents complete black screen on uncaught errors
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#0a0a0b',
          color: '#f0f0f2',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💥</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Algo deu errado</h1>
          <p style={{ fontSize: 13, color: '#9898a3', marginBottom: 16, textAlign: 'center' }}>
            Abra o console do navegador (F12) para ver o erro completo.
          </p>
          <pre style={{
            background: '#111113',
            border: '1px solid #2a2a2e',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: 12,
            color: '#ef4444',
            maxWidth: 400,
            overflow: 'auto',
          }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 20,
              padding: '10px 20px',
              background: '#e63329',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Recarregar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
