import { Router } from "express";
import { requireAdmin } from "../middleware/admin-auth";
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
import { getRegistrationStats, listRegistrations, resetRegistrations } from "../services/registration-service";
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
    .transform((value) => (value ? value : null))
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
  "/reset",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await resetRegistrations(buildAuditContext(req, res));
    res.json(result);
  })
);
