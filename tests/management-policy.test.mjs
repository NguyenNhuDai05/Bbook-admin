import test from "node:test";
import assert from "node:assert/strict";
import { allowedApiPath } from "../src/lib/policy.mjs";

test("management reads are explicitly scoped and do not open mutations or arbitrary admin routes", () => {
  for (const path of [
    "admin/management/users",
    "admin/management/financial-summary",
    "admin/bank-accounts/history",
  ]) {
    assert.equal(allowedApiPath("GET", path), true);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"])
      assert.equal(allowedApiPath(method, path), false);
  }
  for (const path of [
    "admin/management",
    "admin/management/secrets",
    "admin/management/users/../secrets",
    "admin/bank-accounts/history/all",
  ])
    assert.equal(allowedApiPath("GET", path), false);
});
