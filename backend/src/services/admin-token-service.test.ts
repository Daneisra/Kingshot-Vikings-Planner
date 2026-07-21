import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:5432/test";
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.ADMIN_TOKEN_SECRET = "test-admin-token-secret-32-characters";
process.env.ADMIN_TOKEN_TTL_MINUTES = "1";

const loadTokenService = () => import("./admin-token-service");

describe("admin-token-service", () => {
  it("creates a signed token that validates", async () => {
    const { createAdminToken, isValidAdminToken } = await loadTokenService();
    const result = createAdminToken();

    assert.equal(isValidAdminToken(result.token), true);
    assert.equal(Number.isNaN(Date.parse(result.expiresAt)), false);
  });

  it("rejects missing and malformed tokens", async () => {
    const { isValidAdminToken } = await loadTokenService();

    assert.equal(isValidAdminToken(undefined), false);
    assert.equal(isValidAdminToken(""), false);
    assert.equal(isValidAdminToken("payload-only"), false);
    assert.equal(isValidAdminToken("payload.signature.extra"), false);
  });

  it("rejects a token with an altered signature", async () => {
    const { createAdminToken, isValidAdminToken } = await loadTokenService();
    const { token } = createAdminToken();
    const [payload, signature] = token.split(".");
    const replacement = signature.endsWith("a") ? "b" : "a";
    const alteredToken = `${payload}.${signature.slice(0, -1)}${replacement}`;

    assert.equal(isValidAdminToken(alteredToken), false);
  });

  it("rejects a correctly signed token after expiry", async () => {
    const { createAdminToken, isValidAdminToken } = await loadTokenService();
    const originalDateNow = Date.now;
    const issuedAt = originalDateNow();

    try {
      Date.now = () => issuedAt;
      const { token } = createAdminToken();

      Date.now = () => issuedAt + 61_000;
      assert.equal(isValidAdminToken(token), false);
    } finally {
      Date.now = originalDateNow;
    }
  });
});
