import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtemp, writeFile, rm, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  analyticsToday,
  analyticsRange,
  percentageChange,
} from "../src/lib/analytics-contracts.mjs";
import {
  analyticsReports,
  normalizeAnalytics,
  createAnalyticsService,
  AnalyticsError,
} from "../src/lib/analytics-data.mjs";
import { handleAnalyticsRequest } from "../src/lib/analytics-handler.mjs";
import {
  readAdminProfile,
  AuthorizationError,
} from "../src/lib/admin-session.mjs";

const range = analyticsRange("2024-02-28", "2024-03-01");
const hosts = ["bbookmakeup.com", "www.bbookmakeup.com"];
const row = (dimensions, metrics) => ({
  dimensionValues: dimensions.map((value) => ({ value })),
  metricValues: metrics.map((value) => ({ value: String(value) })),
});
function report(spec, rows = []) {
  return {
    dimensionHeaders: [
      ...spec.request.dimensions,
      ...(spec.request.dateRanges.length > 1 ? [{ name: "dateRange" }] : []),
    ],
    metricHeaders: spec.request.metrics,
    rows,
    rowCount: rows.length,
    metadata: { timeZone: "Asia/Ho_Chi_Minh" },
  };
}
function fixtures() {
  const data = Object.fromEntries(
    analyticsReports(range, hosts).map((spec) => [spec.id, report(spec)]),
  );
  const put = (id, rows) => {
    data[id].rows = rows;
    data[id].rowCount = rows.length;
  };
  put("totals", [row(["previous"], [8, 12]), row(["current"], [10, 15])]);
  put("apk", [row(["previous"], [4])]); // Current absent: must NOT reuse previous.
  put("play", [row(["current"], [3])]);
  put("daily", [row(["20240228"], [7]), row(["20240301"], [6])]);
  put("home", [row([], [9])]);
  put("apkHome", [row([], [5, 3])]);
  put("playHome", [row([], [3, 2])]);
  for (let i = 0; i < 6; i++) put(`source${i}`, [row([], [4])]);
  put("campaignSessions", [
    row(["facebook", "social", "launch", "hero"], [5]),
    row(["facebook", "social", "launch", "footer"], [2]),
  ]);
  put("campaignClicks", [
    row(["facebook", "social", "launch", "hero"], [7]),
    row(["tiktok", "social", "older", "video"], [1]),
  ]);
  put("pages", [row(["/"], [20]), row(["/privacy/"], [5])]);
  return data;
}
test("Vietnam timezone, strict dates, equal inclusive previous period, zero baseline", () => {
  assert.equal(analyticsToday(new Date("2024-02-28T18:00:00Z")), "2024-02-29");
  assert.deepEqual(range, {
    start: "2024-02-28",
    end: "2024-03-01",
    days: 3,
    previousStart: "2024-02-25",
    previousEnd: "2024-02-27",
  });
  for (const pair of [
    ["2025-02-29", "2025-03-01"],
    ["2024-03-01", "2024-02-28"],
    ["2023-01-01", "2024-02-01"],
    ["2099-01-01", "2099-01-02"],
    [null, "2024-01-01"],
    ["2024-2-01", "2024-02-03"],
  ])
    assert.throws(() => analyticsRange(...pair));
  assert.equal(percentageChange(10, 0), null);
  assert.equal(percentageChange(0, 0), 0);
  assert.equal(percentageChange(5, 10), -50);
});
test("KPI period names, distinct users vs daily/source sum, full campaign key and parallel actions", () => {
  const result = normalizeAnalytics(
    range,
    fixtures(),
    hosts,
    "2024-03-02T00:00:00Z",
  );
  assert.equal(result.kpis.users.value, 10);
  assert.equal(result.kpis.sessions.value, 15);
  assert.deepEqual(result.kpis.apk, { value: 0, previous: 4, change: -100 });
  assert.equal(result.kpis.play.change, null);
  assert.deepEqual(
    result.daily.map((day) => day.users),
    [7, 0, 6],
  );
  assert.equal(
    result.daily.reduce((sum, day) => sum + day.users, 0),
    13,
  );
  assert.equal(
    result.sources.reduce((sum, source) => sum + source.users, 0),
    24,
  );
  assert.equal(result.sources[0].share, 40);
  assert.equal(result.campaigns[0].clickRate, 140);
  assert.equal(
    result.campaigns.find((c) => c.content === "footer").apkClicks,
    0,
  );
  assert.equal(
    result.campaigns.find((c) => c.source === "tiktok").clickRate,
    null,
  );
  assert.equal(result.actions.visitors, 9);
  assert.equal(result.actions.apkUsers, 3);
  assert.equal(result.actions.apkRate, (3 / 9) * 100);
  assert.equal(result.actions.playRate, (2 / 9) * 100);
  assert.deepEqual(
    result.pages.map((p) => p.path),
    ["/", "/privacy/"],
  );
  assert.equal(result.pages[0].share, 80);
});
test("all queries share dates/hosts; Other excludes only named sources; no guessed paths", () => {
  const specs = analyticsReports(range, hosts);
  for (const spec of specs)
    assert.deepEqual(spec.request.dateRanges[0], {
      startDate: range.start,
      endDate: range.end,
      name: "current",
    });
  const source = specs.find((spec) => spec.id === "source5");
  assert.equal(
    source.request.dimensionFilter.andGroup.expressions[1].notExpression.orGroup
      .expressions.length,
    5,
  );
  assert.equal(
    specs.find((spec) => spec.id === "campaignClicks").request.dimensions.at(-1)
      .name,
    "sessionManualAdContent",
  );
  assert.deepEqual(
    specs.find((spec) => spec.id === "pages").request.dimensions,
    [{ name: "pagePath" }],
  );
  assert.ok(!JSON.stringify(specs).includes("/about"));
});
test("empty proto fields are real zeros; mismatched timezone/truncation/malformed counts fail closed", () => {
  const empty = Object.fromEntries(
    analyticsReports(range, hosts).map((spec) => {
      const data = report(spec);
      delete data.rows;
      delete data.rowCount;
      if (!data.dimensionHeaders.length) delete data.dimensionHeaders;
      return [spec.id, data];
    }),
  );
  const result = normalizeAnalytics(range, empty, hosts, "now");
  assert.equal(result.kpis.users.value, 0);
  assert.equal(result.sources[0].share, null);
  assert.equal(result.actions.apkRate, null);
  for (const [mutate, code] of [
    [
      (data) => {
        data.totals.metadata.timeZone = "America/New_York";
      },
      "timezone",
    ],
    [
      (data) => {
        data.pages.rowCount++;
      },
      "truncated",
    ],
    [
      (data) => {
        data.totals.metadata.dataTruncationReasons = [
          "DATA_TRUNCATION_REASON_UNSPECIFIED",
        ];
      },
      "truncated",
    ],
    [
      (data) => {
        data.totals.rows[0].metricValues[0].value = "NaN";
      },
      "response",
    ],
  ]) {
    const data = fixtures();
    mutate(data);
    assert.throws(
      () => normalizeAnalytics(range, data, hosts, "now"),
      (e) => e.code === code,
    );
  }
  const data = fixtures();
  data.daily.metadata.subjectToThresholding = true;
  data.pages.metadata.dataLossFromOtherRow = true;
  assert.equal(
    normalizeAnalytics(range, data, hosts, "now").warnings.length,
    2,
  );
});

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const credentials = Buffer.from(
  JSON.stringify({
    type: "service_account",
    client_email: "tests@test-project.iam.gserviceaccount.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
  }),
).toString("base64");
function fakeGoogle({ fail = null } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (fail) return new Response("private error body", { status: fail });
    if (url.includes("oauth2")) {
      const jwt = init.body.get("assertion").split(".");
      const claims = JSON.parse(Buffer.from(jwt[1], "base64url"));
      assert.equal(
        claims.scope,
        "https://www.googleapis.com/auth/analytics.readonly",
      );
      assert.equal(claims.aud, "https://oauth2.googleapis.com/token");
      return Response.json({
        access_token: "test-access-token",
        expires_in: 3600,
      });
    }
    const body = JSON.parse(init.body);
    assert.equal(init.redirect, "error");
    if (url.includes("checkCompatibility")) {
      const dimensions = [
        "hostName",
        "eventName",
        "pagePath",
        "sessionSource",
        "sessionMedium",
        "sessionCampaignName",
        "sessionManualAdContent",
        "date",
      ];
      return Response.json({
        dimensionCompatibilities: dimensions.map((apiName) => ({
          dimensionMetadata: { apiName },
          compatibility: "COMPATIBLE",
        })),
        metricCompatibilities: [
          ...body.metrics.map((m) => ({
            metricMetadata: { apiName: m.name },
            compatibility: "COMPATIBLE",
          })),
          {
            metricMetadata: { apiName: "unrelatedMetric" },
            compatibility: "INCOMPATIBLE",
          },
        ],
      });
    }
    assert.ok(body.requests.length <= 5);
    return Response.json({
      reports: body.requests.map((request) => report({ request })),
    });
  };
  return { calls, fetchImpl };
}
test("missing credentials stays disconnected, malformed credentials fail without HTTP", async () => {
  let called = false;
  const load = createAnalyticsService({
    environment: () => ({}),
    fetchImpl: () => {
      called = true;
    },
  });
  assert.equal((await load(range)).status, "not_connected");
  assert.equal(called, false);
  await assert.rejects(
    createAnalyticsService({
      environment: () => ({
        GA4_PROPERTY_ID: "G-INVALID",
        GA4_SERVICE_ACCOUNT_JSON_BASE64: credentials,
      }),
    })(range),
    (e) => e.code === "config",
  );
});
test("server OAuth, batches, cache expiration, compatibility reuse, coalesced same-range requests", async () => {
  const google = fakeGoogle();
  let clock = Date.parse("2024-03-02");
  const load = createAnalyticsService({
    environment: () => ({
      GA4_PROPERTY_ID: "123456",
      GA4_SERVICE_ACCOUNT_JSON_BASE64: credentials,
    }),
    fetchImpl: google.fetchImpl,
    now: () => clock,
  });
  const [first, second] = await Promise.all([load(range), load(range)]);
  assert.deepEqual(first, second);
  assert.equal(first.status, "ready");
  assert.equal(google.calls.filter((c) => c.url.includes("oauth2")).length, 1);
  assert.equal(
    google.calls.filter((c) => c.url.includes("batchRunReports")).length,
    4,
  );
  const before = google.calls.length;
  await load(range);
  assert.equal(google.calls.length, before);
  const checks = google.calls.filter((c) =>
    c.url.includes("checkCompatibility"),
  ).length;
  clock += 21 * 60000;
  await load(range);
  assert.equal(
    google.calls.filter((c) => c.url.includes("checkCompatibility")).length,
    checks,
  );
  assert.equal(
    google.calls.filter((c) => c.url.includes("batchRunReports")).length,
    8,
  );
});
test("ADC service-account file alone authenticates and keeps report/token caches and coalescing", async () => {
  const google = fakeGoogle();
  const filename = path.resolve("tests", "fixture-only-credentials.json");
  let reads = 0;
  let clock = Date.parse("2024-03-02");
  const load = createAnalyticsService({
    environment: () => ({
      GA4_PROPERTY_ID: "558760053",
      GOOGLE_APPLICATION_CREDENTIALS: filename,
    }),
    readCredentialsFile: async (requested) => {
      assert.equal(requested, filename);
      reads++;
      return Buffer.from(credentials, "base64").toString("utf8");
    },
    fetchImpl: google.fetchImpl,
    now: () => clock,
  });
  const [first, second] = await Promise.all([load(range), load(range)]);
  assert.equal(first.status, "ready");
  assert.deepEqual(first, second);
  assert.equal(
    google.calls.filter((call) => call.url.includes("oauth2")).length,
    1,
  );
  assert.equal(
    google.calls.filter((call) => call.url.includes("batchRunReports")).length,
    4,
  );
  const before = google.calls.length;
  await load(range);
  assert.equal(google.calls.length, before);
  assert.ok(reads >= 3); // Re-read runtime config to detect file/key rotation before cache lookup.
  assert.ok(!JSON.stringify(first).includes("private_key"));
  assert.ok(!JSON.stringify(first).includes(filename));
  assert.ok(!JSON.stringify(first).includes("test-access-token"));
  clock += 21 * 60000;
  await load(range);
  assert.equal(
    google.calls.filter((call) => call.url.includes("batchRunReports")).length,
    8,
  );
  assert.equal(
    google.calls.filter((call) => call.url.includes("oauth2")).length,
    1,
  );
});
test("explicit ADC has priority over legacy base64 and never falls back on unreadable/invalid file", async () => {
  const filename = path.resolve("tests", "fixture-only-credentials.json");
  const environment = () => ({
    GA4_PROPERTY_ID: "558760053",
    GOOGLE_APPLICATION_CREDENTIALS: filename,
    GA4_SERVICE_ACCOUNT_JSON_BASE64: "invalid-unused-base64",
  });
  const google = fakeGoogle();
  const load = createAnalyticsService({
    environment,
    readCredentialsFile: async () =>
      Buffer.from(credentials, "base64").toString("utf8"),
    fetchImpl: google.fetchImpl,
  });
  assert.equal((await load(range)).status, "ready");
  for (const [reader, code] of [
    [
      async () => {
        throw new Error("EACCES private file detail");
      },
      "credentials_file",
    ],
    [async () => "{invalid json", "config"],
    [async () => "null", "config"],
    [async () => JSON.stringify({ type: "authorized_user" }), "config"],
    [async () => "x".repeat(20001), "config"],
  ]) {
    let called = false;
    const service = createAnalyticsService({
      environment: () => ({
        ...environment(),
        GA4_SERVICE_ACCOUNT_JSON_BASE64: credentials,
      }),
      readCredentialsFile: reader,
      fetchImpl: async () => {
        called = true;
      },
    });
    await assert.rejects(
      service(range),
      (error) => error.code === code && !error.message.includes("private"),
    );
    assert.equal(called, false);
  }
});
test("ADC requires numeric property and an absolute server-side path before file access", async () => {
  const filename = path.resolve("tests", "fixture-only-credentials.json");
  for (const env of [
    {
      GA4_PROPERTY_ID: "558760053\\",
      GOOGLE_APPLICATION_CREDENTIALS: filename,
    },
    {
      GA4_PROPERTY_ID: "558760053",
      GOOGLE_APPLICATION_CREDENTIALS: "relative-key.json",
    },
  ]) {
    let read = false;
    await assert.rejects(
      createAnalyticsService({
        environment: () => env,
        readCredentialsFile: async () => {
          read = true;
        },
      })(range),
      (error) => error.code === "config",
    );
    assert.equal(read, false);
  }
  let read = false;
  const result = await createAnalyticsService({
    environment: () => ({ GOOGLE_APPLICATION_CREDENTIALS: filename }),
    readCredentialsFile: async () => {
      read = true;
    },
  })(range);
  assert.equal(result.status, "not_connected");
  assert.equal(read, false);
});
test("default ADC file reader rejects malformed non-secret fixture and sanitizes missing-file errors", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "bbook-adc-public-fixture-"),
  );
  const filename = path.join(directory, "not-a-secret.json");
  try {
    await writeFile(filename, "{not valid JSON");
    const load = createAnalyticsService({
      environment: () => ({
        GA4_PROPERTY_ID: "558760053",
        GOOGLE_APPLICATION_CREDENTIALS: filename,
      }),
    });
    await assert.rejects(load(range), (error) => error.code === "config");
    await rm(filename);
    await assert.rejects(
      load(range),
      (error) =>
        error.code === "credentials_file" && !error.message.includes(filename),
    );
  } finally {
    await rm(filename, { force: true });
    await rmdir(directory);
  }
});
test("ADC file/key rotation invalidates old cached reports; invalid rotation fails before cache", async () => {
  const filename = path.resolve("tests", "fixture-only-credentials.json");
  const google = fakeGoogle();
  let contents = Buffer.from(credentials, "base64").toString("utf8");
  const load = createAnalyticsService({
    environment: () => ({
      GA4_PROPERTY_ID: "558760053",
      GOOGLE_APPLICATION_CREDENTIALS: filename,
    }),
    readCredentialsFile: async () => contents,
    fetchImpl: google.fetchImpl,
  });
  await load(range);
  const rotated = JSON.parse(contents);
  rotated.private_key_id = "test-rotation-id";
  contents = JSON.stringify(rotated);
  await load(range);
  assert.equal(
    google.calls.filter((call) => call.url.includes("oauth2")).length,
    2,
  );
  assert.equal(
    google.calls.filter((call) => call.url.includes("batchRunReports")).length,
    8,
  );
  contents = "null";
  await assert.rejects(load(range), (error) => error.code === "config");
});
test("ADC failure is safe in API response and denied Admin requests never read the file", async () => {
  const filename = path.resolve("tests", "fixture-only-credentials.json");
  let reads = 0;
  const load = createAnalyticsService({
    environment: () => ({
      GA4_PROPERTY_ID: "558760053",
      GOOGLE_APPLICATION_CREDENTIALS: filename,
    }),
    readCredentialsFile: async () => {
      reads++;
      throw new Error(`EACCES ${filename}: private detail`);
    },
  });
  const request = new Request(
    "https://admin.example/api/analytics?start=2024-01-01&end=2024-01-02",
  );
  const denied = await handleAnalyticsRequest(request, {
    authorize: async () => null,
    load,
  });
  assert.equal(denied.status, 401);
  assert.equal(reads, 0);
  const error = await handleAnalyticsRequest(request, {
    authorize: async () => ({}),
    load,
  });
  assert.equal(error.status, 502);
  const body = await error.text();
  assert.ok(body.includes("GOOGLE_APPLICATION_CREDENTIALS"));
  assert.ok(!body.includes(filename));
  assert.ok(!body.includes("EACCES"));
  assert.ok(!body.includes("private detail"));
  assert.equal(error.headers.get("Cache-Control"), "private, no-store");
});
test("Google rate limit, denied access and timeout do not turn into fake data", async () => {
  for (const [status, code] of [
    [429, "quota"],
    [403, "credentials"],
    [500, "google"],
  ]) {
    const google = fakeGoogle({ fail: status });
    await assert.rejects(
      createAnalyticsService({
        environment: () => ({
          GA4_PROPERTY_ID: "123456",
          GA4_SERVICE_ACCOUNT_JSON_BASE64: credentials,
        }),
        fetchImpl: google.fetchImpl,
      })(range),
      (e) => e.code === code,
    );
  }
  const load = createAnalyticsService({
    environment: () => ({
      GA4_PROPERTY_ID: "123456",
      GA4_SERVICE_ACCOUNT_JSON_BASE64: credentials,
    }),
    fetchImpl: async () => {
      throw new DOMException("private timeout", "TimeoutError");
    },
  });
  await assert.rejects(load(range), (e) => e.code === "timeout");
});
test("API checks existing backend-verified session before config/date/cache; refuses non-Admin", async () => {
  let called = false;
  const request = new Request(
    "https://admin.example/api/analytics?start=bad&end=bad",
  );
  const load = async () => {
    called = true;
    return {};
  };
  const unauthorized = await handleAnalyticsRequest(request, {
    authorize: async () => null,
    load,
  });
  assert.equal(unauthorized.status, 401);
  assert.equal(called, false);
  const unauthorizedAdmin = await handleAnalyticsRequest(request, {
    authorize: () =>
      readAdminProfile(async () =>
        Response.json({
          userId: "customer",
          fullName: "Customer",
          email: "test@example.invalid",
          role: "Customer",
        }),
      ),
    load,
  });
  assert.equal(unauthorizedAdmin.status, 403);
  assert.equal(called, false);
  const unavailable = await handleAnalyticsRequest(request, {
    authorize: async () => {
      throw new Error("private backend details");
    },
    load,
  });
  assert.equal(unavailable.status, 503);
  assert.ok(!(await unavailable.text()).includes("private"));
  const invalidDate = await handleAnalyticsRequest(request, {
    authorize: async () => ({}),
    load,
  });
  assert.equal(invalidDate.status, 400);
  assert.equal(called, false);
  const duplicateDate = await handleAnalyticsRequest(
    new Request(
      "https://admin.example/api/analytics?start=2024-01-01&start=2024-01-02&end=2024-01-03",
    ),
    { authorize: async () => ({}), load },
  );
  assert.equal(duplicateDate.status, 400);
});
test("API sanitized errors, no-store responses and rate-limit retry headers", async () => {
  const request = new Request(
    "https://admin.example/api/analytics?start=2024-01-01&end=2024-01-02",
  );
  for (const [code, status] of [
    ["quota", 429],
    ["timeout", 504],
    ["credentials", 502],
  ]) {
    const response = await handleAnalyticsRequest(request, {
      authorize: async () => ({}),
      load: async () => {
        throw new AnalyticsError(code);
      },
    });
    assert.equal(response.status, status);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    if (status === 429) assert.equal(response.headers.get("Retry-After"), "60");
    assert.ok(!(await response.text()).includes(credentials));
  }
  const forbidden = await handleAnalyticsRequest(request, {
    authorize: async () => {
      throw new AuthorizationError();
    },
    load: async () => ({}),
  });
  assert.equal(forbidden.status, 403);
});
