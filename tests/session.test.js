import test from "node:test";
import assert from "node:assert/strict";
import { storeSession, readSession, setRememberPreference, createApiClient } from "../src/session.js";

function storage() { const values = new Map(); return { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }; }
globalThis.localStorage = storage(); globalThis.sessionStorage = storage();
globalThis.window = new EventTarget();
const token = expiry => `e30.${Buffer.from(JSON.stringify({ exp: expiry })).toString("base64url")}.test`;

test("session survives F5 regardless of remember setting", () => {
  for (const remember of [false, true]) {
    setRememberPreference(remember);
    storeSession({ userId: "misha", accessToken: "access", refreshToken: "refresh" });
    assert.equal(readSession().userId, "misha");
    assert.equal(Boolean(localStorage.getItem("monimon-session-v2")), remember);
    assert.equal(Boolean(sessionStorage.getItem("monimon-session-v2")), !remember);
  }
});
test("remembered session survives a new browser session", () => {
  setRememberPreference(true); storeSession({ userId: "misha", accessToken: "a" });
  globalThis.sessionStorage = storage(); assert.equal(readSession().userId, "misha");
  storeSession(null); assert.equal(readSession(), null);
});
test("simultaneous calls rotate refresh token once", async () => {
  setRememberPreference(false); storeSession({ userId: "misha", accessToken: token(1), refreshToken: "r1" });
  let calls = 0;
  globalThis.fetch = async () => { calls++; await new Promise(resolve => setTimeout(resolve, 10)); return { ok: true, json: async () => ({ access_token: token(Date.now()/1000+3600), refresh_token: "r2" }) }; };
  const api = createApiClient("http://example.test");
  await Promise.all([api.refresh(), api.refresh()]);
  assert.equal(calls, 1); assert.equal(readSession().refreshToken, "r2");
});
test("network outage does not remove a valid stored session", async () => {
  storeSession({ userId: "misha", accessToken: token(1), refreshToken: "r" });
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(createApiClient("http://example.test").refresh());
  assert.equal(readSession().userId, "misha");
});

test("expired request retries once with rotated credentials, including auth body", async () => {
  const original = token(Date.now()/1000+300);
  const rotated = token(Date.now()/1000+3600);
  storeSession({ userId: "misha", accessToken: original, refreshToken: "r1" });
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith("/refresh")) return { ok: true, json: async () => ({ access_token: rotated, refresh_token: "r2" }) };
    const ok = options.headers.Authorization === `Bearer ${rotated}`;
    return { ok, status: ok ? 200 : 401, json: async () => ok ? { success: true } : { error: "expired" } };
  };
  const response = await createApiClient("http://example.test")("/api/auth/update-email", {
    method: "POST", headers: { Authorization: `Bearer ${original}` }, body: JSON.stringify({ access_token: original, email: "demo@example.test" })
  });
  assert.equal(response.success, true);
  assert.equal(requests.length, 3);
  assert.equal(JSON.parse(requests[2].options.body).access_token, rotated);
});
