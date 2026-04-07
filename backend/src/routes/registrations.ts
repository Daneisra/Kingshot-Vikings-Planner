import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/admin-auth";
import {
  createRegistration,
  deleteRegistration,
  getRegistrationStats,
  listPartners,
  listRegistrations,
  updateRegistration
} from "../services/registration-service";
import { asyncHandler } from "../utils/async-handler";

const registrationSchema = z.object({
  nickname: z.string().trim().min(2, "Nickname is required.").max(40),
  partnerName: z.string().trim().min(2, "Partner name is required.").max(40),
  troopCount: z.coerce.number().int().min(0).max(100000000),
  troopLevel: z.coerce.number().int().min(1).max(100),
  comment: z
    .string()
    .trim()
    .max(300, "Comment is too long.")
    .optional()
    .transform((value) => (value ? value : null)),
  isAvailable: z.boolean()
});

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
    await deleteRegistration(id);
    res.status(204).send();
  })
);
