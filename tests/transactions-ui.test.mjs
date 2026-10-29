import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as transactions from "../src/lib/transactions.mjs";
import * as dates from "../src/lib/dashboard-presentation.mjs";

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(
  readFileSync(
    new URL("../src/components/transactions-page.tsx", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
function render(query = "scope=all", resource = {}, id, options = {}) {
  const compiledModule = { exports: {} };
  const navigations = [];
  const states = [];
  const revenueQueries = [];
  const params = new URLSearchParams(query);
  const mocks = {
    react: {
      ...React,
      useState: () => [
        options.expanded || false,
        (value) => states.push(value),
      ],
    },
    "next/link": {
      default: ({ children, ...props }) =>
        React.createElement("a", props, children),
    },
    "next/navigation": {
      useSearchParams: () => params,
      useRouter: () => ({ replace: (url) => navigations.push(url) }),
    },
    "@/lib/client": {
      useResource: (query) => ({
        loading: false,
        error: "",
        reload() {},
        ...(query.key === "revenue"
          ? options.revenue || {
              data: { current: { revenue: 4500 }, lifetime: { revenue: 9000 } },
            }
          : resource),
      }),
    },
    "@/services/admin-service": {
      adminService: {
        transactions: () => ({ key: "transactions" }),
        dashboard: (from, to, enabled) => {
          revenueQueries.push({ from, to, enabled });
          return { key: "revenue" };
        },
      },
    },
    "@/lib/format": {
      money: (n) => `${n} VND`,
      shortId: (id) => id.slice(0, 8),
    },
    "@/lib/transactions.mjs": transactions,
    "@/lib/dashboard-presentation.mjs": dates,
    "./dashboard-transactions": {
      TransactionDetail: () =>
        React.createElement("div", null, "Detail content"),
    },
    "./transactions-page.module.css": {
      __esModule: true,
      default: new Proxy({}, { get: (_, key) => String(key) }),
    },
    "./ui": {
      Modal: ({ children, onClose, className }) =>
        React.createElement(
          "dialog",
          { open: true, className },
          React.createElement("button", { onClick: onClose }, "Đóng"),
          children,
        ),
      PageTitle: ({ title, action }) =>
        React.createElement("header", null, title, action),
      State: ({ error, loading, empty }) =>
        React.createElement("p", null, error || (loading ? "Loading" : empty)),
      Pagination: ({ page, count, total }) =>
        React.createElement("footer", null, `${page}:${count}/${total}`),
    },
  };
  vm.runInNewContext(compiled, {
    module: compiledModule,
    exports: compiledModule.exports,
    URLSearchParams,
    Intl,
    FormData: class {
      constructor(form) {
        return form;
      }
    },
    require: (name) => mocks[name] || require(name),
  });
  const tree = id
    ? compiledModule.exports.TransactionPage({ id })
    : compiledModule.exports.TransactionsPage();
  return {
    tree,
    html: renderToStaticMarkup(tree),
    navigations,
    states,
    revenueQueries,
  };
}
const rows = Array.from({ length: 23 }, (_, i) => ({
  paymentId: `payment-${i}`,
  bookingId: "booking-id",
  amount: 100,
  paidAt: "2026-10-28T18:00:00Z",
  providerOrderCode: i + 9000,
  customerName: `Customer ${i}`,
  status: i < 20 ? "Paid" : "Refunded",
}));
function find(tree, predicate) {
  if (!tree || typeof tree !== "object") return null;
  if (predicate(tree)) return tree;
  for (const child of React.Children.toArray(tree.props?.children)) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}

test("transaction UI counts the entire result and paginates only the table", () => {
  const { html } = render("scope=all&page=2", { data: rows });
  assert.match(html, /<strong>23<\/strong>/);
  assert.match(html, /<strong>20<\/strong>/);
  assert.match(html, /<strong>3<\/strong>/);
  assert.match(html, /2:3\/23/);
  assert.doesNotMatch(
    html,
    /giao dịch khớp bộ lọc|Tổng tiền thu ban đầu|Tra cứu thanh toán|Dữ liệu PayOS đã thu tiền/,
  );
  assert.match(html, /Mở rộng bảng/);
  assert.match(html, /Customer 22/);
  assert.doesNotMatch(html, />Customer 0</);
  assert.match(html, /29\/10\/26/); // Vietnam day crosses UTC midnight.
  assert.match(html, /transactions\/payment-22\?scope=all&amp;page=2/);
});

test("status filters and search apply before pagination and invalid pages clamp", () => {
  const { html } = render("scope=all&status=Refunded&q=Customer&page=999", {
    data: rows,
  });
  assert.match(html, /1:3\/3/);
  assert.doesNotMatch(html, />Customer 0</);
});

test("loading, error, empty and invalid dates do not show invented financial totals", () => {
  assert.match(render("scope=all", { loading: true }).html, /Loading/);
  assert.match(
    render("scope=all", { error: "Backend failed" }).html,
    /Backend failed/,
  );
  assert.match(
    render("scope=all", { data: [] }).html,
    /Không có giao dịch khớp bộ lọc/,
  );
  assert.match(render("from=2026-02-31&to=2026-03-01").html, /tối đa 366 ngày/);
});

test("filter change resets pagination and all-time search works without dates", () => {
  const { tree, navigations } = render("scope=all&page=2", { data: rows });
  const form = find(tree, (el) => el.type === "form");
  const fakeForm = new FormData();
  fakeForm.set("from", "");
  fakeForm.set("to", "");
  fakeForm.set("q", "9001");
  fakeForm.set("status", "Paid");
  form.props.onSubmit({ preventDefault() {}, currentTarget: fakeForm });
  const url = new URL(navigations[0], "https://admin.test");
  assert.equal(url.searchParams.has("page"), false);
  assert.equal(url.searchParams.get("scope"), "all");
  assert.equal(url.searchParams.get("status"), "Paid");
  assert.equal(url.searchParams.get("q"), "9001");
  assert.equal(url.searchParams.has("from"), false);
});

test("details preserve list filters in the back link and reject malformed IDs", () => {
  const id = "11111111-1111-1111-1111-111111111111";
  const { html } = render("scope=all&status=Paid&page=2", {}, id);
  assert.match(
    html,
    /href="\/transactions\?scope=all&amp;status=Paid&amp;page=2"/,
  );
  assert.match(html, /Detail content/);
  assert.match(
    render("scope=all", {}, "bad-id").html,
    /Mã giao dịch không hợp lệ/,
  );
});

test("app revenue uses dashboard platform fees for the selected completion dates, never payment amounts", () => {
  const period = render(
    "from=2026-10-23&to=2026-10-29&q=Customer&status=Refunded",
    { data: rows },
  );
  assert.match(period.html, /4500 VND/);
  assert.doesNotMatch(period.html, /9000 VND|2300 VND/);
  assert.deepEqual(period.revenueQueries, [
    { from: "2026-10-23", to: "2026-10-29", enabled: true },
  ]);
  assert.match(render("scope=all", { data: rows }).html, /9000 VND/);
  assert.match(
    render("scope=all&status=Paid&q=not-found", { data: rows }).html,
    /9000 VND/,
  );
  assert.equal(
    render("from=invalid&to=invalid").revenueQueries[0].enabled,
    false,
  );
});

test("unavailable revenue stays unavailable while the transaction list remains readable", () => {
  const { html, tree } = render("scope=all", { data: rows }, undefined, {
    revenue: { error: "Revenue unavailable" },
  });
  const card = find(tree, (el) => el.props["aria-label"] === "Doanh thu app");
  assert.doesNotMatch(renderToStaticMarkup(card), /VND/);
  assert.match(html, /Thử lại/);
  assert.match(html, /Customer 0/);
});

test("expanded table retains the selected page and can close without resetting filters", () => {
  const closed = render("scope=all&page=2", { data: rows });
  find(
    closed.tree,
    (el) =>
      el.type === "button" && el.props.className?.includes("expandButton"),
  ).props.onClick();
  assert.deepEqual(closed.states, [true]);
  const opened = render("scope=all&page=2", { data: rows }, undefined, {
    expanded: true,
  });
  assert.match(opened.html, /<dialog/);
  assert.match(opened.html, /Customer 22/);
  assert.match(opened.html, /2:3\/23/);
  find(opened.tree, (el) => el.props.className === "expanded").props.onClose();
  assert.deepEqual(opened.states, [false]);
  assert.deepEqual(opened.navigations, []);
});

test("transactions use the scrolling page layout so filters cannot squeeze the table into one row", () => {
  const result = { exports: {} };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../src/components/admin-content-layout.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module: result,
    exports: result.exports,
    require,
  });
  assert.equal(result.exports.isAdminListRoute("transactions"), false);
  assert.equal(result.exports.isAdminListRoute("users"), true);
});
