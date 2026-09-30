import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedApiPath, isAdmin, isSameOrigin } from "../src/lib/policy.mjs";
const id = "11111111-1111-4111-8111-111111111111";
test("proxy allows only explicit admin operations", () => {
  assert.equal(allowedApiPath("GET", "admin/mua-applications"), true);
  assert.equal(
    allowedApiPath("POST", `admin/mua-applications/${id}/approve`),
    true,
  );
  assert.equal(allowedApiPath("POST", `Refund/${id}/retry`), true);
  assert.equal(allowedApiPath("PATCH", `admin/users/${id}/active`), true);
  assert.equal(allowedApiPath("POST", "Booking/auto-complete-overdue"), true);
});
test("proxy blocks public auth, unknown endpoints, wrong methods and traversal", () => {
  for (const path of [
    "Auth/register",
    "Wallet/deposit",
    "admin/../User/profile",
    "https://example.com",
    "admin/muas/not-a-guid",
    "admin/muas/------------------------------------",
  ])
    assert.equal(allowedApiPath("GET", path), false);
  assert.equal(allowedApiPath("DELETE", "admin/mua-applications"), false);
  assert.equal(allowedApiPath("POST", "admin/notifications/users"), false);
  assert.equal(allowedApiPath("POST", `Booking/${id}/resolve-dispute`), false);
  assert.equal(allowedApiPath("POST", "Wallet/deposit"), false);
});
test("admin role includes backend numeric and string representations only", () => {
  for (const role of [0, "Admin", "ADMIN"]) assert.equal(isAdmin(role), true);
  for (const role of [1, 2, "Customer", "MUA", "0", null, undefined])
    assert.equal(isAdmin(role), false);
});
test("mutations require exact same origin including port and protocol", () => {
  assert.equal(
    isSameOrigin("http://localhost:3001", "http://localhost:3001/api/session"),
    true,
  );
  for (const origin of [
    null,
    "null",
    "https://attacker.example",
    "http://localhost:3000",
    "https://localhost:3001",
  ])
    assert.equal(
      isSameOrigin(origin, "http://localhost:3001/api/session"),
      false,
    );
});
