import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as contracts from "../src/lib/catalog-contracts.mjs";
import * as common from "../src/lib/contracts.mjs";
import { allowedApiPath, isSameOrigin } from "../src/lib/policy.mjs";
const require = createRequire(import.meta.url);
function load(path, mocks = {}, globals = {}) {
  const compiled = ts.transpileModule(
    readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: compiledModule,
    Error,
    exports: compiledModule.exports,
    require: (name) => mocks[name] ?? require(name),
    ...globals,
  });
  return compiledModule.exports;
}
const base = {
  name: "Soft Glam",
  label: "Soft Glam",
  description: "",
  sortOrder: 0,
};
test("validation follows backend key grammar and lengths", () => {
  for (const key of ["warm", "warm-tone-2", "a"])
    assert.equal(contracts.validCatalogKey(key), true);
  for (const key of ["A", "-x", "x-", "a--b", "a_b", "a".repeat(101)])
    assert.equal(contracts.validCatalogKey(key), false);
  assert.equal(contracts.catalogValidation(base, true, true), "");
  for (const value of [
    { name: " " },
    { name: "x".repeat(101) },
    { description: "x".repeat(256) },
    { sortOrder: -1 },
    { sortOrder: 1.2 },
    { sortOrder: NaN },
    { key: "x-" },
  ])
    assert.ok(contracts.catalogValidation({ ...base, ...value }, true, true));
  assert.equal(
    contracts.catalogValidation(
      {
        ...base,
        key: "warm",
        kind: "color-tone",
        description: "x".repeat(2000),
      },
      false,
      true,
    ),
    "",
  );
  assert.ok(
    contracts.catalogValidation(
      {
        ...base,
        key: "warm",
        kind: "color-tone",
        description: "x".repeat(2001),
      },
      false,
      true,
    ),
  );
});
test("intensity creation prohibited; grouped terms require a group; immutable keys omitted on update", () => {
  assert.ok(
    contracts.catalogValidation(
      { ...base, kind: "intensity", key: "light" },
      false,
      true,
    ),
  );
  assert.ok(
    contracts.catalogValidation(
      { ...base, kind: "effect", key: "glow" },
      false,
      true,
    ),
  );
  assert.equal(
    contracts.catalogValidation(
      { ...base, kind: "effect", key: "glow", groupId: 1 },
      false,
      true,
    ),
    "",
  );
  assert.equal(
    contracts.catalogValidation({ ...base, kind: "intensity" }, false, false),
    "",
  );
});
test("review filters never invent provenance or send invalid review status", () => {
  assert.deepEqual(contracts.reviewFilters("LegacyUnknown"), {
    source: "LegacyUnknown",
  });
  assert.deepEqual(contracts.reviewFilters("Archived"), {
    source: "MUA",
    status: "archived",
  });
  assert.deepEqual(contracts.reviewFilters("Pending"), {
    source: "MUA",
    reviewStatus: "Pending",
  });
  assert.equal(
    contracts.canReview({ source: "LegacyUnknown", version: 2 }),
    false,
  );
  assert.equal(contracts.canReview({ source: "MUA", version: 2 }), true);
  assert.equal(
    contracts.canReview({ source: "MUA", version: 2, archivedAt: "now" }),
    false,
  );
  assert.equal(contracts.canActivate({ reviewStatus: "Rejected" }), false);
  assert.equal(contracts.canActivate({ archivedAt: "now" }), false);
});
test("conflicts, unavailable endpoints and null portfolio are honest", () => {
  for (const code of [
    "VERSION_CONFLICT",
    "CATALOG_VERSION_CONFLICT",
    "CATALOG_WRITE_CONFLICT",
  ])
    assert.match(contracts.catalogError(409, { code }, "fallback"), /Tải lại/);
  assert.match(contracts.catalogError(404, {}, "fallback"), /Phase B/);
  assert.equal(contracts.portfolioUsageLabel(null), "Chưa hỗ trợ");
  assert.equal(contracts.portfolioUsageLabel(0), "0");
  assert.equal(contracts.catalogError(403, {}, "denied"), "denied");
});
test("explicit proxy allowlist grants only existing Phase B endpoints", () => {
  for (const [method, path] of [
    ["GET", "makeup-catalog"],
    ["GET", "admin/makeup-styles/12/usage"],
    ["POST", "admin/makeup-styles/12/archive"],
    ["POST", "admin/makeup-styles/12/review"],
    ["GET", "admin/makeup-catalog/terms"],
    ["POST", "admin/makeup-catalog/terms"],
    ["GET", "admin/makeup-catalog/terms/12"],
    ["PUT", "admin/makeup-catalog/terms/12"],
    ["GET", "admin/makeup-catalog/terms/12/usage"],
    ["PATCH", "admin/makeup-catalog/terms/12/status"],
    ["POST", "admin/makeup-catalog/terms/12/archive"],
  ])
    assert.equal(allowedApiPath(method, path), true, `${method} ${path}`);
  for (const [method, path] of [
    ["DELETE", "admin/makeup-catalog/terms/1"],
    ["POST", "makeup-catalog"],
    ["POST", "admin/makeup-catalog/terms/1/merge"],
    ["POST", "admin/makeup-styles/1/merge"],
    ["GET", "admin/makeup-catalog/terms/0"],
    ["PATCH", "admin/makeup-catalog/terms/1"],
    ["POST", "admin/makeup-catalog/import"],
    ["GET", "admin/makeup-catalog/terms/1/../1"],
  ])
    assert.equal(allowedApiPath(method, path), false, `${method} ${path}`);
  assert.equal(
    isSameOrigin("https://attacker.invalid", "http://127.0.0.1:3001"),
    false,
  );
});
test("API requests exact DTO filters, methods, version and optional metadata semantics", async () => {
  const calls = [];
  const api = load("repositories/catalog-api.ts", {
    "@/lib/client": {
      request: async (...args) => {
        calls.push(args);
        return { items: [], total: 0, page: 1, pageSize: 10 };
      },
    },
    "@/lib/contracts.mjs": common,
    "@/lib/catalog-contracts.mjs": contracts,
  }).catalogApi;
  await api.list(true, {
    page: 2,
    search: "mắt & môi",
    status: "all",
    source: "MUA",
    reviewStatus: "Pending",
  });
  const query = new URLSearchParams(calls[0][0].split("?")[1]);
  assert.equal(query.get("search"), "mắt & môi");
  assert.equal(query.get("pageSize"), "10");
  assert.equal(query.get("source"), "MUA");
  await api.save(true, 2, {
    name: "Glam",
    description: "",
    sortOrder: 3,
    expectedVersion: 7,
  });
  assert.equal(calls[1][1], "PUT");
  assert.equal(calls[1][2].expectedVersion, 7);
  assert.equal("metadataTermIds" in calls[1][2], false);
  await api.save(true, 2, { ...base, expectedVersion: 7, metadataTermIds: [] });
  assert.equal(calls[2][2].metadataTermIds.length, 0);
  await api.lifecycle(true, 2, "review", {
    status: "Rejected",
    expectedVersion: 7,
    reason: "Duplicate",
  });
  assert.equal(calls[3][1], "POST");
  assert.equal(calls[3][0], "admin/makeup-styles/2/review");
  await api.lifecycle(false, 4, "status", {
    isActive: false,
    expectedVersion: 3,
  });
  assert.equal(calls[4][1], "PATCH");
});
test("all term options use server pagination without truncating or fabricating results", async () => {
  let page = 0;
  const term = { id: 1, kind: "occasion", key: "a", label: "A", version: 1 };
  const api = load("repositories/catalog-api.ts", {
    "@/lib/client": {
      request: async () => ({
        items:
          ++page === 1
            ? Array.from({ length: 100 }, (_, i) => ({ ...term, id: i + 1 }))
            : [{ ...term, id: 101 }],
        page,
        pageSize: 100,
        total: 101,
      }),
    },
    "@/lib/contracts.mjs": common,
    "@/lib/catalog-contracts.mjs": contracts,
  }).catalogApi;
  const result = await api.terms();
  assert.equal(result.length, 101);
  assert.equal(page, 2);
});
test("client retains API status/code for version conflicts while sanitizing errors", async () => {
  const api = load(
    "lib/client.ts",
    { "./contracts.mjs": common },
    {
      EventTarget,
      fetch: async () =>
        Response.json(
          { code: "CATALOG_VERSION_CONFLICT", message: "Reload" },
          { status: 409 },
        ),
    },
  );
  await assert.rejects(
    api.request("admin/makeup-styles/1", "PUT", {}),
    (e) => e.status === 409 && e.code === "CATALOG_VERSION_CONFLICT",
  );
});

