import { NavLink } from 'react-router-dom'
import { Trophy, ListCheck, Flame, GitBranch, Search } from 'lucide-react'

const navItems = [
  { to: '/draft', label: 'Draft', icon: Search },
  { to: '/palpites', label: 'Palpites', icon: ListCheck },
  { to: '/ranking', label: 'Ranking', icon: Trophy },
  { to: '/mata-mata', label: 'Mata-mata', icon: GitBranch },
  { to: '/churrasco', label: 'Churrasco', icon: Flame },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" style={{ overflow: 'visible' }}>
      <div className="bottom-nav-inner" style={{ overflow: 'visible' }}>
        {navItems.map(({ to, label, icon: Icon }) => {
          const isRanking = to === '/ranking'
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive && !isRanking ? ' active' : ''}`}
              style={{ position: isRanking ? 'relative' : 'static', overflow: 'visible' }}
            >
              {isRanking ? (
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  boxShadow: '0 0 0 8px var(--color-background)',
                  position: 'absolute',
                  top: '-28px',
                }}>
                  <Icon size={26} strokeWidth={1.5} />
                </div>
              ) : (
                <Icon size={22} strokeWidth={1.5} />
              )}
              <span style={{ marginTop: isRanking ? 24 : 0 }}>{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
