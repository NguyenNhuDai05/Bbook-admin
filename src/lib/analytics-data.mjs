// Imported only by analytics-server.ts, which marks the server boundary.
import { createHash, createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import {
  ANALYTICS_TIMEZONE,
  percentageChange,
  ratio,
  shiftDate,
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
  add("totals", [], ["totalUsers", "sessions"], host, true);
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
  add("daily", ["date"], ["totalUsers"]);
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
    all(host, { notExpression: { orGroup: { expressions: sources } } }),
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
  return reports;
}
function metric(row, report, name) {
  const index = report.metricHeaders.findIndex(
    (header) => header.name === name,
  );
  if (index < 0) throw new AnalyticsError("response");
  if (!row) return 0;
  const raw = row.metricValues?.[index]?.value;
  const value = Number(raw);
  if (
    typeof raw !== "string" ||
    !/^\d+$/.test(raw) ||
    !Number.isSafeInteger(value)
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
  for (const report of Object.values(reports)) {
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
  const kpi = (report, name) => {
    const value = periodMetric(report, name, "current"),
      previous = periodMetric(report, name, "previous");
    return { value, previous, change: percentageChange(value, previous) };
  };
  const kpis = {
    users: kpi(reports.totals, "totalUsers"),
    sessions: kpi(reports.totals, "sessions"),
    apk: kpi(reports.apk, "eventCount"),
    play: kpi(reports.play, "eventCount"),
  };
  const dayValues = new Map(
    (reports.daily.rows || []).map((row) => [
      dimension(row, reports.daily, "date"),
      metric(row, reports.daily, "totalUsers"),
    ]),
  );
  const daily = Array.from({ length: range.days }, (_, i) => {
    const date = shiftDate(range.start, i);
    return { date, users: dayValues.get(date.replaceAll("-", "")) || 0 };
  });
  const sources = [
    "Direct",
    "Facebook",
    "Threads",
    "TikTok",
    "Google",
    "Other sources",
  ].map((name, i) => {
    const users = periodMetric(reports[`source${i}`], "totalUsers");
    return { name, users, share: ratio(users, kpis.users.value) };
  });
  // Join counts by the complete session attribution tuple. Never sum unique users.
  const campaignMap = new Map();
  for (const [report, metricName, field] of [
    [reports.campaignSessions, "sessions", "sessions"],
    [reports.campaignClicks, "eventCount", "apkClicks"],
  ]) {
    for (const row of report.rows || []) {
      const values = [
        "sessionSource",
        "sessionMedium",
        "sessionCampaignName",
        "sessionManualAdContent",
      ].map((name) => dimension(row, report, name));
      const key = JSON.stringify(values);
      const item = campaignMap.get(key) || {
        source: values[0],
        medium: values[1],
        campaign: values[2],
        content: values[3],
        sessions: 0,
        apkClicks: 0,
      };
      item[field] = metric(row, report, metricName);
      campaignMap.set(key, item);
    }
  }
  const campaigns = [...campaignMap.values()]
    .map((item) => ({
      ...item,
      clickRate: ratio(item.apkClicks, item.sessions),
    }))
    .sort((a, b) => b.sessions - a.sessions || b.apkClicks - a.apkClicks);
  const pageRows = (reports.pages.rows || []).map((row) => ({
    path: dimension(row, reports.pages, "pagePath"),
    views: metric(row, reports.pages, "screenPageViews"),
  }));
  const totalViews = pageRows.reduce((sum, page) => sum + page.views, 0);
  const pages = pageRows
    .map((page) => ({ ...page, share: ratio(page.views, totalViews) }))
    .sort((a, b) => b.views - a.views);
  const visitors = periodMetric(reports.home, "totalUsers");
  const apkUsers = periodMetric(reports.apkHome, "totalUsers"),
    playUsers = periodMetric(reports.playHome, "totalUsers");
  const warnings = [];
  const metadata = Object.values(reports).map((report) => report.metadata);
  if (metadata.some((meta) => meta.subjectToThresholding))
    warnings.push(
      "GA4 có áp dụng ngưỡng bảo vệ dữ liệu; một số dữ liệu có thể không được hiển thị.",
    );
  if (metadata.some((meta) => meta.dataLossFromOtherRow))
    warnings.push(
      "GA4 đã gộp một số giá trị vào (other); chi tiết nguồn hoặc chiến dịch có thể bị giới hạn.",
    );
  if (metadata.some((meta) => meta.samplingMetadatas?.length))
    warnings.push("GA4 trả dữ liệu có lấy mẫu cho khoảng thời gian này.");
  return {
    status: "ready",
    range,
    timezone: ANALYTICS_TIMEZONE,
    hosts,
    fetchedAt,
    kpis,
    daily,
    sources,
    campaigns,
    pages,
    warnings,
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
            const checked = await request("checkCompatibility", body);
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
            )
              throw new AnalyticsError("compatibility");
            remember(compatibilityCache, key, now() + 24 * 60 * 60000, 256);
          }),
        );
      }
      const reports = {};
      // GA4 allows at most five reports per batch. Two batches at a time bounds load.
      const batches = [];
      for (let i = 0; i < specs.length; i += 5)
        batches.push(specs.slice(i, i + 5));
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
