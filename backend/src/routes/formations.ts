import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/admin-auth";
import {
  addFormationSlot,
  deleteFormationSlot,
  getFormationPreset,
  isFormationEventKey,
  listFormationPresets,
  resetFormationPreset,
  updateFormationSlot,
  updateFormationTotals
} from "../services/formation-service";
import { buildFormationPresetCsv } from "../utils/csv";
import { asyncHandler } from "../utils/async-handler";
import { HttpError } from "../utils/http-error";

const troopCountSchema = z.coerce.number().int().min(0).max(1000000000);

const troopTotalsSchema = z.object({
  infantry: troopCountSchema,
  lancer: troopCountSchema,
  marksman: troopCountSchema
});

const slotSchema = z.object({
  name: z.string().trim().min(1, "Formation name is required.").max(80),
  hero: z.string().trim().min(1, "Hero is required.").max(120),
  infantry: troopCountSchema,
  lancer: troopCountSchema,
  marksman: troopCountSchema,
  notes: z.string().trim().max(300).optional().default(""),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional().default(0)
});

const slotUpdateSchema = slotSchema.extend({
  sortOrder: z.coerce.number().int().min(1).max(1000)
});

const slotIdSchema = z.object({
  slotId: z.string().trim().min(1)
});

export const formationsRouter = Router();

formationsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const presets = await listFormationPresets();
    res.json(presets);
  })
);

formationsRouter.get(
  "/:eventKey/export.csv",
  asyncHandler(async (req, res) => {
    const eventKey = parseEventKey(req.params.eventKey);
    const preset = await getFormationPreset(eventKey);
    const exportDate = new Date().toISOString().slice(0, 10);
    const csv = buildFormationPresetCsv(preset);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="kingshot-formations-${eventKey}-${exportDate}.csv"`
    );
    res.send(csv);
  })
);

formationsRouter.get(
  "/:eventKey",
  asyncHandler(async (req, res) => {
    const eventKey = parseEventKey(req.params.eventKey);
    const preset = await getFormationPreset(eventKey);
    res.json(preset);
  })
);

formationsRouter.put(
  "/:eventKey/totals",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const eventKey = parseEventKey(req.params.eventKey);
    const totals = troopTotalsSchema.parse(req.body);
    const preset = await updateFormationTotals(eventKey, totals);
    res.json(preset);
  })
);

formationsRouter.post(
  "/:eventKey/slots",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const eventKey = parseEventKey(req.params.eventKey);
    const slot = slotSchema.parse(req.body);
    const preset = await addFormationSlot(eventKey, slot);
    res.status(201).json(preset);
  })
);

formationsRouter.put(
  "/:eventKey/slots/:slotId",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const eventKey = parseEventKey(req.params.eventKey);
    const { slotId } = slotIdSchema.parse(req.params);
    const slot = slotUpdateSchema.parse(req.body);
    const preset = await updateFormationSlot(eventKey, slotId, slot);
    res.json(preset);
  })
);

formationsRouter.delete(
  "/:eventKey/slots/:slotId",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const eventKey = parseEventKey(req.params.eventKey);
    const { slotId } = slotIdSchema.parse(req.params);
    const preset = await deleteFormationSlot(eventKey, slotId);
    res.json(preset);
  })
);

formationsRouter.post(
  "/:eventKey/reset",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const eventKey = parseEventKey(req.params.eventKey);
    const preset = await resetFormationPreset(eventKey);
    res.json(preset);
  })
);

function parseEventKey(value: string) {
  if (!isFormationEventKey(value)) {
    throw new HttpError(404, "Unknown formation preset.");
  }

  return value;
}
