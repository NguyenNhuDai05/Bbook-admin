import { bookingLabels } from "./dashboard-presentation.mjs";

/** @type {Record<string, string>} */
export const bookingPaymentLabels = {
  Unpaid: "Chưa thanh toán",
  Paid: "Đã thanh toán",
  Refunded: "Đã hoàn tiền",
  Failed: "Thanh toán thất bại",
  DepositHeld: "Đã nhận cọc",
  Released: "Đã nhận cọc",
  Frozen: "Đang tạm giữ cọc",
  RefundPending: "Chờ hoàn tiền",
  PartiallyRefunded: "Hoàn tiền một phần",
  Forfeited: "Đã khấu trừ cọc",
};
export function bookingLabel(status) {
  return bookingLabels[status] || "Chưa xác định";
}
export function bookingTone(status) {
  if (["Completed", "AutoCompleted"].includes(status)) return "success";
  if (["Cancelled", "Rejected"].includes(status)) return "neutral";
  return status === "Disputed" ? "danger" : "info";
}
export function bookingTime(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
export function appointmentDate(value) {
  const day = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day)
    ? day.split("-").reverse().join("/")
    : "—";
}
export function readBookingPage(value) {
  const validCount = (n) => Number.isInteger(n) && n >= 0;
  if (
    !value?.summary ||
    !Array.isArray(value.items) ||
    !["total", "completed", "cancelled", "active"].every((k) =>
      validCount(value.summary[k]),
    ) ||
    value.summary.total !==
      value.summary.completed +
        value.summary.cancelled +
        value.summary.active ||
    !value.items.every(
      (r) =>
        typeof r.bookingId === "string" &&
        Array.isArray(r.serviceNames) &&
        Number.isFinite(Date.parse(r.createdAt)) &&
        Number.isFinite(Date.parse(r.bookingDate)) &&
        Number.isFinite(r.totalAmount) &&
        r.totalAmount >= 0 &&
        Number.isFinite(r.depositAmount) &&
        r.depositAmount >= 0,
    )
  )
    throw new Error("Không thể đọc danh sách booking. Vui lòng tải lại.");
  return value;
}
