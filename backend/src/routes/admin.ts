import { Router } from "express";
import { requireAdmin } from "../middleware/admin-auth";
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

export const adminRouter = Router();

adminRouter.post(
  "/verify",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json({ ok: true });
  })
);

adminRouter.get(
  "/export.csv",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const filters = filtersSchema.parse(req.query);
    const registrations = await listRegistrations(filters);
    const csv = buildRegistrationsCsv(registrations);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="kingshot-vikings-registrations.csv"');
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

adminRouter.post(
  "/reset",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    await resetRegistrations();
    res.status(204).send();
  })
);
