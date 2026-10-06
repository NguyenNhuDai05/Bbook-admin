import { request, invalidateResources, type ResourceQuery } from "@/lib/client";
import { assertPaged } from "@/lib/contracts.mjs";
import type { Paged } from "@/lib/types";
export interface FeedbackRow {
  id: string;
  category: string;
  body: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  userName: string;
  role: string;
}
export interface FeedbackDetail extends FeedbackRow {
  events: {
    id: string;
    status: string;
    note: string;
    createdAt: string;
    adminName: string;
  }[];
}
export const feedbackStatuses: Record<string, string> = {
  New: "Mới",
  InProgress: "Đang xử lý",
  Resolved: "Đã xử lý",
  Closed: "Đã đóng",
};
export const feedbackCategories: Record<string, string> = {
  Bug: "Báo lỗi",
  Suggestion: "Góp ý",
  Other: "Khác",
};
export const feedbackService = {
  list: (
    status = "",
    category = "",
    role = "",
    search = "",
    page = 1,
    pageSize = 20,
    from = "",
    to = "",
  ): ResourceQuery<Paged<FeedbackRow>> => ({
    key: `admin:feedback:list:${status}:${category}:${role}:${search}:${page}:${pageSize}:${from}:${to}`,
    load: async (signal) =>
      assertPaged(
        await request(
          `admin/feedback?${new URLSearchParams({ status, category, role, search, page: String(page), pageSize: String(pageSize), ...(from && to ? { from, to } : {}) })}`,
          "GET",
          undefined,
          signal,
        ),
        [
          "id",
          "body",
          "category",
          "status",
          "userName",
          "createdAt",
          "version",
        ],
      ) as Paged<FeedbackRow>,
  }),
  detail: (id: string): ResourceQuery<FeedbackDetail> => ({
    key: `admin:feedback:detail:${id}`,
    load: (signal) => request(`admin/feedback/${id}`, "GET", undefined, signal),
  }),
  async review(id: string, status: string, note: string, version: number) {
    try {
      return await request(`admin/feedback/${id}/review`, "POST", {
        status,
        note,
        version,
      });
    } finally {
      invalidateResources(["admin:feedback:", "admin:work-summary"]);
    }
  },
};
