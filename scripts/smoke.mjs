import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const root = process.env.APP_ORIGIN;
if (!root)
  throw new Error(
    "Configure APP_ORIGIN and start Web Admin before the smoke check.",
  );
// No credentials, JWT creation, Backend mocks or business mutations.
const checks = [
  ["GET", "/", 307],
  ["GET", `/verification/${randomUUID()}`, 307],
  ["GET", "/preview", 307],
  ["GET", "/api/session", 401],
  ["GET", "/api/backend/admin/mua-applications", 401],
  ["GET", "/api/backend/admin/work-summary", 401],
  ["GET", "/api/backend/admin/feedback", 401],
  ["GET", `/api/backend/admin/feedback/${randomUUID()}`, 401],
  [
    "POST",
    `/api/backend/admin/feedback/${randomUUID()}/review`,
    403,
    "https://attacker.invalid",
  ],
  ["GET", "/api/backend/Auth/register", 404],
  ["GET", "/api/backend/Booking", 404],
  ["POST", "/api/backend/Wallet/deposit", 404],
  ["POST", "/api/session", 403, "https://attacker.invalid"],
  ["POST", "/api/session", 400, root],
];
for (const [method, path, status, origin] of checks) {
  const response = await fetch(root + path, {
    method,
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
    headers: origin
      ? { Origin: origin, "Content-Type": "application/json" }
      : undefined,
    ...(method === "POST" ? { body: "{}" } : {}),
  });
  assert.equal(response.status, status, `${method} ${path}`);
  if (status === 307) assert.equal(response.headers.get("location"), "/login");
}
console.info(
  `${checks.length} anonymous auth/allowlist/Origin HTTP checks passed. No business writes executed.`,
);
