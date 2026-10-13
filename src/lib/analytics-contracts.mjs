export const ANALYTICS_TIMEZONE = "Asia/Ho_Chi_Minh";
const DAY = 86400000;
export function analyticsToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TIMEZONE,
  }).format(now);
}
export function shiftDate(date, days) {
  return new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10);
}
export function analyticsRange(start, end, today = analyticsToday()) {
  const valid = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  if (
    !valid(start) ||
    !valid(end) ||
    start > end ||
    end > today ||
    start < "2005-01-01"
  )
    throw new Error("date");
  const days = (Date.parse(end) - Date.parse(start)) / DAY + 1;
  if (days > 366) throw new Error("date");
  return {
    start,
    end,
    days,
    previousStart: shiftDate(start, -days),
    previousEnd: shiftDate(start, -1),
  };
}
export function percentageChange(value, previous) {
  if (value === null || previous === null) return null;
  return previous === 0
    ? value === 0
      ? 0
      : null
    : ((value - previous) / previous) * 100;
}
export function ratio(value, total) {
  return value !== null && total ? (value / total) * 100 : null;
}
export function sourceCategory(source, medium = "") {
  const value = source.trim().toLowerCase();
  const channel = medium.trim().toLowerCase();
  if (value === "(data not available)" || channel === "(data not available)")
    return "(data not available)";
  if (!value || !channel || value === "(not set)" || channel === "(not set)")
    return "(not set)";
  if (value === "(direct)" && ["(none)", "none"].includes(channel))
    return "Direct";
  if (/^(facebook|fb|facebook\.com|[a-z0-9.-]+\.facebook\.com)$/.test(value))
    return "Facebook";
  if (
    /^(threads|threads\.(net|com)|[a-z0-9.-]+\.threads\.(net|com))$/.test(value)
  )
    return "Threads";
  if (/^(tiktok|tiktok\.com|[a-z0-9.-]+\.tiktok\.com)$/.test(value))
    return "TikTok";
  if (/^(google|google\.[a-z.]+|[a-z0-9.-]+\.google\.[a-z.]+)$/.test(value))
    return "Google";
  return "Other";
}
