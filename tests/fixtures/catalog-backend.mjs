// Test-only loopback HTTP fixture. Never imported by src or regular npm dev/start.
import { createServer } from "node:http";
const terms = [
  {
    id: 1,
    kind: "occasion-group",
    key: "daily",
    label: "Sinh hoạt thường ngày",
  },
  { id: 2, kind: "occasion", key: "work", label: "Đi làm", groupId: 1 },
  { id: 3, kind: "effect-group", key: "complexion", label: "Lớp nền" },
  { id: 4, kind: "effect", key: "glow", label: "Căng bóng", groupId: 3 },
  { id: 5, kind: "intensity", key: "light", label: "Nhẹ" },
  { id: 6, kind: "intensity", key: "medium", label: "Vừa" },
  { id: 7, kind: "intensity", key: "bold", label: "Đậm" },
  { id: 8, kind: "color-tone", key: "rose", label: "Hồng" },
].map((t) => ({
  description: "Dữ liệu test local",
  groupId: null,
  broaderTermId: null,
  sortOrder: 0,
  isActive: true,
  archivedAt: null,
  version: 3,
  ...t,
}));
const styles = Array.from({ length: 12 }, (_, i) => ({
  styleId: i + 1,
  name: `Phong cách kiểm thử ${i + 1}`,
  key: i === 11 ? null : `test-${i + 1}`,
  description:
    "Mô tả kiểm thử cho bố cục bảng trên desktop và tablet, không phải dữ liệu runtime production.",
  source: i === 11 ? "LegacyUnknown" : i % 2 ? "MUA" : "Admin",
  reviewStatus: i % 2 ? "Pending" : "Approved",
  isActive: true,
  archivedAt: null,
  version: 7,
  sortOrder: i,
  metadata: [terms[1]],
  createdAt: "2026-10-18T00:00:00Z",
}));
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:43187");
  const path = url.pathname.replace(/^\/api\//, "");
  function json(body, status = 200) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  }
  if (path === "Auth/login" && req.method === "POST")
    return json({
      role: "Admin",
      token: "catalog-local-test-only",
      expiration: new Date(Date.now() + 3600000).toISOString(),
    });
  if (req.headers.authorization !== "Bearer catalog-local-test-only")
    return json({ message: "Fixture unauthorized" }, 401);
  if (path === "User/profile")
    return json({
      userId: "11111111-1111-1111-1111-111111111111",
      fullName: "Catalog test admin",
      email: "catalog@example.test",
      role: "Admin",
    });
  if (path === "makeup-catalog")
    return json({ version: "fixture", styles, terms });
  if (path.endsWith("/usage"))
    return json({
      muaCount: 2,
      serviceCount: 4,
      portfolioCount: null,
      styleMetadataCount: 1,
      childTermCount: 0,
      portfolioUsage: "unavailable-until-structured-tagging",
    });
  const isStyle = path.startsWith("admin/makeup-styles");
  const prefix = isStyle ? "admin/makeup-styles" : "admin/makeup-catalog/terms";
  if (!path.startsWith(prefix))
    return json(
      { message: "Fixture does not implement this unrelated API" },
      404,
    );
  const id = Number(path.slice(prefix.length + 1).split("/")[0]);
  const all = isStyle ? styles : terms;
  if (req.method !== "GET")
    return json(
      {
        code: "CATALOG_VERSION_CONFLICT",
        message: "Fixture conflict: reload the record",
      },
      409,
    );
  if (id)
    return json(
      all.find((row) => (isStyle ? row.styleId : row.id) === id) ?? null,
    );
  let rows = all.filter(
    (row) =>
      (!url.searchParams.get("kind") ||
        row.kind === url.searchParams.get("kind")) &&
      (!url.searchParams.get("source") ||
        row.source === url.searchParams.get("source")) &&
      (!url.searchParams.get("reviewStatus") ||
        row.reviewStatus === url.searchParams.get("reviewStatus")) &&
      (!url.searchParams.get("groupId") ||
        row.groupId === Number(url.searchParams.get("groupId"))),
  );
  const search = url.searchParams.get("search")?.toLowerCase();
  if (search)
    rows = rows.filter((row) =>
      `${row.name ?? row.label} ${row.key}`.toLowerCase().includes(search),
    );
  const status = url.searchParams.get("status");
  if (status === "archived") rows = rows.filter((row) => row.archivedAt);
  if (status === "inactive")
    rows = rows.filter((row) => !row.isActive && !row.archivedAt);
  const page = Number(url.searchParams.get("page") || 1);
  const pageSize = Number(url.searchParams.get("pageSize") || 10);
  return json({
    items: rows.slice((page - 1) * pageSize, page * pageSize),
    total: rows.length,
    page,
    pageSize,
  });
});
server.listen(43187, "127.0.0.1", () =>
  console.info(
    "Catalog test fixture listening on 127.0.0.1:43187; no database connections.",
  ),
);
