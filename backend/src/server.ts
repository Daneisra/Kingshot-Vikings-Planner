import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { adminRouter } from "./routes/admin";
import { healthRouter } from "./routes/health";
import { registrationsRouter } from "./routes/registrations";

dotenv.config();

const app = express();

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
app.use(express.json({ limit: "1mb" }));
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

app.use("/api/health", healthRouter);
app.use("/api/registrations", registrationsRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Route introuvable." });
});

app.use(errorHandler);

export { app };

