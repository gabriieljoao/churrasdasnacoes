import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { canPickCraque, flagUrl, getCraqueDeadline } from '@/lib/utils'
import { DRAFT_MAX_TEAMS, DRAFT_MAX_SHARED } from '@/lib/scoring'
import type { Team, Player, DraftPick, Match } from '@/types'
import { Shield, Users, Lock, Clock, CheckCircle2, Zap, Save, Coins } from 'lucide-react'
import { format } from 'date-fns'

// ─── Draft — Team Section ──────────────────────────────────────────────────────

function TeamCard({ team, isMyPick, onToggle, disabled, pickedCount, maxReached }: {
  team: Team
  isMyPick: boolean
  onToggle: () => void
  disabled: boolean
  pickedCount: number
  maxReached: boolean
}) {
  const isFull = pickedCount >= DRAFT_MAX_SHARED
  const canInteract = isMyPick || (!isFull && !disabled && !maxReached)

  return (
    <button
      onClick={canInteract ? onToggle : undefined}
      disabled={!canInteract}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: isMyPick
          ? 'rgba(37,99,235,0.12)'
          : isFull ? 'rgba(239,68,68,0.06)' : 'var(--color-surface-2)',
        border: `1.5px solid ${isMyPick ? 'rgba(37,99,235,0.4)' : isFull ? 'rgba(239,68,68,0.2)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: canInteract ? 'pointer' : 'default',
        transition: 'all 0.15s',
        textAlign: 'left',
        opacity: (!canInteract && !isMyPick) ? 0.6 : 1
      }}
    >
      <img
        src={team.flag_url || flagUrl(team.country_code)}
        alt={team.name}
        className="flag-md"
        onError={(e) => { (e.target as HTMLImageElement).src = `https://flagcdn.com/w80/${team.country_code.toLowerCase()}.png` }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{team.name}</div>
        {team.group_letter && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Grupo {team.group_letter}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isMyPick && (
          <span className="badge badge-accent"><CheckCircle2 size={10} /> Meu</span>
        )}
        {pickedCount > 0 && !isMyPick && (
          <span className="badge badge-muted">
            <Users size={10} /> {pickedCount}/{DRAFT_MAX_SHARED}
          </span>
        )}
        {isFull && !isMyPick && <Lock size={14} style={{ color: 'var(--color-error)' }} />}
      </div>
    </button>
  )
}

// ─── Craque Picker ────────────────────────────────────────────────────────────

