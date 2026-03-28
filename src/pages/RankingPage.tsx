import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { ordinal } from '@/lib/utils'
import { SCORE_LABELS, SCORE_MAP, SCORE_DESCRIPTIONS } from '@/lib/scoring'
import type { LeaderboardEntry, MVPRecord } from '@/types'
import { Crown, Flame, Star, Trophy, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span style={{ fontSize: 20 }}>🥇</span>
  if (rank === 2) return <span style={{ fontSize: 20 }}>🥈</span>
  if (rank === 3) return <span style={{ fontSize: 20 }}>🥉</span>
  return (
    <span style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'var(--color-text-muted)' }}>
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
          background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--radius-xl)',
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{ fontSize: 32 }}>⭐</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
              MVP da Rodada {mvp.round_number}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {(mvp as any).profiles?.display_name ?? 'Jogador'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              {mvp.points} pts na rodada
            </div>
          </div>
          <button
            className="badge badge-gold"
            onClick={() => setShowHistory(!showHistory)}
            style={{ cursor: 'pointer', background: 'none', border: 'none' }}
          >
            <Star size={10} />
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
          background: 'var(--color-accent-muted)',
          border: '1px solid rgba(37,99,235,0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          transition: 'border-color 0.2s'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Sua posição: <strong style={{ color: 'var(--color-text-primary)' }}>{ordinal(myEntry.rank)} lugar</strong><br/>
            <span style={{ fontSize: 12, color: 'var(--color-accent)', opacity: 0.8, marginTop: 2, display: 'inline-block' }}>Ver extrato de pontos</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="font-display" style={{ fontSize: 22, color: 'var(--color-accent)' }}>
              {myEntry.total_points}
            </span>
            <ChevronRight size={18} style={{ color: 'var(--color-accent)', opacity: 0.5 }} />
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
            return (
              <div
                key={entry.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  borderBottom: idx < leaderboard.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                  background: isMe ? 'rgba(37,99,235,0.06)' : 'transparent',
                  transition: 'background 0.2s',
                }}
              >
                <RankBadge rank={entry.rank} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {entry.profile?.display_name}
                    {isMe && <span style={{ fontSize: 10, color: 'var(--color-accent)', fontWeight: 600 }}>você</span>}
                    {entry.rank === 1 && <Crown size={13} style={{ color: 'var(--color-gold)' }} />}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>@{entry.profile?.username}</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="font-display" style={{ fontSize: 22, color: entry.rank <= 3 ? 'var(--color-gold)' : isMe ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>
                    {entry.total_points}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>pts</div>
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
