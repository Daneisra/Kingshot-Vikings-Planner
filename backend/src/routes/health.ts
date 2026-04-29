import { Router } from "express";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { API_VERSION } from "../config/app-version";
import { asyncHandler } from "../utils/async-handler";
import { pool } from "../db/pool";

export const healthRouter = Router();

const startedAt = new Date().toISOString();
const deployInfoPath = path.resolve(__dirname, "../deploy-info.json");

interface DeployInfo {
  deployedAt?: string;
  commitSha?: string;
}

function readDeployInfo(): DeployInfo {
  if (process.env.APP_DEPLOYED_AT || process.env.APP_COMMIT_SHA) {
    return {
      deployedAt: process.env.APP_DEPLOYED_AT,
      commitSha: process.env.APP_COMMIT_SHA
    };
  }

  if (!existsSync(deployInfoPath)) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(readFileSync(deployInfoPath, "utf8")) as DeployInfo;

    return {
      deployedAt: typeof parsedValue.deployedAt === "string" ? parsedValue.deployedAt : undefined,
      commitSha: typeof parsedValue.commitSha === "string" ? parsedValue.commitSha : undefined
    };
  } catch {
    return {};
  }
}

healthRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const databaseStartedAt = Date.now();
    let databaseStatus: "ok" | "error" = "ok";
    let databaseLatencyMs: number | null = null;

    try {
      await pool.query("SELECT 1");
      databaseLatencyMs = Date.now() - databaseStartedAt;
    } catch {
      databaseStatus = "error";
    }

    const deployInfo = readDeployInfo();
    const status = databaseStatus === "ok" ? "ok" : "degraded";

    res.json({
      status,
      version: API_VERSION,
      database: {
        status: databaseStatus,
        latencyMs: databaseLatencyMs
      },
      startedAt,
      uptimeSeconds: Math.round(process.uptime()),
      deployedAt: deployInfo.deployedAt ?? null,
      commitSha: deployInfo.commitSha ?? null
    });
  })
);
