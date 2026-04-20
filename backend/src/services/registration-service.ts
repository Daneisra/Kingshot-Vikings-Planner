import { QueryResult } from "pg";
import { pool } from "../db/pool";
import type { AuditContext } from "../types/audit";
import {
  RegistrationFilters,
  RegistrationInput,
  RegistrationRecord,
  RegistrationStats,
  TroopLoadoutEntry
} from "../types/registration";
import { insertAuditLog } from "./audit-service";
import { HttpError } from "../utils/http-error";

const selectColumns = `
  id,
  nickname,
  partner_name AS "partnerName",
  partner_names AS "partnerNames",
  troop_count AS "troopCount",
  troop_level AS "troopLevel",
  troop_loadout AS "troopLoadout",
  comment,
  is_available AS "isAvailable",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

function buildWhereClause(filters: RegistrationFilters) {
  const conditions: string[] = [];
  const values: Array<string | boolean> = [];

  if (filters.search) {
    values.push(`%${filters.search.toLowerCase()}%`);
    conditions.push(`LOWER(nickname) LIKE $${values.length}`);
  }

  if (filters.partner) {
    values.push(filters.partner.toLowerCase());
    conditions.push(`
      EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(partner_names) AS partner_name_values(partner_name_value)
        WHERE LOWER(partner_name_value) = $${values.length}
      )
    `);
  }

  if (typeof filters.available === "boolean") {
    values.push(filters.available);
    conditions.push(`is_available = $${values.length}`);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    values
  };
}

function mapRow(result: QueryResult<RegistrationRecord>) {
  const row = result.rows[0];

  if (!row) {
    return row;
  }

  return {
    ...row,
    partnerNames: normalizePartnerNames(row.partnerNames, row.partnerName),
    troopLoadout: normalizeTroopLoadout(row.troopLoadout)
  };
}

function normalizePartnerNames(value: unknown, fallbackPartnerName?: string): string[] {
  const partnerNames = Array.isArray(value)
    ? value.flatMap((entry) => (typeof entry === "string" ? [entry.trim()] : []))
    : [];

  const dedupedPartnerNames: string[] = [];

  partnerNames.forEach((partnerName) => {
    if (
      partnerName &&
      !dedupedPartnerNames.some((existingPartnerName) => existingPartnerName.toLowerCase() === partnerName.toLowerCase())
    ) {
      dedupedPartnerNames.push(partnerName);
    }
  });

  if (dedupedPartnerNames.length > 0) {
    return dedupedPartnerNames;
  }

  if (fallbackPartnerName?.trim()) {
    return [fallbackPartnerName.trim()];
  }

  return [];
}

function normalizeTroopLoadout(value: unknown): TroopLoadoutEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("type" in entry) ||
      !("tier" in entry) ||
      !("count" in entry)
    ) {
      return [];
    }

    const troopType = String(entry.type);
    const tier = Number(entry.tier);
    const count = Number(entry.count);

    if (!["infantry", "lancer", "marksman"].includes(troopType) || !Number.isInteger(tier) || !Number.isInteger(count)) {
      return [];
    }

    return [
      {
        type: troopType as TroopLoadoutEntry["type"],
        tier,
        count
      }
    ];
  });
}

function summarizeTroopLoadout(troopLoadout: TroopLoadoutEntry[]) {
  return {
    troopCount: troopLoadout.reduce((sum, entry) => sum + entry.count, 0),
    troopLevel: troopLoadout.reduce((highestTier, entry) => Math.max(highestTier, entry.tier), 0)
  };
}

export async function listRegistrations(filters: RegistrationFilters) {
  const { whereClause, values } = buildWhereClause(filters);
  const result = await pool.query<RegistrationRecord>(
    `
      SELECT ${selectColumns}
      FROM registrations
      ${whereClause}
      ORDER BY is_available DESC, LOWER(nickname) ASC, created_at DESC
    `,
    values
  );

  return result.rows.map((row) => ({
    ...row,
    partnerNames: normalizePartnerNames(row.partnerNames, row.partnerName),
    troopLoadout: normalizeTroopLoadout(row.troopLoadout)
  }));
}

export async function listPartners() {
  const result = await pool.query<{ partnerName: string }>(
    `
      SELECT partner_name_value AS "partnerName"
      FROM registrations
      CROSS JOIN LATERAL jsonb_array_elements_text(partner_names) AS partner_name_values(partner_name_value)
      GROUP BY partner_name_value
      ORDER BY LOWER(partner_name_value) ASC
    `
  );

  return result.rows.map((row) => row.partnerName);
}

export async function getRegistrationStats(filters: RegistrationFilters): Promise<RegistrationStats> {
  const { whereClause, values } = buildWhereClause(filters);
  const aggregateQuery = await pool.query<{
    totalParticipants: string;
    availableParticipants: string;
    totalTroops: string | null;
    availableTroops: string | null;
    averageTroopLevel: string | null;
  }>(
    `
      SELECT
        COUNT(*)::text AS "totalParticipants",
        COUNT(*) FILTER (WHERE is_available = TRUE)::text AS "availableParticipants",
        COALESCE(SUM(troop_count), 0)::text AS "totalTroops",
        COALESCE(SUM(troop_count) FILTER (WHERE is_available = TRUE), 0)::text AS "availableTroops",
        ROUND(COALESCE(AVG(troop_level), 0), 1)::text AS "averageTroopLevel"
      FROM registrations
      ${whereClause}
    `,
    values
  );

  const topPartnersQuery = await pool.query<{
    partnerName: string;
    count: string;
    totalTroops: string;
    availableTroops: string;
  }>(
    `
      SELECT
        partner_name_value AS "partnerName",
        COUNT(*)::text AS "count",
        COALESCE(SUM(troop_count), 0)::text AS "totalTroops",
        COALESCE(SUM(troop_count) FILTER (WHERE is_available = TRUE), 0)::text AS "availableTroops"
      FROM registrations
      CROSS JOIN LATERAL jsonb_array_elements_text(partner_names) AS partner_name_values(partner_name_value)
      ${whereClause}
      GROUP BY partner_name_value
      ORDER BY COUNT(*) DESC, COALESCE(SUM(troop_count), 0) DESC, LOWER(partner_name_value) ASC
      LIMIT 5
    `,
    values
  );

  const aggregate = aggregateQuery.rows[0];

  return {
    totalParticipants: Number(aggregate.totalParticipants ?? 0),
    availableParticipants: Number(aggregate.availableParticipants ?? 0),
    totalTroops: Number(aggregate.totalTroops ?? 0),
    availableTroops: Number(aggregate.availableTroops ?? 0),
    averageTroopLevel: Number(aggregate.averageTroopLevel ?? 0),
    topPartners: topPartnersQuery.rows.map((row) => ({
      partnerName: row.partnerName,
      count: Number(row.count),
      totalTroops: Number(row.totalTroops ?? 0),
      availableTroops: Number(row.availableTroops ?? 0)
    }))
  };
}

export async function createRegistration(input: RegistrationInput) {
  const partnerNames = normalizePartnerNames(input.partnerNames);
  const primaryPartnerName = partnerNames[0];

  if (!primaryPartnerName) {
    throw new HttpError(400, "At least one partner is required.");
  }

  const troopLoadout = normalizeTroopLoadout(input.troopLoadout);
  const { troopCount, troopLevel } = summarizeTroopLoadout(troopLoadout);
  const result = await pool.query<RegistrationRecord>(
    `
      INSERT INTO registrations (
        nickname,
        partner_name,
        partner_names,
        troop_count,
        troop_level,
        troop_loadout,
        comment,
        is_available
      )
      VALUES ($1, $2, $3::jsonb, $4, $5, $6::jsonb, $7, $8)
      RETURNING ${selectColumns}
    `,
    [
      input.nickname,
      primaryPartnerName,
      JSON.stringify(partnerNames),
      troopCount,
      troopLevel,
      JSON.stringify(troopLoadout),
      input.comment,
      input.isAvailable
    ]
  );

  return mapRow(result);
}

export async function updateRegistration(id: string, input: RegistrationInput) {
  const partnerNames = normalizePartnerNames(input.partnerNames);
  const primaryPartnerName = partnerNames[0];

  if (!primaryPartnerName) {
    throw new HttpError(400, "At least one partner is required.");
  }

  const troopLoadout = normalizeTroopLoadout(input.troopLoadout);
  const { troopCount, troopLevel } = summarizeTroopLoadout(troopLoadout);
  const result = await pool.query<RegistrationRecord>(
    `
      UPDATE registrations
      SET
        nickname = $2,
        partner_name = $3,
        partner_names = $4::jsonb,
        troop_count = $5,
        troop_level = $6,
        troop_loadout = $7::jsonb,
        comment = $8,
        is_available = $9
      WHERE id = $1
      RETURNING ${selectColumns}
    `,
    [
      id,
      input.nickname,
      primaryPartnerName,
      JSON.stringify(partnerNames),
      troopCount,
      troopLevel,
      JSON.stringify(troopLoadout),
      input.comment,
      input.isAvailable
    ]
  );

  const registration = mapRow(result);

  if (!registration) {
    throw new HttpError(404, "Registration not found.");
  }

  return registration;
}

export async function deleteRegistration(id: string, auditContext: AuditContext) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<RegistrationRecord>(
      `
        DELETE FROM registrations
        WHERE id = $1
        RETURNING ${selectColumns}
      `,
      [id]
    );

    const registration = mapRow(result);

    if (!registration) {
      throw new HttpError(404, "Registration not found.");
    }

    await insertAuditLog(client, {
      action: "registration_deleted",
      targetType: "registration",
      targetId: registration.id,
      summary: `Deleted registration for ${registration.nickname}.`,
      metadata: {
        nickname: registration.nickname,
        partnerName: registration.partnerName,
        partnerNames: registration.partnerNames,
        troopCount: registration.troopCount,
        troopLevel: registration.troopLevel,
        troopLoadout: registration.troopLoadout,
        isAvailable: registration.isAvailable
      },
      context: auditContext
    });

    await client.query("COMMIT");
    return registration;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function resetRegistrations(auditContext: AuditContext) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<{ deletedCount: string }>(
      `
        WITH deleted AS (
          DELETE FROM registrations
          RETURNING id
        )
        SELECT COUNT(*)::text AS "deletedCount"
        FROM deleted
      `
    );

    const deletedCount = Number(result.rows[0]?.deletedCount ?? 0);

    await insertAuditLog(client, {
      action: "weekly_reset",
      targetType: "registrations",
      summary:
        deletedCount === 1
          ? "Started a new week and cleared 1 registration."
          : `Started a new week and cleared ${deletedCount} registrations.`,
      metadata: {
        deletedCount
      },
      context: auditContext
    });

    await client.query("COMMIT");
    return deletedCount;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
