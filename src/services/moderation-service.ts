import { request, invalidateResources, type ResourceQuery } from "@/lib/client";

export type ReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
};
export type ReportDetail = ReportRow & {
  targetOwnerId?: string;
  description: string;
  content: string | null;
  contentAvailable: boolean;
  canRemove: boolean;
  reviewedAt?: string;
  decisionNote: string;
  imageUrls: string[];
  hasPrivateImage: boolean;
};
export const reportStatuses: Record<string, string> = {
  Pending: "Chờ xử lý",
  Reviewed: "Đã xem xét",
  Dismissed: "Không xác định vi phạm",
  Removed: "Đã ẩn nội dung",
};
export const reportTargets: Record<string, string> = {
  User: "Người dùng",
  Portfolio: "Portfolio",
  Comment: "Bình luận",
  Review: "Đánh giá",
  Message: "Tin nhắn",
};
export const reportReasons: Record<string, string> = {
  Harassment: "Quấy rối",
  Inappropriate: "Nội dung không phù hợp",
  Spam: "Spam",
  Fraud: "Lừa đảo",
  Other: "Khác",
};
export const moderationService = {
  image: (id: string) =>
    request<{ url: string; expiresIn: number }>(
      `admin/moderation/reports/${id}/image`,
      "GET",
    ),
  list: (
    status: string,
    page: number,
  ): ResourceQuery<{ items: ReportRow[]; total: number }> => ({
    key: `admin:moderation:list:${status}:${page}`,
    load: (signal) =>
      request(
        `admin/moderation/reports?${new URLSearchParams({ status, page: String(page) })}`,
        "GET",
        undefined,
        signal,
      ),
  }),
  detail: (id: string): ResourceQuery<ReportDetail> => ({
    key: `admin:moderation:${id}`,
    load: (signal) =>
      request(`admin/moderation/reports/${id}`, "GET", undefined, signal),
  }),
  async decide(id: string, action: string, note: string) {
    try {
      return await request<ReportDetail>(
        `admin/moderation/reports/${id}/decision`,
        "POST",
        { action, note },
      );
    } finally {
      invalidateResources(["admin:moderation:", "admin:work-summary"]);
    }
  },
};
