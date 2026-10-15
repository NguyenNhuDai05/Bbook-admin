import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { createAnalyticsService } from "../src/lib/analytics-data.mjs";
import {
  parseRealtime,
  realtimeRequest,
} from "../src/lib/analytics-realtime.mjs";
import { handleAnalyticsRequest } from "../src/lib/analytics-handler.mjs";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const credentials = Buffer.from(
  JSON.stringify({
    type: "service_account",
    client_email: "qa@example.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
  }),
).toString("base64");
const env = () => ({
  GA4_PROPERTY_ID: "123",
  GA4_WEB_STREAM_ID: "456",
  GA4_SERVICE_ACCOUNT_JSON_BASE64: credentials,
});
const report = (value, timeline = false) => ({
  metricHeaders: [{ name: "activeUsers" }],
  dimensionHeaders: timeline ? [{ name: "minutesAgo" }] : [],
  rowCount: 1,
  rows: [
    {
      metricValues: [{ value: String(value) }],
      ...(timeline ? { dimensionValues: [{ value: "00" }] } : {}),
    },
  ],
});

test("realtime is restricted to web stream and inclusive rolling minute windows", () => {
  const request = realtimeRequest("456", 5);
  assert.deepEqual(request.minuteRanges, [
    { name: "recent", startMinutesAgo: 4, endMinutesAgo: 0 },
  ]);
  assert.equal(
    request.dimensionFilter.andGroup.expressions[0].filter.stringFilter.value,
    "456",
  );
  assert.equal(
    request.dimensionFilter.andGroup.expressions[1].filter.stringFilter.value,
    "web",
  );
  assert.equal(JSON.stringify(request).includes("hostName"), false);
});
test("timeline fills only successful empty buckets, orders oldest first and never totals minute users", () => {
  const points = parseRealtime(report(3, true), true);
  assert.equal(points.length, 30);
  assert.deepEqual(points[29], { minutesAgo: 0, users: 3 });
  assert.equal(points[0].users, 0);
  assert.equal(parseRealtime({ ...report(0), rows: [], rowCount: 0 }), 0);
  assert.throws(() => parseRealtime({}), /response/);
  assert.throws(() => parseRealtime({ ...report(1), rowCount: 2 }), /response/);
  assert.throws(() => parseRealtime(report("-1")), /response/);
  const invalid = report(1, true);
  invalid.rows[0].dimensionValues[0].value = "30";
  assert.throws(() => parseRealtime(invalid, true), /response/);
});

test("named minute range column is resolved by header name in either order", () => {
  for (const reversed of [false, true]) {
    const value = report(4, true);
    value.dimensionHeaders.push({ name: "dateRange" });
    value.rows[0].dimensionValues.push({ value: "recent" });
    if (reversed) {
      value.dimensionHeaders.reverse();
      value.rows[0].dimensionValues.reverse();
    }
    assert.equal(parseRealtime(value, true)[29].users, 4);
  }
  const total = report(7);
  total.dimensionHeaders = [{ name: "dateRange" }];
  total.rows[0].dimensionValues = [{ value: "recent" }];
  assert.equal(parseRealtime(total), 7);
  total.rows[0].dimensionValues[0].value = "another-window";
  assert.throws(() => parseRealtime(total), /response/);
});

test("recognized empty protobuf reports may omit headers but malformed reports remain errors", () => {
  const empty = { kind: "analyticsData#runRealtimeReport" };
  assert.equal(parseRealtime(empty), 0);
  assert.equal(
    parseRealtime(empty, true).every((point) => point.users === 0),
    true,
  );
  assert.throws(() => parseRealtime({}), /response/);
  assert.throws(() => parseRealtime({ ...empty, rowCount: 1 }), /response/);
  assert.throws(
    () => parseRealtime({ ...empty, metricHeaders: [{ name: "eventCount" }] }),
    /response/,
  );
});
test("service reuses OAuth, coalesces refreshes, separates 5/30 minute totals and expires short cache", async () => {
  let time = 100000,
    calls = 0,
    tokens = 0;
  const requests = [];
  const load = createAnalyticsService({
    environment: env,
    now: () => time,
    fetchImpl: async (url, options) => {
      if (url.includes("oauth2")) {
        tokens++;
        return Response.json({ access_token: "fake-token", expires_in: 3600 });
      }
      calls++;
      assert.match(url, /:runRealtimeReport$/);
      const body = JSON.parse(options.body);
      requests.push(body);
      return Response.json(
        report(
          body.dimensions.length
            ? 2
            : body.minuteRanges[0].startMinutesAgo === 4
              ? 3
              : 7,
          body.dimensions.length > 0,
        ),
      );
    },
  });
  const [first, second] = await Promise.all([
    load({ realtime: true }),
    load({ realtime: true }),
  ]);
  assert.deepEqual(first, second);
  assert.equal(first.active30, 7);
  assert.equal(first.active5, 3);
  assert.equal(calls, 3);
  assert.equal(tokens, 1);
  await load({ realtime: true });
  assert.equal(calls, 3);
  time += 26000;
  await load({ realtime: true });
  assert.equal(calls, 6);
  assert.equal(tokens, 1);
  assert.equal(
    requests.every(
      (body) => body.dimensionFilter.andGroup.expressions.length === 2,
    ),
    true,
  );
});
test("missing stream does not request unfiltered GA4 data", async () => {
  let calls = 0;
  const load = createAnalyticsService({
    environment: () => ({ ...env(), GA4_WEB_STREAM_ID: undefined }),
    fetchImpl: () => {
      calls++;
      throw Error("unexpected");
    },
  });
  assert.equal((await load({ realtime: true })).status, "not_connected");
  assert.equal(calls, 0);
});

