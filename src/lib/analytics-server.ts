import "server-only";
import { createAnalyticsService } from "./analytics-data.mjs";
import type { AnalyticsRange, AnalyticsResponse } from "./analytics-types";
const load = createAnalyticsService();
export async function loadWebsiteAnalytics(
  range: AnalyticsRange,
): Promise<AnalyticsResponse> {
  return (await load(range)) as AnalyticsResponse;
}
