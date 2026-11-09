import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as adapter from "../src/features/outcome3/dashboard-adapter.mjs";
import * as fixtures from "../src/features/outcome3/demo.mjs";
import * as dates from "../src/lib/dashboard-presentation.mjs";
import * as contracts from "../src/lib/contracts.mjs";

const require = createRequire(import.meta.url);
const root = new URL("../src/", import.meta.url);
const css = new Proxy({}, { get: (_, key) => String(key) });

function harness({
  realData = adapter.demoDashboard(),
  range,
  reviewRating = 0,
  selected = null,
} = {}) {
  const apiCalls = [],
    queries = [],
    invalidations = [],
    navigations = [],
    updates = [],
    elements = [];
  let component = "";
  const cache = new Map();
  const real =
    (name) =>
    (...args) => {
      apiCalls.push({ name, args });
      return { key: name, load: async () => realData };
    };
  const mocks = {
    "react/jsx-runtime": Object.fromEntries(
      Object.entries(require("react/jsx-runtime")).map(([name, fn]) => [
        name,
        typeof fn === "function"
          ? (...args) => {
              const element = fn(...args);
              elements.push(element);
              return element;
            }
          : fn,
      ]),
    ),
    react: {
      ...React,
      useState(initial) {
        const [value, setter] = React.useState(initial);
        const next =
          component === "operations" &&
          range &&
          value &&
          typeof value === "object" &&
          "from" in value
            ? range
            : component === "reviews" && value === 0
              ? reviewRating
              : component === "reviews" && value === null
                ? selected
                : value;
        return [
          next,
          (v) => {
            updates.push(v);
            setter(v);
          },
        ];
      },
    },
    "next/link": {
      default: ({ children, ...props }) =>
        React.createElement("a", props, children),
    },
    "next/navigation": {
      useRouter: () => ({ push: (url) => navigations.push(url) }),
    },
    "@/lib/client": {
      useResource: (query) => {
        queries.push(query);
        return {
          loading: false,
          error: "",
          reload() {},
          data:
            query.enabled === false
              ? undefined
              : query.key === "dashboard"
                ? realData
                : query.key === "dashboardReviews"
                  ? { items: [], total: 0, page: 1, pageSize: 20 }
                  : undefined,
        };
      },
      invalidateResources: (prefixes) => invalidations.push(prefixes),
    },
    "@/services/admin-service": {
      adminService: {
        dashboard: real("dashboard"),
        dashboardReviews: real("dashboardReviews"),
        dashboardReview: real("dashboardReview"),
      },
    },
    "./work-summary": {
      workModules: [],
      useWorkSummary: () => ({
        loading: false,
        error: "",
        data: { total: 99, counts: {} },
      }),
    },
    "./ui": {
      Pagination: () =>
        React.createElement("nav", { "aria-label": "Phân trang" }),
      State: () => React.createElement("p", null, "Loading or error"),
      Modal: ({ children, title }) =>
        React.createElement("dialog", { open: true }, title, children),
      DocumentView: () => null,
    },
    "@/features/outcome3/dashboard-adapter.mjs": adapter,
    "@/features/outcome3/demo.mjs": fixtures,
    "@/lib/dashboard-presentation.mjs": dates,
    "./contracts.mjs": contracts,
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const compiledModule = { exports: {} };
    const code = ts.transpileModule(readFileSync(new URL(file, root), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    vm.runInNewContext(code, {
      module: compiledModule,
      exports: compiledModule.exports,
      require: (name) => {
        if (name.endsWith(".module.css"))
          return { __esModule: true, default: css };
        if (mocks[name]) return mocks[name];
        const files = {
          "./dashboard-charts": "components/dashboard-charts.tsx",
          "./dashboard-reviews": "components/dashboard-reviews.tsx",
          "@/lib/format": "lib/format.ts",
          "@/components/dashboard-operations":
            "components/dashboard-operations.tsx",
        };
        if (files[name]) return load(files[name]);
        return require(name);
      },
    });
    const exports = compiledModule.exports;
    if (exports.OperationsDashboard) {
      const original = exports.OperationsDashboard;
      exports.OperationsDashboard = (props) => {
        component = "operations";
        return original(props);
      };
    }
    if (exports.ServiceReviews) {
      const original = exports.ServiceReviews;
      exports.ServiceReviews = (props) => {
        component = "reviews";
        return original(props);
      };
    }
    cache.set(file, exports);
    return exports;
  }
  return {
    load,
    apiCalls,
    queries,
    invalidations,
    navigations,
    updates,
    elements,
  };
}

function renderDemo(options) {
  const h = harness(options);
  const html = renderToStaticMarkup(
    React.createElement(
      h.load("features/outcome3/outcome3-page.tsx").Outcome3Page,
    ),
  );
  return { ...h, html };
}

test("Outcome 3 renders the existing five-card dashboard, charts, review analytics, booking status and daily table without API requests", () => {
  const { html, apiCalls, queries } = renderDemo();
  for (const text of [
    "Outcome 3 — Tổng quan kết quả",
    "Giao dịch thanh toán thành công",
    "32 Customer · 7 MUA",
    "Tổng tích lũy",
    "Thống kê theo kỳ",
    "Doanh thu theo ngày",
    "Tài khoản mới theo ngày",
    "Customer mới",
    "Đánh giá dịch vụ",
    "Trạng thái booking",
    "Công việc cần xử lý",
    "Số liệu từng ngày",
    "Paid Users",
    "4,56 / 5",
    "2.095.000",
    "Chưa có dữ liệu so sánh",
  ])
    assert.ok(html.includes(text), text);
  assert.doesNotMatch(
    html.replace(/<[^>]*>/g, ""),
    /demo|mô phỏng|simulation/i,
  );
  assert.match(html, /<strong>29<\/strong>/);
  assert.match(html, /class="kpis lifetimeKpis"/);
  assert.match(html, /class="linePlot"/);
  assert.match(html, /class="ratingDistribution"/);
  assert.match(html, /max="16" value="10"/);
  assert.match(html, /max="16" value="5"/);
  assert.equal((html.match(/class="reviewRow"/g) || []).length, 16);
  assert.equal(
    (html.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0].match(/<tr>/g) || []).length,
    7,
  );
  assert.doesNotMatch(
    html,
    /NaN|undefined|Không có đánh giá trong khoảng|href="\/(transactions|bookings)/,
  );
  assert.equal(apiCalls.length, 0);
  assert.ok(queries.every((q) => q.enabled === false));
  if (process.env.OUTCOME3_PREVIEW_HTML) {
    const globals = readFileSync(new URL("app/globals.css", root), "utf8");
    const styles = readFileSync(
      new URL("components/dashboard.module.css", root),
      "utf8",
    );
    writeFileSync(
      process.env.OUTCOME3_PREVIEW_HTML,
      `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Outcome 3 — local render verification</title><style>${globals}\n${styles}\nbody{margin:0;padding:28px;background:var(--bg);font-family:Arial,sans-serif}</style><body>${html}</body></html>`,
    );
  }
});

test("demo date filtering, empty ranges, rating filter and local review detail stay isolated", () => {
  const filtered = renderDemo({ reviewRating: 3 });
  assert.equal((filtered.html.match(/class="reviewRow"/g) || []).length, 1);
  const empty = renderDemo({ range: { from: "2026-11-05", to: "2026-11-05" } });
  assert.match(empty.html, /Không có đánh giá/);
  assert.match(empty.html, /05\/11\/2026/);
  assert.equal(empty.apiCalls.length, 0);
  const detail = renderDemo({ selected: "BBOOK_REVIEW_001" });
  assert.match(detail.html, /Chi tiết đánh giá dịch vụ/);
  assert.match(detail.html, /BBOOK_BOOKING_001/);
  assert.doesNotMatch(detail.html.replace(/<[^>]*>/g, ""), /demo|mô phỏng/i);
  assert.equal(detail.apiCalls.length, 0);
});

test("production dashboard retains real queries, labels, navigation and precision without demo fixtures", () => {
  const realData = structuredClone(adapter.demoDashboard());
  realData.users = { total: 100, customers: 88, muas: 12, locked: 0 };
  realData.lifetime.averageRating = 3.7;
  realData.serviceReviews.averageRating = 3.7;
  const h = harness({ realData });
  const html = renderToStaticMarkup(
    React.createElement(
      h.load("components/dashboard-operations.tsx").OperationsDashboard,
    ),
  );
  assert.match(html, /<h1>Tổng quan<\/h1>/);
  assert.match(html, /88 Customer/);
  assert.match(html, /3,7 \/ 5/);
  assert.doesNotMatch(
    html,
    /DEMO|DỮ LIỆU MÔ PHỎNG|Paid Users|Chưa có dữ liệu so sánh/,
  );
  assert.deepEqual(
    h.apiCalls.map((c) => c.name),
    ["dashboard", "dashboardReviews"],
  );
  assert.ok(h.queries.every((q) => q.enabled !== false));
  const refresh = h.elements.find(
    (e) =>
      e.type === "button" &&
      JSON.stringify(e.props.children).includes("Làm mới"),
  );
  refresh.props.onClick();
  assert.deepEqual(Array.from(h.invalidations[0]), [
    "admin:dashboard:",
    "admin:work-summary",
  ]);
  const transactions = h.elements.find(
    (e) =>
      e.type === "button" && String(e.props.className).includes("clickableKpi"),
  );
  transactions.props.onClick();
  assert.deepEqual(h.navigations, ["/transactions?scope=all"]);
});

test("demo refresh and date submit update local state; transaction navigation stays disabled", () => {
  const h = renderDemo();
  const refresh = h.elements.find(
    (e) =>
      e.type === "button" &&
      JSON.stringify(e.props.children).includes("Làm mới"),
  );
  refresh.props.onClick();
  assert.equal(h.updates.length, 1);
  assert.equal(h.invalidations.length, 0);
  const transaction = h.elements.find(
    (e) =>
      e.type === "button" && String(e.props.className).includes("clickableKpi"),
  );
  assert.equal(transaction.props.disabled, true);
  transaction.props.onClick();
  assert.equal(h.navigations.length, 0);
  const form = h.elements.find((e) => e.type === "form");
  form.props.onSubmit({ preventDefault() {} });
  assert.ok(
    h.updates.some(
      (value) => value?.from === "2026-10-29" && value?.to === "2026-11-04",
    ),
  );
  assert.equal(h.apiCalls.length, 0);
});

test("demo adapter meets production view-model contract and reconciles chart and daily totals", () => {
  const h = harness();
  const { validateDashboard } = h.load("lib/dashboard.ts");
  for (const [from, to] of [
    [fixtures.days[0], fixtures.days[6]],
    ["2026-11-01", "2026-11-02"],
    ["2026-11-05", "2026-11-05"],
    ["2026-10-28", "2026-11-06"],
  ]) {
    const data = validateDashboard(adapter.demoDashboard(from, to));
    assert.equal(
      data.daily.reduce((sum, d) => sum + d.revenue, 0),
      data.current.revenue,
    );
    assert.equal(
      data.daily.reduce((sum, d) => sum + d.newUsers, 0),
      data.current.newUsers,
    );
    assert.equal(
      data.daily.reduce((sum, d) => sum + d.newMuas, 0),
      data.current.newMuas,
    );
    assert.equal(
      data.daily.reduce((sum, d) => sum + d.bookings, 0),
      data.current.totalBookings,
    );
    const stats = fixtures.demoReport(from, to);
    assert.equal(
      stats.daily.reduce((sum, d) => sum + d.transactions, 0),
      data.current.successfulTransactions,
    );
    assert.equal(
      stats.daily.reduce((sum, d) => sum + d.reviews, 0),
      data.serviceReviews.total,
    );
  }
  const data = adapter.demoDashboard();
  assert.equal(
    data.daily.reduce((sum, d) => sum + d.newUsers - d.newMuas, 0),
    32,
  );
  assert.equal(
    data.daily.reduce((sum, d) => sum + d.newMuas, 0),
    7,
  );
  assert.ok(data.daily.every((d) => d.newMuas === 1));
  assert.equal(data.daily.length, 7);
  assert.equal(data.current.revenue, 2095000);
  assert.equal(data.current.successfulTransactions, 29);
});