test("page views use the views metric and reject user counts as views", () => {
  const request = realtimeRequest("456", 30, true, "screenPageViews");
  assert.deepEqual(request.metrics, [{ name: "screenPageViews" }]);
  assert.equal(request.minuteRanges[0].startMinutesAgo, 29);
  const value = report(12, true);
  assert.throws(
    () => parseRealtime(value, true, "screenPageViews"),
    /response/,
  );
  value.metricHeaders = [{ name: "screenPageViews" }];
  value.dimensionHeaders.unshift({ name: "dateRange" });
  value.rows[0].dimensionValues.unshift({ value: "recent" });
  const minutes = parseRealtime(value, true, "screenPageViews");
  assert.deepEqual(minutes[29], { minutesAgo: 0, views: 12 });
  assert.equal(minutes[0].views, 0);
  assert.equal(
    parseRealtime(
      { kind: "analyticsData#runRealtimeReport" },
      false,
      "screenPageViews",
    ),
    0,
  );
  assert.throws(() => realtimeRequest("456", 30, false, "unknown"), /config/);
});

test("views and active users have independent cache and duplicate requests coalesce", async () => {
  let calls = 0,
    tokens = 0;
  const load = createAnalyticsService({
    environment: env,
    fetchImpl: async (url, options) => {
      if (url.includes("oauth2")) {
        tokens++;
        return Response.json({ access_token: "fake", expires_in: 3600 });
      }
      calls++;
      const request = JSON.parse(options.body);
      const views = request.metrics[0].name === "screenPageViews";
      const value = report(views ? 12 : 2, request.dimensions.length > 0);
      value.metricHeaders = request.metrics;
      assert.equal(
        request.dimensionFilter.andGroup.expressions[0].filter.stringFilter
          .value,
        "456",
      );
      return Response.json(value);
    },
  });
  const [views, duplicate, users] = await Promise.all([
    load({ realtime: true, metric: "screenPageViews" }),
    load({ realtime: true, metric: "screenPageViews" }),
    load({ realtime: true }),
  ]);
  assert.deepEqual(views, duplicate);
  assert.equal(views.views30, 12);
  assert.equal(views.views5, 12);
  assert.equal(views.active30, undefined);
  assert.equal(users.active30, 2);
  assert.equal(users.views30, undefined);
  assert.equal(calls, 6);
  assert.equal(tokens, 1);
  await load({ realtime: true, metric: "screenPageViews" });
  assert.equal(calls, 6);
});

test("page view quota failure remains an error and is not cached as zero", async () => {
  let calls = 0;
  const load = createAnalyticsService({
    environment: env,
    fetchImpl: async (url) => {
      if (url.includes("oauth2"))
        return Response.json({ access_token: "fake", expires_in: 3600 });
      calls++;
      return Response.json({}, { status: 429 });
    },
  });
  await assert.rejects(
    load({ realtime: true, metric: "screenPageViews" }),
    (error) => error.code === "quota",
  );
  await assert.rejects(
    load({ realtime: true, metric: "screenPageViews" }),
    (error) => error.code === "quota",
  );
  assert.equal(calls, 6);
});
test("realtime authorization precedes load and errors never return fake zero or credentials", async () => {
  let calls = 0;
  const request = new Request("https://admin.test/api/analytics/realtime");
  const denied = await handleAnalyticsRequest(request, {
    realtime: true,
    authorize: async () => false,
    load: async () => {
      calls++;
    },
  });
  assert.equal(denied.status, 401);
  assert.equal(calls, 0);
  const failed = await handleAnalyticsRequest(request, {
    realtime: true,
    authorize: async () => true,
    load: async () => {
      throw Error("secret");
    },
  });
  assert.equal(failed.status, 502);
  assert.equal(failed.headers.get("cache-control"), "private, no-store");
  const body = await failed.text();
  assert.equal(body.includes("secret"), false);
  assert.equal(body.includes("active30"), false);
});
