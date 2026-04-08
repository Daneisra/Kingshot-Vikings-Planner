import { QueryResult } from "pg";
import { pool } from "../db/pool";
import type { AuditContext } from "../types/audit";
import {
  RegistrationFilters,
  RegistrationInput,
  RegistrationRecord,
  RegistrationStats
} from "../types/registration";
import { insertAuditLog } from "./audit-service";
import { HttpError } from "../utils/http-error";

const selectColumns = `
  id,
  nickname,
  partner_name AS "partnerName",
  troop_count AS "troopCount",
  troop_level AS "troopLevel",
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
    conditions.push(`LOWER(partner_name) = $${values.length}`);
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
  return result.rows[0];
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

  return result.rows;
}

export async function listPartners() {
  const result = await pool.query<{ partnerName: string }>(
    `
      SELECT partner_name AS "partnerName"
      FROM registrations
      GROUP BY partner_name
      ORDER BY LOWER(partner_name) ASC
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
        partner_name AS "partnerName",
        COUNT(*)::text AS "count",
        COALESCE(SUM(troop_count), 0)::text AS "totalTroops",
        COALESCE(SUM(troop_count) FILTER (WHERE is_available = TRUE), 0)::text AS "availableTroops"
      FROM registrations
      ${whereClause}
      GROUP BY partner_name
      ORDER BY COUNT(*) DESC, COALESCE(SUM(troop_count), 0) DESC, LOWER(partner_name) ASC
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
  const result = await pool.query<RegistrationRecord>(
    `
      INSERT INTO registrations (
        nickname,
        partner_name,
        troop_count,
        troop_level,
        comment,
        is_available
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING ${selectColumns}
    `,
    [
      input.nickname,
      input.partnerName,
      input.troopCount,
      input.troopLevel,
      input.comment,
      input.isAvailable
    ]
  );

  return mapRow(result);
}

export async function updateRegistration(id: string, input: RegistrationInput) {
  const result = await pool.query<RegistrationRecord>(
    `
      UPDATE registrations
      SET
        nickname = $2,
        partner_name = $3,
        troop_count = $4,
        troop_level = $5,
        comment = $6,
        is_available = $7
      WHERE id = $1
      RETURNING ${selectColumns}
    `,
    [id, input.nickname, input.partnerName, input.troopCount, input.troopLevel, input.comment, input.isAvailable]
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
        troopCount: registration.troopCount,
        troopLevel: registration.troopLevel,
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
