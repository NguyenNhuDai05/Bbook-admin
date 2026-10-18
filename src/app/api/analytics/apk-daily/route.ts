import { currentAdmin, backendUrl } from "@/lib/server";
import { createApkDailyReader } from "@/lib/apk-counter.mjs";
import { handleAnalyticsRequest } from "@/lib/analytics-handler.mjs";
import type { AnalyticsRange } from "@/lib/analytics-types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const load = createApkDailyReader();
export async function GET(request: Request) {
  let session: Awaited<ReturnType<typeof currentAdmin>>;
  return handleAnalyticsRequest(request, {
    authorize: async () => {
      session = await currentAdmin();
      return session;
    },
    load: (range: AnalyticsRange) => load(range, session!.token, backendUrl()),
  });
}
