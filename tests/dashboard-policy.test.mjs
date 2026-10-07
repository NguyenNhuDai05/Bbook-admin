import test from "node:test";
import assert from "node:assert/strict";
import { allowedApiPath } from "../src/lib/policy.mjs";

test("dashboard proxy exposes only the exact read endpoint", () => {
  assert.equal(allowedApiPath("GET", "admin/dashboard"), true);
  for (const method of ["POST", "PATCH", "DELETE"])
    assert.equal(allowedApiPath(method, "admin/dashboard"), false);
  assert.equal(allowedApiPath("GET", "admin/dashboard/export"), false);
  assert.equal(allowedApiPath("GET", "admin/../dashboard"), false);
});
test("review list and GUID detail are read-only and reject arbitrary subpaths", () => {
  const id = "12345678-1234-1234-1234-123456789abc";
  for (const path of [
    "admin/dashboard/reviews",
    `admin/dashboard/reviews/${id}`,
  ]) {
    assert.equal(allowedApiPath("GET", path), true);
    for (const method of ["POST", "PUT", "DELETE", "PATCH"])
      assert.equal(allowedApiPath(method, path), false);
  }
  for (const path of [
    "admin/dashboard/reviews/all",
    `admin/dashboard/reviews/${id}/image`,
    "admin/dashboard/reviews/../users",
  ])
    assert.equal(allowedApiPath("GET", path), false);
});
