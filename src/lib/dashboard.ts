export interface DashboardPeriod {
  revenue: number;
  bookingValue: number;
  completedBookings: number;
  newUsers: number;
  newMuas: number;
  totalBookings: number;
  depositsCollected: number;
  refundsCompleted: number;
  successfulTransactions: number;
}
export interface DashboardReview {
  reviewId: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customerName: string | null;
  muaName: string | null;
  hasImage: boolean;
}
export interface DashboardReviewDetail extends Omit<
  DashboardReview,
  "hasImage"
> {
  imageUrl: string | null;
  muaReply: string | null;
  muaReplyAt: string | null;
  customerId: string;
  muaId: string;
  booking: {
    bookingDate: string;
    startTime: string;
    status: string;
    totalAmount: number;
    services: { serviceName: string; participantsCount: number }[];
  };
}
export interface DashboardData {
  current: DashboardPeriod;
  previous: DashboardPeriod;
  users: { total: number; customers: number; muas: number; locked: number };
  daily: {
    date: string;
    revenue: number;
    newUsers: number;
    newMuas: number;
    bookings: number;
  }[];
  bookingStatuses: { status: string; count: number }[];
  serviceReviews: {
    total: number;
    averageRating: number | null;
    lowRatingCount: number;
    distribution: { rating: number; count: number }[];
    reviewedCompletedBookings: number;
    eligibleCompletedBookings: number;
    recent: {
      reviewId: string;
      bookingId: string;
      rating: number;
      comment: string | null;
      createdAt: string;
      customerName: string | null;
      muaName: string | null;
    }[];
  };
}
export function validateDashboard(value: DashboardData): DashboardData {
  const valid = (x: unknown) =>
    typeof x === "number" && Number.isFinite(x) && x >= 0;
  const fields: (keyof DashboardPeriod)[] = [
    "revenue",
    "bookingValue",
    "completedBookings",
    "newUsers",
    "newMuas",
    "totalBookings",
    "depositsCollected",
    "refundsCompleted",
    "successfulTransactions",
  ];
  if (
    !value ||
    !fields.every(
      (k) => valid(value.current?.[k]) && valid(value.previous?.[k]),
    ) ||
    !Number.isInteger(value.current?.successfulTransactions) ||
    !Number.isInteger(value.previous?.successfulTransactions) ||
    !["total", "customers", "muas", "locked"].every((k) =>
      valid(value.users?.[k as keyof DashboardData["users"]]),
    ) ||
    !Array.isArray(value.daily) ||
    !value.daily.every(
      (x) =>
        /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
        valid(x.revenue) &&
        valid(x.newUsers) &&
        valid(x.newMuas) &&
        valid(x.bookings),
    ) ||
    !Array.isArray(value.bookingStatuses) ||
    !value.bookingStatuses.every(
      (x) => typeof x.status === "string" && valid(x.count),
    ) ||
    value.bookingStatuses.reduce((sum, x) => sum + x.count, 0) !==
      value.current.totalBookings ||
    !value.serviceReviews ||
    ![
      value.serviceReviews.total,
      value.serviceReviews.lowRatingCount,
      value.serviceReviews.reviewedCompletedBookings,
      value.serviceReviews.eligibleCompletedBookings,
    ].every(valid) ||
    (value.serviceReviews.total === 0
      ? value.serviceReviews.averageRating !== null
      : typeof value.serviceReviews.averageRating !== "number" ||
        !Number.isFinite(value.serviceReviews.averageRating) ||
        value.serviceReviews.averageRating < 1 ||
        value.serviceReviews.averageRating > 5) ||
    !Array.isArray(value.serviceReviews.distribution) ||
    value.serviceReviews.distribution.length !== 5 ||
    new Set(value.serviceReviews.distribution.map((x) => x.rating)).size !==
      5 ||
    !value.serviceReviews.distribution.every(
      (x) =>
        Number.isInteger(x.rating) &&
        x.rating >= 1 &&
        x.rating <= 5 &&
        valid(x.count),
    ) ||
    value.serviceReviews.distribution.reduce((sum, x) => sum + x.count, 0) !==
      value.serviceReviews.total ||
    value.serviceReviews.distribution
      .filter((x) => x.rating <= 2)
      .reduce((sum, x) => sum + x.count, 0) !==
      value.serviceReviews.lowRatingCount ||
    value.serviceReviews.reviewedCompletedBookings >
      value.serviceReviews.eligibleCompletedBookings ||
    !Array.isArray(value.serviceReviews.recent) ||
    !value.serviceReviews.recent.every(
      (x) =>
        typeof x.reviewId === "string" &&
        typeof x.bookingId === "string" &&
        Number.isInteger(x.rating) &&
        x.rating >= 1 &&
        x.rating <= 5 &&
        Number.isFinite(Date.parse(x.createdAt)),
    )
  )
    throw new Error("Dữ liệu thống kê Backend không hợp lệ.");
  return value;
}
