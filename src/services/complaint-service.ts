import { request, invalidateResources, type ResourceQuery } from "@/lib/client";
export type ComplaintRow = {
  id: string;
  bookingId: string;
  category: string;
  status: string;
  isOpen: boolean;
  createdAt: string;
  responseDeadline?: string;
  customerName?: string;
  muaName?: string;
  requestedAmount?: number;
};
export type ComplaintDetail = ComplaintRow & {
  description: string;
  requestedOutcome: string;
  decisionReason?: string;
  approvedRefundAmount?: number;
  resolvedAt?: string;
  paidAmount: number;
  needsFinancialReconciliation: boolean;
  booking: {
    customerName?: string;
    muaName?: string;
    totalAmount: number;
    depositAmount: number;
    status: number | string;
  };
  refund?: {
    refundId: string;
    amount: number;
    status: number | string;
    completedAt?: string;
  };
  messages: {
    id: string;
    authorRole: string;
    kind: string;
    body: string;
    imageUrls: string[];
    internal: boolean;
    createdAt: string;
  }[];
};
export const complaintLabels: Record<string, string> = {
  Submitted: "Đã tiếp nhận",
  AwaitingCustomer: "Chờ khách bổ sung",
  AwaitingMua: "Chờ MUA phản hồi",
  UnderReview: "Đang xem xét",
  ResolvedRejected: "Đã có quyết định",
  ResolvedRefund: "Chấp nhận hoàn tiền",
};
export const categoryLabels: Record<string, string> = {
  NoShow: "MUA không đến",
  Late: "Sai giờ / đến trễ",
  Quality: "Chất lượng dịch vụ",
  ExtraFee: "Phát sinh phí",
  Conduct: "Hành vi không phù hợp",
  Other: "Khác",
};
export const complaintService = {
  list: (
    status: string,
    page: number,
  ): ResourceQuery<{ items: ComplaintRow[]; total: number }> => ({
    key: `admin:complaints:list:${status}:${page}`,
    load: (signal) =>
      request(
        `admin/complaints?${new URLSearchParams({ status, page: String(page), pageSize: "20" })}`,
        "GET",
        undefined,
        signal,
      ),
  }),
  detail: (id: string): ResourceQuery<ComplaintDetail> => ({
    key: `admin:complaints:${id}`,
    load: (signal) => request(`complaints/${id}`, "GET", undefined, signal),
  }),
  async action(
    id: string,
    body: { action: string; reason: string; refundAmount?: number },
  ) {
    try {
      return await request<ComplaintDetail>(
        `admin/complaints/${id}/actions`,
        "POST",
        body,
      );
    } finally {
      invalidateResources([
        "admin:complaints:",
        "admin:refunds:",
        "admin:payouts:",
        "admin:work-summary",
        "admin:dashboard:",
      ]);
    }
  },
  async message(id: string, body: string, internal: boolean) {
    try {
      return await request<ComplaintDetail>(
        `complaints/${id}/messages`,
        "POST",
        { body, internal, imageUrls: [] },
      );
    } finally {
      invalidateResources(["admin:complaints:"]);
    }
  },
};
