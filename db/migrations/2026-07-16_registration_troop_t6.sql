ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_troop_level_supported_check;

ALTER TABLE registrations
  DROP CONSTRAINT IF EXISTS registrations_troop_level_t6_t16_check;

ALTER TABLE registrations
  ADD CONSTRAINT registrations_troop_level_t6_t16_check
  CHECK (troop_level >= 6 AND troop_level <= 16)
  NOT VALID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM registrations
    WHERE troop_level < 6 OR troop_level > 16
  ) THEN
    ALTER TABLE registrations
      VALIDATE CONSTRAINT registrations_troop_level_t6_t16_check;
  END IF;
END;
$$;
