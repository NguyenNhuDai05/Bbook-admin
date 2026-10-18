import test from "node:test";
import assert from "node:assert/strict";
import {
  createApkDailyReader,
  validateApkDaily,
} from "../src/lib/apk-counter.mjs";
import { analyticsRange } from "../src/lib/analytics-contracts.mjs";
import { handleAnalyticsRequest } from "../src/lib/analytics-handler.mjs";
const range = analyticsRange("2026-01-01", "2026-01-02");
const fixture = () => ({
  status: "ready",
  source: "first_party",
  timezone: "Asia/Ho_Chi_Minh",
  trackingStartedAt: "2026-01-02T01:00:00Z",
  total: 3,
  daily: [
    { date: "2026-01-01", clicks: null },
    { date: "2026-01-02", clicks: 3 },
  ],
  fetchedAt: "2026-01-02T02:00:00Z",
});
test("daily counter preserves unknown history and never falls back to GA4", () => {
  assert.equal(validateApkDaily(range, fixture()).daily[0].clicks, null);
  const empty = fixture();
  empty.trackingStartedAt = null;
  empty.total = null;
  empty.daily.forEach((row) => (row.clicks = null));
  assert.equal(validateApkDaily(range, empty).total, null);
  const wrong = fixture();
  wrong.source = "ga4";
  assert.throws(() => validateApkDaily(range, wrong), /counter/);
  const mismatch = fixture();
  mismatch.total = 4;
  assert.throws(() => validateApkDaily(range, mismatch), /counter/);
});
test("reader short cache coalesces authorized requests and expires after ten seconds", async () => {
  let calls = 0,
    time = 100000;
  const read = createApkDailyReader({
    now: () => time,
    fetchImpl: async (url, options) => {
      calls++;
      assert.match(url, /WebsiteMetrics\/apk-daily\?start=2026-01-01/);
      assert.equal(options.headers.Authorization, "Bearer fake");
      return Response.json(fixture());
    },
  });
  const [a, b] = await Promise.all([
    read(range, "fake", "https://backend.test/api"),
    read(range, "fake", "https://backend.test/api"),
  ]);
  assert.deepEqual(a, b);
  assert.equal(calls, 1);
  time += 11000;
  await read(range, "fake", "https://backend.test/api");
  assert.equal(calls, 2);
});
test("auth gate executes before counter cache and upstream failures never become zero counts", async () => {
  let calls = 0;
  const request = new Request(
    "https://admin.test/api/analytics/apk-daily?start=2026-01-01&end=2026-01-02",
  );
  const denied = await handleAnalyticsRequest(request, {
    authorize: async () => null,
    load: async () => {
      calls++;
    },
  });
  assert.equal(denied.status, 401);
  assert.equal(calls, 0);
  const read = createApkDailyReader({
    fetchImpl: async () => Response.json({}, { status: 503 }),
  });
  const failed = await handleAnalyticsRequest(request, {
    authorize: async () => true,
    load: (date) => read(date, "fake", "https://backend.test/api"),
  });
  assert.equal(failed.status, 502);
  const body = await failed.text();
  assert.match(body, /WebsiteMetrics/);
  assert.doesNotMatch(body, /"total":0|Bearer fake/);
});
