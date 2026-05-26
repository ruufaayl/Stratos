/**
 * Audit logging utility.
 * Writes immutable records of significant user actions to audit_logs.
 * Non-fatal — failures are logged but never propagate to callers.
 */
import { db, schema } from "@/lib/db";

export type AuditAction =
  | "scan_started"
  | "scan_completed"
  | "scan_failed"
  | "finding_applied"
  | "finding_dismissed"
  | "finding_undone"
  | "export_run"
  | "bulk_action"
  | "account_connected"
  | "account_deleted"
  | "portal_accessed";

interface LogAuditOptions {
  orgId: string;
  userId: string;
  action: AuditAction;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry. Always non-fatal — errors are caught and logged.
 * Use `void logAudit(...)` in routes so failures never block the response.
 */
export async function logAudit(opts: LogAuditOptions): Promise<void> {
  try {
    await db.insert(schema.auditLogs).values({
      orgId: opts.orgId,
      userId: opts.userId,
      action: opts.action,
      resourceId: opts.resourceId ?? null,
      metadata: opts.metadata ?? {},
    });
  } catch (err) {
    // Non-fatal: audit log failure must never break the user-facing action
    console.error("[audit] Failed to write audit log:", err);
  }
}
