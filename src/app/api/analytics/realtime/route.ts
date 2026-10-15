import { currentAdmin } from "@/lib/server";
import { loadRealtimeAnalytics } from "@/lib/analytics-server";
import { handleAnalyticsRequest } from "@/lib/analytics-handler.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return handleAnalyticsRequest(request, {
    authorize: currentAdmin,
    load: loadRealtimeAnalytics,
    realtime: true,
  });
}
