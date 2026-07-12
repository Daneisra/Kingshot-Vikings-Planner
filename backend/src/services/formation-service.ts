import { createHash, randomUUID } from "crypto";
import { pool } from "../db/pool";
import type {
  FormationEventKey,
  FormationPreset,
  FormationPresetSummary,
  FormationSlot,
  FormationTroopCounts
} from "../types/formations";

const defaultAvailableTroops: FormationTroopCounts = {
  infantry: 0,
  lancer: 0,
  marksman: 0
};

const formationTemplateVersion = 1;

const defaultFormationPresets: Record<FormationEventKey, Omit<FormationPreset, "updatedAt">> = {
  "bear-trap": {
    eventKey: "bear-trap",
    eventName: "Bear Trap",
    availableTroops: defaultAvailableTroops,
    slots: [
      createDefaultSlot("bear-b1", "B1", "Marlin/Zoe/Amadeus", 1),
      createDefaultSlot("bear-j1", "J1", "Amane", 2),
      createDefaultSlot("bear-j2", "J2", "Chenko", 3),
      createDefaultSlot("bear-j3", "J3", "Yeonwoo", 4),
      createDefaultSlot("bear-j4", "J4", "No hero", 5),
      createDefaultSlot("bear-j5", "J5", "No hero", 6)
    ]
  },
  vikings: {
    eventKey: "vikings",
    eventName: "Vikings",
    availableTroops: defaultAvailableTroops,
    slots: [
      createDefaultSlot("vikings-garrison-lead", "Garrison Lead", "Marlin/Zoe/Jabel", 1),
      createDefaultSlot("vikings-garrison-join", "Garrison Join", "Amane", 2),
      createDefaultSlot("vikings-j1", "J1", "Amane", 3),
      createDefaultSlot("vikings-j2", "J2", "Yeonwoo", 4),
      createDefaultSlot("vikings-j3", "J3", "Chenko", 5),
      createDefaultSlot("vikings-j4", "J4", "Gordon", 6),
      createDefaultSlot("vikings-j5", "J5", "Howard", 7),
      createDefaultSlot("vikings-j6", "J6", "Amadeus", 8)
    ]
  },
  battle: {
    eventKey: "battle",
    eventName: "Battle",
    availableTroops: defaultAvailableTroops,
    slots: [
      createDefaultSlot("battle-a1", "A1", "Amane", 1),
      createDefaultSlot("battle-a2", "A2", "Yeonwoo", 2),
      createDefaultSlot("battle-d1", "D1", "Gordon", 3),
      createDefaultSlot("battle-d2", "D2", "Howard", 4),
      createDefaultSlot("battle-d3", "D3", "Saul", 5)
    ]
  }
};

interface FormationPresetRow {
  eventKey: FormationEventKey;
  eventName: string;
  availableTroops: unknown;
  slots: unknown;
  templateVersion: number;
  isCustomized: boolean | null;
  updatedAt: Date;
}

const knownDefaultPresetFingerprints: Record<FormationEventKey, Map<number, string>> = {
  "bear-trap": new Map([[1, "60e05adef130299fc5dad5c38ebac2d89e08f740d987d515528e3483ec7820fa"]]),
  vikings: new Map([[1, "a4a184bdc7aab0adac973e93da8dee9e2980810aef4dc7db8744ab757132cd2a"]]),
  battle: new Map([[1, "595a4effec6dfa02f84a39860beebe92c039b66a266bc6bd6ac0195e7c5f8201"]])
};

let seedPromise: Promise<void> | null = null;

export function getFormationEventKeys() {
  return Object.keys(defaultFormationPresets) as FormationEventKey[];
}

export function isFormationEventKey(value: string): value is FormationEventKey {
  return value in defaultFormationPresets;
}

export function seedDefaultFormationPresets() {
  if (!seedPromise) {
    seedPromise = seedDefaultFormationPresetsOnce().catch((error: unknown) => {
      seedPromise = null;
      throw error;
    });
  }

  return seedPromise;
}

