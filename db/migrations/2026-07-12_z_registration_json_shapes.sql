DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'registrations_partner_names_array_check'
      AND conrelid = 'registrations'::regclass
  ) THEN
    ALTER TABLE registrations
      ADD CONSTRAINT registrations_partner_names_array_check
      CHECK (jsonb_typeof(partner_names) = 'array')
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'registrations_troop_loadout_array_check'
      AND conrelid = 'registrations'::regclass
  ) THEN
    ALTER TABLE registrations
      ADD CONSTRAINT registrations_troop_loadout_array_check
      CHECK (jsonb_typeof(troop_loadout) = 'array')
      NOT VALID;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM registrations WHERE jsonb_typeof(partner_names) <> 'array'
  ) THEN
    ALTER TABLE registrations VALIDATE CONSTRAINT registrations_partner_names_array_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM registrations WHERE jsonb_typeof(troop_loadout) <> 'array'
  ) THEN
    ALTER TABLE registrations VALIDATE CONSTRAINT registrations_troop_loadout_array_check;
  END IF;
END;
$$;
