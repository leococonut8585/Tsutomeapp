-- Add credential columns to players
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS username text;

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS password_plain text;

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'player';

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

UPDATE players
SET
  username = COALESCE(username, CONCAT('user_', LEFT(id, 8))),
  password_plain = COALESCE(password_plain, 'changeme');

ALTER TABLE players
  ALTER COLUMN username SET NOT NULL,
  ALTER COLUMN password_plain SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'players_username_unique'
  ) THEN
    CREATE UNIQUE INDEX players_username_unique ON players (username);
  END IF;
END
$$;

-- Reset gameplay tables so that new seed data can be loaded cleanly
TRUNCATE TABLE
  drop_history,
  inventories,
  items,
  stories,
  bosses,
  shikakus,
  shihans,
  shurens,
  tsutomes,
  players
RESTART IDENTITY CASCADE;
