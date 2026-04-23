import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import type { Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { attachRequestId } from "./middleware/request-id";
import { adminRouter } from "./routes/admin";
import { healthRouter } from "./routes/health";
import { registrationsRouter } from "./routes/registrations";

dotenv.config();

const app = express();

function jsonLogToken(value: string | undefined) {
  return value ?? null;
}

morgan.token("request-id", (_req, res) =>
  typeof (res as Response).locals.requestId === "string" ? (res as Response).locals.requestId : undefined
);

morgan.format("json", (tokens, req, res) =>
  JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId: jsonLogToken(tokens["request-id"](req, res)),
    method: jsonLogToken(tokens.method(req, res)),
    url: jsonLogToken(tokens.url(req, res)),
    status: Number(tokens.status(req, res) ?? 0),
    responseTimeMs: Number(tokens["response-time"](req, res) ?? 0),
    contentLength: jsonLogToken(tokens.res(req, res, "content-length")),
    remoteAddress: jsonLogToken(tokens["remote-addr"](req, res)),
    userAgent: jsonLogToken(tokens["user-agent"](req, res))
  })
);

const corsOrigin =
  config.corsOrigin === "*"
    ? true
    : config.corsOrigin
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: false }));
app.use(attachRequestId);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(config.nodeEnv === "production" ? "json" : "dev"));

app.use("/api/health", healthRouter);
app.use("/api/registrations", registrationsRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found." });
});

app.use(errorHandler);

export { app };
