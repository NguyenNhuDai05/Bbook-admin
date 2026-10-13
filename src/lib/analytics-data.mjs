// Imported only by analytics-server.ts, which marks the server boundary.
import { createHash, createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import {
  ANALYTICS_TIMEZONE,
  percentageChange,
  ratio,
  shiftDate,
  analyticsToday,
  sourceCategory,
} from "./analytics-contracts.mjs";

export class AnalyticsError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
const exact = (fieldName, value) => ({
  filter: { fieldName, stringFilter: { matchType: "EXACT", value } },
});
const all = (...expressions) => ({ andGroup: { expressions } });
const sourcePatterns = [
  "\\(direct\\)",
  "(facebook|fb|facebook\\.com|[a-z0-9.-]+\\.facebook\\.com)",
  "(threads|threads\\.(net|com)|[a-z0-9.-]+\\.threads\\.(net|com))",
  "(tiktok|tiktok\\.com|[a-z0-9.-]+\\.tiktok\\.com)",
  "(google|google\\.[a-z.]+|[a-z0-9.-]+\\.google\\.[a-z.]+)",
];
export function analyticsReports(range, hosts) {
  const host = {
    filter: { fieldName: "hostName", inListFilter: { values: hosts } },
  };
  const homepage = all(host, exact("pagePath", "/"));
  const dates = [
    { startDate: range.start, endDate: range.end, name: "current" },
    {
      startDate: range.previousStart,
      endDate: range.previousEnd,
      name: "previous",
    },
  ];
  const reports = [];
  function add(id, dimensions, metrics, filter = host, compare = false) {
    reports.push({
      id,
      request: {
        dateRanges: compare ? dates : [dates[0]],
        dimensions: dimensions.map((name) => ({ name })),
        metrics: metrics.map((name) => ({ name })),
        dimensionFilter: filter,
        keepEmptyRows: true,
        limit: "100000",
      },
    });
  }
  add(
    "totals",
    [],
    [
      "totalUsers",
      "sessions",
      "newUsers",
      "screenPageViews",
      "engagementRate",
      "userEngagementDuration",
      "activeUsers",
    ],
    host,
    true,
  );
  for (const [id, event] of [
    ["apk", "apk_download_click"],
    ["play", "play_store_click"],
  ]) {
    add(id, [], ["eventCount"], all(host, exact("eventName", event)), true);
    add(
      `${id}Home`,
      [],
      ["eventCount", "totalUsers"],
      all(homepage, exact("eventName", event)),
    );
  }
  add("home", [], ["totalUsers"], homepage);
  add("daily", ["date"], ["totalUsers", "sessions"]);
  add(
    "dailyApk",
    ["date"],
    ["eventCount"],
    all(host, exact("eventName", "apk_download_click")),
  );
  const sources = sourcePatterns.map((value) => ({
    filter: {
      fieldName: "sessionSource",
      stringFilter: { matchType: "FULL_REGEXP", value, caseSensitive: false },
    },
  }));
  for (let i = 0; i < sources.length; i++)
    add(`source${i}`, [], ["totalUsers"], all(host, sources[i]));
  add(
    "source5",
    [],
    ["totalUsers"],
    all(host, {
      notExpression: {
        orGroup: {
          expressions: [
            ...sources,
            exact("sessionSource", "(data not available)"),
            exact("sessionSource", "(not set)"),
          ],
        },
      },
    }),
  );
  add(
    "source6",
    [],
    ["totalUsers"],
    all(host, exact("sessionSource", "(data not available)")),
  );
  add(
    "source7",
    [],
    ["totalUsers"],
    all(host, exact("sessionSource", "(not set)")),
  );
  const campaign = [
    "sessionSource",
    "sessionMedium",
    "sessionCampaignName",
    "sessionManualAdContent",
  ];
  add("campaignSessions", campaign, ["sessions"]);
  add(
    "campaignClicks",
    campaign,
    ["eventCount"],
    all(host, exact("eventName", "apk_download_click")),
  );
  add("pages", ["pagePath"], ["screenPageViews"]);
  add("trafficSessions", ["sessionSource", "sessionMedium"], ["sessions"]);
  add("trafficUsers", ["sessionSource", "sessionMedium"], ["totalUsers"]);
  add(
    "trafficClicks",
    ["sessionSource", "sessionMedium"],
    ["eventCount"],
    all(host, exact("eventName", "apk_download_click")),
  );
  return reports;
}
function metric(row, report, name) {
  const index = report.metricHeaders.findIndex(
    (header) => header.name === name,
  );
  if (index < 0) throw new AnalyticsError("response");
  if (report.metadata?.emptyReason?.trim()) return null;
  if (!row) return 0;
  const raw = row.metricValues?.[index]?.value;
  const value = Number(raw);
  if (
    typeof raw !== "string" ||
    !/^\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?$/.test(raw) ||
    !Number.isFinite(value) ||
    value < 0 ||
    (!["engagementRate", "userEngagementDuration"].includes(name) &&
      !Number.isSafeInteger(value)) ||
    (name === "engagementRate" && value > 1)
  )
    throw new AnalyticsError("response");
  return value;
}
function dimension(row, report, name) {
  const index = report.dimensionHeaders.findIndex(
    (header) => header.name === name,
  );
  const value = row.dimensionValues?.[index]?.value;
  if (index < 0 || typeof value !== "string")
    throw new AnalyticsError("response");
  return value;
}
function periodMetric(report, name, period) {
  const rows = report.rows || [];
  const row = period
    ? rows.find((item) => dimension(item, report, "dateRange") === period)
    : rows[0];
  return metric(row, report, name);
}
export function normalizeAnalytics(range, reports, hosts, fetchedAt) {
  const availability = {};
  const warnings = [];
  for (const [id, report] of Object.entries(reports)) {
    report.dimensionHeaders ||= [];
    const count = report.rowCount ?? 0;
    if (
      !Array.isArray(report.metricHeaders) ||
      !Array.isArray(report.dimensionHeaders) ||
      !Number.isInteger(count) ||
      count < (report.rows?.length || 0)
    )
      throw new AnalyticsError("response");
    if (
      count > (report.rows?.length || 0) ||
      report.metadata?.dataTruncationReasons?.length
    )
      throw new AnalyticsError("truncated");
    if (
      ![ANALYTICS_TIMEZONE, "Asia/Saigon"].includes(report.metadata?.timeZone)
    )
      throw new AnalyticsError("timezone");
    const reason =
      typeof report.metadata?.emptyReason === "string"
        ? report.metadata.emptyReason.trim().slice(0, 500)
        : null;
    availability[id] = {
      state: reason ? "unavailable" : count ? "available" : "empty",
      reason: reason || null,
    };
    if (reason)
      warnings.push(
        "GA4 chưa cung cấp dữ liệu cho báo cáo " + id + ". Lý do: " + reason,
      );
    for (const row of report.rows || []) {
      if (
        (row.dimensionValues?.length || 0) !== report.dimensionHeaders.length ||
        row.metricValues?.length !== report.metricHeaders.length
      )
        throw new AnalyticsError("response");
      for (const header of report.metricHeaders)
        metric(row, report, header.name);
    }
  }
  const values = (current, previous) => ({
    value: current,
    previous,
    change: percentageChange(current, previous),
  });
  const kpi = (report, name, multiplier = 1) => {
    const current = periodMetric(report, name, "current"),
      previous = periodMetric(report, name, "previous");
    return values(
      current === null ? null : current * multiplier,
      previous === null ? null : previous * multiplier,
    );
  };
  const average = (period) => {
    const duration = periodMetric(
        reports.totals,
        "userEngagementDuration",
        period,
      ),
      active = periodMetric(reports.totals, "activeUsers", period);
    return duration !== null && active ? duration / active : null;
  };
  const kpis = {
    users: kpi(reports.totals, "totalUsers"),
    sessions: kpi(reports.totals, "sessions"),
    apk: kpi(reports.apk, "eventCount"),
    play: kpi(reports.play, "eventCount"),
    newUsers: kpi(reports.totals, "newUsers"),
    views: kpi(reports.totals, "screenPageViews"),
    engagementRate: kpi(reports.totals, "engagementRate", 100),
    averageEngagementTime: values(average("current"), average("previous")),
  };
  const dailyValues = new Map(
    (reports.daily.rows || []).map((row) => [
      dimension(row, reports.daily, "date"),
      {
        users: metric(row, reports.daily, "totalUsers"),
        sessions: metric(row, reports.daily, "sessions"),
      },
    ]),
  );
  const apkValues = new Map(
    (reports.dailyApk.rows || []).map((row) => [
      dimension(row, reports.dailyApk, "date"),
      metric(row, reports.dailyApk, "eventCount"),
    ]),
  );
  const daily = Array.from({ length: range.days }, (_, i) => {
    const date = shiftDate(range.start, i),
      key = date.replaceAll("-", "");
    return {
      date,
      users:
        availability.daily.state === "unavailable"
          ? null
          : (dailyValues.get(key)?.users ?? 0),
      sessions:
        availability.daily.state === "unavailable"
          ? null
          : (dailyValues.get(key)?.sessions ?? 0),
      apkClicks:
        availability.dailyApk.state === "unavailable"
          ? null
          : (apkValues.get(key) ?? 0),
    };
  });
  const sources = [
    "Direct",
    "Facebook",
    "Threads",
    "TikTok",
    "Google",
    "Other",
    "(data not available)",
    "(not set)",
  ].map((name, i) => {
    const users = periodMetric(reports["source" + i], "totalUsers");
    return { name, users, share: ratio(users, kpis.users.value) };
  });
  function joinCounts(specs, dimensions) {
    const rows = new Map();
    for (const [report, metricName, field] of specs)
      for (const row of report.rows || []) {
        const tuple = dimensions.map((name) => dimension(row, report, name));
        const key = JSON.stringify(tuple);
        const item = rows.get(key) || {
          source: tuple[0],
          medium: tuple[1],
          ...(tuple.length > 2
            ? { campaign: tuple[2], content: tuple[3] }
            : {}),
          ...Object.fromEntries(
            specs.map(([r, , f]) => [
              f,
              r.metadata?.emptyReason?.trim() ? null : 0,
            ]),
          ),
        };
        item[field] = metric(row, report, metricName);
        rows.set(key, item);
      }
    return [...rows.values()];
  }
  const campaigns = joinCounts(
    [
      [reports.campaignSessions, "sessions", "sessions"],
      [reports.campaignClicks, "eventCount", "apkClicks"],
    ],
    [
      "sessionSource",
      "sessionMedium",
      "sessionCampaignName",
      "sessionManualAdContent",
    ],
  )
    .map((item) => ({
      ...item,
      clickRate: ratio(item.apkClicks, item.sessions),
      clicksPerSession:
        item.apkClicks !== null && item.sessions
          ? item.apkClicks / item.sessions
          : null,
    }))
    .sort(
      (a, b) =>
        (b.sessions ?? 0) - (a.sessions ?? 0) ||
        (b.apkClicks ?? 0) - (a.apkClicks ?? 0),
    );
  const traffic = joinCounts(
    [
      [reports.trafficSessions, "sessions", "sessions"],
      [reports.trafficUsers, "totalUsers", "users"],
      [reports.trafficClicks, "eventCount", "apkClicks"],
    ],
    ["sessionSource", "sessionMedium"],
  )
    .map((item) => ({
      ...item,
      category: sourceCategory(item.source, item.medium),
      clicksPerSession:
        item.apkClicks !== null && item.sessions
          ? item.apkClicks / item.sessions
          : null,
    }))
    .sort(
      (a, b) =>
        (b.sessions ?? 0) - (a.sessions ?? 0) ||
        (b.apkClicks ?? 0) - (a.apkClicks ?? 0),
    );
  const pageRows = (reports.pages.rows || []).map((row) => ({
    path: dimension(row, reports.pages, "pagePath"),
    views: metric(row, reports.pages, "screenPageViews"),
  }));
  const totalViews = pageRows.reduce((sum, page) => sum + (page.views ?? 0), 0);
  const pages = pageRows
    .map((page) => ({ ...page, share: ratio(page.views, totalViews) }))
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  const visitors = periodMetric(reports.home, "totalUsers"),
    apkUsers = periodMetric(reports.apkHome, "totalUsers"),
    playUsers = periodMetric(reports.playHome, "totalUsers");
  const metadata = Object.values(reports).map((report) => report.metadata);
  if (metadata.some((meta) => meta.subjectToThresholding))
    warnings.push(
      "GA4 có áp dụng ngưỡng bảo vệ dữ liệu; số liệu chi tiết có thể bị giới hạn.",
    );
  if (metadata.some((meta) => meta.dataLossFromOtherRow))
    warnings.push("GA4 đã gộp một số giá trị vào (other).");
  if (metadata.some((meta) => meta.samplingMetadatas?.length))
    warnings.push("GA4 trả dữ liệu có lấy mẫu.");
  if (traffic.some((row) => row.category === "(data not available)"))
    warnings.push(
      "Một số nguồn chưa có attribution: (data not available). Không được coi là Direct.",
    );
  const provisional =
    range.end ===
    analyticsToday(
      Number.isFinite(Date.parse(fetchedAt)) ? new Date(fetchedAt) : new Date(),
    );
  return {
    status: "ready",
    range,
    timezone: ANALYTICS_TIMEZONE,
    hosts,
    fetchedAt,
    kpis,
    daily,
    sources,
    traffic,
    campaigns,
    pages,
    warnings,
    availability,
    provisional,
    empty: availability.totals.state === "empty",
    actions: {
      visitors,
      apkUsers,
      playUsers,
      apkClicks: periodMetric(reports.apkHome, "eventCount"),
      playClicks: periodMetric(reports.playHome, "eventCount"),
      apkRate: ratio(apkUsers, visitors),
      playRate: ratio(playUsers, visitors),
    },
  };
}

export function createAnalyticsService({
  environment = () => process.env,
  fetchImpl = (...args) => fetch(...args),
  readCredentialsFile = (path) => readFile(path, "utf8"),
  now = () => Date.now(),
} = {}) {
  const cache = new Map(),
    pending = new Map(),
    compatibilityCache = new Map();
  let oauth, oauthPending;
  function remember(map, key, value, size = 48) {
    if (map.size >= size) map.delete(map.keys().next().value);
    map.set(key, value);
  }
  async function readJson(response) {
    if (!response.ok) {
      if (response.status === 429) throw new AnalyticsError("quota");
      if ([401, 403].includes(response.status))
        throw new AnalyticsError("credentials");
      throw new AnalyticsError("google");
    }
    try {
      return await response.json();
    } catch {
      throw new AnalyticsError("response");
    }
  }
  async function config() {
    const env = environment();
    if (
      !env.GA4_PROPERTY_ID ||
      (!env.GOOGLE_APPLICATION_CREDENTIALS &&
        !env.GA4_SERVICE_ACCOUNT_JSON_BASE64)
    )
      return null;
    const property = env.GA4_PROPERTY_ID;
    const hosts = (env.GA4_HOSTNAMES || "bbookmakeup.com,www.bbookmakeup.com")
      .split(",")
      .map((value) => value.trim().toLowerCase());
    if (
      !/^\d{1,20}$/.test(property) ||
      !hosts.length ||
      hosts.length > 10 ||
      hosts.some(
        (host) => !/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(host),
      )
    )
      throw new AnalyticsError("config");
    let credentialJson;
    // ADC service-account file takes precedence. A bad explicit file must never
    // silently fall back to a different account from the legacy base64 variable.
    if (env.GOOGLE_APPLICATION_CREDENTIALS) {
      if (!isAbsolute(env.GOOGLE_APPLICATION_CREDENTIALS))
        throw new AnalyticsError("config");
      try {
        credentialJson = await readCredentialsFile(
          env.GOOGLE_APPLICATION_CREDENTIALS,
        );
      } catch {
        throw new AnalyticsError("credentials_file");
      }
    } else {
      const encoded = env.GA4_SERVICE_ACCOUNT_JSON_BASE64;
      if (encoded.length > 20000 || !/^[A-Za-z0-9+/=\s]+$/.test(encoded))
        throw new AnalyticsError("config");
      credentialJson = Buffer.from(encoded, "base64").toString("utf8");
    }
    if (typeof credentialJson !== "string" || credentialJson.length > 20000)
      throw new AnalyticsError("config");
    let account;
    try {
      account = JSON.parse(credentialJson);
    } catch {
      throw new AnalyticsError("config");
    }
    if (
      !account ||
      account.type !== "service_account" ||
      typeof account.private_key !== "string" ||
      typeof account.client_email !== "string" ||
      !account.client_email.endsWith(".iam.gserviceaccount.com")
    )
      throw new AnalyticsError("config");
    return {
      property,
      hosts: [...new Set(hosts)],
      account,
      identity: createHash("sha256")
        .update(`${property}:${hosts.join(",")}:${credentialJson}`)
        .digest("hex"),
    };
  }
  async function token(settings, signal) {
    if (oauth?.identity === settings.identity && oauth.expires > now())
      return oauth.token;
    if (oauthPending?.identity === settings.identity)
      return oauthPending.promise;
    const identity = settings.identity;
    const promise = (async () => {
      const issued = Math.floor(now() / 1000);
      const encode = (value) =>
        Buffer.from(JSON.stringify(value)).toString("base64url");
      const payload = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: settings.account.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: "https://oauth2.googleapis.com/token", iat: issued, exp: issued + 3600 })}`;
      let signature;
      try {
        signature = createSign("RSA-SHA256")
          .update(payload)
          .sign(settings.account.private_key, "base64url");
      } catch {
        throw new AnalyticsError("config");
      }
      const response = await fetchImpl("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: `${payload}.${signature}`,
        }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      });
      if (response.status === 400) throw new AnalyticsError("credentials");
      const result = await readJson(response);
      if (
        typeof result.access_token !== "string" ||
        !result.access_token ||
        !Number.isFinite(Number(result.expires_in))
      )
        throw new AnalyticsError("credentials");
      oauth = {
        identity,
        token: result.access_token,
        expires: now() + Math.max(0, Number(result.expires_in) - 60) * 1000,
      };
      return oauth.token;
    })();
    oauthPending = { identity, promise };
    try {
      return await promise;
    } finally {
      if (oauthPending?.promise === promise) oauthPending = undefined;
    }
  }
  return async function load(range) {
    const settings = await config();
    if (!settings)
      return {
        status: "not_connected",
        message:
          "Chưa kết nối Google Analytics. Cần GA4_PROPERTY_ID và GOOGLE_APPLICATION_CREDENTIALS (file service account) hoặc GA4_SERVICE_ACCOUNT_JSON_BASE64 trên máy chủ Admin.",
      };
    const key = `${settings.identity}:${range.start}:${range.end}`;
    const hit = cache.get(key);
    if (hit && hit.expires > now()) return hit.value;
    if (pending.has(key)) return pending.get(key);
    if (pending.size >= 8) throw new AnalyticsError("busy");
    const promise = run(settings, range);
    pending.set(key, promise);
    try {
      return await promise;
    } finally {
      pending.delete(key);
    }
  };
  async function run(settings, range) {
    const signal = AbortSignal.timeout(55000);
    try {
      const bearer = await token(settings, signal);
      const base = `https://analyticsdata.googleapis.com/v1beta/properties/${settings.property}`;
      async function request(method, body) {
        const response = await fetchImpl(`${base}:${method}`, {
          method: "POST",
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bearer}`,
          },
          redirect: "error",
          cache: "no-store",
          signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        });
        if (method === "checkCompatibility" && response.status === 400)
          throw new AnalyticsError("compatibility");
        return readJson(response);
      }
      const specs = analyticsReports(range, settings.hosts);
      const unavailable = new Set();
      // Check each distinct combination once per configuration, including filter fields.
      const checks = new Map();
      for (const { request: report } of specs) {
        const body = {
          dimensions: report.dimensions,
          metrics: report.metrics,
          dimensionFilter: report.dimensionFilter,
        };
        const key = `${settings.identity}:${JSON.stringify(body)}`;
        if ((compatibilityCache.get(key) || 0) <= now()) checks.set(key, body);
      }
      const checkEntries = [...checks.entries()];
      for (let i = 0; i < checkEntries.length; i += 4) {
        await Promise.all(
          checkEntries.slice(i, i + 4).map(async ([key, body]) => {
            const optional =
              body.metrics.length === 1 &&
              body.metrics[0].name === "totalUsers" &&
              body.dimensions.map((item) => item.name).join(",") ===
                "sessionSource,sessionMedium";
            let checked;
            try {
              checked = await request("checkCompatibility", body);
            } catch (error) {
              if (
                optional &&
                error instanceof AnalyticsError &&
                error.code === "compatibility"
              ) {
                unavailable.add("trafficUsers");
                return;
              }
              throw error;
            }
            const metrics = new Map(
              (checked.metricCompatibilities || []).map((item) => [
                item.metricMetadata?.apiName,
                item.compatibility,
              ]),
            );
            const dimensions = new Map(
              (checked.dimensionCompatibilities || []).map((item) => [
                item.dimensionMetadata?.apiName,
                item.compatibility,
              ]),
            );
            function filterFields(expression) {
              if (expression.filter) return [expression.filter.fieldName];
              if (expression.notExpression)
                return filterFields(expression.notExpression);
              return (
                expression.andGroup?.expressions ||
                expression.orGroup?.expressions ||
                []
              ).flatMap(filterFields);
            }
            const requiredDimensions = [
              ...body.dimensions.map((item) => item.name),
              ...filterFields(body.dimensionFilter),
            ];
            if (
              body.metrics.some(
                (item) => metrics.get(item.name) !== "COMPATIBLE",
              ) ||
              requiredDimensions.some(
                (name) => dimensions.get(name) !== "COMPATIBLE",
              )
            ) {
              if (optional) {
                unavailable.add("trafficUsers");
                return;
              }
              throw new AnalyticsError("compatibility");
            }
            remember(compatibilityCache, key, now() + 24 * 60 * 60000, 256);
          }),
        );
      }
      const reports = {};
      if (unavailable.has("trafficUsers"))
        reports.trafficUsers = {
          dimensionHeaders: [
            { name: "sessionSource" },
            { name: "sessionMedium" },
          ],
          metricHeaders: [{ name: "totalUsers" }],
          rowCount: 0,
          metadata: {
            timeZone: ANALYTICS_TIMEZONE,
            emptyReason:
              "Total Users không tương thích với source/medium của property này.",
          },
        };
      // GA4 allows at most five reports per batch. Two batches at a time bounds load.
      const batches = [];
      const supported = specs.filter((spec) => !unavailable.has(spec.id));
      for (let i = 0; i < supported.length; i += 5)
        batches.push(supported.slice(i, i + 5));
      for (let i = 0; i < batches.length; i += 2) {
        await Promise.all(
          batches.slice(i, i + 2).map(async (batch) => {
            const result = await request("batchRunReports", {
              requests: batch.map((spec) => spec.request),
            });
            if (
              !Array.isArray(result.reports) ||
              result.reports.length !== batch.length
            )
              throw new AnalyticsError("response");
            batch.forEach((spec, index) => {
              reports[spec.id] = result.reports[index];
            });
          }),
        );
      }
      const value = normalizeAnalytics(
        range,
        reports,
        settings.hosts,
        new Date(now()).toISOString(),
      );
      remember(cache, `${settings.identity}:${range.start}:${range.end}`, {
        value,
        expires: now() + 20 * 60000,
      });
      return value;
    } catch (error) {
      if (error instanceof AnalyticsError) {
        if (error.code === "credentials") oauth = undefined;
        throw error;
      }
      throw new AnalyticsError(
        signal.aborted ||
          error?.name === "TimeoutError" ||
          error?.name === "AbortError"
          ? "timeout"
          : "google",
      );
    }
  }
}
