DO $$
BEGIN
  IF to_regclass('weekly_archives') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'weekly_archives_manual_stats_array_check'
        AND conrelid = to_regclass('weekly_archives')
    ) THEN
      ALTER TABLE weekly_archives ADD CONSTRAINT weekly_archives_manual_stats_array_check
        CHECK (jsonb_typeof(manual_stats) = 'array') NOT VALID;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'weekly_archives_registrations_array_check'
        AND conrelid = to_regclass('weekly_archives')
    ) THEN
      ALTER TABLE weekly_archives ADD CONSTRAINT weekly_archives_registrations_array_check
        CHECK (jsonb_typeof(registrations) = 'array') NOT VALID;
    END IF;
  END IF;

  IF to_regclass('app_settings') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'app_settings_value_object_check'
      AND conrelid = to_regclass('app_settings')
  ) THEN
    ALTER TABLE app_settings ADD CONSTRAINT app_settings_value_object_check
      CHECK (jsonb_typeof(value) = 'object') NOT VALID;
  END IF;

  IF to_regclass('troop_formation_presets') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'troop_formation_presets_available_troops_object_check'
        AND conrelid = to_regclass('troop_formation_presets')
    ) THEN
      ALTER TABLE troop_formation_presets
        ADD CONSTRAINT troop_formation_presets_available_troops_object_check
        CHECK (jsonb_typeof(available_troops) = 'object') NOT VALID;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'troop_formation_presets_slots_array_check'
        AND conrelid = to_regclass('troop_formation_presets')
    ) THEN
      ALTER TABLE troop_formation_presets ADD CONSTRAINT troop_formation_presets_slots_array_check
        CHECK (jsonb_typeof(slots) = 'array') NOT VALID;
    END IF;
  END IF;

  IF to_regclass('audit_logs') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audit_logs_metadata_object_check'
      AND conrelid = to_regclass('audit_logs')
  ) THEN
    ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_metadata_object_check
      CHECK (jsonb_typeof(metadata) = 'object') NOT VALID;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('weekly_archives') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM weekly_archives WHERE jsonb_typeof(manual_stats) <> 'array') THEN
      ALTER TABLE weekly_archives VALIDATE CONSTRAINT weekly_archives_manual_stats_array_check;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM weekly_archives WHERE jsonb_typeof(registrations) <> 'array') THEN
      ALTER TABLE weekly_archives VALIDATE CONSTRAINT weekly_archives_registrations_array_check;
    END IF;
  END IF;

  IF to_regclass('app_settings') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM app_settings WHERE jsonb_typeof(value) <> 'object') THEN
    ALTER TABLE app_settings VALIDATE CONSTRAINT app_settings_value_object_check;
  END IF;

  IF to_regclass('troop_formation_presets') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM troop_formation_presets WHERE jsonb_typeof(available_troops) <> 'object'
    ) THEN
      ALTER TABLE troop_formation_presets
        VALIDATE CONSTRAINT troop_formation_presets_available_troops_object_check;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM troop_formation_presets WHERE jsonb_typeof(slots) <> 'array') THEN
      ALTER TABLE troop_formation_presets VALIDATE CONSTRAINT troop_formation_presets_slots_array_check;
    END IF;
  END IF;

  IF to_regclass('audit_logs') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM audit_logs WHERE jsonb_typeof(metadata) <> 'object') THEN
    ALTER TABLE audit_logs VALIDATE CONSTRAINT audit_logs_metadata_object_check;
  END IF;
END;
$$;
