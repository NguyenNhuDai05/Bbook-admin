export interface DashboardPeriod {
  revenue: number;
  bookingValue: number;
  completedBookings: number;
  newUsers: number;
  depositsCollected: number;
  refundsCompleted: number;
}
export interface DashboardData {
  current: DashboardPeriod;
  previous: DashboardPeriod;
  users: { total: number; customers: number; muas: number; locked: number };
  daily: { date: string; revenue: number; newUsers: number }[];
  bookingStatuses: { status: string; count: number }[];
}
export function validateDashboard(value: DashboardData): DashboardData {
  const valid = (x: unknown) =>
    typeof x === "number" && Number.isFinite(x) && x >= 0;
  const fields: (keyof DashboardPeriod)[] = [
    "revenue",
    "bookingValue",
    "completedBookings",
    "newUsers",
    "depositsCollected",
    "refundsCompleted",
  ];
  if (
    !value ||
    !fields.every(
      (k) => valid(value.current?.[k]) && valid(value.previous?.[k]),
    ) ||
    !["total", "customers", "muas", "locked"].every((k) =>
      valid(value.users?.[k as keyof DashboardData["users"]]),
    ) ||
    !Array.isArray(value.daily) ||
    !value.daily.every(
      (x) =>
        /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
        valid(x.revenue) &&
        valid(x.newUsers),
    ) ||
    !Array.isArray(value.bookingStatuses) ||
    !value.bookingStatuses.every(
      (x) => typeof x.status === "string" && valid(x.count),
    )
  )
    throw new Error("Dữ liệu thống kê Backend không hợp lệ.");
  return value;
}
