import { request } from "@/lib/client";
import {
  validateDashboard,
  type DashboardData,
  type DashboardReview,
  type DashboardReviewDetail,
  type DashboardTransaction,
  type DashboardTransactionDetail,
} from "@/lib/dashboard";
import { assertArray, assertPaged } from "@/lib/contracts.mjs";
import type {
  Application,
  ApplicationDetail,
  BankAccount,
  BankApproval,
  BankReviewRequest,
  FinancialQr,
  Campaign,
  DirectoryUser,
  MoneyRecord,
  Paged,
  Style,
  NotificationRequest,
  RejectionRequest,
  FinancialRequest,
} from "@/lib/types";
const params = (values: Record<string, string | number>) =>
  new URLSearchParams(
    Object.entries(values).map(([key, value]) => [key, String(value)]),
  ).toString();
async function list<T>(
  path: string,
  fields: string[],
  signal: AbortSignal,
): Promise<T[]> {
  return assertArray(
    await request<unknown>(path, "GET", undefined, signal),
    fields,
  ) as T[];
}
async function paged<T>(
  path: string,
  fields: string[],
  signal: AbortSignal,
): Promise<Paged<T>> {
  return assertPaged(
    await request<unknown>(path, "GET", undefined, signal),
    fields,
  ) as Paged<T>;
}
export const adminApi = {
  dashboardTransactions: (
    from: string,
    to: string,
    page: number,
    signal: AbortSignal,
  ) =>
    paged<DashboardTransaction>(
      `admin/dashboard/transactions?${params({ page, pageSize: 20, ...(from && to ? { from, to } : {}) })}`,
      [
        "paymentId",
        "bookingId",
        "amount",
        "paidAt",
        "status",
        "providerOrderCode",
      ],
      signal,
    ),
  dashboardTransaction: (id: string, signal: AbortSignal) =>
    request<DashboardTransactionDetail>(
      `admin/dashboard/transactions/${id}`,
      "GET",
      undefined,
      signal,
    ),
  dashboardReviews: (
    from: string,
    to: string,
    rating: number,
    page: number,
    signal: AbortSignal,
  ) =>
    paged<DashboardReview>(
      `admin/dashboard/reviews?${params({ from, to, page, pageSize: 20, ...(rating ? { rating } : {}) })}`,
      ["reviewId", "bookingId", "rating", "createdAt", "hasImage"],
      signal,
    ),
  dashboardReview: (id: string, signal: AbortSignal) =>
    request<DashboardReviewDetail>(
      `admin/dashboard/reviews/${id}`,
      "GET",
      undefined,
      signal,
    ),
  adminStyles: (
    page: number,
    search: string,
    status: string,
    signal: AbortSignal,
  ) =>
    paged<Style>(
      `admin/makeup-styles?${params({ page, pageSize: 10, search, status })}`,
      ["styleId", "name", "isActive", "createdAt"],
      signal,
    ),
  adminStyle: (id: number, signal: AbortSignal) =>
    request<Style>(`admin/makeup-styles/${id}`, "GET", undefined, signal),
  saveAdminStyle: (id: number | null, name: string, description: string) =>
    request<Style>(
      `admin/makeup-styles${id === null ? "" : `/${id}`}`,
      id === null ? "POST" : "PUT",
      { name, description },
    ),
  statusAdminStyle: (id: number, isActive: boolean) =>
    request<Style>(`admin/makeup-styles/${id}/status`, "PATCH", { isActive }),
  dashboard: async (from: string, to: string, signal: AbortSignal) =>
    validateDashboard(
      await request<DashboardData>(
        `admin/dashboard?${params({ from, to })}`,
        "GET",
        undefined,
        signal,
      ),
    ),
  applications: (
    status: string,
    page: number,
    pageSize: number,
    signal: AbortSignal,
  ) =>
    list<Application>(
      `admin/mua-applications?${params({ status, page, pageSize })}`,
      ["muaId", "verificationStatus", "fullName"],
      signal,
    ),
  async mua(id: string, signal: AbortSignal) {
    const value = await request<ApplicationDetail>(
      `admin/muas/${id}`,
      "GET",
      undefined,
      signal,
    );
    if (
      !value?.profile ||
      !value.verificationDocuments ||
      !value.eligibility ||
      !Array.isArray(value.eligibility.requirements)
    )
      throw new Error("Dữ liệu hồ sơ Backend không hợp lệ.");
    return value;
  },
  approveMua: (id: string) =>
    request(`admin/mua-applications/${id}/approve`, "POST"),
  rejectMua: (id: string, body: RejectionRequest) =>
    request(`admin/mua-applications/${id}/reject`, "POST", body),
  suspendMua: (id: string, suspended: boolean) =>
    request<void>(`admin/muas/${id}/suspension`, "PATCH", { suspended }),
  activeUser: (id: string, isActive: boolean) =>
    request<void>(`admin/users/${id}/active`, "PATCH", { isActive }),
  users: (
    search: string,
    role: string,
    active: boolean,
    page: number,
    signal: AbortSignal,
  ) =>
    paged<DirectoryUser>(
      `admin/management/users?${params({ search, role, active: String(active), page, pageSize: 20 })}`,
      ["userId", "fullName", "email", "isActive"],
      signal,
    ),
  financialSummary: async (refund: boolean, signal: AbortSignal) => {
    const result = await request<
      Record<string, { count: number; amount: number }>
    >(
      `admin/management/financial-summary?refund=${refund}`,
      "GET",
      undefined,
      signal,
    );
    if (
      !result ||
      ["pending", "processing", "completed", "failed"].some(
        (k) =>
          !result[k] ||
          !Number.isSafeInteger(result[k].count) ||
          result[k].count < 0 ||
          !Number.isFinite(result[k].amount) ||
          result[k].amount < 0,
      )
    )
      throw new Error("Không thể đọc thống kê tài chính.");
    return result;
  },
  banks: (signal: AbortSignal, status = "PENDING_ADMIN") =>
    list<BankAccount>(
      status === "PENDING_ADMIN"
        ? "admin/bank-accounts/pending"
        : `admin/bank-accounts/history?status=${status}`,
      ["id", "ownerId", "accountNumber"],
      signal,
    ),
  approveBank: (id: string, body: BankReviewRequest) =>
    request<BankApproval>(`admin/bank-accounts/${id}/approve`, "POST", body),
  rejectBank: (id: string, body: BankReviewRequest) =>
    request<void>(`admin/bank-accounts/${id}/reject`, "POST", body),
  financialQr: (
    id: string,
    context: "bank" | "payout" | "refund",
    signal: AbortSignal,
  ) =>
    request<FinancialQr>(
      context === "bank"
        ? `admin/bank-accounts/${id}/financial-qr`
        : `admin/${context}s/${id}/transfer-qr`,
      "GET",
      undefined,
      signal,
    ),
  moneyList: (refund: boolean, status: string, signal: AbortSignal) =>
    list<MoneyRecord>(
      refund
        ? `Refund${status ? `?${params({ status })}` : ""}`
        : "admin/payouts",
      [refund ? "refundId" : "id", "amount", "status", "createdAt"],
      signal,
    ),
  async money(id: string, refund: boolean, signal: AbortSignal) {
    const value = await request<MoneyRecord>(
      `${refund ? "Refund" : "admin/payouts"}/${id}`,
      "GET",
      undefined,
      signal,
    );
    assertArray([value], [refund ? "refundId" : "id", "amount", "status"]);
    return value;
  },
  financialAction: (
    id: string,
    refund: boolean,
    action: string,
    body: FinancialRequest,
  ) =>
    request(
      `${refund ? "Refund" : "admin/payouts"}/${id}/${action}`,
      "POST",
      body,
    ),
  campaigns: (page: number, signal: AbortSignal) =>
    paged<Campaign>(
      `admin/notifications?${params({ page, pageSize: 20 })}`,
      ["id", "title", "audience", "recipientCount"],
      signal,
    ),
  recipients: (
    search: string,
    role: string,
    page: number,
    pageSize: number,
    signal: AbortSignal,
  ) =>
    paged<DirectoryUser>(
      `admin/notifications/users?${params({ search, role, page, pageSize })}`,
      ["userId", "fullName", "email", "role"],
      signal,
    ),
  notify: (body: NotificationRequest) =>
    request<Campaign>("admin/notifications", "POST", body),
  styles: (signal: AbortSignal) =>
    list<Style>("Mua/styles", ["styleId", "name", "isActive"], signal),
  createStyle: (name: string, description: string) =>
    request<Style>("Mua/styles", "POST", {
      name,
      description: description || null,
    }),
  autoComplete: () =>
    request<{ completedBookings: number }>(
      "Booking/auto-complete-overdue",
      "POST",
    ),
};
