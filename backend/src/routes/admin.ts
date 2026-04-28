import { Router } from "express";
import { requireAdmin } from "../middleware/admin-auth";
import { registrationSchema } from "../schemas/registration-schema";
import { buildAuditContext } from "../services/audit-service";
import { createAdminToken } from "../services/admin-token-service";
import {
  getWeeklyArchive,
  listPersonalScoreTrends,
  listWeeklyArchives,
  updateWeeklyArchiveMetadata
} from "../services/archive-service";
import { buildRegistrationsCsv } from "../utils/csv";
import { asyncHandler } from "../utils/async-handler";
import {
  bulkImportRegistrations,
  getRegistrationStats,
  listRegistrations,
  resetRegistrations
} from "../services/registration-service";
import { updateEventWarningSettings } from "../services/settings-service";
import { z } from "zod";

const filtersSchema = z.object({
  search: z.string().trim().optional(),
  partner: z.string().trim().optional(),
  available: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => {
      if (value === "true") {
        return true;
      }

      if (value === "false") {
        return false;
      }

      return undefined;
    })
});

const archiveIdSchema = z.object({
  id: z.string().uuid("Invalid archive identifier.")
});

const archiveMetadataSchema = z.object({
  allianceScore: z
    .coerce
    .number()
    .int("Alliance score must be a whole number.")
    .min(0, "Alliance score must be 0 or higher.")
    .max(1000000000, "Alliance score is unrealistically high.")
    .nullable()
    .optional()
    .transform((value) => (typeof value === "number" ? value : null)),
  difficultyLevel: z
    .string()
    .trim()
    .max(40, "Difficulty level is too long.")
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
  difficultyNote: z
    .string()
    .trim()
    .max(300, "Difficulty note is too long.")
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
  eventLog: z
    .string()
    .trim()
    .max(1200, "Weekly event log is too long.")
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
  manualStats: z
    .array(
      z.object({
        label: z
          .string()
          .trim()
          .min(1, "Manual stat label is required.")
          .max(30, "Manual stat label is too long."),
        value: z
          .coerce
          .number()
          .int("Manual stat value must be a whole number.")
          .min(0, "Manual stat value must be 0 or higher.")
          .max(1000000000, "Manual stat value is unrealistically high.")
      })
    )
    .max(4, "Use up to 4 manual stat fields.")
    .optional()
    .transform((value) => value ?? [])
});

const bulkImportSchema = z.object({
  registrations: z
    .array(registrationSchema)
    .min(1, "At least one registration is required.")
    .max(100, "Import up to 100 registrations at a time.")
});

const eventWarningSchema = z
  .object({
    isEnabled: z.boolean(),
    title: z
      .string()
      .trim()
      .max(80, "Warning title is too long.")
      .optional()
      .transform((value) => value ?? ""),
    message: z
      .string()
      .trim()
      .max(240, "Warning message is too long.")
      .optional()
      .transform((value) => value ?? "")
  })
  .superRefine((value, context) => {
    if (!value.isEnabled) {
      return;
    }

    if (!value.title) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Warning title is required when the banner is enabled.",
        path: ["title"]
      });
    }

    if (!value.message) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Warning message is required when the banner is enabled.",
        path: ["message"]
      });
    }
  });

export const adminRouter = Router();

adminRouter.post(
  "/verify",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json({ ok: true, ...createAdminToken() });
  })
);

adminRouter.get(
  "/export.csv",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const filters = filtersSchema.parse(req.query);
    const registrations = await listRegistrations(filters);
    const csv = buildRegistrationsCsv(registrations, { filters, exportedAt: new Date() });
    const exportDate = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="kingshot-vikings-registrations-${exportDate}.csv"`
    );
    res.send(csv);
  })
);

adminRouter.get(
  "/stats",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const filters = filtersSchema.parse(req.query);
    const stats = await getRegistrationStats(filters);
    res.json(stats);
  })
);

adminRouter.get(
  "/archives",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const archives = await listWeeklyArchives();
    res.json(archives);
  })
);

adminRouter.get(
  "/archives/personal-score-trends",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const trends = await listPersonalScoreTrends();
    res.json(trends);
  })
);

adminRouter.get(
  "/archives/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = archiveIdSchema.parse(req.params);
    const archive = await getWeeklyArchive(id);
    res.json(archive);
  })
);

adminRouter.get(
  "/archives/:id/export.csv",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = archiveIdSchema.parse(req.params);
    const archive = await getWeeklyArchive(id);
    const archiveDate = new Date(archive.archivedAt).toISOString().slice(0, 10);
    const csv = buildRegistrationsCsv(archive.registrations, {
      filters: {},
      exportedAt: new Date()
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="kingshot-vikings-archive-${archiveDate}-${archive.id}.csv"`
    );
    res.send(csv);
  })
);

adminRouter.patch(
  "/archives/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = archiveIdSchema.parse(req.params);
    const payload = archiveMetadataSchema.parse(req.body);
    const archive = await updateWeeklyArchiveMetadata(id, payload);
    res.json(archive);
  })
);

adminRouter.post(
  "/import",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const payload = bulkImportSchema.parse(req.body);
    const result = await bulkImportRegistrations(payload.registrations, buildAuditContext(req, res));
    res.status(201).json(result);
  })
);

adminRouter.patch(
  "/settings/event-warning",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const payload = eventWarningSchema.parse(req.body);
    const settings = await updateEventWarningSettings(payload, buildAuditContext(req, res));
    res.json(settings);
  })
);

adminRouter.post(
  "/reset",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await resetRegistrations(buildAuditContext(req, res));
    res.json(result);
  })
);
