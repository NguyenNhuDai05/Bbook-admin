import { AnalyticsError } from "./analytics-data.mjs";
import { shiftDate } from "./analytics-contracts.mjs";

export function validateApkDaily(range, data) {
  const integer = (value) => Number.isSafeInteger(value) && value >= 0;
  if (
    data?.status !== "ready" ||
    data.source !== "first_party" ||
    data.timezone !== "Asia/Ho_Chi_Minh" ||
    !Array.isArray(data.daily) ||
    data.daily.length !== range.days ||
    (data.trackingStartedAt !== null &&
      !Number.isFinite(Date.parse(data.trackingStartedAt))) ||
    !Number.isFinite(Date.parse(data.fetchedAt))
  )
    throw new AnalyticsError("counter");
  let total = 0,
    known = false;
  data.daily.forEach((row, i) => {
    if (
      row.date !== shiftDate(range.start, i) ||
      (row.clicks !== null && !integer(row.clicks))
    )
      throw new AnalyticsError("counter");
    if (row.clicks !== null) {
      known = true;
      total += row.clicks;
    }
  });
  if (
    (known ? total : null) !== data.total ||
    (data.trackingStartedAt === null && known)
  )
    throw new AnalyticsError("counter");
  return data;
}

export function createApkDailyReader({
  fetchImpl = (...args) => fetch(...args),
  now = () => Date.now(),
} = {}) {
  const cache = new Map(),
    pending = new Map();
  return async (range, token, baseUrl) => {
    const key = `${baseUrl}:${range.start}:${range.end}`;
    const cached = cache.get(key);
    if (cached?.expires > now()) return cached.data;
    if (pending.has(key)) return pending.get(key);
    if (pending.size >= 8) throw new AnalyticsError("busy");
    const promise = (async () => {
      let response;
      try {
        response = await fetchImpl(
          `${baseUrl}/WebsiteMetrics/apk-daily?${new URLSearchParams({ start: range.start, end: range.end })}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.timeout(20000),
          },
        );
        if (!response.ok) throw new AnalyticsError("counter");
        const data = validateApkDaily(range, await response.json());
        if (cache.size >= 24) cache.delete(cache.keys().next().value);
        cache.set(key, { data, expires: now() + 10000 });
        return data;
      } catch {
        throw new AnalyticsError("counter");
      }
    })();
    pending.set(key, promise);
    try {
      return await promise;
    } finally {
      pending.delete(key);
    }
  };
}
