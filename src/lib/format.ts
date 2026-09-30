import { financialStatus } from "./contracts.mjs";
export const money = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount,
  );
export const date = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
export const shortId = (id?: string | null) =>
  id ? id.slice(0, 8).toUpperCase() : "—";
export const maskAccount = (value?: string | null) =>
  value ? `•••• ${value.slice(-4)}` : "Chưa có";
export const waitHours = (value?: string | null) =>
  value
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(value).getTime()) / 3600000),
      )
    : 0;
export const experience = (level?: string | null, years = 0) =>
  (
    ({
      BEGINNER: "Mới bắt đầu",
      UNDER_ONE: "Dưới 1 năm",
      ONE_TO_THREE: "1–3 năm",
      THREE_TO_FIVE: "3–5 năm",
      OVER_FIVE: "Trên 5 năm",
    }) as Record<string, string>
  )[level || ""] || `${years} năm`;
export const statusName = financialStatus;
export const statusLabels: Record<string, string> = {
  PENDING_ADMIN: "Chờ duyệt",
  PendingReview: "Chờ duyệt",
  Approved: "Đã duyệt",
  Rejected: "Từ chối",
  Draft: "Bản nháp",
  Pending: "Chờ xử lý",
  ManualActionRequired: "Cần xử lý thủ công",
  Processing: "Đang xử lý",
  Paid: "Đã chi trả",
  Completed: "Hoàn tất",
  Failed: "Thất bại",
  AwaitingDestination: "Chờ tài khoản nhận tiền",
  Active: "Đang hoạt động",
  Listed: "Đã đăng hồ sơ",
  Suspended: "Đình chỉ",
  Inactive: "Đã khóa",
  Confirmed: "Đã xác nhận",
  Disputed: "Tranh chấp",
  Cancelled: "Đã hủy",
  Unknown: "Không xác định",
};
export function statusTone(value: string) {
  return ["Approved", "Verified", "Paid", "Completed", "Active"].includes(value)
    ? "success"
    : ["Rejected", "Failed", "Suspended", "Inactive", "Cancelled"].includes(
          value,
        )
      ? "danger"
      : ["Processing", "Confirmed"].includes(value)
        ? "info"
        : [
              "PendingReview",
              "PENDING_ADMIN",
              "Pending",
              "ManualActionRequired",
              "NeedsMoreInfo",
              "AwaitingDestination",
              "Disputed",
            ].includes(value)
          ? "warning"
          : "neutral";
}
