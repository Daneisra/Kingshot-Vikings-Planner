export interface AuditContext {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditAction = "registration_deleted" | "weekly_reset";

export type AuditTargetType = "registration" | "registrations";

export interface AuditLogInput {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  context: AuditContext;
}
