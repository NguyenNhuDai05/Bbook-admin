import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as status from "../src/lib/subscription-status.mjs";

const require = createRequire(import.meta.url);
const compiledModule = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(
      new URL("../src/components/mua-order-fulfillment.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText,
  {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (name) =>
      name === "next/link"
        ? {
            default: ({ children, ...props }) =>
              React.createElement("a", props, children),
          }
        : name === "@/lib/subscription-status.mjs"
          ? status
          : name.endsWith(".module.css")
            ? { default: {} }
            : require(name),
  },
);
const render = (props) =>
  renderToStaticMarkup(
    React.createElement(compiledModule.exports.MuaOrderFulfillment, props),
  );
const fulfillment = {
  workersEnabled: true,
  sponsoredDeliveryEnabled: true,
  lastJob: null,
};
test("paid unactivated order distinguishes app activation from manual external advertising", () => {
  const html = render({ grants: [], fulfillment, promotionTasks: [] });
  assert.match(html, /Chưa kích hoạt thời hạn nổi bật trong app/);
  assert.match(html, /không chờ đội BBook liên hệ/);
  assert.match(html, /Hệ thống không tự liên hệ hoặc tự đăng bài/);
  assert.match(html, /href="\/mua-promotions"/);
  assert.match(html, /Chưa có lượt xử lý kích hoạt/);
});
test("app interval and preparing task never claim the external article was published", () => {
  const html = render({
    grants: [
      {
        id: "grant",
        startsAt: "2026-11-04T00:00:00Z",
        endsAt: "2026-12-04T00:00:00Z",
        revokedAt: null,
      },
    ],
    fulfillment,
    promotionTasks: [
      {
        id: "task",
        state: "Preparing",
        cycleStartsAt: "2026-11-04T00:00:00Z",
        dueAt: "2026-11-09T00:00:00Z",
        publishedAt: null,
        publishedUrl: null,
      },
    ],
  });
  assert.match(html, /Đã ghi nhận thời hạn/);
  assert.match(html, /Đội BBook đang chuẩn bị/);
  assert.doesNotMatch(html, /Xem bài đã đăng/);
  assert.doesNotMatch(html, /Ghi nhận đăng:/);
});
test("disabled processing and failed job show actionable diagnostics without claiming success", () => {
  const html = render({
    grants: [],
    promotionTasks: [],
    fulfillment: {
      workersEnabled: false,
      sponsoredDeliveryEnabled: false,
      lastJob: {
        state: "ManualReview",
        attempts: 8,
        lastError: "COMMERCE_RETRY",
        availableAt: "2026-11-04T00:00:00Z",
      },
    },
  });
  assert.match(html, /MuaMonetization__WorkersEnabled/);
  assert.match(html, /MuaMonetization__SponsoredDeliveryEnabled/);
  assert.match(html, /COMMERCE_RETRY/);
  assert.match(html, /8/);
  assert.doesNotMatch(html, /Đã ghi nhận thời hạn/);
});
