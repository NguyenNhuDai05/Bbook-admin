import { readWebsiteAnalytics } from "@/repositories/analytics-api";
import { readApkDaily } from "@/repositories/analytics-api";
import type { ApkDailyReady } from "@/lib/analytics-types";
export function websiteApkQuery(
  start: string,
  end: string,
): ResourceQuery<ApkDailyReady> {
  return {
    key: `admin:apk-daily:${start}:${end}`,
    load: (signal) => readApkDaily(start, end, signal),
  };
}
import type { ResourceQuery } from "@/lib/client";
import type { AnalyticsResponse } from "@/lib/analytics-types";
export function websiteAnalyticsQuery(
  start: string,
  end: string,
): ResourceQuery<AnalyticsResponse> {
  return {
    key: `admin:website-analytics:${start}:${end}`,
    load: (signal) => readWebsiteAnalytics(start, end, signal),
  };
}
