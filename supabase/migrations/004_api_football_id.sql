-- ============================================================
--  ChurrAsco das Nações — API-Football Integration Schema
-- ============================================================

-- ─── Teams ────────────────────────────────────────────────────────────────────
ALTER TABLE teams ADD COLUMN IF NOT EXISTS api_id INTEGER UNIQUE;

-- ─── Players ──────────────────────────────────────────────────────────────────
ALTER TABLE players ADD COLUMN IF NOT EXISTS api_id INTEGER UNIQUE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_atk_score NUMERIC DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_def_score NUMERIC DEFAULT 0;

-- ─── Matches ──────────────────────────────────────────────────────────────────
ALTER TABLE matches ADD COLUMN IF NOT EXISTS api_id INTEGER UNIQUE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]'::jsonb;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- ─── Update existing policy ───────────────────────────────────────────────────
-- Ensure new columns are readable
CREATE POLICY "players_select_new" ON players FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "matches_select_new" ON matches FOR SELECT TO authenticated USING (TRUE);
-- (Note: previous policies already cover SELECT for all authenticated)
