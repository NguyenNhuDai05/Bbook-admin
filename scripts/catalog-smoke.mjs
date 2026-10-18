// Run only against the explicitly started local Phase C test fixture.
import assert from "node:assert/strict";
const root = "http://127.0.0.1:43188";
let checks = 0;
async function check(path, status, init = {}) {
  const response = await fetch(root + path, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, status, `${init.method ?? "GET"} ${path}`);
  checks++;
  return response;
}
await check("/styles", 307);
for (const path of [
  "makeup-catalog",
  "admin/makeup-catalog/terms",
  "admin/makeup-styles/1/usage",
])
  await check(`/api/backend/${path}`, 401);
await check("/api/backend/admin/makeup-catalog/terms", 403, {
  method: "POST",
  headers: { Origin: "https://attacker.invalid" },
  body: "{}",
});
await check("/api/backend/admin/makeup-catalog/terms/1/merge", 404, {
  method: "POST",
  headers: { Origin: root },
  body: "{}",
});
const login = await check("/api/session", 200, {
  method: "POST",
  headers: { Origin: root, "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "catalog@example.test",
    password: "local-fixture-only",
  }),
});
const cookie = login.headers.get("set-cookie").split(";")[0];
const headers = { Cookie: cookie };
const page = await check("/styles", 200, { headers });
const html = await page.text();
for (const tab of [
  "Danh mục Makeup",
  "Phong cách makeup",
  "Dịp / sự kiện",
  "Độ đậm nhạt",
  "Tông màu",
  "Hiệu ứng makeup",
  "Phong cách MUA tạo",
])
  assert.ok(html.includes(tab), tab);
for (const path of [
  "makeup-catalog",
  "admin/makeup-styles?page=1&pageSize=10",
  "admin/makeup-styles/1",
  "admin/makeup-styles/1/usage",
  "admin/makeup-catalog/terms?kind=occasion",
  "admin/makeup-catalog/terms/2",
  "admin/makeup-catalog/terms/2/usage",
])
  await check(`/api/backend/${path}`, 200, { headers });
const usage = await (
  await check("/api/backend/admin/makeup-styles/1/usage", 200, { headers })
).json();
assert.equal(usage.portfolioCount, null);
const update = await check("/api/backend/admin/makeup-styles/1", 409, {
  method: "PUT",
  headers: { ...headers, Origin: root, "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Test", description: "", expectedVersion: 6 }),
});
assert.equal((await update.json()).code, "CATALOG_VERSION_CONFLICT");
await check("/api/backend/admin/makeup-catalog/terms/2/archive", 403, {
  method: "POST",
  headers: { ...headers, Origin: "https://attacker.invalid" },
  body: "{}",
});
await check("/api/backend/admin/makeup-catalog/terms/2/merge", 404, {
  method: "POST",
  headers: { ...headers, Origin: root },
  body: "{}",
});
await check("/api/session", 200, {
  method: "DELETE",
  headers: { ...headers, Origin: root },
});
console.info(
  `${checks} Phase C local HTTP auth/proxy/SSR/contract checks passed against in-memory fixture only; no database writes.`,
);
