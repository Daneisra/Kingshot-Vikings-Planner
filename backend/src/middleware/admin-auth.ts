import { NextFunction, Request, Response } from "express";
import { config } from "../config/env";
import { isValidAdminToken } from "../services/admin-token-service";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const providedToken = req.header("x-admin-token");
  const providedPassword = req.header("x-admin-password");

  if (isValidAdminToken(providedToken)) {
    res.locals.adminAuthMethod = "token";
    return next();
  }

  if (isValidAdminPassword(providedPassword)) {
    res.locals.adminAuthMethod = "password";
    return next();
  }

  return res.status(401).json({ message: "Invalid admin credentials." });
}

function isValidAdminPassword(providedPassword: string | undefined) {
  if (!providedPassword) {
    return false;
  }

  return providedPassword === config.adminPassword || providedPassword === config.adminSecondaryPassword;
}
