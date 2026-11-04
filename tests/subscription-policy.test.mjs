import test from "node:test";
import assert from "node:assert/strict";
import { allowedApiPath } from "../src/lib/policy.mjs";
import {
  readPlans,
  readOrderPage,
} from "../src/lib/subscription-contracts.mjs";
test("empty data is distinct from malformed subscription responses", () => {
  assert.deepEqual(readPlans([]), []);
  assert.throws(() => readPlans({}));
  assert.throws(() =>
    readPlans([
      {
        id: "new_plan",
        name: "AI",
        role: "Customer",
        amountVnd: "20000",
        days: null,
        description: "",
        state: "Published",
        version: 1,
      },
    ]),
  );
  assert.throws(() => readOrderPage({ items: [], total: -1 }));
  assert.deepEqual(readOrderPage({ items: [], total: 0 }), {
    items: [],
    total: 0,
  });
});
test("subscription admin routes use explicit methods and reject unrelated paths", () => {
  for (const method of ["GET", "PUT", "DELETE"])
    assert.equal(
      allowedApiPath(method, "admin/plans/bbook_visibility_30d_v1"),
      true,
    );
  assert.equal(allowedApiPath("POST", "admin/plans"), true);
  assert.equal(
    allowedApiPath("POST", "admin/plans/bbook_visibility_30d_v1"),
    false,
  );
  assert.equal(allowedApiPath("PUT", "admin/plans/../users"), false);
  assert.equal(
    allowedApiPath(
      "GET",
      "admin/commerce/orders/Customer/00000000-0000-0000-0000-000000000001",
    ),
    true,
  );
  assert.equal(
    allowedApiPath(
      "POST",
      "admin/commerce/orders/Customer/00000000-0000-0000-0000-000000000001/resolve",
    ),
    true,
  );
  assert.equal(
    allowedApiPath(
      "POST",
      "admin/commerce/orders/Admin/00000000-0000-0000-0000-000000000001/resolve",
    ),
    false,
  );
});