// Render actual components using the existing React dependency. Hooks are controlled
// so event handlers can be exercised without adding a UI testing dependency.
function uiHarness(record, terms = [], mutate = async () => {}) {
  const stores = new Map();
  let current = "",
    index = 0;
  let root;
  const hooks = {
    ...React,
    useState(initial) {
      const key = `${current}:${index++}`;
      if (!stores.has(key))
        stores.set(key, typeof initial === "function" ? initial() : initial);
      return [
        stores.get(key),
        (value) =>
          stores.set(
            key,
            typeof value === "function" ? value(stores.get(key)) : value,
          ),
      ];
    },
    useRef(initial) {
      const [ref] = hooks.useState({ current: initial });
      return ref;
    },
    useEffect() {},
  };
  const calls = [];
  const resource = {
    loading: false,
    error: "",
    reload() {
      calls.push("reload");
    },
  };
  const client = {
    ApiError: class extends Error {},
    useResource: (q) => ({
      ...resource,
      data: q.usage
        ? {
            muaCount: 2,
            serviceCount: 4,
            portfolioCount: null,
            styleMetadataCount: 1,
            childTermCount: 0,
          }
        : record,
    }),
    useSubmission() {
      const [lock] = hooks.useState(common.createSubmissionLock);
      const [busy, setBusy] = hooks.useState(false);
      return {
        busy,
        begin() {
          if (!lock.acquire()) return false;
          setBusy(true);
          return true;
        },
        end() {
          lock.release();
          setBusy(false);
        },
      };
    },
  };
  const service = {
    detail: () => ({}),
    usage: () => ({ usage: true }),
    async save(...args) {
      calls.push(args);
      return mutate(...args);
    },
    async lifecycle(...args) {
      calls.push(args);
      return mutate(...args);
    },
  };
  const mocks = {
    react: hooks,
    "@/lib/client": client,
    "@/services/catalog-service": { catalogService: service },
    "@/lib/catalog-contracts.mjs": contracts,
    "./admin-reference.module.css": {},
    "./makeup-catalog.module.css": {},
    "./ui": {
      Modal: (p) =>
        React.createElement(
          "section",
          { "aria-label": p.title, onClose: p.onClose },
          p.children,
        ),
      SubmitButton: ({ busy, ...p }) =>
        React.createElement("button", { ...p, disabled: p.disabled || busy }),
    },
  };
  const Panel = load(
    "components/makeup-catalog-panel.tsx",
    mocks,
  ).CatalogRecordPanel;
  const props = {
    styles: true,
    id: record?.styleId ?? null,
    kind: "occasion",
    terms,
    termsError: "",
    onReloadTerms() {},
    onClose() {
      calls.push("close");
    },
    onSaved() {
      calls.push("saved");
    },
  };
  function evaluate(element, path = "root") {
    if (Array.isArray(element))
      return element.map((el, i) => evaluate(el, `${path}.${i}`));
    if (!React.isValidElement(element)) return element;
    if (typeof element.type === "function") {
      current = `${path}:${element.type.name}`;
      index = 0;
      return evaluate(element.type(element.props), `${path}.child`);
    }
    const children = evaluate(element.props.children, `${path}.children`);
    return React.createElement(
      element.type,
      {
        ...element.props,
        key: path,
      },
      children,
    );
  }
  function render() {
    root = evaluate(React.createElement(Panel, props));
    return root;
  }
  function nodes(element) {
    if (Array.isArray(element)) return element.flatMap((e) => nodes(e));
    if (!React.isValidElement(element)) return [];
    return [element, ...nodes(element.props.children)];
  }
  function text(el) {
    if (Array.isArray(el)) return el.map(text).join("");
    if (!React.isValidElement(el)) return el == null ? "" : String(el);
    return text(el.props.children);
  }
  render();
  return {
    calls,
    render,
    nodes: () => nodes(root),
    html: () => renderToStaticMarkup(root),
    button(label) {
      const el = nodes(root).find(
        (n) => n.type === "button" && text(n) === label,
      );
      assert.ok(el, `button ${label}`);
      return el;
    },
    props,
  };
}
const style = {
  styleId: 2,
  name: "Natural",
  key: "natural",
  description: "",
  version: 7,
  source: "MUA",
  reviewStatus: "Pending",
  isActive: true,
  archivedAt: null,
  sortOrder: 1,
  metadata: [],
};
test("detail renders null portfolio as unavailable and Pending MUA can remain active", () => {
  const h = uiHarness(style);
  assert.match(h.html(), /Chưa hỗ trợ/);
  assert.match(h.html(), /Hoạt động/);
  assert.ok(h.button("Duyệt"));
  assert.ok(h.button("Từ chối"));
});
test("legacy and archived styles expose no false review or activation actions", () => {
  const h = uiHarness({ ...style, source: "LegacyUnknown", archivedAt: "now" });
  const text = h.html();
  assert.doesNotMatch(text, />Duyệt<|>Từ chối<|>Kích hoạt<|>Archive</);
  const old = { ...style };
  delete old.version;
  const legacy = uiHarness(old);
  assert.match(legacy.html(), /Backend chưa cung cấp version/);
  assert.doesNotMatch(legacy.html(), />Chỉnh sửa</);
});
test("edit submits expectedVersion, omits key and preserves untouched metadata", async () => {
  const h = uiHarness(style);
  h.button("Chỉnh sửa").props.onClick();
  h.render();
  assert.equal(
    h.nodes().find((n) => n.type === "input" && n.props.value === "natural")
      .props.disabled,
    true,
  );
  h.nodes()
    .find((n) => n.type === "form")
    .props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  const [styles, id, body] = h.calls.find(Array.isArray);
  assert.equal(styles, true);
  assert.equal(id, 2);
  assert.equal(body.expectedVersion, 7);
  assert.equal("key" in body, false);
  assert.equal("metadataTermIds" in body, false);
});
test("submit lock blocks duplicate requests and closing during pending save", async () => {
  let finish;
  const h = uiHarness(
    style,
    [],
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  h.button("Chỉnh sửa").props.onClick();
  h.render();
  const submit = h.nodes().find((n) => n.type === "form").props.onSubmit;
  submit({ preventDefault() {} });
  submit({ preventDefault() {} });
  h.render();
  assert.equal(h.calls.filter(Array.isArray).length, 1);
  h.nodes()
    .find((n) => n.type === "section")
    .props.onClose();
  assert.equal(h.calls.includes("close"), false);
  assert.equal(h.button("Lưu danh mục").props.disabled, true);
  finish();
  await new Promise(setImmediate);
});
test("reject reason is required and successful request keeps version", async () => {
  const h = uiHarness(style);
  h.button("Từ chối").props.onClick();
  h.render();
  let form = h.nodes().find((n) => n.type === "form");
  form.props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.equal(h.calls.filter(Array.isArray).length, 0);
  h.render();
  assert.match(h.html(), /Vui lòng nhập lý do/);
  h.nodes()
    .find((n) => n.type === "textarea")
    .props.onChange({ target: { value: "Không phù hợp" } });
  h.render();
  form = h.nodes().find((n) => n.type === "form");
  form.props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  const call = h.calls.find(Array.isArray);
  assert.equal(call[2], "review");
  assert.equal(call[3].status, "Rejected");
  assert.equal(call[3].expectedVersion, 7);
});
test("failed mutation leaves form open with explicit reload control", async () => {
  const h = uiHarness(style, [], async () => {
    throw new Error("Danh mục đã thay đổi; hãy tải lại trước khi lưu.");
  });
  h.button("Chỉnh sửa").props.onClick();
  h.render();
  h.nodes()
    .find((n) => n.type === "form")
    .props.onSubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  h.render();
  assert.match(h.html(), /Danh mục đã thay đổi/);
  assert.ok(h.button("Tải lại bản mới (bỏ thay đổi chưa lưu)"));
  assert.equal(h.calls.includes("saved"), false);
});
