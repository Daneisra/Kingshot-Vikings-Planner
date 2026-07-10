import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

const postgresUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function attachRequestId(req: Request, res: Response, next: NextFunction) {
  const incomingRequestId = req.header("x-request-id")?.trim();
  const requestId =
    incomingRequestId && postgresUuidPattern.test(incomingRequestId) ? incomingRequestId : randomUUID();

  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
