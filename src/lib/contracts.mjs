// Backend enums: Models/Enums/PayoutStatus.cs and RefundStatus.cs.
export function financialStatus(value, refund = false) {
  const names = [
    "Pending",
    "ManualActionRequired",
    "Processing",
    refund ? "Completed" : "Paid",
    "Failed",
    ...(refund ? ["AwaitingDestination"] : []),
  ];
  return typeof value === "number"
    ? (names[value] ?? "Unknown")
    : names.includes(value)
      ? value
      : "Unknown";
}
export function financialActions(value, refund = false) {
  const status = financialStatus(value, refund);
  if (status === "Pending" || status === "ManualActionRequired")
    return ["start-processing"];
  if (status === "Processing") return ["complete", "fail"];
  return refund && status === "Failed" ? ["retry"] : [];
}
export function apiMessage(status, payload) {
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status === 401) return "Phiên đăng nhập đã hết hạn.";
  const errors = payload?.errors ?? payload?.Errors;
  const message =
    payload?.message ??
    payload?.Message ??
    (errors &&
      Object.values(errors)
        .flat()
        .find((x) => typeof x === "string"));
  if (
    status < 500 &&
    typeof message === "string" &&
    !/(https?:\/\/|exception|stacktrace|npgsql|SELECT\s|Bearer\s)/i.test(
      message,
    )
  )
    return message;
  return status === 404
    ? "Không tìm thấy dữ liệu."
    : status === 409
      ? "Dữ liệu đã thay đổi hoặc thao tác không còn hợp lệ. Vui lòng tải lại."
      : "Không thể thực hiện thao tác. Vui lòng thử lại.";
}
export function assertArray(value, fields) {
  if (
    !Array.isArray(value) ||
    value.some(
      (row) =>
        !row ||
        typeof row !== "object" ||
        fields.some((field) => !(field in row)),
    )
  )
    throw new Error("Dữ liệu Backend không đúng định dạng. Vui lòng thử lại.");
  return value;
}
export function assertPaged(value, fields) {
  if (
    !value ||
    !Number.isInteger(value.total) ||
    value.total < 0 ||
    !Number.isInteger(value.page) ||
    value.page < 1 ||
    !Number.isInteger(value.pageSize) ||
    value.pageSize < 1
  )
    throw new Error("Dữ liệu phân trang Backend không hợp lệ.");
  assertArray(value.items, fields);
  return value;
}
export function createSubmissionLock() {
  let pending = false;
  return {
    acquire() {
      if (pending) return false;
      pending = true;
      return true;
    },
    release() {
      pending = false;
    },
  };
}
