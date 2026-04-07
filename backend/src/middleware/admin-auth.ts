import { NextFunction, Request, Response } from "express";
import { config } from "../config/env";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const providedPassword = req.header("x-admin-password");

  if (!providedPassword || providedPassword !== config.adminPassword) {
    return res.status(401).json({ message: "Invalid admin password." });
  }

  next();
}
