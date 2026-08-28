import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/server/session-token";

describe("session-token", () => {
  const originalSecret = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-do-not-use-in-prod";
  });

  afterEach(() => {
    process.env.AUTH_SECRET = originalSecret;
  });

  it("round-trips a valid userId/role payload", async () => {
    const token = await createSessionToken({ userId: "user_1", role: "TEACHER" });
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ userId: "user_1", role: "TEACHER" });
  });

  it("rejects a token whose role claim was tampered with", async () => {
    const token = await createSessionToken({ userId: "user_1", role: "STUDENT" });
    const [body, signature] = token.split(".");
    const decoded = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    decoded.role = "ADMIN";
    const tamperedBody = Buffer.from(JSON.stringify(decoded))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const payload = await verifySessionToken(`${tamperedBody}.${signature}`);
    expect(payload).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken({ userId: "user_1", role: "ADMIN" });
    process.env.AUTH_SECRET = "a-different-secret";
    const payload = await verifySessionToken(token);
    expect(payload).toBeNull();
  });

  it("rejects malformed and empty tokens", async () => {
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
    expect(await verifySessionToken("not-a-valid-token")).toBeNull();
    expect(await verifySessionToken("a.b.c")).toBeNull();
  });

  it("throws when signing without AUTH_SECRET configured", async () => {
    delete process.env.AUTH_SECRET;
    await expect(createSessionToken({ userId: "user_1", role: "STUDENT" })).rejects.toThrow();
  });

  it("returns null when verifying without AUTH_SECRET configured", async () => {
    const token = await createSessionToken({ userId: "user_1", role: "STUDENT" });
    delete process.env.AUTH_SECRET;
    expect(await verifySessionToken(token)).toBeNull();
  });
});
