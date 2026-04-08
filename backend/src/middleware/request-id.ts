import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export function attachRequestId(req: Request, res: Response, next: NextFunction) {
  const incomingRequestId = req.header("x-request-id")?.trim();
  const requestId = incomingRequestId || randomUUID();

  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
