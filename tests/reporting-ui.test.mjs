import test from "node:test";
import assert from "node:assert/strict";
import {
  reportingHarness,
  fixture,
  reviewFixture,
} from "./fixtures/reporting-ui.mjs";
import {
  reportPreset,
  readReportRange,
  reviewFilters,
  reviewHref,
} from "../src/lib/reporting-range.mjs";

test("dashboard uses 30 inclusive Vietnam dates by default and keeps all-time totals independent of chart filters", () => {
  const h = reportingHarness({
    trends: {
      ...fixture,
      current: { totalBookings: 1 },
      lifetime: { revenue: 1 },
    },
  });
  const html = h.render(
    "components/overview-dashboard.tsx",
    "OverviewDashboard",
  );
  const [totals, trends] = h.calls.filter((q) => q.name === "dashboard");
  assert.deepEqual(totals.args, ["", ""]);
  assert.equal(
    (Date.parse(trends.args[1]) - Date.parse(trends.args[0])) / 86400000 + 1,
    30,
  );
  assert.match(html, /Thống kê tổng/);
  assert.match(html, /2\.460\.000/);
  assert.match(html, />46</);
  assert.doesNotMatch(html, /Thống kê theo kỳ|so với .*ngày trước|Outcome 3/);
  assert.match(html, /href="\/reviews"/);
  const other = reportingHarness({
    range: reportPreset("week", "2026-11-21"),
    trends: fixture,
  });
  other.render("components/overview-dashboard.tsx", "OverviewDashboard");
  assert.deepEqual(
    other.calls.filter((q) => q.name === "dashboard").map((q) => q.args),
    [
      ["", ""],
      ["2026-11-15", "2026-11-21"],
    ],
  );
});

test("unavailable totals never become zero and navigation no longer offers Outcome 3", () => {
  const h = reportingHarness({ summaryError: true });
  const html = h.render("components/admin-app.tsx", "AdminApp", {
    route: [],
    user: { fullName: "Admin", email: "admin@example.org" },
  });
  assert.match(html, /Không thể tải thống kê/);
  assert.doesNotMatch(html, /<strong>0<\/strong>|Outcome 3|outcome-3/);
  assert.match(html, /href="\/reviews"/);
});

test("review list uses real all-time pagination by default and supports empty and error states", () => {
  const h = reportingHarness();
  const html = h.render("components/reviews-page.tsx", "ReviewsPage");
  assert.deepEqual(h.calls.find((q) => q.name === "dashboardReviews").args, [
    "",
    "",
    0,
    1,
  ]);
  assert.match(html, /Nguyễn Thảo Linh/);
  assert.match(html, /Phạm Minh Thư/);
  assert.match(html, /1–2 \/ 20/);
  assert.match(
    html,
    /\/reviews\/11111111-2222-4333-8444-555555555555\?scope=all/,
  );
  assert.match(
    reportingHarness({ empty: true }).render(
      "components/reviews-page.tsx",
      "ReviewsPage",
    ),
    /Chưa có đánh giá trong khoảng ngày này/,
  );
  assert.match(
    reportingHarness({ listError: true }).render(
      "components/reviews-page.tsx",
      "ReviewsPage",
    ),
    /Không thể tải đánh giá/,
  );
});

test("review date changes reset pagination while detail open and close retain date and rating filters", () => {
  const h = reportingHarness({
    query: "scope=month&from=2026-10-23&to=2026-11-21&rating=4&page=3",
    captureRange: true,
  });
  const html = h.render("components/reviews-page.tsx", "ReviewsPage", {
    id: reviewFixture.reviewId,
  });
  assert.deepEqual(h.calls.find((q) => q.name === "dashboardReviews").args, [
    "2026-10-23",
    "2026-11-21",
    4,
    3,
  ]);
  assert.match(html, /Chi tiết đánh giá/);
  assert.match(html, /Trang điểm dự tiệc/);
  assert.match(html, /Cảm ơn Linh/);
  h.controls.modal.onClose();
  assert.match(h.navigations[0], /rating=4&page=3/);
  h.controls.range.onChange(reportPreset("week", "2026-11-21"));
  assert.match(h.navigations[1], /from=2026-11-15&to=2026-11-21&rating=4/);
  assert.doesNotMatch(h.navigations[1], /page=/);
});

test("missing review detail is an error, absent comment/image/reply remain honest", () => {
  const fail = reportingHarness({ detailError: true });
  assert.match(
    fail.render("components/reviews-page.tsx", "ReviewDetails", {
      id: reviewFixture.reviewId,
      onClose() {},
    }),
    /Không tìm thấy đánh giá/,
  );
  const h = reportingHarness({
    detail: { ...reviewFixture, comment: null, imageUrl: null, muaReply: null },
  });
  const html = h.render("components/reviews-page.tsx", "ReviewDetails", {
    id: reviewFixture.reviewId,
    onClose() {},
  });
  assert.match(html, /không để lại nhận xét/);
  assert.match(html, /Chưa có phản hồi/);
  assert.doesNotMatch(html, /<img/);
});

test("range links preserve selected presets, reject malformed ranges and constrain rating/page inputs", () => {
  const range = reportPreset("quarter", "2026-11-21");
  assert.equal(
    (Date.parse(range.to) - Date.parse(range.from)) / 86400000 + 1,
    90,
  );
  const url = reviewHref({ range, rating: 2, page: 3 }, reviewFixture.reviewId);
  assert.deepEqual(
    reviewFilters(new URL(url, "http://localhost").searchParams),
    { range, rating: 2, page: 3 },
  );
  assert.deepEqual(
    readReportRange(new URLSearchParams("scope=all"), { today: "2026-11-21" }),
    reportPreset("month", "2026-11-21"),
  );
  assert.deepEqual(
    reviewFilters(new URLSearchParams("rating=-1&page=100001")).range,
    reportPreset("all"),
  );
  assert.equal(reviewFilters(new URLSearchParams("rating=6&page=0")).rating, 0);
  assert.equal(
    reviewFilters(new URLSearchParams("rating=2.5&page=2.3")).page,
    1,
  );
  assert.deepEqual(
    readReportRange(new URLSearchParams("from=2026-02-31&to=2026-03-10"), {
      today: "2026-11-21",
    }),
    reportPreset("month", "2026-11-21"),
  );
});
