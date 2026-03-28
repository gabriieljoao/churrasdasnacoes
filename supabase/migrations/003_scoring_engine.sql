-- ============================================================
--  Migration 003: Scoring Engine (Events & Processing)
-- ============================================================

-- Add fields to matches to track events (goals/cards) and if points were already processed
ALTER TABLE matches ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]'::jsonb;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS processed BOOLEAN NOT NULL DEFAULT false;

-- Create an index to quickly find unprocessed finished matches
CREATE INDEX IF NOT EXISTS idx_matches_unprocessed ON matches(status, processed) WHERE status = 'FINISHED' AND processed = false;
