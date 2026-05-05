import { Router } from "express";
import {
  listPersonalScoreTrends,
  listPlayerProfileSummaries,
  listWeeklyArchives
} from "../services/archive-service";
import type { WeeklyArchiveSummary } from "../types/registration";
import { asyncHandler } from "../utils/async-handler";

export const scoresRouter = Router();

scoresRouter.get(
  "/archives",
  asyncHandler(async (_req, res) => {
    const archives = await listWeeklyArchives();
    res.json(archives.map(toPublicArchiveSummary));
  })
);

scoresRouter.get(
  "/personal-score-trends",
  asyncHandler(async (_req, res) => {
    const trends = await listPersonalScoreTrends();
    res.json(trends);
  })
);

scoresRouter.get(
  "/player-profiles",
  asyncHandler(async (_req, res) => {
    const profiles = await listPlayerProfileSummaries();
    res.json(profiles);
  })
);

function toPublicArchiveSummary(archive: WeeklyArchiveSummary): WeeklyArchiveSummary {
  return {
    ...archive,
    eventLog: null
  };
}
