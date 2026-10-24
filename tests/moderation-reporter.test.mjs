import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(relativePath, mocks) {
  const compiled = ts.transpileModule(
    readFileSync(new URL(relativePath, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (name) => mocks[name] || require(name),
  });
  return compiledModule.exports;
}
const service = load("../src/services/moderation-service.ts", {
  "@/lib/client": { request() {}, invalidateResources() {} },
});
const report = {
  id: "11111111-1111-4111-8111-111111111111",
  targetType: "User",
  targetId: "22222222-2222-4222-8222-222222222222",
  reason: "Fraud",
  status: "Pending",
  createdAt: "2026-10-25T00:00:00Z",
  reporterName: "Người gửi báo cáo",
  reporterEmail: "reporter@gmail.com",
  contentAvailable: false,
  imageUrls: [],
};
function render(item, detail = false) {
  const { Moderation } = load("../src/components/moderation-pages.tsx", {
    "next/link": {
      default: ({ children, ...props }) =>
        React.createElement("a", props, children),
    },
    "@/lib/client": {
      useResource: () => ({
        data: detail ? item : { items: [item], total: 1 },
        loading: false,
        reload() {},
      }),
      useSubmission: () => ({ busy: false, begin: () => true, end() {} }),
    },
    "@/services/moderation-service": service,
    "@/lib/format": {
      date: (value) => value || "—",
      shortId: (id) => id.slice(0, 8).toUpperCase(),
    },
    "./ui": {
      PageTitle: ({ title }) => React.createElement("h1", null, title),
      Pagination: () => null,
      State: () => null,
      DocumentView: () => null,
      Modal: () => null,
    },
  });
  return renderToStaticMarkup(
    React.createElement(Moderation, {
      base: "",
      ...(detail ? { id: item.id } : {}),
    }),
  );
}
for (const detail of [false, true]) {
  const location = detail ? "detail" : "list";
  test(`${location} shows reporter name and complete Gmail address`, () => {
    const html = render(report, detail);
    assert.match(html, /Người báo cáo/);
    assert.match(html, /Người gửi báo cáo/);
    assert.match(html, /reporter@gmail\.com/);
    assert.match(html, /BC-11111111/);
  });
  test(`${location} handles older responses and unavailable reporter identity`, () => {
    for (const value of [undefined, null, ""]) {
      const html = render(
        { ...report, reporterName: value, reporterEmail: value },
        detail,
      );
      assert.match(html, /Chưa có thông tin email/);
      assert.doesNotMatch(html, /reporter@gmail\.com/);
    }
  });
  test(`${location} renders reporter information as escaped text`, () => {
    const html = render(
      {
        ...report,
        reporterName: '<script>alert("name")</script>',
        reporterEmail: "<img src=x onerror=alert(1)>@example.test",
      },
      detail,
    );
    assert.doesNotMatch(html, /<script>|<img/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /@example\.test/);
  });
}
