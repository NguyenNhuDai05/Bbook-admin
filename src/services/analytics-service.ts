import { readWebsiteAnalytics } from "@/repositories/analytics-api";
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
