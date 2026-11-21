import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as ranges from "../../src/lib/reporting-range.mjs";
import * as dates from "../../src/lib/dashboard-presentation.mjs";

const require = createRequire(import.meta.url);
export const fixture = {
  lifetime: {
    revenue: 2460000,
    bookingRevenue: 1860000,
    planRevenue: 600000,
    reviewCount: 20,
    averageRating: 4.75,
    successfulTransactions: 46,
  },
  revenueScope: "BookingAndPlans",
  users: { total: 54, customers: 42, muas: 12, locked: 0 },
  current: { totalBookings: 46, completedBookings: 28 },
  daily: Array.from({ length: 30 }, (_, i) => ({
    date: dates.shiftDay("2026-10-23", i),
    revenue: [0, 15000, 0, 30000, 12000, 0, 8000, 0, 45000, 25000][i % 10],
    newUsers:
      i > 22 ? (i === 24 ? 1 : i === 26 ? 3 : 0) : [0, 1, 0, 2, 0, 1, 3][i % 7],
    newMuas: i === 3 || i === 14 ? 1 : 0,
    bookings: i % 4,
  })),
  bookingStatuses: [
    { status: "Completed", count: 28 },
    { status: "Pending", count: 8 },
    { status: "Cancelled", count: 6 },
    { status: "InProgress", count: 4 },
  ],
  serviceReviews: {
    total: 20,
    averageRating: 4.75,
    lowRatingCount: 1,
    reviewedCompletedBookings: 20,
    eligibleCompletedBookings: 28,
    distribution: [5, 4, 3, 2, 1].map((rating, i) => ({
      rating,
      count: [15, 3, 1, 1, 0][i],
    })),
    recent: [],
  },
};
export const reviewFixture = {
  reviewId: "11111111-2222-4333-8444-555555555555",
  bookingId: "66666666-7777-4888-8999-000000000000",
  rating: 5,
  customerName: "Nguyễn Thảo Linh",
  muaName: "Trần Ngọc Anh",
  comment:
    "Chị tư vấn rất kỹ, lớp nền mỏng nhẹ và bền cả buổi. Mình rất hài lòng với phong cách trang điểm tự nhiên.",
  createdAt: "2026-11-18T03:32:00Z",
  hasImage: false,
  imageUrl: null,
  muaReply:
    "Cảm ơn Linh đã tin tưởng. Hẹn gặp bạn trong những dịp đặc biệt sắp tới!",
  muaReplyAt: "2026-11-18T08:00:00Z",
  booking: {
    bookingDate: "2026-11-17T00:00:00Z",
    startTime: "09:00:00",
    status: "Completed",
    totalAmount: 650000,
    services: [{ serviceName: "Trang điểm dự tiệc", participantsCount: 1 }],
  },
};
export function reportingHarness(options = {}) {
  const calls = [],
    navigations = [],
    states = [],
    controls = {},
    cache = new Map();
  const params = new URLSearchParams(options.query || "");
  const empty = () => null;
  const passive = new Proxy(
    {},
    { get: (_, name) => (name === "__esModule" ? true : empty) },
  );
  const work = {
    data: {
      total: 6,
      counts: {
        verification: 2,
        "bank-accounts": 0,
        complaints: 1,
        moderation: 0,
        payouts: 2,
        refunds: 1,
        feedback: 0,
      },
    },
    error: "",
    loading: false,
    reload() {},
  };
  const query =
    (name) =>
    (...args) => {
      calls.push({ name, args });
      return { key: name, args };
    };
  const modules = {
    react: {
      ...React,
      useState: (initial) => {
        const value = typeof initial === "function" ? initial() : initial;
        return [
          value?.preset && options.range ? options.range : value,
          (next) => states.push(next),
        ];
      },
    },
    "next/link": {
      __esModule: true,
      default: ({ children, scroll, ...props }) => {
        void scroll;
        return React.createElement("a", props, children);
      },
    },
    "next/navigation": {
      useSearchParams: () => params,
      useRouter: () => ({ replace: (href) => navigations.push(href) }),
    },
    "@/lib/client": {
      useSubmission: () => ({ begin: () => true, end() {} }),
      invalidateResources() {},
      useResource: (q) => {
        const base = { loading: false, error: "", reload() {} };
        if (q.key === "dashboard")
          return {
            ...base,
            data: q.args[0] ? options.trends || fixture : fixture,
            ...(options.summaryError
              ? { data: undefined, error: "Không thể tải thống kê" }
              : {}),
          };
        if (q.key === "dashboardReviews")
          return {
            ...base,
            data: {
              items: options.empty
                ? []
                : [
                    reviewFixture,
                    {
                      ...reviewFixture,
                      reviewId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                      customerName: "Phạm Minh Thư",
                      rating: 4,
                      comment: "Đúng giờ, trang điểm đẹp và nhẹ nhàng.",
                    },
                  ],
              total: options.empty ? 0 : 20,
            },
            ...(options.listError
              ? { data: undefined, error: "Không thể tải đánh giá" }
              : {}),
          };
        return {
          ...base,
          data: options.detail || reviewFixture,
          ...(options.detailError
            ? { data: undefined, error: "Không tìm thấy đánh giá" }
            : {}),
        };
      },
    },
    "@/services/admin-service": {
      adminService: {
        dashboard: query("dashboard"),
        dashboardReviews: query("dashboardReviews"),
        dashboardReview: query("dashboardReview"),
      },
    },
    "@/services/session-service": {
      sessionService: { logout: async () => {} },
    },
    "@/lib/work-contracts.mjs": { badgeText: (n) => String(n) },
    "@/lib/reporting-range.mjs": ranges,
    "@/lib/dashboard-presentation.mjs": dates,
    "@/lib/format": {
      money: (n) => `${n.toLocaleString("vi-VN")} ₫`,
      shortId: (id) => id.slice(0, 8),
    },
    "./work-summary": {
      useWorkSummary: () => work,
      WorkSummaryProvider: ({ children }) => children,
      WorkBadge: empty,
      WorkNotifications: empty,
      workModules: [
        "verification",
        "bank-accounts",
        "complaints",
        "moderation",
        "payouts",
        "refunds",
        "feedback",
      ].map((key, i) => ({
        key,
        label: [
          "Xác minh MUA",
          "Tài khoản nhận tiền",
          "Khiếu nại",
          "Báo cáo nội dung",
          "Chi trả MUA",
          "Hoàn tiền",
          "Feedback người dùng",
        ][i],
        icon: empty,
      })),
    },
    "./ui": {
      State: ({ loading, error, empty }) =>
        React.createElement(
          "div",
          { className: "empty-state" },
          error || (loading ? "Đang tải…" : empty || "Chưa có dữ liệu"),
        ),
      Pagination: (p) => {
        controls.pagination = p;
        return React.createElement(
          "div",
          { className: "pagination" },
          `${p.count ? (p.page - 1) * p.size + 1 : 0}–${p.count ? (p.page - 1) * p.size + p.count : 0} / ${p.total}`,
          React.createElement("span", null, `Trang ${p.page}`),
        );
      },
      Modal: (p) => {
        controls.modal = p;
        return React.createElement(
          "dialog",
          { className: `modal wide ${p.className}`, open: true },
          React.createElement(
            "div",
            { className: "modal-heading" },
            React.createElement(
              "div",
              null,
              React.createElement("h2", null, p.title),
              React.createElement("p", null, p.description),
            ),
            React.createElement("button", { onClick: p.onClose }, "Đóng"),
          ),
          React.createElement("div", { className: "modal-body" }, p.children),
        );
      },
      DocumentView: (p) =>
        React.createElement("img", { src: p.url, alt: p.label }),
    },
  };
  const root = new URL("../../src/", import.meta.url);
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const compiledModule = { exports: {} };
    cache.set(file, compiledModule);
    const source = ts.transpileModule(
      readFileSync(new URL(file, root), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      },
    ).outputText;
    const actualRequire = (name) => {
      if (modules[name]) return modules[name];
      if (name.endsWith(".css"))
        return {
          __esModule: true,
          default: new Proxy({}, { get: (_, key) => String(key) }),
        };
      const local = {
        "./dashboard-charts": "components/dashboard-charts.tsx",
        "./dashboard-reviews": "components/dashboard-reviews.tsx",
        "./report-range": "components/report-range.tsx",
        "./overview-dashboard": "components/overview-dashboard.tsx",
        "./reviews-page": "components/reviews-page.tsx",
        "./admin-content-layout": "components/admin-content-layout.tsx",
      };
      if (name === "./overview-pages")
        return {
          Dashboard: load("components/overview-dashboard.tsx")
            .OverviewDashboard,
        };
      if (name === "./report-range" && options.captureRange)
        return {
          ...load(local[name]),
          ReportRangeFilter: (p) => {
            controls.range = p;
            return null;
          },
        };
      if (local[name]) return load(local[name]);
      if (name.startsWith("./") || name.startsWith("@/components/"))
        return passive;
      return require(name);
    };
    vm.runInNewContext(source, {
      module: compiledModule,
      exports: compiledModule.exports,
      require: actualRequire,
      URLSearchParams,
      Intl,
      Date,
      console,
    });
    return compiledModule.exports;
  }
  return {
    calls,
    navigations,
    states,
    controls,
    load,
    render: (file, name, props = {}) =>
      renderToStaticMarkup(React.createElement(load(file)[name], props)),
  };
}