function CraqueCard({ player, isSelected, onSelect, disabled, canAfford }: {
  player: Player & { team?: Team }
  isSelected: boolean
  onSelect: () => void
  disabled: boolean
  canAfford: boolean
}) {
  const interactable = !disabled && (isSelected || canAfford)
  return (
    <button
      onClick={interactable ? onSelect : undefined}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: isSelected ? 'rgba(245,158,11,0.1)' : 'var(--color-surface-2)',
        border: `1.5px solid ${isSelected ? 'rgba(245,158,11,0.4)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: interactable ? 'pointer' : 'default',
        transition: 'all 0.15s',
        textAlign: 'left',
        opacity: (!interactable && !isSelected) ? 0.6 : 1
      }}
    >
      {player.team && (
        <img src={player.team.flag_url || flagUrl(player.team.country_code, 'sm')} alt={player.team.name} className="flag-sm" />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>
          {player.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{player.team?.name} · {player.position}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Coins size={12} /> {player.price}
        </span>
        {isSelected && <span className="badge badge-gold"><Zap size={10} /> Selecionado</span>}
        {!isSelected && !canAfford && <span style={{ fontSize: 10, color: 'var(--color-error)' }}>Saldo Insuficiente</span>}
      </div>
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DraftPage() {
  const { user } = useAuthStore()
  
  // Data State
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<(Player & { team?: Team })[]>([])
  const [picks, setPicks] = useState<DraftPick[]>([])
  const [currentRound, setCurrentRound] = useState<{ number: number; firstMatch?: Match } | null>(null)
  
  // Database state for user choices
  const [dbTeamIds, setDbTeamIds] = useState<Set<number>>(new Set())
  const [dbCraqueId, setDbCraqueId] = useState<number | null>(null)
  
  // Local (Unsaved) State
  const [localTeamIds, setLocalTeamIds] = useState<Set<number>>(new Set())
  const [localCraqueId, setLocalCraqueId] = useState<number | null>(null)

  // Economy State
  const [userBalance, setUserBalance] = useState<number>(0)

  // Screen State
  const [draftOpen, setDraftOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [tab, setTab] = useState<'teams' | 'craque'>('teams')
  const [groupFilter, setGroupFilter] = useState<string | null>(null)
  const [playerTeamFilter, setPlayerTeamFilter] = useState<number | 'all'>('all')
  const [missingPicksAlert, setMissingPicksAlert] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [teamsRes, playersRes, picksRes, configRes, scoreRes] = await Promise.all([
        supabase.from('teams').select('*').order('group_letter').order('name'),
        supabase.from('players').select('*, teams(*)').order('name'),
        supabase.from('draft_picks').select('*, profiles(id, username, display_name), teams(*)'),
        supabase.from('app_config').select('*').single(),
        supabase.from('user_scores').select('total_points').eq('user_id', user?.id).single()
      ])

      if (scoreRes.data) setUserBalance(scoreRes.data.total_points ?? 0)
      if (teamsRes.data) setTeams(teamsRes.data)
      if (playersRes.data) setPlayers(playersRes.data.map((p: any) => ({ ...p, team: p.teams })))
      if (picksRes.data) {
        setPicks(picksRes.data.map((p: any) => ({ ...p, team: p.teams, profile: p.profiles })))
        const myPicks = picksRes.data.filter((p: any) => p.user_id === user?.id)
        const myIds = new Set<number>(myPicks.map((p: any) => p.team_id))
        setDbTeamIds(myIds)
        setLocalTeamIds(new Set(myIds)) // sync local
      }

      const config = configRes.data
      if (config) setDraftOpen(config.draft_open ?? true)

      // Get current round (Smart Detection)
      const { data: allMatches } = await supabase
        .from('matches')
        .select('*')
        .order('starts_at')
      
      if (allMatches && allMatches.length > 0) {
        const now = Date.now()
        const fourHoursAgo = now - 4 * 60 * 60 * 1000
        
        const activeMatch = allMatches.find(m => 
          m.status === 'LIVE' || 
          (m.status === 'SCHEDULED' && new Date(m.starts_at).getTime() > fourHoursAgo)
        )

        const roundNum = activeMatch?.round_number ?? 1
        
        const roundMatches = allMatches.filter(m => m.round_number === roundNum)
        const roundInfo = { number: roundNum, firstMatch: roundMatches[0] }
        setCurrentRound(roundInfo)

        // Get craques for current round
        const { data: craques } = await supabase
          .from('round_craques')
          .select('*, players(*, teams(*))')
          .eq('round_number', roundNum)
            
        if (craques) {
          const my = craques.find((c: any) => c.user_id === user?.id)
          setDbCraqueId(my ? my.player_id : null)
          setLocalCraqueId(my ? my.player_id : null)
          if (!my) setMissingPicksAlert(true)
        } else {
          setMissingPicksAlert(true)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── Local Toggles ──────────────────────────────────────────────────────────

  const toggleLocalTeam = (teamId: number) => {
    if (!draftOpen) return
    
    // If I already have my full draft (3 teams), clicking a team acts as a filter shortcut to the Craque tab
    // BUT only for the teams in the list, not the ones already picked (which remain static/toggleable)
    if (localTeamIds.size === DRAFT_MAX_TEAMS && !localTeamIds.has(teamId)) {
      setTab('craque')
      setPlayerTeamFilter(teamId)
      // Scroll to top to see the dropdown
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const next = new Set(localTeamIds)
    if (next.has(teamId)) {
      next.delete(teamId)
    } else {
      if (next.size >= DRAFT_MAX_TEAMS) return // max reached
      next.add(teamId)
    }
    setLocalTeamIds(next)
  }

  const toggleLocalCraque = (playerId: number) => {
    if (localCraqueId === playerId) {
      setLocalCraqueId(null)
    } else {
      setLocalCraqueId(playerId)
    }
  }

  // Calculate changes
  const hasTeamChanges = JSON.stringify(Array.from(localTeamIds).sort()) !== JSON.stringify(Array.from(dbTeamIds).sort())
  const hasCraqueChanges = localCraqueId !== dbCraqueId

  // Economy calculations
  const oldPlayerPrice = dbCraqueId ? (players.find(p => p.id === dbCraqueId)?.price || 0) : 0
  const effectiveBalance = userBalance + oldPlayerPrice

  // ─── Save Functions ──────────────────────────────────────────────────────────

  const saveTeams = async () => {
    if (!user || !hasTeamChanges) return
    setSaving(true)

    const toAdd = Array.from(localTeamIds).filter(id => !dbTeamIds.has(id))
    const toRemove = Array.from(dbTeamIds).filter(id => !localTeamIds.has(id))

    try {
      if (toRemove.length > 0) {
        await supabase.from('draft_picks').delete().eq('user_id', user.id).in('team_id', toRemove)
      }
      if (toAdd.length > 0) {
        const inserts = toAdd.map(team_id => ({ user_id: user.id, team_id }))
        const { error } = await supabase.from('draft_picks').insert(inserts)
        if (error) throw error
      }
      showToast('Seleções salvas com sucesso!')
      await fetchData()
    } catch (err: any) {
      showToast('Erro ao salvar algumas seleções. Elas podem estar lotadas.')
      await fetchData() // refresh to real state
    } finally {
      setSaving(false)
    }
  }

  const saveCraque = async () => {
    if (!user || !currentRound || !hasCraqueChanges) return
    
    // Validate deadline
    const firstMatchAt = currentRound.firstMatch?.starts_at
    if (firstMatchAt && !canPickCraque(firstMatchAt)) {
      showToast('Prazo para escolher o craque esgotou!')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.rpc('buy_craque', {
        p_user_id: user.id,
        p_player_id: localCraqueId,
        p_round_number: currentRound.number
      })
      if (error) throw error
      
      showToast('Craque salvo com sucesso!')
      await fetchData() // Will refresh the userBalance
    } catch (err: any) {
      console.error(err)
      showToast(err.message || 'Erro ao comprar craque. Saldo insuficiente?')
    } finally {
      setSaving(false)
    }
  }

  // ─── Derived UI Data ────────────────────────────────────────────────────────

  const groups = [...new Set(teams.map((t) => t.group_letter).filter(Boolean))] as string[]
  const filteredTeams = groupFilter ? teams.filter((t) => t.group_letter === groupFilter) : teams

  const craqueDeadlinePassed = currentRound?.firstMatch
    ? !canPickCraque(currentRound.firstMatch.starts_at)
    : false

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      {/* Missing Picks Alert */}
      {missingPicksAlert && !craqueDeadlinePassed && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={16} style={{ color: 'var(--color-gold)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-gold)' }}>Craque pendente!</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Você ainda não escolheu seu craque para a Rodada {currentRound?.number}.</div>
          </div>
        </div>
      )}

      {!draftOpen && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Lock size={16} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-error)' }}>Draft encerrado</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>A Copa começou. Seleções não podem mais ser alteradas.</div>
          </div>
        </div>
      )}

      {/* Basic Dashboard Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Meu Draft</span>
          <span className={`badge ${localTeamIds.size >= DRAFT_MAX_TEAMS ? 'badge-success' : 'badge-muted'}`}>
            {localTeamIds.size}/{DRAFT_MAX_TEAMS} seleções
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {Array.from(localTeamIds).map((id) => {
            const team = teams.find(t => t.id === id)
            if (!team) return null
            return (
              <div key={id} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 8, 
                background: 'var(--color-surface-2)', 
                border: '1px solid var(--color-border)', 
                borderRadius: 'var(--radius-lg)', 
                padding: '16px 8px',
                textAlign: 'center'
              }}>
                <img src={team.flag_url || flagUrl(team.country_code, 'md')} alt={team.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-surface)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.1 }}>{team.name}</span>
              </div>
            )
          })}
          {Array.from({ length: Math.max(0, DRAFT_MAX_TEAMS - localTeamIds.size) }).map((_, i) => (
            <div key={`empty-${i}`} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 8, 
              border: '1.5px dashed var(--color-border-subtle)', 
              borderRadius: 'var(--radius-lg)', 
              padding: '16px 8px'
            }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20, color: 'var(--color-text-muted)' }}>+</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)' }}>Vazio</span>
            </div>
          ))}
        </div>

        {/* MVP Craque Info */}
        {currentRound && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚡ Craque da Rodada {currentRound.number}
              </span>
              {currentRound.firstMatch && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} />
                  {craqueDeadlinePassed ? 'Encerrado' : `Até ${format(getCraqueDeadline(currentRound.firstMatch.starts_at), "dd/MM HH:mm")}`}
                </span>
              )}
            </div>
            
            {localCraqueId ? (() => {
              const player = players.find(p => p.id === localCraqueId)
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
                  <Zap size={14} style={{ color: 'var(--color-gold)' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {player?.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    · {player?.team?.name}
                  </span>
                </div>
              )
            })() : (
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                {craqueDeadlinePassed ? 'Você não escolheu craque para esta rodada.' : 'Nenhum selecionado'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${tab === 'teams' ? 'btn-accent' : 'btn-ghost'}`}
          style={{ flex: 1 }}
          onClick={() => setTab('teams')}
          id="tab-teams"
        >
          <Shield size={14} /> Seleções
        </button>
        <button
          className={`btn btn-sm ${tab === 'craque' ? 'btn-accent' : 'btn-ghost'}`}
          style={{ flex: 1 }}
          onClick={() => setTab('craque')}
          id="tab-craque"
        >
          <Zap size={14} /> Craque
        </button>
      </div>

      {/* Teams tab */}
      {tab === 'teams' && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <button className={`badge ${!groupFilter ? 'badge-accent' : 'badge-muted'}`} style={{ cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => setGroupFilter(null)}>
              Todos
            </button>
            {groups.map((g) => (
              <button key={g} className={`badge ${groupFilter === g ? 'badge-accent' : 'badge-muted'}`} style={{ cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => setGroupFilter(g)}>
                Grupo {g}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 58, borderRadius: 'var(--radius-md)' }} />)
              : filteredTeams.map((team) => {
                const teamPicks = picks.filter((p) => p.team_id === team.id && p.user_id !== user?.id)
                const otherPickCount = teamPicks.length
                
                return (
                  <TeamCard
                    key={team.id}
                    team={team}
                    isMyPick={localTeamIds.has(team.id)}
                    onToggle={() => toggleLocalTeam(team.id)}
                    disabled={saving || !draftOpen}
                    pickedCount={otherPickCount + (dbTeamIds.has(team.id) ? 1 : 0)}
                    maxReached={localTeamIds.size >= DRAFT_MAX_TEAMS}
                  />
                )
              })}
          </div>

          {hasTeamChanges && (
            <div style={{ position: 'fixed', bottom: 84, left: 0, right: 0, padding: '0 16px', zIndex: 40, display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={saveTeams} 
                disabled={saving || localTeamIds.size !== DRAFT_MAX_TEAMS}
                className="btn btn-primary" 
                style={{ width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(230, 51, 41, 0.4)' }}
              >
                {saving ? 'Salvando...' : (localTeamIds.size === DRAFT_MAX_TEAMS ? <><Save size={16} /> Confirmar {DRAFT_MAX_TEAMS} Seleções</> : `Escolha mais ${DRAFT_MAX_TEAMS - localTeamIds.size} seleções`)}
              </button>
            </div>
          )}
        </>
      )}

      {/* Craque tab */}
      {tab === 'craque' && (
        <>
          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seu Saldo Restante</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Coins size={18} /> {userBalance} pts
              </div>
            </div>
            {hasCraqueChanges && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ao salvar</div>
                {localCraqueId ? (() => {
                  const p = players.find(p => p.id === localCraqueId)
                  if (!p) return null
                  const diff = effectiveBalance - p.price
                  return (
                    <div style={{ fontSize: 13, fontWeight: 600, color: diff >= 0 ? 'var(--color-text-primary)' : 'var(--color-error)' }}>
                      ficará com {diff} pts
                    </div>
                  )
                })() : (
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-success)' }}>
                    + {oldPlayerPrice} pts de reembolso
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Escolha 1 jogador. O custo dele cai dos seus pontos no Ranking! Se cancelar a seleção, você recebe os pontos de volta.
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginLeft: 4 }}>
                Filtrar por Time
              </label>
              <select 
                value={playerTeamFilter} 
                onChange={(e) => setPlayerTeamFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: 14,
                  outline: 'none'
                }}
              >
                <option value="all">Todos os times</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 'var(--radius-md)' }} />)
              : players
                  .filter(p => playerTeamFilter === 'all' || p.team_id === playerTeamFilter)
                  .map((player) => (
                    <CraqueCard
                      key={player.id}
                      player={player}
                      isSelected={localCraqueId === player.id}
                      onSelect={() => toggleLocalCraque(player.id)}
                      disabled={craqueDeadlinePassed || saving}
                      canAfford={effectiveBalance >= player.price!}
                    />
                  ))
            }
          </div>

          {hasCraqueChanges && (
            <div style={{ position: 'fixed', bottom: 84, left: 0, right: 0, padding: '0 16px', zIndex: 40, display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={saveCraque} 
                disabled={saving || (localCraqueId !== null && effectiveBalance < (players.find(p => p.id === localCraqueId)?.price || 0))}
                className="btn btn-primary" 
                style={{ width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(230, 51, 41, 0.4)' }}
              >
                {saving ? 'Validando...' : <><Save size={16} /> Confirmar Craque</>}
              </button>
            </div>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 20px', fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', backdropFilter: 'blur(8px)', pointerEvents: 'auto', whiteSpace: 'nowrap' }}>
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
