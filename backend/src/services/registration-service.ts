import { QueryResult } from "pg";
import { pool } from "../db/pool";
import {
  RegistrationFilters,
  RegistrationInput,
  RegistrationRecord,
  RegistrationStats
} from "../types/registration";
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
    totalTroops: string | null;
    averageTroopLevel: string | null;
  }>(
    `
      SELECT
        COUNT(*)::text AS "totalParticipants",
        COALESCE(SUM(troop_count), 0)::text AS "totalTroops",
        ROUND(COALESCE(AVG(troop_level), 0), 1)::text AS "averageTroopLevel"
      FROM registrations
      ${whereClause}
    `,
    values
  );

  const topPartnersQuery = await pool.query<{ partnerName: string; count: string }>(
    `
      SELECT
        partner_name AS "partnerName",
        COUNT(*)::text AS "count"
      FROM registrations
      ${whereClause}
      GROUP BY partner_name
      ORDER BY COUNT(*) DESC, LOWER(partner_name) ASC
      LIMIT 5
    `,
    values
  );

  const aggregate = aggregateQuery.rows[0];

  return {
    totalParticipants: Number(aggregate.totalParticipants ?? 0),
    totalTroops: Number(aggregate.totalTroops ?? 0),
    averageTroopLevel: Number(aggregate.averageTroopLevel ?? 0),
    topPartners: topPartnersQuery.rows.map((row) => ({
      partnerName: row.partnerName,
      count: Number(row.count)
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

export async function deleteRegistration(id: string) {
  const result = await pool.query("DELETE FROM registrations WHERE id = $1", [id]);

  if (result.rowCount === 0) {
    throw new HttpError(404, "Registration not found.");
  }
}

export async function resetRegistrations() {
  const result = await pool.query<{ deletedCount: string }>(
    `
      WITH deleted AS (
        DELETE FROM registrations
        RETURNING id
      )
      SELECT COUNT(*)::text AS "deletedCount"
      FROM deleted
    `
  );

  return Number(result.rows[0]?.deletedCount ?? 0);
}
