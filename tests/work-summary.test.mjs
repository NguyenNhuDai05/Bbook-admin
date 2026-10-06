import test from "node:test";
import assert from "node:assert/strict";
import {
  validateWorkSummary,
  newestDaily,
  badgeText,
  workKeys,
} from "../src/lib/work-contracts.mjs";
import { allowedApiPath } from "../src/lib/policy.mjs";

test("summary rejects partial, invalid and inconsistent counts rather than filling them with zeros", () => {
  const value = {
    updatedAt: "2026-10-06T10:00:00Z",
    counts: Object.fromEntries(workKeys.map((key) => [key, 2])),
    total: 14,
    processingPayouts: 0,
    processingRefunds: 3,
  };
  assert.equal(validateWorkSummary(value), value);
  assert.throws(() => validateWorkSummary({ ...value, total: 13 }));
  assert.throws(() =>
    validateWorkSummary({ ...value, counts: { verification: 2 } }),
  );
  assert.throws(() =>
    validateWorkSummary({ ...value, counts: { ...value.counts, payouts: -1 } }),
  );
  assert.throws(() => validateWorkSummary({ ...value, updatedAt: "invalid" }));
});
test("daily table is newest first across month boundaries without mutating chart data", () => {
  const rows = [
    { date: "2026-09-30", revenue: 0 },
    { date: "2026-10-06", revenue: 12 },
    { date: "2026-10-01", revenue: 0 },
  ];
  const sorted = newestDaily(rows);
  assert.deepEqual(
    sorted.map((row) => row.date),
    ["2026-10-06", "2026-10-01", "2026-09-30"],
  );
  assert.equal(rows[0].date, "2026-09-30");
  assert.equal(sorted[1].revenue, 0);
  assert.equal(badgeText(100), "99+");
  assert.equal(badgeText(99), "99");
});
test("proxy exposes only authorized work and feedback routes", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  for (const route of [
    "admin/work-summary",
    "admin/feedback",
    `admin/feedback/${id}`,
  ]) {
    assert.equal(allowedApiPath("GET", route), true);
    assert.equal(allowedApiPath("DELETE", route), false);
    assert.equal(allowedApiPath("POST", route), false);
  }
  assert.equal(allowedApiPath("POST", `admin/feedback/${id}/review`), true);
  assert.equal(allowedApiPath("POST", "feedback"), false);
  assert.equal(allowedApiPath("GET", "admin/feedback/export"), false);
});
