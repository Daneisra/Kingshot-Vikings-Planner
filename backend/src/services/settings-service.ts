import { pool } from "../db/pool";
import type { AuditContext } from "../types/audit";
import type { EventWarningSettings, GuideNotesSettings } from "../types/settings";
import { insertAuditLog } from "./audit-service";

const eventWarningKey = "event_warning";
const guideNotesKey = "guide_notes";

const defaultEventWarningSettings: EventWarningSettings = {
  isEnabled: false,
  title: "",
  message: ""
};

const defaultGuideNotesSettings: GuideNotesSettings = {
  isEnabled: false,
  title: "",
  notes: ""
};

function normalizeEventWarningSettings(value: unknown): EventWarningSettings {
  if (!value || typeof value !== "object") {
    return defaultEventWarningSettings;
  }

  const candidate = value as Partial<EventWarningSettings>;

  return {
    isEnabled: Boolean(candidate.isEnabled),
    title: typeof candidate.title === "string" ? candidate.title.trim().slice(0, 80) : "",
    message: typeof candidate.message === "string" ? candidate.message.trim().slice(0, 240) : ""
  };
}

function normalizeGuideNotesSettings(value: unknown): GuideNotesSettings {
  if (!value || typeof value !== "object") {
    return defaultGuideNotesSettings;
  }

  const candidate = value as Partial<GuideNotesSettings>;

  return {
    isEnabled: Boolean(candidate.isEnabled),
    title: typeof candidate.title === "string" ? candidate.title.trim().slice(0, 80) : "",
    notes: typeof candidate.notes === "string" ? candidate.notes.trim().slice(0, 800) : ""
  };
}

export async function getEventWarningSettings() {
  const result = await pool.query<{ value: unknown }>(
    `
      SELECT value
      FROM app_settings
      WHERE key = $1
    `,
    [eventWarningKey]
  );

  return normalizeEventWarningSettings(result.rows[0]?.value);
}

export async function getGuideNotesSettings() {
  const result = await pool.query<{ value: unknown }>(
    `
      SELECT value
      FROM app_settings
      WHERE key = $1
    `,
    [guideNotesKey]
  );

  return normalizeGuideNotesSettings(result.rows[0]?.value);
}

export async function updateEventWarningSettings(input: EventWarningSettings, auditContext: AuditContext) {
  const client = await pool.connect();
  const settings = normalizeEventWarningSettings(input);

  try {
    await client.query("BEGIN");

    const result = await client.query<{ value: unknown }>(
      `
        INSERT INTO app_settings (key, value)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (key)
        DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW()
        RETURNING value
      `,
      [eventWarningKey, JSON.stringify(settings)]
    );

    await insertAuditLog(client, {
      action: "event_warning_updated",
      targetType: "app_settings",
      summary: settings.isEnabled ? "Updated and enabled the event warning banner." : "Disabled the event warning banner.",
      metadata: {
        key: eventWarningKey,
        isEnabled: settings.isEnabled,
        title: settings.title
      },
      context: auditContext
    });

    await client.query("COMMIT");
    return normalizeEventWarningSettings(result.rows[0]?.value);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateGuideNotesSettings(input: GuideNotesSettings, auditContext: AuditContext) {
  const client = await pool.connect();
  const settings = normalizeGuideNotesSettings(input);

  try {
    await client.query("BEGIN");

    const result = await client.query<{ value: unknown }>(
      `
        INSERT INTO app_settings (key, value)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (key)
        DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = NOW()
        RETURNING value
      `,
      [guideNotesKey, JSON.stringify(settings)]
    );

    await insertAuditLog(client, {
      action: "guide_notes_updated",
      targetType: "app_settings",
      summary: settings.isEnabled ? "Updated and enabled the alliance guide notes." : "Disabled the alliance guide notes.",
      metadata: {
        key: guideNotesKey,
        isEnabled: settings.isEnabled,
        title: settings.title
      },
      context: auditContext
    });

    await client.query("COMMIT");
    return normalizeGuideNotesSettings(result.rows[0]?.value);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
