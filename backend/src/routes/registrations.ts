import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/admin-auth";
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

const troopTypeSchema = z.enum(["infantry", "lancer", "marksman"]);

const troopLoadoutEntrySchema = z.object({
  type: troopTypeSchema,
  tier: z.coerce.number().int().min(7, "Troop tier must be 7 or higher.").max(11, "Troop tier must be 11 or lower."),
  count: z.coerce.number().int().min(1, "Troop count must be at least 1.").max(100000000)
});

const registrationSchema = z.object({
  nickname: z.string().trim().min(2, "Nickname is required.").max(40),
  partnerName: z.string().trim().min(2, "Partner name is required.").max(40),
  troopLoadout: z
    .array(troopLoadoutEntrySchema)
    .min(1, "At least one troop line is required.")
    .max(2, "Only your strongest 2 troop tiers should be counted.")
    .superRefine((entries, context) => {
      const combinations = new Set<string>();

      entries.forEach((entry, index) => {
        const key = `${entry.type}:${entry.tier}`;

        if (combinations.has(key)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate troop type and tier combinations are not allowed.",
            path: [index, "tier"]
          });
        }

        combinations.add(key);
      });
    }),
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
    await deleteRegistration(id, buildAuditContext(req, res));
    res.status(204).send();
  })
);
