import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error";

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : undefined;

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "The submitted data is invalid.",
      requestId,
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      message: error.message,
      requestId
    });
  }

  console.error(`[${requestId ?? "unknown-request"}] ${req.method} ${req.originalUrl}`, error);
  res.status(500).json({
    message: "An internal error occurred.",
    requestId
  });
}
