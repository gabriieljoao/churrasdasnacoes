import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { User, Trophy } from 'lucide-react'

export function AppHeader() {
  const { user } = useAuthStore()
  const location = useLocation()

  const pageTitle: Record<string, string> = {
    '/ranking': 'Ranking',
    '/draft': 'Draft',
    '/palpites': 'Palpites',
    '/mata-mata': 'Mata-mata',
    '/churrasco': 'Churrasco',
    '/perfil': 'Perfil',
  }

  const title = pageTitle[location.pathname] ?? 'ChurrAsco'

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trophy size={20} strokeWidth={1.5} color="var(--color-accent)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.04em', color: 'var(--color-text-primary)' }}>
            {title}
          </span>
        </div>

        {user && (
          <Link
            to="/perfil"
            className="btn btn-ghost btn-sm"
            style={{
              borderRadius: 'var(--radius-full)',
              padding: '6px 14px',
              fontSize: 12,
              color: '#d1d1d6',
              border: '1px solid #2a2a2e',
              background: '#1a1a1d',
              gap: 6
            }}
          >
            <User size={14} style={{ color: 'var(--color-primary)' }} /> Meu Perfil
          </Link>
        )}
      </div>
    </header>
  )
}
