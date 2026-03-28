import { NavLink } from 'react-router-dom'
import { Trophy, ListCheck, Flame, GitBranch, Search } from 'lucide-react'

const navItems = [
  { to: '/draft',     label: 'Draft',     icon: Search },
  { to: '/palpites',  label: 'Palpites',  icon: ListCheck },
  { to: '/ranking',   label: 'Ranking',   icon: Trophy },
  { to: '/mata-mata', label: 'Mata-mata', icon: GitBranch },
  { to: '/churrasco', label: 'Churrasco', icon: Flame },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" style={{ overflow: 'visible' }}>
      <div className="bottom-nav-inner" style={{ overflow: 'visible' }}>
        {navItems.map(({ to, label, icon: Icon }) => {
          const isCenter = to === '/ranking'
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-item${isActive && !isCenter ? ' active' : ''}`
              }
              style={{ position: isCenter ? 'relative' : 'static', overflow: 'visible' }}
            >
              {isCenter ? (
                <NavLink to={to} style={{ display: 'contents' }}>
                  {({ isActive }) => (
                    <div style={{
                      width: 54,
                      height: 54,
                      borderRadius: '50%',
                      background: isActive
                        ? 'linear-gradient(145deg, #e0bc78, #cba052, #a07838)'
                        : 'linear-gradient(145deg, #d4aa60, #ba923e, #8f6e2a)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1a1000',
                      boxShadow: [
                        '0 0 0 6px var(--color-background)',
                        'inset 0 1px 0 rgba(255,255,255,0.35)',
                        'inset 0 -1px 0 rgba(0,0,0,0.25)',
                        `0 4px 20px rgba(203,160,82,${isActive ? '0.55' : '0.30'})`,
                      ].join(', '),
                      position: 'absolute',
                      top: '-26px',
                      transition: 'box-shadow 0.25s ease, background 0.25s ease',
                    }}>
                      <Icon size={24} strokeWidth={isActive ? 2 : 1.6} />
                    </div>
                  )}
                </NavLink>
              ) : (
                <Icon size={21} strokeWidth={1.5} />
              )}
              <span style={{ marginTop: isCenter ? 26 : 0 }}>{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
