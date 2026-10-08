export function vietnamToday(now = Date.now()) {
  return new Date(now + 7 * 3600000).toISOString().slice(0, 10);
}
export function shiftDay(day, days) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function presetRange(preset, today = vietnamToday()) {
  const days = { today: 1, week: 7, month: 30 }[preset];
  return {
    from:
      preset === "this-year"
        ? `${today.slice(0, 4)}-01-01`
        : preset === "this-month"
          ? `${today.slice(0, 7)}-01`
          : shiftDay(today, 1 - days),
    to: today,
  };
}
export function calendarRange(value) {
  if (!/^\d{4}(-\d{2})?$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = value.length === 7 ? Number(value.slice(5)) : 1;
  if (year < 1970 || year > 9998 || month < 1 || month > 12) return null;
  const from = `${value}-01${value.length === 4 ? "-01" : ""}`;
  const to = new Date(Date.UTC(year, value.length === 7 ? month : 12, 0))
    .toISOString()
    .slice(0, 10);
  return { from, to };
}
export function validRange(from, to) {
  const days = (Date.parse(to) - Date.parse(from)) / 86400000;
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(to) &&
    from >= "1970-01-01" &&
    Number.isFinite(days) &&
    new Date(Date.parse(from)).toISOString().slice(0, 10) === from &&
    new Date(Date.parse(to)).toISOString().slice(0, 10) === to &&
    days >= 0 &&
    days <= 365
  );
}
export function comparison(current, previous, days) {
  if (previous === 0) return { text: "Kỳ trước: 0", direction: "neutral" };
  const percent = ((current - previous) / previous) * 100;
  return {
    text: `${percent > 0 ? "+" : ""}${percent.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}% so với ${days} ngày trước`,
    direction: percent > 0 ? "up" : percent < 0 ? "down" : "neutral",
  };
}
export function currencyAxis(value) {
  const divisor = value >= 1000000 ? 1000000 : value >= 1000 ? 1000 : 1;
  return `${(value / divisor).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}${divisor === 1000000 ? "M" : divisor === 1000 ? "K" : ""}`;
}
export const bookingLabels = {
  Pending: "Chờ duyệt",
  Approved: "Đã duyệt",
  Completed: "Hoàn thành",
  Cancelled: "Đã hủy",
  WaitingCustomer: "Chờ khách xác nhận",
  PendingPayment: "Chờ thanh toán",
  PendingConfirmation: "Chờ xác nhận",
  Rejected: "Từ chối",
  InProgress: "Đang thực hiện",
  Disputed: "Tranh chấp",
  AutoCompleted: "Tự hoàn thành",
};
export const bookingColors = {
  Completed: "#07814b",
  AutoCompleted: "#07814b",
  Cancelled: "#b42318",
  Rejected: "#b42318",
  Disputed: "#b42318",
  Approved: "#1570ef",
  InProgress: "#1570ef",
  Pending: "#b86b00",
  PendingPayment: "#b86b00",
  PendingConfirmation: "#b86b00",
  WaitingCustomer: "#b86b00",
};
