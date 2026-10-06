import { request, type ResourceQuery } from "@/lib/client";
import { validateWorkSummary } from "@/lib/work-contracts.mjs";
export interface WorkSummary {
  updatedAt: string;
  counts: Record<string, number>;
  total: number;
  processingPayouts: number;
  processingRefunds: number;
}
export const workService = {
  summary: (): ResourceQuery<WorkSummary> => ({
    key: "admin:work-summary",
    load: async (signal) =>
      validateWorkSummary(
        await request<WorkSummary>(
          "admin/work-summary",
          "GET",
          undefined,
          signal,
        ),
      ),
  }),
};
