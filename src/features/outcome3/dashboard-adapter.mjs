import { bookings, reviews, users, days, demoReport } from "./demo.mjs";
const localDay = (timestamp) =>
  new Date(Date.parse(timestamp) + 7 * 3600000).toISOString().slice(0, 10);

/** @returns {import('../../lib/dashboard').DashboardReviewDetail[]} */
export function demoReviewDetails(from, to) {
  return reviews
    .filter((r) => localDay(r.createdAt) >= from && localDay(r.createdAt) <= to)
    .map((r) => {
      const booking = bookings.find((b) => b.bookingId === r.bookingId);
      return {
        ...r,
        rating: Number(r.rating),
        comment: String(r.comment),
        customerName: users.find((u) => u.id === r.customerId).displayName,
        muaName: users.find((u) => u.id === r.muaId).displayName,
        imageUrl: null,
        muaReply: null,
        muaReplyAt: null,
        booking: {
          bookingDate: booking.createdAt,
          startTime: "08:00:00",
          status: "Completed",
          totalAmount: booking.bookingTotal,
          services: [],
        },
      };
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** Same metric definitions and view model as the production dashboard API.
 * @returns {import('../../lib/dashboard').DashboardData}
 */
export function demoDashboard(from = days[0], to = days[6]) {
  const report = demoReport(from, to);
  const lifetime = demoReport();
  const within = (timestamp) =>
    localDay(timestamp) >= from && localDay(timestamp) <= to;
  const createdBookings = bookings.filter((b) => within(b.createdAt));
  const period = {
    revenue: report.revenue,
    bookingRevenue: report.bookingRevenue,
    planRevenue: report.visibilityRevenue,
    aiRevenue: 0,
    visibilityRevenue: report.visibilityRevenue,
    bookingValue: bookings
      .filter((b) => within(b.completedAt))
      .reduce((sum, b) => sum + b.bookingTotal, 0),
    completedBookings: report.completedBookings,
    newUsers: report.users,
    newMuas: report.muas,
    totalBookings: createdBookings.length,
    depositsCollected: bookings
      .filter((b) => within(b.paymentConfirmedAt))
      .reduce((sum, b) => sum + b.depositAmount, 0),
    refundsCompleted: 0,
    successfulTransactions: report.successfulTransactions,
  };
  const daily = [];
  for (
    let date = Date.parse(`${from}T00:00:00+07:00`);
    date <= Date.parse(`${to}T00:00:00+07:00`);
    date += 86400000
  ) {
    const key = localDay(new Date(date).toISOString());
    const row = demoReport(key, key);
    daily.push({
      date: key,
      revenue: row.revenue,
      bookingRevenue: row.bookingRevenue,
      planRevenue: row.visibilityRevenue,
      newUsers: row.users,
      newMuas: row.muas,
      bookings: bookings.filter((b) => localDay(b.createdAt) === key).length,
    });
  }
  return {
    revenueScope: "BookingAndPlans",
    lifetime: {
      revenue: lifetime.revenue,
      bookingRevenue: lifetime.bookingRevenue,
      planRevenue: lifetime.visibilityRevenue,
      aiRevenue: 0,
      visibilityRevenue: lifetime.visibilityRevenue,
      reviewCount: lifetime.reviews.total,
      averageRating: lifetime.reviews.averageRating,
      successfulTransactions: lifetime.successfulTransactions,
    },
    current: period,
    previous: Object.fromEntries(Object.keys(period).map((key) => [key, 0])),
    users: {
      total: users.length,
      customers: users.filter((u) => u.role === "CUSTOMER").length,
      muas: users.filter((u) => u.role === "MUA").length,
      locked: users.filter((u) => !u.isActive).length,
    },
    daily,
    bookingStatuses: [{ status: "Completed", count: createdBookings.length }],
    serviceReviews: {
      total: report.reviews.total,
      averageRating: report.reviews.averageRating,
      lowRatingCount: report.reviews.lowRatingCount,
      distribution: report.reviews.distribution,
      eligibleCompletedBookings: report.completedBookings,
      reviewedCompletedBookings: bookings.filter(
        (b) =>
          within(b.completedAt) &&
          reviews.some((r) => r.bookingId === b.bookingId),
      ).length,
      recent: demoReviewDetails(from, to),
    },
  };
}
