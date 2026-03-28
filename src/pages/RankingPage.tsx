import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { ordinal } from '@/lib/utils'
import { SCORE_LABELS, SCORE_MAP, SCORE_DESCRIPTIONS } from '@/lib/scoring'
import type { LeaderboardEntry, MVPRecord } from '@/types'
import { Crown, Flame, Star, Trophy, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const rankStyles: Record<number, { gradient: string; color: string; glow: string }> = {
  1: { gradient: 'linear-gradient(145deg, #FFE066, #FFD700, #C9A800)', color: '#FFD700', glow: 'rgba(255,215,0,0.40)' },
  2: { gradient: 'linear-gradient(145deg, #E8E8E8, #C0C0C0, #909090)', color: '#C0C0C0', glow: 'rgba(192,192,192,0.30)' },
  3: { gradient: 'linear-gradient(145deg, #E8A060, #CD7F32, #9A5C1A)', color: '#CD7F32', glow: 'rgba(205,127,50,0.30)' },
}

function RankBadge({ rank }: { rank: number }) {
  const style = rankStyles[rank]
  if (style) {
    return (
      <div style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: style.gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 800,
        color: rank === 1 ? '#5a3a00' : rank === 2 ? '#2a2a2a' : '#3a1a00',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.20), 0 2px 8px ${style.glow}`,
        letterSpacing: '-0.02em',
        flexShrink: 0,
      }}>
        {rank}
      </div>
    )
  }
  return (
    <span style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'var(--color-text-muted)', flexShrink: 0 }}>
      {rank}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
      <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
      <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="skeleton" style={{ width: '55%', height: 14 }} />
        <div className="skeleton" style={{ width: '30%', height: 12 }} />
      </div>
      <div className="skeleton" style={{ width: 48, height: 24, borderRadius: 6 }} />
    </div>
  )
}

export default function RankingPage() {
  const { user } = useAuthStore()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [mvp, setMvp] = useState<MVPRecord | null>(null)
  const [mvpHistory, setMvpHistory] = useState<MVPRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch leaderboard
        const { data: scores } = await supabase
          .from('user_scores')
          .select('user_id, total_points, profiles(id, username, display_name, is_admin)')
          .order('total_points', { ascending: false })

        if (scores) {
          const entries: LeaderboardEntry[] = scores.map((s: any, i: number) => ({
            user_id: s.user_id,
            profile: s.profiles,
            total_points: s.total_points ?? 0,
            rank: i + 1,
          }))
          setLeaderboard(entries)
        }

        // Fetch current MVP (latest round)
        const { data: mvpData } = await supabase
          .from('mvp_history')
          .select('*, profiles(id, username, display_name)')
          .order('round_number', { ascending: false })
          .limit(5)

        if (mvpData && mvpData.length > 0) {
          setMvp(mvpData[0] as MVPRecord)
          setMvpHistory(mvpData as MVPRecord[])
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const myEntry = leaderboard.find((e) => e.user_id === user?.id)

  return (
    <div className="page">
      {/* MVP Banner */}
      {mvp && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(203,160,82,0.12), rgba(160,120,56,0.06))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(203,160,82,0.22)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 20px rgba(0,0,0,0.40)',
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(145deg, rgba(224,188,120,0.25), rgba(203,160,82,0.12))',
            border: '1px solid rgba(203,160,82,0.30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px rgba(203,160,82,0.25)',
            flexShrink: 0,
          }}>
            <Star size={18} strokeWidth={1.5} style={{ color: 'var(--color-accent-light)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
              marginBottom: 3,
              background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              MVP · Rodada {mvp.round_number}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>
              {(mvp as any).profiles?.display_name ?? 'Jogador'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {mvp.points} pts na rodada
            </div>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              cursor: 'pointer',
              background: 'rgba(203,160,82,0.10)',
              border: '1px solid rgba(203,160,82,0.20)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              color: 'var(--color-accent-light)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
            }}
          >
            <Star size={10} strokeWidth={2} />
            Histórico
          </button>
        </div>
      )}

      {/* MVP History */}
      {showHistory && mvpHistory.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-header">
            <span className="section-title">Histórico de MVPs</span>
          </div>
          {mvpHistory.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <div>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginRight: 8 }}>Rodada {m.round_number}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {(m as any).profiles?.display_name}
                </span>
              </div>
              <span className="badge badge-gold">+{m.points} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* My position highlight */}
      {myEntry && (
        <button
          onClick={() => navigate('/history')}
          style={{
            width: '100%',
            textAlign: 'left',
            background: 'linear-gradient(135deg, rgba(0,96,57,0.12), rgba(0,60,36,0.06))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0,135,90,0.22)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary-light)', boxShadow: '0 0 8px rgba(0,175,110,0.6)', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'left' }}>
            Sua posição: <strong style={{ color: 'var(--color-text-primary)' }}>{ordinal(myEntry.rank)} lugar</strong>
            <div style={{ fontSize: 11, color: 'rgba(0,175,110,0.70)', marginTop: 2, letterSpacing:'0.02em' }}>Ver extrato de pontos</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="font-display" style={{ fontSize: 24, background: 'linear-gradient(to bottom, #a0d4b8, #5cd9a2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {myEntry.total_points}
            </span>
            <ChevronRight size={16} style={{ color: 'rgba(0,175,110,0.50)' }} />
          </div>
        </button>
      )}

      {/* Leaderboard */}
      <div className="section-header">
        <span className="section-title">
          <Trophy size={13} style={{ display: 'inline', marginRight: 4 }} />
          Classificação
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{leaderboard.length} participantes</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          : leaderboard.map((entry, idx) => {
            const isMe = entry.user_id === user?.id
            const isTop3 = entry.rank <= 3
            const ptColor = isTop3
              ? (rankStyles[entry.rank]?.color ?? 'var(--color-text-primary)')
              : isMe ? 'var(--color-accent-light)' : 'var(--color-text-primary)'
            return (
              <div
                key={entry.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  borderBottom: idx < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  background: isMe
                    ? 'linear-gradient(90deg, rgba(0,96,57,0.10), rgba(0,60,36,0.04))'
                    : isTop3
                    ? 'linear-gradient(90deg, rgba(203,160,82,0.05), transparent)'
                    : 'transparent',
                  transition: 'background 0.2s',
                }}
              >
                <RankBadge rank={entry.rank} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {entry.profile?.display_name}
                    {isMe && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'rgba(0,200,120,0.80)',
                        border: '1px solid rgba(0,150,80,0.25)',
                        borderRadius: 4,
                        padding: '1px 5px',
                      }}>você</span>
                    )}
                    {entry.rank === 1 && <Crown size={12} style={{ color: 'var(--color-gold)' }} />}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>@{entry.profile?.username}</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="font-display" style={{ fontSize: 22, color: ptColor }}>
                    {entry.total_points}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>pts</div>
                </div>
              </div>
            )
          })}

        {!loading && leaderboard.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
            <Flame size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            Nenhum ponto registrado ainda.<br />O churrasco ainda está frio!
          </div>
        )}
      </div>

      {/* Scoring legend */}
      <div style={{ marginTop: 24 }}>
        <div className="section-header">
          <span className="section-title">Tabela de pontuação</span>
        </div>
        <div className="card" style={{ padding: 0, borderRadius: 12 }}>
          {(Object.entries(SCORE_LABELS) as [keyof typeof SCORE_MAP, string][])
            .filter(([reason]) => !['STARTING_BALANCE', 'BUY_CRAQUE', 'REFUND_CRAQUE'].includes(reason))
            .map(([reason, label], idx, arr) => (
            <details key={reason} style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--color-border-subtle)' : 'none' }}>
              <summary style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                cursor: 'pointer',
                listStyle: 'none'
              }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{label}</span>
                <span className="badge badge-accent">+{SCORE_MAP[reason]}</span>
              </summary>
              <div style={{ padding: '0 16px 14px', fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                {SCORE_DESCRIPTIONS[reason]}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
