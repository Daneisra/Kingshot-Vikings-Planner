import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/admin-auth";
import { registrationSchema } from "../schemas/registration-schema";
import { buildAuditContext } from "../services/audit-service";
import {
  createRegistration,
  deleteRegistration,
  getRegistrationStats,
  listPartners,
  listRegistrations,
  updateRegistration
} from "../services/registration-service";
import { asyncHandler } from "../utils/async-handler";

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

const idSchema = z.object({
  id: z.string().uuid("Invalid identifier.")
});

export const registrationsRouter = Router();

registrationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filters = filtersSchema.parse(req.query);
    const registrations = await listRegistrations(filters);
    res.json(registrations);
  })
);

registrationsRouter.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const filters = filtersSchema.parse(req.query);
    const stats = await getRegistrationStats(filters);
    res.json(stats);
  })
);

registrationsRouter.get(
  "/partners",
  asyncHandler(async (_req, res) => {
    const partners = await listPartners();
    res.json(partners);
  })
);

registrationsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const payload = registrationSchema.parse(req.body);
    const registration = await createRegistration(payload);
    res.status(201).json(registration);
  })
);

registrationsRouter.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = idSchema.parse(req.params);
    const payload = registrationSchema.parse(req.body);
    const registration = await updateRegistration(id, payload);
    res.json(registration);
  })
);

registrationsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = idSchema.parse(req.params);
    await deleteRegistration(id, buildAuditContext(req, res));
    res.status(204).send();
  })
);
