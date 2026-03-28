-- ============================================================
--  Migration 002: Craque Economy
-- ============================================================

-- 1. Add price to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS price INTEGER NOT NULL DEFAULT 5;

-- 2. Retroactively give 10 points to existing profiles
INSERT INTO score_ledger (user_id, reason, points)
SELECT id, 'STARTING_BALANCE', 10 FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM score_ledger WHERE score_ledger.user_id = profiles.id AND reason = 'STARTING_BALANCE'
);

-- 3. Trigger to give 10 points to new users automatically
CREATE OR REPLACE FUNCTION give_starting_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO score_ledger (user_id, reason, points)
  VALUES (NEW.id, 'STARTING_BALANCE', 10);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_starting_balance ON profiles;
CREATE TRIGGER trg_starting_balance
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION give_starting_balance();

-- 4. RPC for buying a Craque safely
CREATE OR REPLACE FUNCTION buy_craque(p_user_id UUID, p_player_id INTEGER, p_round_number INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to check scores and insert safely
AS $$
DECLARE
  v_new_price INTEGER;
  v_old_player_id INTEGER;
  v_old_price INTEGER;
  v_current_balance INTEGER;
  v_first_match_starts_at TIMESTAMPTZ;
BEGIN
  -- 1. Check if deadline passed
  SELECT starts_at INTO v_first_match_starts_at 
  FROM matches 
  WHERE round_number = p_round_number 
  ORDER BY starts_at ASC LIMIT 1;

  IF v_first_match_starts_at IS NOT NULL AND v_first_match_starts_at <= NOW() THEN
    RAISE EXCEPTION 'Prazo para escolher o craque esgotou!';
  END IF;

  -- 2. Check if user already has a craque for this round
  SELECT player_id INTO v_old_player_id FROM round_craques 
  WHERE user_id = p_user_id AND round_number = p_round_number;

  IF v_old_player_id IS NOT NULL THEN
    -- If it's the exact same player, do nothing
    IF v_old_player_id = p_player_id THEN
      RETURN;
    END IF;

    -- Refund old player
    SELECT price INTO v_old_price FROM players WHERE id = v_old_player_id;
    INSERT INTO score_ledger (user_id, round_number, reason, points)
    VALUES (p_user_id, p_round_number, 'REFUND_CRAQUE', v_old_price);
  END IF;

  IF p_player_id IS NULL THEN
    -- User just wants to refund and not pick anyone
    DELETE FROM round_craques WHERE user_id = p_user_id AND round_number = p_round_number;
    RETURN;
  END IF;

  -- 3. Get new player price
  SELECT price INTO v_new_price FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogador não encontrado!';
  END IF;

  -- 4. Check user balance (Total Score)
  SELECT total_points INTO v_current_balance FROM user_scores WHERE user_id = p_user_id;
  
  -- If balance is somehow null, coalesce to 0
  v_current_balance := COALESCE(v_current_balance, 0);

  IF v_current_balance < v_new_price THEN
    RAISE EXCEPTION 'Pontos insuficientes para comprar este craque. Saldo atual: %, Custo: %', v_current_balance, v_new_price;
  END IF;

  -- 5. Deduct points for new player
  INSERT INTO score_ledger (user_id, round_number, reason, points)
  VALUES (p_user_id, p_round_number, 'BUY_CRAQUE', -v_new_price);

  -- 6. Upsert round_craques
  INSERT INTO round_craques (user_id, player_id, round_number, deadline)
  VALUES (
    p_user_id, 
    p_player_id, 
    p_round_number, 
    (v_first_match_starts_at - INTERVAL '6 hours')
  )
  ON CONFLICT (user_id, round_number) 
  DO UPDATE SET player_id = EXCLUDED.player_id, deadline = EXCLUDED.deadline;

END;
$$;
