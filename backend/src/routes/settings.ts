import { Router } from "express";
import { getEventWarningSettings, getGuideNotesSettings } from "../services/settings-service";
import { asyncHandler } from "../utils/async-handler";

export const settingsRouter = Router();

settingsRouter.get(
  "/event-warning",
  asyncHandler(async (_req, res) => {
    const settings = await getEventWarningSettings();
    res.json(settings);
  })
);

settingsRouter.get(
  "/guide-notes",
  asyncHandler(async (_req, res) => {
    const settings = await getGuideNotesSettings();
    res.json(settings);
  })
);
