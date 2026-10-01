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
