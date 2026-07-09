CREATE TABLE IF NOT EXISTS troop_formation_presets (
  event_key VARCHAR(40) PRIMARY KEY,
  event_name VARCHAR(80) NOT NULL,
  available_troops JSONB NOT NULL DEFAULT '{"infantry":0,"lancer":0,"marksman":0}'::jsonb,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS troop_formation_presets_set_updated_at ON troop_formation_presets;
CREATE TRIGGER troop_formation_presets_set_updated_at
BEFORE UPDATE ON troop_formation_presets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_troop_formation_presets_updated_at
  ON troop_formation_presets (updated_at DESC);

INSERT INTO troop_formation_presets (event_key, event_name, available_troops, slots)
VALUES
  (
    'bear-trap',
    'Bear Trap',
    '{"infantry":0,"lancer":0,"marksman":0}'::jsonb,
    '[
      {"id":"bear-b1","name":"B1","hero":"Marlin/Zoe/Amadeus","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":1},
      {"id":"bear-j1","name":"J1","hero":"Amane","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":2},
      {"id":"bear-j2","name":"J2","hero":"Chenko","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":3},
      {"id":"bear-j3","name":"J3","hero":"Yeonwoo","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":4},
      {"id":"bear-j4","name":"J4","hero":"No hero","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":5},
      {"id":"bear-j5","name":"J5","hero":"No hero","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":6}
    ]'::jsonb
  ),
  (
    'vikings',
    'Vikings',
    '{"infantry":0,"lancer":0,"marksman":0}'::jsonb,
    '[
      {"id":"vikings-garrison-lead","name":"Garrison Lead","hero":"Marlin/Zoe/Jabel","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":1},
      {"id":"vikings-garrison-join","name":"Garrison Join","hero":"Amane","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":2},
      {"id":"vikings-j1","name":"J1","hero":"Amane","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":3},
      {"id":"vikings-j2","name":"J2","hero":"Yeonwoo","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":4},
      {"id":"vikings-j3","name":"J3","hero":"Chenko","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":5},
      {"id":"vikings-j4","name":"J4","hero":"Gordon","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":6},
      {"id":"vikings-j5","name":"J5","hero":"Howard","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":7},
      {"id":"vikings-j6","name":"J6","hero":"Amadeus","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":8}
    ]'::jsonb
  ),
  (
    'battle',
    'Battle',
    '{"infantry":0,"lancer":0,"marksman":0}'::jsonb,
    '[
      {"id":"battle-a1","name":"A1","hero":"Amane","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":1},
      {"id":"battle-a2","name":"A2","hero":"Yeonwoo","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":2},
      {"id":"battle-d1","name":"D1","hero":"Gordon","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":3},
      {"id":"battle-d2","name":"D2","hero":"Howard","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":4},
      {"id":"battle-d3","name":"D3","hero":"Saul","infantry":0,"lancer":0,"marksman":0,"notes":"","sortOrder":5}
    ]'::jsonb
  )
ON CONFLICT (event_key) DO NOTHING;
