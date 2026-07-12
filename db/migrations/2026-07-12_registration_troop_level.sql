CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(40) NOT NULL,
  partner_name VARCHAR(40) NOT NULL,
  partner_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  troop_count INTEGER NOT NULL CHECK (troop_count >= 0),
  troop_level INTEGER NOT NULL,
  troop_loadout JSONB NOT NULL DEFAULT '[]'::jsonb,
  personal_score INTEGER CHECK (personal_score IS NULL OR personal_score >= 0),
  comment TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'registrations_troop_level_supported_check'
      AND conrelid = 'registrations'::regclass
  ) THEN
    ALTER TABLE registrations
      ADD CONSTRAINT registrations_troop_level_supported_check
      CHECK (troop_level >= 7 AND troop_level <= 16)
      NOT VALID;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM registrations
    WHERE troop_level < 7 OR troop_level > 16
  ) THEN
    ALTER TABLE registrations
      VALIDATE CONSTRAINT registrations_troop_level_supported_check;
  END IF;
END;
$$;