async function seedDefaultFormationPresetsOnce() {
  for (const preset of Object.values(defaultFormationPresets)) {
    await pool.query(
      `
        INSERT INTO troop_formation_presets (
          event_key,
          event_name,
          available_troops,
          slots,
          template_version,
          is_customized
        )
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, FALSE)
        ON CONFLICT (event_key) DO NOTHING
      `,
      [
        preset.eventKey,
        preset.eventName,
        JSON.stringify(preset.availableTroops),
        JSON.stringify(preset.slots),
        formationTemplateVersion
      ]
    );

    const unclassifiedResult = await pool.query<FormationPresetRow>(
      `
        SELECT
          event_key AS "eventKey",
          event_name AS "eventName",
          available_troops AS "availableTroops",
          slots,
          template_version AS "templateVersion",
          is_customized AS "isCustomized",
          updated_at AS "updatedAt"
        FROM troop_formation_presets
        WHERE event_key = $1
          AND is_customized IS NULL
      `,
      [preset.eventKey]
    );
    const unclassifiedPreset = unclassifiedResult.rows[0];

    if (unclassifiedPreset) {
      const knownFingerprint = knownDefaultPresetFingerprints[preset.eventKey].get(
        unclassifiedPreset.templateVersion
      );
      const isCustomized = knownFingerprint !== fingerprintPreset(unclassifiedPreset);

      await pool.query(
        `UPDATE troop_formation_presets SET is_customized = $2 WHERE event_key = $1`,
        [preset.eventKey, isCustomized]
      );
    }

    await pool.query(
      `
        UPDATE troop_formation_presets
        SET event_name = $2,
            available_troops = $3::jsonb,
            slots = $4::jsonb,
            template_version = $5,
            updated_at = NOW()
        WHERE event_key = $1
          AND is_customized = FALSE
          AND template_version < $5
      `,
      [
        preset.eventKey,
        preset.eventName,
        JSON.stringify(preset.availableTroops),
        JSON.stringify(preset.slots),
        formationTemplateVersion
      ]
    );
  }

  await pool.query(`UPDATE troop_formation_presets SET is_customized = TRUE WHERE is_customized IS NULL`);
}

export async function listFormationPresets(): Promise<FormationPresetSummary[]> {
  await seedDefaultFormationPresets();

  const result = await pool.query<FormationPresetRow>(`
    SELECT
      event_key AS "eventKey",
      event_name AS "eventName",
      available_troops AS "availableTroops",
      slots,
      updated_at AS "updatedAt"
    FROM troop_formation_presets
    ORDER BY event_name ASC
  `);

  return result.rows.map((row) => ({
    eventKey: row.eventKey,
    eventName: row.eventName,
    slotCount: normalizeSlots(row.slots).length,
    updatedAt: row.updatedAt.toISOString()
  }));
}

export async function getFormationPreset(eventKey: FormationEventKey): Promise<FormationPreset> {
  await seedDefaultFormationPresets();

  const result = await pool.query<FormationPresetRow>(
    `
      SELECT
        event_key AS "eventKey",
        event_name AS "eventName",
        available_troops AS "availableTroops",
        slots,
        updated_at AS "updatedAt"
      FROM troop_formation_presets
      WHERE event_key = $1
    `,
    [eventKey]
  );

  const row = result.rows[0];

  if (!row) {
    return resetFormationPreset(eventKey);
  }

  return mapPresetRow(row);
}

export async function updateFormationTotals(eventKey: FormationEventKey, totals: FormationTroopCounts) {
  await seedDefaultFormationPresets();

  const result = await pool.query<FormationPresetRow>(
    `
      UPDATE troop_formation_presets
      SET available_troops = $2::jsonb,
          is_customized = TRUE,
          updated_at = NOW()
      WHERE event_key = $1
      RETURNING
        event_key AS "eventKey",
        event_name AS "eventName",
        available_troops AS "availableTroops",
        slots,
        updated_at AS "updatedAt"
    `,
    [eventKey, JSON.stringify(normalizeTroopCounts(totals))]
  );

  return mapPresetRow(result.rows[0]);
}

export async function addFormationSlot(eventKey: FormationEventKey, input: Omit<FormationSlot, "id" | "sortOrder">) {
  const preset = await getFormationPreset(eventKey);
  const nextSortOrder = preset.slots.reduce((highest, slot) => Math.max(highest, slot.sortOrder), 0) + 1;
  const nextSlot = normalizeSlot({
    ...input,
    id: randomUUID(),
    sortOrder: nextSortOrder
  });

  return saveFormationSlots(eventKey, [...preset.slots, nextSlot]);
}

export async function updateFormationSlot(
  eventKey: FormationEventKey,
  slotId: string,
  input: Omit<FormationSlot, "id">
) {
  const preset = await getFormationPreset(eventKey);
  const nextSlots = preset.slots.map((slot) =>
    slot.id === slotId
      ? normalizeSlot({
          ...input,
          id: slotId
        })
      : slot
  );

  return saveFormationSlots(eventKey, nextSlots);
}

