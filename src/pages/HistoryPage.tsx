import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { SCORE_LABELS } from '@/lib/scoring'
import { ArrowLeft, Clock, History, CalendarDays } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ScoreLedger {
  id: string
  reason: string
  points: number
  created_at: string
  round_number?: number
  match_id?: number
  match?: {
    home_team: { name: string, country_code: string }
    away_team: { name: string, country_code: string }
  }
}

export default function HistoryPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [ledgers, setLedgers] = useState<ScoreLedger[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return
      setLoading(true)
      try {
        const { data } = await supabase
          .from('score_ledger')
          .select(`
            id, reason, points, created_at, round_number, match_id,
            matches (
              home_team:teams!matches_home_team_id_fkey(name, country_code),
              away_team:teams!matches_away_team_id_fkey(name, country_code)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (data) {
          // Flatten because Supabase returns nested relations as arrays or objects depending on config
          const formatted = data.map((d: any) => ({
            ...d,
            match: d.matches ? {
              home_team: Array.isArray(d.matches.home_team) ? d.matches.home_team[0] : d.matches.home_team,
              away_team: Array.isArray(d.matches.away_team) ? d.matches.away_team[0] : d.matches.away_team,
            } : undefined
          }))
          setLedgers(formatted)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [user])

  // Group by date
  const groupedLedgers = ledgers.reduce((acc, curr) => {
    const date = new Date(curr.created_at).toLocaleDateString('pt-BR')
    if (!acc[date]) acc[date] = []
    acc[date].push(curr)
    return acc
  }, {} as Record<string, ScoreLedger[]>)

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, background: 'var(--color-surface-2)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', padding: 4 }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} style={{ color: 'var(--color-accent)' }} /> Extrato de Pontos
          </h1>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Histórico completo da sua conta</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : ledgers.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <Clock size={40} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>Nenhum movimento</div>
          <div style={{ fontSize: 13 }}>Seu extrato ainda está vazio.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(groupedLedgers).map(([date, items]) => (
            <div key={date}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarDays size={12} />
                {date}
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {items.map((item, idx) => {
                  const isPositive = item.points > 0
                  const isNegative = item.points < 0
                  const label = SCORE_LABELS[item.reason] || item.reason

                  return (
                    <div key={item.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderBottom: idx < items.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {format(new Date(item.created_at), "HH:mm", { locale: ptBR })}
                          {item.match && (
                            <>
                              <span>•</span>
                              <span>{item.match.home_team.name} x {item.match.away_team.name}</span>
                            </>
                          )}
                          {item.round_number && !item.match && (
                            <>
                              <span>•</span>
                              <span>Rodada {item.round_number}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: isPositive ? 'var(--color-success)' : isNegative ? 'var(--color-error)' : 'var(--color-text-muted)',
                        background: isPositive ? 'rgba(34,197,94,0.1)' : isNegative ? 'rgba(239,68,68,0.1)' : 'var(--color-surface-2)',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-md)',
                      }}>
                        {isPositive ? '+' : ''}{item.points} pts
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
