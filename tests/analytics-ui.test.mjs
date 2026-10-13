import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as contracts from "../src/lib/analytics-contracts.mjs";
import {
  analyticsReports,
  normalizeAnalytics,
} from "../src/lib/analytics-data.mjs";

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(
  readFileSync(
    new URL("../src/components/website-analytics.tsx", import.meta.url),
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
function render(resource) {
  const compiledModule = { exports: {} };
  const mocks = {
    "@/lib/client": {
      useResource: () => ({
        reload() {},
        loading: false,
        error: "",
        ...resource,
      }),
    },
    "@/lib/analytics-contracts.mjs": contracts,
    "@/services/analytics-service": { websiteAnalyticsQuery: () => ({}) },
    "./website-analytics.module.css": new Proxy(
      {},
      { get: (_, key) => String(key) },
    ),
    "./ui": {
      PageTitle: ({ title, description, action }) =>
        React.createElement(
          "header",
          null,
          React.createElement("h1", null, title),
          React.createElement("p", null, description),
          action,
        ),
    },
  };
  vm.runInNewContext(compiled, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (name) => mocks[name] || require(name),
  });
  return renderToStaticMarkup(
    React.createElement(compiledModule.exports.WebsiteAnalytics),
  );
}
function snapshot(reason = null) {
  const today = contracts.analyticsToday();
  const range = contracts.analyticsRange(today, today);
  const reports = Object.fromEntries(
    analyticsReports(range, ["bbookmakeup.com"]).map((spec) => [
      spec.id,
      {
        dimensionHeaders: [
          ...spec.request.dimensions,
          ...(spec.request.dateRanges.length > 1
            ? [{ name: "dateRange" }]
            : []),
        ],
        metricHeaders: spec.request.metrics,
        rowCount: 0,
        metadata: {
          timeZone: contracts.ANALYTICS_TIMEZONE,
          ...(reason && spec.id === "totals" ? { emptyReason: reason } : {}),
        },
      },
    ]),
  );
  return normalizeAnalytics(
    range,
    reports,
    ["bbookmakeup.com"],
    new Date().toISOString(),
  );
}
test("MVP zero-data UI renders seven required KPI labels, retained Play, trend selector and both attribution tables", () => {
  const html = render({ data: snapshot() });
  for (const label of [
    "Tổng người truy cập",
    "Người dùng mới",
    "Phiên truy cập",
    "Tổng lượt xem trang",
    "Lượt nhấn tải APK",
    "Tỷ lệ tương tác",
    "Thời gian tương tác trung bình",
    "Lượt nhấn Google Play",
    "Hiệu quả nguồn truy cập",
    "Chiến dịch UTM chi tiết",
    "Top Pages",
    "(data not available)",
    "(not set)",
    "Khoảng ngày có hôm nay",
  ])
    assert.ok(html.includes(label), label);
  assert.ok(!html.includes("Click-through Rate"));
  assert.ok(!html.includes("Top Landing Pages"));
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes("Xem dữ liệu theo ngày"));
});
test("unavailable metadata renders dash and explanation, while API error and disconnected have distinct states", () => {
  const unavailable = render({ data: snapshot("Processing pending") });
  assert.ok(unavailable.includes("Processing pending"));
  assert.ok(unavailable.includes("GA4 chưa cung cấp chỉ số"));
  const error = render({ error: "Google Analytics đang giới hạn truy vấn." });
  assert.ok(error.includes('role="alert"'));
  assert.ok(error.includes("Thử lại"));
  const disconnected = render({
    data: { status: "not_connected", message: "Chưa cấu hình" },
  });
  assert.ok(disconnected.includes("Chưa kết nối Google Analytics"));
  assert.ok(!disconnected.includes("Khoảng ngày có hôm nay"));
});
