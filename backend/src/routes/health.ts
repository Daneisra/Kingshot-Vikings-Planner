import { Router } from "express";
import { API_VERSION } from "../config/app-version";
import { asyncHandler } from "../utils/async-handler";
import { pool } from "../db/pool";

export const healthRouter = Router();

healthRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok", version: API_VERSION });
  })
);
