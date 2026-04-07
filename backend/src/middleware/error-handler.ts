import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Les donnees envoyees sont invalides.",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  res.status(500).json({ message: "Une erreur interne est survenue." });
}

