-- ============================================================
--  ChurrAsco das Nações — Initial Database Schema
--  Run this in your Supabase SQL Editor
-- ============================================================

-- ─── Enable extensions ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── App Config ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_config (
  id          BOOLEAN PRIMARY KEY DEFAULT TRUE,  -- singleton row
  phase       TEXT NOT NULL DEFAULT 'PRE_COPA' CHECK (phase IN ('PRE_COPA','GROUP_STAGE','KNOCKOUT','FINISHED')),
  copa_start  TIMESTAMPTZ,
  draft_open  BOOLEAN NOT NULL DEFAULT TRUE,
  knockout_start TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO app_config (id) VALUES (TRUE) ON CONFLICT DO NOTHING;

-- ─── Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 2 AND 40),
  is_admin     BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Teams ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  country_code  TEXT NOT NULL,  -- ISO 3166-1 alpha-2, lowercase
  flag_url      TEXT,
  group_letter  CHAR(1),        -- NULL for knockout teams
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Players ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  team_id   INTEGER NOT NULL REFERENCES teams(id),
  position  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Draft Picks ──────────────────────────────────────────────────────────────
-- Max 3 picks per user; max 2 users per team (enforced via CHECK/trigger)
CREATE TABLE IF NOT EXISTS draft_picks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id    INTEGER NOT NULL REFERENCES teams(id),
  picked_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, team_id)
);

-- Max 2 users per team
CREATE OR REPLACE FUNCTION check_draft_team_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM draft_picks WHERE team_id = NEW.team_id) >= 2 THEN
    RAISE EXCEPTION 'Essa seleção já foi escolhida por 2 jogadores.';
  END IF;
  IF (SELECT COUNT(*) FROM draft_picks WHERE user_id = NEW.user_id) >= 3 THEN
    RAISE EXCEPTION 'Você já escolheu o máximo de 3 seleções.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_draft_team_limit ON draft_picks;
CREATE TRIGGER trg_draft_team_limit
  BEFORE INSERT ON draft_picks
  FOR EACH ROW EXECUTE FUNCTION check_draft_team_limit();

-- ─── Round Craques ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS round_craques (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_id     INTEGER NOT NULL REFERENCES players(id),
  round_number  INTEGER NOT NULL,
  deadline      TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, round_number)
);

-- ─── Matches ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id             SERIAL PRIMARY KEY,
  external_id    INTEGER UNIQUE,  -- football-data.org match id
  home_team_id   INTEGER NOT NULL REFERENCES teams(id),
  away_team_id   INTEGER NOT NULL REFERENCES teams(id),
  home_score     INTEGER,
  away_score     INTEGER,
  home_score_ft  INTEGER,
  away_score_ft  INTEGER,
  stage          TEXT NOT NULL DEFAULT 'GROUP_STAGE' CHECK (stage IN ('GROUP_STAGE','ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','FINAL')),
  group_letter   CHAR(1),
  round_number   INTEGER,
  match_day      INTEGER NOT NULL DEFAULT 1,
  starts_at      TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','LIVE','FINISHED','POSTPONED')),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Predictions (Palpites) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id        INTEGER NOT NULL REFERENCES matches(id),
  predicted_home  INTEGER NOT NULL CHECK (predicted_home >= 0),
  predicted_away  INTEGER NOT NULL CHECK (predicted_away >= 0),
  points_earned   INTEGER,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, match_id)
);

-- Server-side deadline check
CREATE OR REPLACE FUNCTION check_prediction_deadline()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT starts_at FROM matches WHERE id = NEW.match_id) <= NOW() THEN
    RAISE EXCEPTION 'Prazo para palpite encerrado.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prediction_deadline ON predictions;
CREATE TRIGGER trg_prediction_deadline
  BEFORE INSERT OR UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION check_prediction_deadline();

-- ─── Knockout Picks (Mata-mata) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knockout_picks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  round       TEXT NOT NULL CHECK (round IN ('ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','FINAL')),
  slot_index  INTEGER NOT NULL,
  team_id     INTEGER NOT NULL REFERENCES teams(id),
  UNIQUE (user_id, round, slot_index)
);

-- ─── Score Ledger (immutable audit log) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS score_ledger (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id),
  match_id     INTEGER REFERENCES matches(id),
  round_number INTEGER,
  reason       TEXT NOT NULL,
  points       INTEGER NOT NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── User Scores (materialized view via live view) ────────────────────────────
CREATE OR REPLACE VIEW user_scores AS
  SELECT
    sl.user_id,
    p.username,
    p.display_name,
    COALESCE(SUM(sl.points), 0) AS total_points
  FROM profiles p
  LEFT JOIN score_ledger sl ON sl.user_id = p.id
  GROUP BY sl.user_id, p.username, p.display_name
  ORDER BY total_points DESC;

-- ─── MVP History ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mvp_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id),
  round_number INTEGER NOT NULL,
  points       INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (round_number, user_id)
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_craques ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knockout_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE mvp_history ENABLE ROW LEVEL SECURITY;
-- teams, players, matches, app_config: read-only for all authenticated users

-- Profiles: anyone can read, only self can update
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Draft picks: all can select, only self can insert
CREATE POLICY "draft_select" ON draft_picks FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "draft_insert" ON draft_picks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Round craques: all can select, only self can insert/update
CREATE POLICY "craques_select" ON round_craques FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "craques_insert" ON round_craques FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "craques_update" ON round_craques FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Predictions: own until game starts, all after game starts
CREATE POLICY "preds_select_own" ON predictions FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR
  (SELECT starts_at FROM matches WHERE id = match_id) <= NOW()
);
CREATE POLICY "preds_insert" ON predictions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "preds_update" ON predictions FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Knockout picks: all can select, only self can insert/update
CREATE POLICY "knockout_select" ON knockout_picks FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "knockout_insert" ON knockout_picks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "knockout_update" ON knockout_picks FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Score ledger: read-only for all authenticated
CREATE POLICY "ledger_select" ON score_ledger FOR SELECT TO authenticated USING (TRUE);

-- MVP history: read-only for all authenticated
CREATE POLICY "mvp_select" ON mvp_history FOR SELECT TO authenticated USING (TRUE);

-- Teams, players, matches: open read
CREATE POLICY "teams_select" ON teams FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "players_select" ON players FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "matches_select" ON matches FOR SELECT TO authenticated USING (TRUE);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_select" ON app_config FOR SELECT TO authenticated USING (TRUE);
