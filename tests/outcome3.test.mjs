import test from "node:test";
import assert from "node:assert/strict";
import {
  reviews,
  bookings,
  users,
  transactions,
  days,
  aggregateReviews,
  demoReport,
} from "../src/features/outcome3/demo.mjs";

test("exact demo review distribution and computed average", () => {
  const result = aggregateReviews(reviews);
  assert.equal(result.total, 16);
  for (const [rating, count] of [
    [5, 10],
    [4, 5],
    [3, 1],
    [2, 0],
    [1, 0],
  ]) {
    assert.equal(reviews.filter((r) => r.rating === rating).length, count);
    assert.equal(
      result.distribution.find((r) => r.rating === rating).count,
      count,
    );
  }
  assert.equal(result.averageRating, 4.5625);
  assert.equal(
    result.averageRating.toLocaleString("vi-VN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    "4,56",
  );
  assert.equal(result.lowRatingCount, 0);
  assert.equal(new Set(reviews.map((r) => r.reviewId)).size, 16);
  assert.equal(new Set(reviews.map((r) => r.comment)).size, 16);
  assert.equal(new Set(reviews.map((r) => r.bookingId)).size, 16);
});
test("reviews reference completed bookings with matching parties and chronology", () => {
  for (const review of reviews) {
    const booking = bookings.find((b) => b.bookingId === review.bookingId);
    assert.ok(booking);
    assert.equal(booking.status, "COMPLETED");
    assert.equal(review.customerId, booking.customerId);
    assert.equal(review.muaId, booking.muaId);
    assert.ok(Date.parse(review.createdAt) > Date.parse(booking.completedAt));
    assert.equal(review.source, "DEMO");
    assert.ok(
      Date.parse(review.createdAt) >= Date.parse("2026-10-29T00:00:00+07:00"),
    );
    assert.ok(
      Date.parse(review.createdAt) < Date.parse("2026-11-05T00:00:00+07:00"),
    );
  }
});
test("shared selectors reconcile daily, distribution, recent and filtered reviews", () => {
  const report = demoReport();
  assert.equal(report.daily.length, 7);
  assert.ok(report.daily.every((d) => d.reviews > 0));
  assert.equal(
    report.daily.reduce((sum, d) => sum + d.reviews, 0),
    report.reviews.total,
  );
  assert.equal(report.reviews.recent.length, report.reviews.total);
  for (const day of days) {
    const single = demoReport(day, day);
    assert.equal(
      single.reviews.total,
      report.daily.find((d) => d.date === day).reviews,
    );
  }
  assert.equal(
    demoReport("2026-11-05", "2026-11-05").reviews.averageRating,
    null,
  );
  assert.equal(
    aggregateReviews([{ ...reviews[0], rating: 2 }]).averageRating,
    2,
  );
});
test("other Outcome 3 targets and relationships remain consistent", () => {
  const report = demoReport();
  assert.deepEqual(
    [
      report.customers,
      report.muas,
      report.users,
      report.paidUsers,
      report.successfulTransactions,
      report.completedBookings,
    ],
    [32, 7, 39, 17, 18, 16],
  );
  assert.equal(report.visibilityRevenue, 150000);
  assert.equal(
    report.revenue,
    bookings.reduce((sum, b) => sum + b.platformFee, 0) + 150000,
  );
  assert.equal(
    report.daily.reduce((sum, d) => sum + d.revenue, 0),
    report.revenue,
  );
  assert.equal(
    report.daily.reduce((sum, d) => sum + d.paidUsers, 0),
    17,
  );
  for (const records of [users, transactions, bookings]) {
    assert.ok(records.every((r) => r.source === "DEMO"));
  }
  for (const booking of bookings) {
    for (const userId of [booking.customerId, booking.muaId]) {
      const user = users.find((u) => u.id === userId);
      assert.ok(user);
      assert.ok(Date.parse(user.createdAt) <= Date.parse(booking.createdAt));
    }
    assert.equal(booking.depositAmount, booking.bookingTotal * 0.3);
    assert.equal(booking.platformFee, booking.bookingTotal * 0.08);
    assert.ok(
      Date.parse(booking.paymentConfirmedAt) < Date.parse(booking.completedAt),
    );
  }
});
