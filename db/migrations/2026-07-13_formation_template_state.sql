ALTER TABLE troop_formation_presets
  ADD COLUMN IF NOT EXISTS template_version INTEGER NOT NULL DEFAULT 1
    CHECK (template_version >= 1),
  ADD COLUMN IF NOT EXISTS is_customized BOOLEAN;
