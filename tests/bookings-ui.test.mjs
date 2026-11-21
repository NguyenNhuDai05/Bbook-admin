import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import * as booking from "../src/lib/bookings.mjs";
import * as dates from "../src/lib/dashboard-presentation.mjs";
import * as transactions from "../src/lib/transactions.mjs";
import { allowedApiPath } from "../src/lib/policy.mjs";

const require = createRequire(import.meta.url);
const id = "12345678-1234-4234-8234-123456789012";
const row = {
  bookingId: id,
  customerName: "Nguyễn Thảo Linh",
  muaName: "Huỳnh Gia Hân",
  serviceNames: ["Makeup chụp ảnh"],
  createdAt: "2026-11-09T12:00:00Z",
  bookingDate: "2026-11-11T00:00:00Z",
  startTime: "15:20:00",
  endTime: "16:20:00",
  status: "Completed",
  paymentStatus: "Released",
  totalAmount: 300000,
  depositAmount: 90000,
};
const data = {
  items: [row],
  total: 37,
  page: 1,
  pageSize: 20,
  summary: { total: 37, completed: 33, active: 0, cancelled: 4 },
};
const code = ts.transpileModule(
  readFileSync(
    new URL("../src/components/bookings-page.tsx", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
).outputText;
function render(query = "", options = {}) {
  const calls = [],
    events = [],
    navigations = [],
    compiled = { exports: {} };
  const runtime = require("react/jsx-runtime");
  const wrap = (fn) => (type, props, key) => {
    if (typeof type === "string") events.push({ type, props });
    return fn(type, props, key);
  };
  const mocks = {
    "react/jsx-runtime": {
      ...runtime,
      jsx: wrap(runtime.jsx),
      jsxs: wrap(runtime.jsxs),
    },
    "next/navigation": {
      useSearchParams: () => new URLSearchParams(query),
      useRouter: () => ({ replace: (value) => navigations.push(value) }),
    },
    "next/link": {
      default: ({ children, ...props }) =>
        React.createElement("a", props, children),
    },
    "@/lib/client": {
      useResource: (q) => ({
        data: options.data === undefined ? data : options.data,
        loading: false,
        error: "",
        reload() {},
        ...options.resource,
        enabled: q.enabled,
      }),
      useSubmission: () => ({ busy: false, begin: () => true, end() {} }),
    },
    "@/services/admin-service": {
      adminService: {
        bookings: (...args) => {
          calls.push(args);
          return { enabled: args[5] };
        },
        booking: () => ({ enabled: true }),
      },
    },
    "@/lib/dashboard-presentation.mjs": dates,
    "@/lib/bookings.mjs": booking,
    "@/lib/transactions.mjs": transactions,
    "@/lib/format": {
      money: (n) => `${n}đ`,
      shortId: (value) => value.slice(0, 8).toUpperCase(),
    },
    "./bookings-page.module.css": {
      default: new Proxy({}, { get: (_, key) => key }),
    },
    "./ui": {
      PageTitle: (p) =>
        React.createElement("header", null, p.title, p.description, p.action),
      State: (p) =>
        React.createElement(
          "p",
          null,
          p.loading ? "Đang tải" : p.error || p.empty,
        ),
      Pagination: (p) =>
        React.createElement("p", null, `Trang ${p.page} / ${p.total}`),
      Modal: (p) => React.createElement("div", null, p.children),
      SubmitButton: (p) => React.createElement("button", null, p.children),
    },
  };
  vm.runInNewContext(code, {
    module: compiled,
    exports: compiled.exports,
    URLSearchParams,
    require: (name) => mocks[name] || require(name),
  });
  const html = renderToStaticMarkup(
    React.createElement(compiled.exports.BookingsPage, { id: options.id }),
  );
  return { html, calls, events, navigations };
}
test("booking list loads real rows with a 30-day default and shows all status counts without origin labels", () => {
  const h = render();
  assert.deepEqual(h.calls[0].slice(0, 2), [
    dates.presetRange("month").from,
    dates.presetRange("month").to,
  ]);
  for (const text of [
    "Nguyễn Thảo Linh",
    "Huỳnh Gia Hân",
    "Makeup chụp ảnh",
    "33",
    "37",
    "90000đ",
    "Hoàn thành",
  ])
    assert.ok(h.html.includes(text));
  assert.doesNotMatch(
    h.html,
    /demo|mô phỏng|Simulated|test|đang được hoàn thiện/i,
  );
  assert.match(h.html, /href="\/bookings\/12345678/);
});
test("status filters keep search and all-time scope and reset pagination", () => {
  const h = render("scope=all&page=2&search=Linh");
  h.events
    .find((x) => x.props["aria-label"] === "Trạng thái booking")
    .props.onChange({ target: { value: "Completed" } });
  const url = new URL(h.navigations[0], "https://admin.invalid");
  assert.equal(url.searchParams.get("status"), "Completed");
  assert.equal(url.searchParams.get("search"), "Linh");
  assert.equal(url.searchParams.get("scope"), "all");
  assert.equal(url.searchParams.has("page"), false);
  assert.equal(url.searchParams.has("from"), false);
});
test("booking details link payment and review records and retain list filters without rendering internal metadata", () => {
  const detail = {
    ...row,
    remainingAmount: 210000,
    platformFeeAmount: 24000,
    totalDurationMinutes: 60,
    address: null,
    source: "Simulated",
    notes: "mô phỏng",
    services: [
      {
        serviceName: "Makeup chụp ảnh",
        participantsCount: 1,
        priceSnapshot: 300000,
        durationMinutesSnapshot: 60,
      },
    ],
    payments: [
      { paymentId: id, amount: 90000, status: "Paid", paidAt: row.createdAt },
    ],
    timeline: [{ status: "Completed", occurredAt: row.createdAt }],
    review: {
      reviewId: id,
      rating: 5,
      comment: "Lớp nền nhẹ, lên hình đẹp.",
      createdAt: row.createdAt,
    },
  };
  const h = render("scope=all&status=Completed&page=2", { id, data: detail });
  assert.match(h.html, /scope=all&amp;status=Completed&amp;page=2/);
  assert.match(h.html, /\/transactions\/12345678/);
  assert.match(h.html, /\/reviews\/12345678/);
  assert.match(h.html, /Lớp nền nhẹ, lên hình đẹp/);
  assert.doesNotMatch(h.html, /demo|mô phỏng|Simulated|test/i);
});
test("invalid ranges, failures and empty lists remain distinct and do not invent counts", () => {
  const invalid = render("from=2026-11-20&to=2026-11-01", { data: null });
  assert.equal(invalid.calls[0][5], false);
  assert.match(invalid.html, /366 ngày/);
  assert.match(
    render("", { data: null, resource: { error: "Không thể tải booking" } })
      .html,
    /Không thể tải booking/,
  );
  assert.match(
    render("", { data: { ...data, items: [], total: 0 } }).html,
    /Không tìm thấy booking/,
  );
  assert.doesNotMatch(
    render("", { data: null, resource: { loading: true } }).html,
    /<strong>0<\/strong>/,
  );
});
test("booking endpoints are read-only and malformed summary data is rejected", () => {
  for (const path of [
    "admin/dashboard/bookings",
    `admin/dashboard/bookings/${id}`,
  ]) {
    assert.equal(allowedApiPath("GET", path), true);
    for (const verb of ["POST", "PATCH", "DELETE"])
      assert.equal(allowedApiPath(verb, path), false);
  }
  assert.equal(
    allowedApiPath("GET", "admin/dashboard/bookings/secrets"),
    false,
  );
  assert.equal(booking.readBookingPage(data), data);
  assert.throws(() =>
    booking.readBookingPage({
      ...data,
      summary: { ...data.summary, total: 38 },
    }),
  );
  assert.equal(booking.appointmentDate("2026-11-11T00:00:00Z"), "11/11/2026");
});
