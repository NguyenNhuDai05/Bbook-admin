import test from "node:test";
import assert from "node:assert/strict";
import {
  stylePagination,
  stylePageButtons,
  STYLE_PAGE_SIZE,
} from "../src/lib/style-contracts.mjs";
import { allowedApiPath } from "../src/lib/policy.mjs";
for (const total of [0, 1, 9, 10, 11, 20, 21, 25]) {
  test(`backend total ${total} determines footer and pages at fixed size 10`, () => {
    assert.equal(STYLE_PAGE_SIZE, 10);
    for (let page = 1; page <= Math.max(1, Math.ceil(total / 10)); page++) {
      const result = stylePagination(total, page);
      assert.equal(result.from, total === 0 ? 0 : (page - 1) * 10 + 1);
      assert.equal(result.to, Math.min(page * 10, total));
      assert.equal(result.pages, Math.max(1, Math.ceil(total / 10)));
    }
  });
}
test("search total 13 has two pages and an invalid current page is clamped after mutation", () => {
  assert.deepEqual(stylePagination(13, 2), {
    pages: 2,
    current: 2,
    from: 11,
    to: 13,
  });
  assert.deepEqual(stylePagination(20, 3), {
    pages: 2,
    current: 2,
    from: 11,
    to: 20,
  });
  assert.deepEqual(stylePagination(0, 2), {
    pages: 1,
    current: 1,
    from: 0,
    to: 0,
  });
});
test("large pagination uses bounded numbered buttons and ellipses", () => {
  assert.deepEqual(stylePageButtons(6, 12), [1, "…", 5, 6, 7, "…", 12]);
  assert.deepEqual(stylePageButtons(1, 3), [1, 2, 3]);
});
test("proxy exposes only explicit admin catalog operations and preserves legacy routes", () => {
  for (const [method, path] of [
    ["GET", "admin/makeup-styles"],
    ["POST", "admin/makeup-styles"],
    ["GET", "admin/makeup-styles/1"],
    ["PUT", "admin/makeup-styles/1"],
    ["PATCH", "admin/makeup-styles/1/status"],
    ["GET", "Mua/styles"],
    ["POST", "Mua/styles"],
  ])
    assert.equal(allowedApiPath(method, path), true);
  for (const [method, path] of [
    ["DELETE", "admin/makeup-styles/1"],
    ["PUT", "Mua/styles"],
    ["PATCH", "admin/makeup-styles/1"],
    ["PUT", "admin/makeup-styles"],
    ["POST", "admin/makeup-styles/1/status"],
    ["GET", "admin/makeup-styles/0"],
  ])
    assert.equal(allowedApiPath(method, path), false);
});
