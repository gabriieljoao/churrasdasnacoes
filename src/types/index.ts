// ─── Auth / User ──────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  username: string
  display_name: string
  is_admin: boolean
  avatar_url?: string
  created_at: string
}

// ─── Teams & Players ──────────────────────────────────────────────────────────

export interface Team {
  id: number
  name: string
  country_code: string
  flag_url: string
  group_letter?: string // 'A'–'H'
}

export interface Player {
  id: number
  name: string
  team_id: number
  team?: Team
  position?: string
  price: number
}

// ─── Draft ────────────────────────────────────────────────────────────────────

export interface DraftPick {
  id: string
  user_id: string
  team_id: number
  team?: Team
  picked_at: string
  profile?: Profile
}

export interface RoundCraque {
  id: string
  user_id: string
  player_id: number
  round_number: number
  deadline: string // ISO datetime — 6h before 1st match of round
  player?: Player
  profile?: Profile
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export type MatchStage =
  | 'GROUP_STAGE'
  | 'ROUND_OF_16'
  | 'QUARTER_FINALS'
  | 'SEMI_FINALS'
  | 'FINAL'

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED'

export interface Match {
  id: number
  external_id?: number
  home_team_id: number
  away_team_id: number
  home_team?: Team
  away_team?: Team
  home_score?: number
  away_score?: number
  home_score_ft?: number // full-time (after ET if applicable)
  away_score_ft?: number
  stage: MatchStage
  group_letter?: string
  round_number?: number
  match_day: number
  starts_at: string // ISO datetime
  status: MatchStatus
  updated_at: string
}

// ─── Predictions (Palpites) ────────────────────────────────────────────────────

export interface Prediction {
  id: string
  user_id: string
  match_id: number
  predicted_home: number
  predicted_away: number
  points_earned?: number
  submitted_at: string
  profile?: Profile
  match?: Match
}

// ─── Knockout picks (Mata-mata) ────────────────────────────────────────────────

export interface KnockoutPick {
  id: string
  user_id: string
  round: MatchStage
  slot_index: number // position within the round bracket
  team_id: number
  team?: Team
}

// ─── Score ledger ─────────────────────────────────────────────────────────────

export type ScoreReason =
  | 'WIN'
  | 'DRAW'
  | 'BLOWOUT'
  | 'ADVANCE_R16'
  | 'ADVANCE_QF'
  | 'ADVANCE_SF'
  | 'ADVANCE_FINAL'
  | 'CHAMPION'
  | 'GOAL'
  | 'CRAQUE_GOAL'
  | 'PREDICTION_WINNER'
  | 'PREDICTION_EXACT'
  | 'MVP_BONUS'
  | 'BRACKET_R16'
  | 'BRACKET_QF'
  | 'BRACKET_SF'
  | 'BRACKET_CHAMPION'

export interface ScoreEntry {
  id: string
  user_id: string
  match_id?: number
  round_number?: number
  reason: ScoreReason
  points: number
  metadata?: Record<string, unknown>
  created_at: string
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  user_id: string
  profile: Profile
  total_points: number
  rank: number
  round_points?: number // points in current round
}

export interface MVPRecord {
  id: string
  user_id: string
  round_number: number
  points: number
  profile?: Profile
  created_at: string
}

// ─── App State ────────────────────────────────────────────────────────────────

export type AppPhase = 'PRE_COPA' | 'GROUP_STAGE' | 'KNOCKOUT' | 'FINISHED'

export interface AppConfig {
  phase: AppPhase
  copa_start: string // ISO datetime
  draft_open: boolean
  knockout_start?: string
}

// ─── Churrasco Rules ──────────────────────────────────────────────────────────

export interface ChurrascoPosition {
  rank: number
  user_id: string
  total_points: number
  profile: Profile
  privilege?: string
  obligation: string
  lights_charcoal: boolean
}
