ALTER TABLE players
  ADD COLUMN IF NOT EXISTS monthly_api_calls integer NOT NULL DEFAULT 0;

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS monthly_api_cost real NOT NULL DEFAULT 0;

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS api_usage_reset_at timestamp with time zone DEFAULT now();

UPDATE players
SET api_usage_reset_at = now()
WHERE api_usage_reset_at IS NULL;
