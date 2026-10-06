const guid =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const rules = [
  ["GET", /^admin\/management\/(users|financial-summary)$/],
  ["GET", /^admin\/bank-accounts\/history$/],
  ["GET", /^admin\/makeup-styles(?:\/[1-9]\d*)?$/],
  ["POST", /^admin\/makeup-styles$/],
  ["PUT", /^admin\/makeup-styles\/[1-9]\d*$/],
  ["PATCH", /^admin\/makeup-styles\/[1-9]\d*\/status$/],
  ["GET", /^admin\/moderation\/reports$/],
  ["GET", new RegExp(`^admin/moderation/reports/${guid}$`)],
  ["GET", new RegExp(`^admin/moderation/reports/${guid}/image$`)],
  ["POST", new RegExp(`^admin/moderation/reports/${guid}/decision$`)],
  ["GET", /^admin\/dashboard$/],
  ["GET", /^admin\/work-summary$/],
  ["GET", /^admin\/feedback$/],
  ["GET", new RegExp(`^admin/feedback/${guid}$`)],
  ["POST", new RegExp(`^admin/feedback/${guid}/review$`)],
  ["GET", /^admin\/complaints$/],
  ["GET", new RegExp(`^complaints/${guid}$`)],
  ["POST", new RegExp(`^complaints/${guid}/messages$`)],
  ["POST", new RegExp(`^admin/complaints/${guid}/actions$`)],
  ["GET", /^admin\/mua-applications$/],
  ["GET", new RegExp(`^admin/muas/${guid}$`)],
  ["POST", new RegExp(`^admin/mua-applications/${guid}/(approve|reject)$`)],
  ["PATCH", new RegExp(`^admin/muas/${guid}/suspension$`)],
  ["PATCH", new RegExp(`^admin/users/${guid}/active$`)],
  ["GET", /^admin\/bank-accounts\/pending$/],
  ["GET", new RegExp(`^admin/bank-accounts/${guid}/financial-qr$`)],
  ["GET", new RegExp(`^admin/payouts/${guid}/transfer-qr$`)],
  ["GET", new RegExp(`^admin/refunds/${guid}/transfer-qr$`)],
  ["POST", new RegExp(`^admin/bank-accounts/${guid}/(approve|reject)$`)],
  ["GET", new RegExp(`^admin/payouts(/${guid})?$`)],
  [
    "POST",
    new RegExp(`^admin/payouts/${guid}/(start-processing|complete|fail)$`),
  ],
  ["GET", new RegExp(`^Refund(/${guid})?$`)],
  [
    "POST",
    new RegExp(`^Refund/${guid}/(start-processing|complete|fail|retry)$`),
  ],
  ["GET", /^admin\/notifications(\/users)?$/],
  ["POST", /^admin\/notifications$/],
  ["GET", /^Mua\/styles$/],
  ["POST", /^Mua\/styles$/],
  ["POST", /^Booking\/auto-complete-overdue$/],
];
export function allowedApiPath(method, path) {
  return (
    !path.includes("..") &&
    rules.some(([verb, pattern]) => verb === method && pattern.test(path))
  );
}
export function isAdmin(role) {
  return role === 0 || String(role).toUpperCase() === "ADMIN";
}
export function isSameOrigin(origin, target) {
  try {
    return !!origin && new URL(origin).origin === new URL(target).origin;
  } catch {
    return false;
  }
}
