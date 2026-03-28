import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ordinal } from '@/lib/utils'
import { getBBQObligationForRank } from '@/lib/scoring'
import type { LeaderboardEntry } from '@/types'
import { Flame, Crown, Info, Medal } from 'lucide-react'

function PositionCard({ entry, totalParticipants }: { entry: LeaderboardEntry; totalParticipants: number }) {
  const isFirst = entry.rank === 1
  const isLast = entry.rank === totalParticipants
  const privilege = entry.rank <= 3 ? 'Escolhe 1 corte de carne' : 'Decide os acompanhamentos com o grupo'
  const obligation = getBBQObligationForRank(entry.rank, isLast)

  const borderColor = isFirst
    ? 'rgba(245,158,11,0.4)'
    : entry.rank === 2 ? 'rgba(192,192,192,0.4)'
    : entry.rank === 3 ? 'rgba(205,127,50,0.4)'
    : 'var(--color-border)'

  const bg = isFirst
    ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))'
    : 'var(--color-surface)'

  const emoji = isFirst ? <Crown size={28} strokeWidth={1.5} style={{color: 'var(--color-gold)'}} /> : entry.rank === 2 ? <Medal size={24} strokeWidth={1.5} style={{color: '#C0C0C0'}} /> : entry.rank === 3 ? <Medal size={24} strokeWidth={1.5} style={{color: '#CD7F32'}} /> : isLast ? <Flame size={24} strokeWidth={1.5} style={{color: 'var(--color-error)'}} /> : <span style={{fontSize: 20, fontWeight: 700}}>{entry.rank}º</span>

  return (
    <div style={{ background: bg, border: `1.5px solid ${borderColor}`, borderRadius: 'var(--radius-xl)', padding: '16px 18px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 32, display: 'flex', justifyContent: 'center' }}>
          {emoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {entry.profile?.display_name}
            {isFirst && <Crown size={14} style={{ color: 'var(--color-gold)' }} />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {ordinal(entry.rank)} lugar
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="font-display" style={{ fontSize: 26, color: isFirst ? 'var(--color-gold)' : 'var(--color-text-primary)' }}>
            {entry.total_points}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>pts</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {entry.rank <= 3 && (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-md)', padding: '8px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Privilégio</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{privilege}</div>
          </div>
        )}
        <div
          style={{
            background: isFirst ? 'transparent' : isLast ? 'rgba(230,51,41,0.08)' : 'var(--color-surface-2)',
            border: `1px solid ${isLast ? 'rgba(230,51,41,0.25)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '8px 10px',
            gridColumn: entry.rank <= 3 ? 'auto' : '1 / -1',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 600, color: isFirst ? 'var(--color-success)' : isLast ? 'var(--color-error)' : 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            {isFirst ? 'Obrigação' : 'Obrigação'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{obligation}</div>
        </div>
      </div>
    </div>
  )
}

export default function ChurrascoPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('user_scores')
        .select('user_id, total_points, profiles(id, username, display_name, is_admin)')
        .order('total_points', { ascending: false })
      if (data) {
        const entries: LeaderboardEntry[] = data.map((s: any, i: number) => ({
          user_id: s.user_id,
          profile: s.profiles,
          total_points: s.total_points ?? 0,
          rank: i + 1,
        }))
        setLeaderboard(entries)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const total = leaderboard.length

  return (
    <div className="page">
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '8px 0 24px', borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--color-accent)' }}>
          <Flame size={48} strokeWidth={1} />
        </div>
        <div className="font-display" style={{ fontSize: 28, letterSpacing: '0.04em' }}>Churrasco Final</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Quem paga, quem come de graça e quem acende o carvão
        </div>
      </div>

      {/* Rules box */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Info size={16} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Regra de ouro:</strong>{' '}
          1º lugar não paga nada e escolhe o corte. Do 2º em diante, todos rateiam a carne e bebidas.
          Os primeiros três escolhem os cortes. A partir do 4º, o grupo decide os acompanhamentos.
          <br />
          <span style={{ color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Flame size={14} strokeWidth={2} /> Último lugar também acende o carvão!
          </span>
        </div>
      </div>

      {/* Standings */}
      {loading
        ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-xl)', marginBottom: 10 }} />)
        : leaderboard.length === 0
          ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-muted)' }}>
              <Flame size={40} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontSize: 14 }}>O churrasco ainda está por vir...<br />A Copa nem começou!</div>
            </div>
          )
          : leaderboard.map((entry) => (
            <PositionCard key={entry.user_id} entry={entry} totalParticipants={total} />
          ))}
    </div>
  )
}
