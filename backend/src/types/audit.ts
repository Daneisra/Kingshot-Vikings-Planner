export interface AuditContext {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditAction =
  | "event_warning_updated"
  | "guide_notes_updated"
  | "registration_deleted"
  | "registrations_imported"
  | "weekly_reset";

export type AuditTargetType = "app_settings" | "registration" | "registrations";

export interface AuditLogInput {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  context: AuditContext;
}