export async function deleteFormationSlot(eventKey: FormationEventKey, slotId: string) {
  const preset = await getFormationPreset(eventKey);
  const nextSlots = preset.slots.filter((slot) => slot.id !== slotId);
  return saveFormationSlots(eventKey, nextSlots);
}

export async function resetFormationPreset(eventKey: FormationEventKey) {
  const defaultPreset = defaultFormationPresets[eventKey];
  const result = await pool.query<FormationPresetRow>(
    `
      INSERT INTO troop_formation_presets (
        event_key,
        event_name,
        available_troops,
        slots,
        template_version,
        is_customized,
        updated_at
      )
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, FALSE, NOW())
      ON CONFLICT (event_key) DO UPDATE
      SET event_name = EXCLUDED.event_name,
          available_troops = EXCLUDED.available_troops,
          slots = EXCLUDED.slots,
          template_version = EXCLUDED.template_version,
          is_customized = FALSE,
          updated_at = NOW()
      RETURNING
        event_key AS "eventKey",
        event_name AS "eventName",
        available_troops AS "availableTroops",
        slots,
        updated_at AS "updatedAt"
    `,
    [
      defaultPreset.eventKey,
      defaultPreset.eventName,
      JSON.stringify(defaultPreset.availableTroops),
      JSON.stringify(defaultPreset.slots),
      formationTemplateVersion
    ]
  );

  return mapPresetRow(result.rows[0]);
}

async function saveFormationSlots(eventKey: FormationEventKey, slots: FormationSlot[]) {
  const normalizedSlots = normalizeSlots(slots).map((slot, index) => ({
    ...slot,
    sortOrder: index + 1
  }));
  const result = await pool.query<FormationPresetRow>(
    `
      UPDATE troop_formation_presets
      SET slots = $2::jsonb,
          is_customized = TRUE,
          updated_at = NOW()
      WHERE event_key = $1
      RETURNING
        event_key AS "eventKey",
        event_name AS "eventName",
        available_troops AS "availableTroops",
        slots,
        updated_at AS "updatedAt"
    `,
    [eventKey, JSON.stringify(normalizedSlots)]
  );

  return mapPresetRow(result.rows[0]);
}

function createDefaultSlot(id: string, name: string, hero: string, sortOrder: number): FormationSlot {
  return {
    id,
    name,
    hero,
    infantry: 0,
    lancer: 0,
    marksman: 0,
    notes: "",
    sortOrder
  };
}

function mapPresetRow(row: FormationPresetRow): FormationPreset {
  return {
    eventKey: row.eventKey,
    eventName: row.eventName,
    availableTroops: normalizeTroopCounts(row.availableTroops),
    slots: normalizeSlots(row.slots),
    updatedAt: row.updatedAt.toISOString()
  };
}

function fingerprintPreset(preset: {
  eventName: string;
  availableTroops: unknown;
  slots: unknown;
}) {
  const canonicalPreset = {
    eventName: preset.eventName,
    availableTroops: normalizeTroopCounts(preset.availableTroops),
    slots: normalizeSlots(preset.slots)
  };

  return createHash("sha256").update(JSON.stringify(canonicalPreset), "utf8").digest("hex");
}

function normalizeTroopCounts(counts: unknown): FormationTroopCounts {
  const candidate = isRecord(counts) ? counts : {};

  return {
    infantry: normalizeCount(candidate.infantry),
    lancer: normalizeCount(candidate.lancer),
    marksman: normalizeCount(candidate.marksman)
  };
}

function normalizeSlots(slots: unknown) {
  if (!Array.isArray(slots)) {
    return [];
  }

  return slots
    .map(normalizeSlot)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
}

function normalizeSlot(value: unknown): FormationSlot {
  const slot = isRecord(value) ? value : {};

  return {
    id: typeof slot.id === "string" && slot.id ? slot.id : randomUUID(),
    name: typeof slot.name === "string" && slot.name.trim() ? slot.name.trim() : "Formation",
    hero: typeof slot.hero === "string" && slot.hero.trim() ? slot.hero.trim() : "No hero",
    infantry: normalizeCount(slot.infantry),
    lancer: normalizeCount(slot.lancer),
    marksman: normalizeCount(slot.marksman),
    notes: typeof slot.notes === "string" ? slot.notes.trim() : "",
    sortOrder: normalizeCount(slot.sortOrder)
  };
}

function normalizeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
