import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { canPredict, formatMatchDate, formatTimeLeft, flagUrl } from '@/lib/utils'
import type { Match, Prediction } from '@/types'
import { Clock, Lock, CheckCircle2, Loader2, ChevronLeft, ChevronRight, Flame } from 'lucide-react'

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
              {match.home_score_ft ?? 0} <span style={{ color: 'var(--color-text-muted)', margin: '0 4px', fontSize: 20 }}>—</span> {match.away_score_ft ?? 0}
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
          
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2, textTransform: 'uppercase', fontWeight: 600 }}>
            {formatMatchDate(match.starts_at)}
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

      {/* Prediction Details Section (Visible if closed or finished) */}
      {!isOpen && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 12 }}>
          {match.myPrediction ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                Seu palpite: <strong style={{ color: 'var(--color-text-primary)' }}>{match.myPrediction.predicted_home}–{match.myPrediction.predicted_away}</strong>
              </span>
              {match.myPrediction.points_earned !== undefined && match.myPrediction.points_earned !== null && (
                <span className={`badge ${match.myPrediction.points_earned > 0 ? 'badge-success' : 'badge-muted'}`}>
                  {match.myPrediction.points_earned > 0 ? `+${match.myPrediction.points_earned} pts` : '0 pts'}
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              {match.status === 'FINISHED' ? 'Você não enviou palpite para este jogo.' : 'Você ainda não registrou seu palpite.'}
            </div>
          )}
          
          {/* Other players' predictions if match is over/live */}
          {(match.status === 'FINISHED' || match.status === 'LIVE') && match.allPredictions && match.allPredictions.length > 1 && (
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
  const [missingPredsAlert, setMissingPredsAlert] = useState(false)

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

  // Auto-set the current round based on filter and matches
  useEffect(() => {
    if (matches.length === 0) return

    if (filter === 'upcoming' || filter === 'live') {
      // SMART ROUND: Find the match that is LIVE or starts soonest (ignoring old stuck matches)
      const now = Date.now()
      const fourHoursAgo = now - 4 * 60 * 60 * 1000
      
      const activeMatch = matches.find(m => 
        m.status === 'LIVE' || 
        (m.status === 'SCHEDULED' && new Date(m.starts_at).getTime() > fourHoursAgo)
      )

      if (activeMatch?.round_number) {
        setSelectedRound(activeMatch.round_number)
      }
    } else if (filter === 'finished') {
      // Find LAST round that has finished matches
      // To be "100% finished", we can group by round and check
      const roundGroups = matches.reduce((acc: any, m) => {
        if (!m.round_number) return acc
        if (!acc[m.round_number]) acc[m.round_number] = []
        acc[m.round_number].push(m)
        return acc
      }, {})

      const finishedRounds = Object.keys(roundGroups)
        .filter(r => roundGroups[r].every((m: any) => m.status === 'FINISHED'))
        .map(Number)
        .sort((a, b) => b - a)

      if (finishedRounds.length > 0) {
        setSelectedRound(finishedRounds[0])
      } else {
        // Fallback to highest round with any finished match
        const anyFinished = [...matches]
          .reverse()
          .find(m => m.status === 'FINISHED')
        if (anyFinished?.round_number) setSelectedRound(anyFinished.round_number)
      }
    }
  }, [matches, filter])

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

    // Check for missing predictions in next 24h
    const now = Date.now()
    const tomorrow = now + 24 * 60 * 60 * 1000
    const pending = enriched.some(m => 
      m.status === 'SCHEDULED' && 
      new Date(m.starts_at).getTime() < tomorrow && 
      !m.myPrediction
    )
    setMissingPredsAlert(pending)

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


  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      {/* Missing Predictions Alert */}
      {missingPredsAlert && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Flame size={16} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-error)' }}>Palpites pendentes!</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Você tem jogos nas próximas 24h que ainda não foram palpitados. Não perca pontos!</div>
          </div>
        </div>
      )}

      {/* Round Selector (Arrows) */}
      <div style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'center', display: 'block', marginBottom: 12, letterSpacing: '0.1em' }}>
          Rodada do Brasileirão
        </span>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: 16,
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          padding: '10px 16px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--glass-shadow)'
        }}>
          <button 
            onClick={() => setSelectedRound(Math.max(1, selectedRound - 1))}
            disabled={selectedRound <= 1}
            style={{ 
              width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'var(--color-surface-3)', 
              color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', opacity: selectedRound <= 1 ? 0.3 : 1
            }}
          >
            <ChevronLeft size={20} />
          </button>
          
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontFamily: 'var(--font-display)', color: 'var(--color-accent)', lineHeight: 1 }}>
              RODADA {selectedRound}
            </div>
          </div>

          <button 
            onClick={() => setSelectedRound(Math.min(38, selectedRound + 1))}
            disabled={selectedRound >= 38}
            style={{ 
              width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'var(--color-surface-3)', 
              color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', opacity: selectedRound >= 38 ? 0.3 : 1
            }}
          >
            <ChevronRight size={20} />
          </button>
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
