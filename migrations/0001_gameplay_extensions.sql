-- Add AI strictness setting for players
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS ai_strictness varchar NOT NULL DEFAULT 'lenient';

-- Extend items with drop-related metadata
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS droppable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS drop_rate integer DEFAULT 10;

-- Normalize item types (equipment -> weapon fallback)
UPDATE items SET item_type = 'weapon' WHERE item_type = 'equipment';

-- Drop history table to track item drops
CREATE TABLE IF NOT EXISTS drop_history (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id varchar NOT NULL REFERENCES players(id),
  item_id varchar NOT NULL REFERENCES items(id),
  tsutome_id varchar REFERENCES tsutomes(id),
  quantity integer NOT NULL DEFAULT 1,
  rarity varchar(20) NOT NULL DEFAULT 'common',
  is_bonus boolean NOT NULL DEFAULT false,
  dropped_at timestamp NOT NULL DEFAULT now()
);
