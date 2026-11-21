import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as ranges from "../src/lib/reporting-range.mjs";
import * as contracts from "../src/lib/contracts.mjs";
import * as transactions from "../src/lib/transactions.mjs";
import { fixture, reviewFixture } from "./fixtures/reporting-ui.mjs";

test("dashboard lifetime totals and review lists are requested with dates accepted by the deployed API", async () => {
  const calls = [];
  const mocks = {
    "@/lib/client": {
      request: async (path, method) => {
        const url = new URL(path, "https://backend.invalid/");
        calls.push({ path, method });
        // Reproduce the deployed API's rejection of unbounded all-time requests.
        if (
          url.searchParams.has("all") ||
          !url.searchParams.get("from") ||
          !url.searchParams.get("to")
        )
          throw Error("Chọn khoảng ngày hợp lệ, tối đa 366 ngày.");
        return url.pathname.endsWith("/reviews")
          ? { items: [reviewFixture], total: 1, page: 1, pageSize: 20 }
          : fixture;
      },
    },
    "@/lib/dashboard": { validateDashboard: (value) => value },
    "@/lib/reporting-range.mjs": ranges,
    "@/lib/contracts.mjs": contracts,
    "@/lib/transactions.mjs": transactions,
  };
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../src/repositories/admin-api.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    module: compiledModule,
    exports: compiledModule.exports,
    URLSearchParams,
    require: (name) => {
      if (!mocks[name]) throw Error(`Unexpected dependency ${name}`);
      return mocks[name];
    },
  });
  const api = compiledModule.exports.adminApi;
  const controller = new AbortController();
  const totals = await api.dashboard("", "", controller.signal);
  assert.equal(totals.lifetime.revenue, 2460000);
  const page = await api.dashboardReviews("", "", 4, 1, controller.signal);
  assert.equal(page.items[0].reviewId, reviewFixture.reviewId);
  for (const call of calls) {
    const params = new URL(call.path, "https://backend.invalid/").searchParams;
    assert.equal(params.has("all"), false);
    assert.equal(
      (Date.parse(params.get("to")) - Date.parse(params.get("from"))) /
        86400000 +
        1,
      30,
    );
    assert.equal(call.method, "GET");
  }
  assert.equal(
    new URL(calls[1].path, "https://backend.invalid/").searchParams.get(
      "rating",
    ),
    "4",
  );
  const count = calls.length;
  await assert.rejects(
    () => api.dashboard("2026-01-01", "", controller.signal),
    /366/,
  );
  assert.equal(calls.length, count);
});
