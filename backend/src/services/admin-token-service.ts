import { createHmac, timingSafeEqual } from "crypto";
import { config } from "../config/env";

interface AdminTokenPayload {
  sub: "admin";
  iat: number;
  exp: number;
}

export interface AdminTokenResult {
  token: string;
  expiresAt: string;
}

export function createAdminToken(): AdminTokenResult {
  const now = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = now + config.adminTokenTtlMinutes * 60;
  const payload: AdminTokenPayload = {
    sub: "admin",
    iat: now,
    exp: expiresAtSeconds
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString()
  };
}

export function isValidAdminToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload);

  if (!safeCompare(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AdminTokenPayload;
    return payload.sub === "admin" && Number.isInteger(payload.exp) && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", config.adminTokenSecret).update(encodedPayload).digest("base64url");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
