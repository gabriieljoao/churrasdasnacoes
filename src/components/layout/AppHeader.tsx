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
    '/history': 'Extrato',
  }

  const title = pageTitle[location.pathname] ?? 'ChurrAsco'

  return (
    <header className="app-header">
      <div className="app-header-inner">
        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: 'linear-gradient(145deg, rgba(0,135,90,0.30), rgba(0,96,57,0.14))',
            border: '1px solid rgba(0,135,90,0.30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 8px rgba(0,96,57,0.25)',
          }}>
            <Trophy size={16} strokeWidth={1.5} color="rgba(0,175,110,0.9)" />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 19,
            letterSpacing: '0.05em',
            background: 'linear-gradient(to bottom, #f5f0e8 0%, rgba(245,240,232,0.55) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {title}
          </span>
        </div>

        {/* Profile pill */}
        {user && (
          <Link
            to="/perfil"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.09)',
              textDecoration: 'none',
              color: 'var(--color-text-secondary)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.02em',
              transition: 'all 0.2s ease',
            }}
          >
            <User size={13} strokeWidth={1.8} style={{ color: 'rgba(0,175,110,0.85)' }} />
            Perfil
          </Link>
        )}
      </div>
    </header>
  )
}
