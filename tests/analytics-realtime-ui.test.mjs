import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const source = ts.transpileModule(
  readFileSync(
    new URL("../src/components/analytics-realtime.tsx", import.meta.url),
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
function render(mode, data, message = "Đang tải") {
  let state = 0;
  const compiledModule = { exports: {} };
  const mocks = {
    react: {
      ...React,
      useState: () => [state++ === 0 ? data : message, () => {}],
      useEffect: () => {},
    },
    "./website-analytics.module.css": new Proxy(
      {},
      { get: (_, key) => String(key) },
    ),
  };
  vm.runInNewContext(source, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (name) => mocks[name] || require(name),
  });
  return renderToStaticMarkup(
    React.createElement(compiledModule.exports.RealtimeActivity, { mode }),
  );
}
const data = {
  status: "ready",
  active5: 1,
  active30: 2,
  views5: 4,
  views30: 12,
  minutes: Array.from({ length: 30 }, (_, i) => ({
    minutesAgo: 29 - i,
    users: i === 29 ? 1 : 0,
    views: i === 29 ? 4 : 0,
  })),
  fetchedAt: "2026-10-15T01:00:00Z",
};
test("page views render independent totals, minute chart, accessible values and repeated-view explanation", () => {
  const html = render("views", data);
  assert.match(html, /<strong>4<\/strong>/);
  assert.match(html, /<strong>12<\/strong>/);
  assert.match(html, /lượt xem trong 30 phút gần đây/);
  assert.match(html, /Lượt xem trang từng phút/);
  assert.match(html, /4 lượt xem/);
  assert.match(html, /Tính cả lượt xem lại/);
  assert.equal((html.match(/<rect /g) || []).length, 30);
  assert.doesNotMatch(html, /người trong 30 phút/);
});
test("active people retain their own counts and unavailable views show a message without zero chart", () => {
  const people = render("users", data);
  assert.match(people, /<strong>2<\/strong>/);
  assert.match(people, /người trong 30 phút/);
  const error = render("views", undefined, "Chưa kết nối GA4");
  assert.match(error, /Chưa kết nối GA4/);
  assert.doesNotMatch(error, /<svg|<strong>0/);
});
