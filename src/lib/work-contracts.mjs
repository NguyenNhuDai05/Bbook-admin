export const workKeys = [
  "verification",
  "bank-accounts",
  "complaints",
  "moderation",
  "payouts",
  "refunds",
  "feedback",
];
export function validateWorkSummary(value) {
  const count = (x) => Number.isSafeInteger(x) && x >= 0;
  if (
    !value ||
    !Number.isFinite(Date.parse(value.updatedAt)) ||
    !workKeys.every((key) => count(value.counts?.[key])) ||
    !count(value.total) ||
    value.total !== workKeys.reduce((sum, key) => sum + value.counts[key], 0) ||
    !count(value.processingPayouts) ||
    !count(value.processingRefunds)
  )
    throw new Error("Dữ liệu công việc Backend không hợp lệ.");
  return value;
}
export function newestDaily(rows) {
  return [...rows].sort((a, b) => b.date.localeCompare(a.date));
}
export function badgeText(count) {
  return count > 99 ? "99+" : String(count);
}
