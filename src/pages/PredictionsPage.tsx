import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { canPredict, formatMatchDate, formatTimeLeft, flagUrl } from '@/lib/utils'
import type { Match, Prediction } from '@/types'
import { Clock, Lock, CheckCircle2, Loader2 } from 'lucide-react'

type MatchWithPrediction = Match & { myPrediction?: Prediction; allPredictions?: Prediction[] }

function MatchCard({ match, onPredict }: {
  match: MatchWithPrediction
  onPredict: (matchId: number, home: number, away: number) => Promise<void>
}) {
  const isOpen = canPredict(match.starts_at)
  const [home, setHome] = useState(match.myPrediction?.predicted_home ?? '')
  const [away, setAway] = useState(match.myPrediction?.predicted_away ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async () => {
    const h = parseInt(String(home))
    const a = parseInt(String(away))
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    setSaving(true)
    await onPredict(match.id, h, a)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const statusLabel = () => {
    if (match.status === 'LIVE') return <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', fontSize: 12, fontWeight: 600 }}><div className="live-dot" /> AO VIVO</span>
    if (match.status === 'FINISHED') return <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Encerrado</span>
    return <span style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {formatTimeLeft(match.starts_at)}</span>
  }

  return (
    <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {match.stage === 'GROUP_STAGE' ? `Grupo ${match.group_letter} · R${match.round_number}` : match.stage.replace(/_/g, ' ')}
        </span>
        {statusLabel()}
      </div>

      {/* Teams & Score Input / Result Grid */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: isOpen ? 12 : 0 }}>
        <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <img src={match.home_team ? (match.home_team.flag_url || flagUrl(match.home_team.country_code)) : ''} alt={match.home_team?.name} className="flag-md" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{match.home_team?.name}</span>
        </div>

        {/* Center: Live/Finished OR Input Boxes */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {match.status === 'FINISHED' || match.status === 'LIVE' ? (
            <div className="font-display" style={{ fontSize: 28, color: 'var(--color-text-primary)' }}>
              {match.home_score ?? 0} <span style={{ color: 'var(--color-text-muted)', margin: '0 4px', fontSize: 20 }}>—</span> {match.away_score ?? 0}
            </div>
          ) : isOpen ? (
            <div className="score-input-pair" style={{ gap: 6 }}>
              <input
                type="number"
                className="score-input"
                min="0"
                max="20"
                value={home}
                onChange={(e) => setHome(e.target.value)}
                id={`pred-home-${match.id}`}
              />
              <span style={{ fontSize: 16, color: 'var(--color-text-muted)', fontWeight: 700 }}>×</span>
              <input
                type="number"
                className="score-input"
                min="0"
                max="20"
                value={away}
                onChange={(e) => setAway(e.target.value)}
                id={`pred-away-${match.id}`}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)', padding: '10px 0' }}>
              <Lock size={12} /> Bloqueado
            </div>
          )}
          
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2, textTransform: 'uppercase' }}>
            {formatMatchDate(match.starts_at).split(' às ')[0]}
          </div>
        </div>

        <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <img src={match.away_team ? (match.away_team.flag_url || flagUrl(match.away_team.country_code)) : ''} alt={match.away_team?.name} className="flag-md" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{match.away_team?.name}</span>
        </div>
      </div>

      {/* Prediction Action & Footer */}
      {isOpen && (
        <button
          className="btn btn-accent btn-lg"
          style={{ marginTop: 4, fontSize: 13, height: 40, minHeight: 40, padding: '0 16px' }}
          onClick={handleSubmit}
          disabled={saving}
          id={`pred-submit-${match.id}`}
        >
          {saving ? (
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          ) : saved ? (
            <><CheckCircle2 size={14} /> Salvo!</>
          ) : (
            match.myPrediction ? 'Atualizar palpite' : 'Confirmar palpite'
          )}
        </button>
      )}

      {/* Finished Match Extra Details */}
      {match.status === 'FINISHED' && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 12 }}>
          {match.myPrediction ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Seu palpite: <strong style={{ color: 'var(--color-text-primary)' }}>{match.myPrediction.predicted_home}–{match.myPrediction.predicted_away}</strong>
              </span>
              {match.myPrediction.points_earned != null && (
                <span className={`badge ${match.myPrediction.points_earned > 0 ? 'badge-success' : 'badge-muted'}`}>
                  {match.myPrediction.points_earned > 0 ? `+${match.myPrediction.points_earned} pts` : '0 pts'}
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Sem palpite registrado</div>
          )}
          {match.allPredictions && match.allPredictions.length > 1 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {match.allPredictions.map((p) => (
                <div key={p.id} style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-surface-2)', borderRadius: 4, padding: '2px 6px' }}>
                  {(p as any).profiles?.display_name?.split(' ')[0]}: {p.predicted_home}–{p.predicted_away}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PredictionsPage() {
  const { user } = useAuthStore()
  const [matches, setMatches] = useState<MatchWithPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'upcoming' | 'live' | 'finished'>('upcoming')
  const [selectedRound, setSelectedRound] = useState<number>(1)

  useEffect(() => {
    // 1. Load from cache first
    const cached = localStorage.getItem('churrasco_preds_cache')
    if (cached) {
      try {
        const { data, timestamp, round } = JSON.parse(cached)
        // Only use cache if it's less than 5 minutes old
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setMatches(data)
          setSelectedRound(round ?? 1)
          setLoading(false)
        }
      } catch (e) {
        console.error('Cache error', e)
      }
    }
    
    fetchMatches()
  }, [])

  // Auto-set the current round based on matches logic (first non-finished round)
  useEffect(() => {
    if (matches.length > 0 && !localStorage.getItem('churrasco_preds_cache')) {
      const firstUpcoming = matches.find(m => m.status === 'SCHEDULED' || m.status === 'LIVE')
      if (firstUpcoming?.round_number) {
        setSelectedRound(firstUpcoming.round_number)
      }
    }
  }, [matches])

  const fetchMatches = async () => {
    setLoading(true)
    const { data: matchData } = await supabase
      .from('matches')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
      .order('starts_at')

    if (!matchData) { setLoading(false); return }

    const matchIds = matchData.map((m: any) => m.id)
    const { data: preds } = await supabase
      .from('predictions')
      .select('*, profiles(id, username, display_name)')
      .in('match_id', matchIds)

    const myPreds = (preds ?? []).filter((p: any) => p.user_id === user?.id)

    const enriched: MatchWithPrediction[] = matchData.map((m: any) => ({
      ...m,
      myPrediction: myPreds.find((p: any) => p.match_id === m.id),
      allPredictions: m.status === 'FINISHED' || m.status === 'LIVE'
        ? (preds ?? []).filter((p: any) => p.match_id === m.id)
        : [],
    }))

    setMatches(enriched)
    setLoading(false)

    // Save to cache
    localStorage.setItem('churrasco_preds_cache', JSON.stringify({
      data: enriched,
      timestamp: Date.now(),
      round: selectedRound
    }))
  }

  const predict = async (matchId: number, home: number, away: number) => {
    if (!user) return
    const match = matches.find((m) => m.id === matchId)
    if (!match || !canPredict(match.starts_at)) return

    await supabase.from('predictions').upsert({
      user_id: user.id,
      match_id: matchId,
      predicted_home: home,
      predicted_away: away,
    }, { onConflict: 'user_id,match_id' })
    await fetchMatches()
  }

  const filtered = matches.filter((m) => {
    // Round filter
    if (m.round_number !== selectedRound) return false
    
    // Status filter
    if (filter === 'upcoming') return m.status === 'SCHEDULED'
    if (filter === 'live') return m.status === 'LIVE'
    return m.status === 'FINISHED'
  })

  // Unique rounds available in the DB
  const rounds = Array.from(new Set(matches.map(m => m.round_number).filter(Boolean))).sort((a, b) => a! - b!) as number[]

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      {/* Round Selector (Horizontal Scroll) */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginLeft: 4, display: 'block', marginBottom: 8 }}>
          Rodada
        </span>
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          overflowX: 'auto', 
          padding: '4px 4px 12px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}>
          {rounds.length > 0 ? rounds.map((r) => (
            <button
              key={r}
              onClick={() => {
                setSelectedRound(r)
                // Update cache preference
                const cached = localStorage.getItem('churrasco_preds_cache')
                if (cached) {
                  const parsed = JSON.parse(cached)
                  parsed.round = r
                  localStorage.setItem('churrasco_preds_cache', JSON.stringify(parsed))
                }
              }}
              style={{
                minWidth: 44,
                height: 44,
                borderRadius: '50%',
                border: '1px solid ' + (selectedRound === r ? 'var(--color-primary)' : 'var(--color-border)'),
                background: selectedRound === r ? 'var(--color-primary-low)' : 'var(--color-surface)',
                color: selectedRound === r ? 'var(--color-primary)' : 'var(--color-text-primary)',
                fontWeight: 700,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: 'pointer',
                boxShadow: selectedRound === r ? '0 0 15px rgba(0, 96, 57, 0.2)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {r}
            </button>
          )) : (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ minWidth: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
            ))
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 4, border: '1px solid var(--color-border)' }}>
        {(['upcoming', 'live', 'finished'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: filter === f ? 'var(--color-surface-3)' : 'transparent',
              color: filter === f ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              fontSize: 13,
              fontWeight: filter === f ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f === 'upcoming' ? '📅 Próximos' : f === 'live' ? '🔴 Ao vivo' : '✅ Encerrados'}
          </button>
        ))}
      </div>

      {loading && matches.length === 0
        ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-lg)', marginBottom: 10 }} />)
        : filtered.length === 0
          ? <div className="card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-muted)', fontSize: 14 }}>
              <Clock size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
              <div>Nenhuma partida de <strong>Rodada {selectedRound}</strong> com status <strong>{filter === 'upcoming' ? 'Próximos' : filter === 'live' ? 'Ao Vivo' : 'Encerrados'}</strong>.</div>
            </div>
          : filtered.map((match) => (
              <MatchCard key={match.id} match={match} onPredict={predict} />
            ))
      }
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
