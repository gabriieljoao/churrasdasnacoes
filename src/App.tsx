import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRouter } from '@/router'
import { useAuthStore } from '@/stores/authStore'
import { supabaseConfigured } from '@/lib/supabase'
import { Trophy, Flame, Settings } from 'lucide-react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
})

// ─── Setup Screen ─────────────────────────────────────────────────────────────

function SetupScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'Inter, system-ui, sans-serif',
      background: '#0a0a0b',
      color: '#f0f0f2',
    }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center', color: 'var(--color-accent)' }}>
        <Trophy size={48} strokeWidth={1} />
        <Flame size={48} strokeWidth={1} />
      </div>
      <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 32, letterSpacing: '0.04em', marginBottom: 8 }}>
        ChurrAsco das Nações
      </h1>
      <p style={{ fontSize: 14, color: '#9898a3', marginBottom: 32, textAlign: 'center' }}>
        Copa do Mundo 2026
      </p>

      <div style={{
        background: '#111113',
        border: '1px solid #2a2a2e',
        borderRadius: 14,
        padding: '20px 24px',
        maxWidth: 400,
        width: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Settings size={20} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Configuração necessária</span>
        </div>
        <p style={{ fontSize: 13, color: '#9898a3', lineHeight: 1.6, marginBottom: 16 }}>
          Para rodar o app, crie um arquivo <code style={{ background: '#1a1a1d', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>.env</code> na raiz do projeto com as credenciais do Supabase:
        </p>
        <pre style={{
          background: '#1a1a1d',
          border: '1px solid #2a2a2e',
          borderRadius: 8,
          padding: '12px 14px',
          fontSize: 12,
          color: '#f0f0f2',
          overflowX: 'auto',
          marginBottom: 16,
        }}>{`VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima`}</pre>
        <p style={{ fontSize: 12, color: '#5a5a65', lineHeight: 1.5 }}>
          Você pode copiar o arquivo <code style={{ background: '#1a1a1d', padding: '2px 6px', borderRadius: 4 }}>.env.example</code> e preencher com suas credenciais do{' '}
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
            painel do Supabase
          </a>.
          Após criar o arquivo, reinicie o servidor de desenvolvimento.
        </p>
      </div>
    </div>
  )
}

// ─── Auth Initializer ─────────────────────────────────────────────────────────

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { initialize } = useAuthStore()
  useEffect(() => {
    initialize()
  }, [])
  return <>{children}</>
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  if (!supabaseConfigured) {
    return <SetupScreen />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <AppRouter />
      </AuthInitializer>
    </QueryClientProvider>
  )
}
