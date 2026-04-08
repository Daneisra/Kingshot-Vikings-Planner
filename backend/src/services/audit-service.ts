import type { PoolClient } from "pg";
import type { Request, Response } from "express";
import { pool } from "../db/pool";
import type { AuditContext, AuditLogInput } from "../types/audit";

const createAuditTableSql = `
  CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID,
    summary TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    request_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
    ON audit_logs (action, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs (created_at DESC);
`;

export async function ensureAuditTable() {
  await pool.query(createAuditTableSql);
}

export function buildAuditContext(req: Request, res: Response): AuditContext {
  return {
    requestId: typeof res.locals.requestId === "string" ? res.locals.requestId : undefined,
    ipAddress: req.ip || undefined,
    userAgent: req.get("user-agent")?.slice(0, 512) || undefined
  };
}

export async function insertAuditLog(client: PoolClient, input: AuditLogInput) {
  await client.query(
    `
      INSERT INTO audit_logs (
        action,
        target_type,
        target_id,
        summary,
        metadata,
        request_id,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
    `,
    [
      input.action,
      input.targetType,
      input.targetId ?? null,
      input.summary,
      JSON.stringify(input.metadata ?? {}),
      input.context.requestId ?? null,
      input.context.ipAddress ?? null,
      input.context.userAgent ?? null
    ]
  );
}
