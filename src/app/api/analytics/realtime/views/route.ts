import { currentAdmin } from "@/lib/server";
import { loadRealtimeViews } from "@/lib/analytics-server";
import { handleAnalyticsRequest } from "@/lib/analytics-handler.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return handleAnalyticsRequest(request, {
    authorize: currentAdmin,
    load: loadRealtimeViews,
    realtime: true,
  });
}
