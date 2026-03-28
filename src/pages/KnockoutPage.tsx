import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { flagUrl } from '@/lib/utils'
import type { Team } from '@/types'
import { Lock, Info } from 'lucide-react'

type Stage = 'ROUND_OF_16' | 'QUARTER_FINALS' | 'SEMI_FINALS' | 'FINAL'

const STAGES: { key: Stage; label: string; slots: number; points: number }[] = [
  { key: 'ROUND_OF_16', label: 'Oitavas', slots: 16, points: 3 },
  { key: 'QUARTER_FINALS', label: 'Quartas', slots: 8, points: 5 },
  { key: 'SEMI_FINALS', label: 'Semis', slots: 4, points: 8 },
  { key: 'FINAL', label: 'Campeão', slots: 1, points: 15 },
]

interface KnockoutPick {
  stage: Stage
  slot_index: number
  team_id: number
  team?: Team
}

function TeamSlot({ pick, allTeams, onSelect, disabled }: {
  pick: KnockoutPick | undefined
  allTeams: Team[]
  onSelect: (teamId: number) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)

  if (pick?.team) {
    return (
      <button
        onClick={disabled ? undefined : () => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          cursor: disabled ? 'default' : 'pointer',
          minWidth: 100,
          position: 'relative',
        }}
      >
        <img src={pick.team.flag_url || flagUrl(pick.team.country_code, 'sm')} alt={pick.team.name} className="flag-sm" />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{pick.team.name}</span>
        {open && !disabled && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            maxHeight: 200,
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {allTeams.map((t) => (
              <button
                key={t.id}
                onClick={() => { onSelect(t.id); setOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-primary)', fontSize: 13 }}
              >
                <img src={t.flag_url || flagUrl(t.country_code, 'sm')} alt={t.name} className="flag-sm" />
                {t.name}
              </button>
            ))}
          </div>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={disabled ? undefined : () => setOpen(!open)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 10px',
        background: 'var(--color-surface-2)',
        border: '1.5px dashed var(--color-border)',
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'default' : 'pointer',
        minWidth: 100,
        fontSize: 12,
        color: 'var(--color-text-muted)',
        position: 'relative',
      }}
    >
      {disabled ? <Lock size={12} /> : '+ Escolher'}
      {open && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 100,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          maxHeight: 200,
          width: 180,
          overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {allTeams.map((t) => (
            <button
              key={t.id}
              onClick={() => { onSelect(t.id); setOpen(false) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-primary)', fontSize: 13 }}
            >
              <img src={t.flag_url || flagUrl(t.country_code, 'sm')} alt={t.name} className="flag-sm" />
              {t.name}
            </button>
          ))}
        </div>
      )}
    </button>
  )
}

export default function KnockoutPage() {
  const { user } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [myPicks, setMyPicks] = useState<KnockoutPick[]>([])
  const [knockoutOpen, setKnockoutOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [teamsRes, picksRes, configRes] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('knockout_picks').select('*, teams(*)').eq('user_id', user?.id ?? ''),
      supabase.from('app_config').select('phase').single(),
    ])
    if (teamsRes.data) setTeams(teamsRes.data)
    if (picksRes.data) setMyPicks(picksRes.data.map((p: any) => ({ ...p, team: p.teams })))
    const phase = configRes.data?.phase
    setKnockoutOpen(phase === 'GROUP_STAGE' || phase === 'KNOCKOUT')
    setLoading(false)
  }

  const savePick = async (stage: Stage, slotIndex: number, teamId: number) => {
    if (!user) return
    setSaving(true)
    await supabase.from('knockout_picks').upsert({
      user_id: user.id,
      round: stage,
      slot_index: slotIndex,
      team_id: teamId,
    }, { onConflict: 'user_id,round,slot_index' })
    showToast('Mata-mata salvo!')
    await fetchData()
    setSaving(false)
  }

  return (
    <div className="page">
      {/* Info banner */}
      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Info size={16} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Como funciona o Mata-mata</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            Escolha as seleções que avançam em cada fase. Cada acerto vale pontos bônus.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {STAGES.map((s) => (
              <span key={s.key} className="badge badge-accent">
                {s.label}: +{s.points} pts
              </span>
            ))}
          </div>
        </div>
      </div>

      {!knockoutOpen && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <Lock size={14} style={{ color: 'var(--color-error)' }} />
          <div style={{ fontSize: 13, color: 'var(--color-error)' }}>Mata-mata disponível apenas na fase de grupos.</div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {STAGES.map((stage) => {
            const stagePicks = myPicks.filter((p) => p.stage === stage.key)
            return (
              <div key={stage.key} className="card">
                <div className="section-header" style={{ marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{stage.label}</span>
                  <span className="badge badge-accent">+{stage.points} pts cada</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Array.from({ length: stage.slots }).map((_, idx) => {
                    const pick = stagePicks.find((p) => p.slot_index === idx)
                    return (
                      <TeamSlot
                        key={idx}
                        pick={pick}
                        allTeams={teams}
                        onSelect={(teamId) => savePick(stage.key, idx, teamId)}
                        disabled={!knockoutOpen || saving}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 20px', fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
