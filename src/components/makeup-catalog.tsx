"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, RotateCcw, Search } from "lucide-react";
import { useResource } from "@/lib/client";
import { catalogService } from "@/services/catalog-service";
import {
  catalogTabs,
  intensityKeys,
  reviewFilters,
} from "@/lib/catalog-contracts.mjs";
import type {
  CatalogFilters,
  CatalogStyle,
  CatalogTerm,
  TermKind,
} from "@/lib/catalog-types";
import {
  AdminEmptyState,
  AdminNotice,
  AdminPageHeader,
  AdminToolbar,
} from "./admin-reference-ui";
import { Pagination } from "./ui";
import {
  CatalogRecordPanel,
  CatalogUsageView,
  recordId,
  recordLabel,
} from "./makeup-catalog-panel";
import css from "./admin-reference.module.css";
import c from "./makeup-catalog.module.css";
export function MakeupCatalog() {
  const [tab, setTab] = useState("styles");
  return (
    <div className={css.page}>
      <AdminPageHeader
        title="Danh mục Makeup"
        description="Quản lý phong cách, taxonomy và kiểm duyệt trong cùng một danh mục."
      />
      <nav aria-label="Danh mục Makeup" className={c.tabs}>
        {catalogTabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      <CatalogSection key={tab} tab={tab} />
    </div>
  );
}
function CatalogSection({ tab }: { tab: string }) {
  const styles = tab === "styles" || tab === "review";
  const [groups, setGroups] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<CatalogFilters>({
    page: 1,
    search: "",
    status: "all",
  });
  const [review, setReview] = useState("");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<{ id: number | null } | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const grouped = tab === "occasion" || tab === "effect";
  const kind = (groups ? `${tab}-group` : tab) as TermKind;
  const query: CatalogFilters = {
    ...filters,
    ...(!styles ? { kind } : {}),
    ...(tab === "review" ? reviewFilters(review) : {}),
  };
  const resource = useResource(catalogService.list(styles, query));
  const options = useResource(catalogService.terms());
  const snapshot = useResource(catalogService.snapshot());
  const rows = (resource.data?.items ?? []).filter(
    (row) =>
      tab !== "intensity" || intensityKeys.includes((row as CatalogTerm).key),
  );
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setFilters((p) =>
          p.search === search.trim()
            ? p
            : { ...p, search: search.trim(), page: 1 },
        ),
      300,
    );
    return () => clearTimeout(timer);
  }, [search]);
  const pages = Math.max(1, Math.ceil((resource.data?.total ?? 0) / 10));
  useEffect(() => {
    if (
      resource.data &&
      !resource.loading &&
      !resource.error &&
      filters.page > pages
    )
      setFilters((p) => ({ ...p, page: pages }));
  }, [resource.data, resource.loading, resource.error, filters.page, pages]);
  function open(id: number | null, element: HTMLElement) {
    trigger.current = element;
    setPanel({ id });
  }
  function close() {
    setPanel(null);
    requestAnimationFrame(() => {
      if (trigger.current?.isConnected) trigger.current.focus();
      else searchRef.current?.focus();
    });
  }
  const groupOptions = (options.data ?? []).filter(
    (t) => t.kind === `${tab}-group`,
  );
  return (
    <>
      {notice && (
        <AdminNotice onDismiss={() => setNotice("")}>{notice}</AdminNotice>
      )}
      <p className={c.hint}>
        {snapshot.error
          ? "Chưa đọc được catalog công khai. Backend có thể chưa triển khai Phase B; các chức năng khả dụng được hiển thị theo API thực tế."
          : snapshot.loading
            ? "Đang kiểm tra catalog công khai…"
            : `Catalog công khai: ${snapshot.data?.styles.length ?? 0} phong cách đang hoạt động.`}
        {tab === "effect" &&
          " Hiệu ứng trong catalog không đồng nghĩa Advisor Engine hỗ trợ. API chưa cung cấp ánh xạ engine; trạng thái hỗ trợ chưa xác định. Thêm hiệu ứng không tạo quy tắc AI."}
        {tab === "review" &&
          " Phong cách MUA hợp lệ được sử dụng ngay khi lưu. Từ chối sẽ tắt mục, giữ lịch sử và liên kết. LegacyUnknown chưa xác định người tạo và không thể kiểm duyệt như nguồn MUA."}
        {tab === "intensity" &&
          " Chỉ light, medium, bold. Chưa import dữ liệu thì danh sách có thể rỗng; không tạo thêm mức độ."}
      </p>
      <section
        className={css.tablePanel}
        aria-label={catalogTabs.find(([key]) => key === tab)?.[1]}
      >
        <AdminToolbar>
          <div className={css.search}>
            <Search size={16} aria-hidden="true" />
            <input
              ref={searchRef}
              aria-label="Tìm danh mục"
              type="search"
              placeholder="Tìm tên hoặc stable key…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className={css.statusFilter}>
            Trạng thái
            <select
              value={
                tab === "review" && review === "Archived"
                  ? "archived"
                  : filters.status
              }
              disabled={tab === "review" && review === "Archived"}
              onChange={(e) =>
                setFilters((p) => ({ ...p, status: e.target.value, page: 1 }))
              }
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Tạm ẩn</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          {tab === "styles" && (
            <label className={css.statusFilter}>
              Nguồn
              <select
                value={filters.source ?? ""}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    source: e.target.value || undefined,
                    page: 1,
                  }))
                }
              >
                <option value="">Tất cả</option>
                {["System", "Admin", "MUA", "LegacyUnknown"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          )}
          {tab === "review" && (
            <label className={css.statusFilter}>
              Kiểm duyệt
              <select
                value={review}
                onChange={(e) => {
                  setReview(e.target.value);
                  setFilters((p) => ({ ...p, status: "all", page: 1 }));
                }}
              >
                <option value="">Tất cả nguồn MUA</option>
                {[
                  "Pending",
                  "Approved",
                  "Rejected",
                  "Archived",
                  "LegacyUnknown",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          )}
          {grouped && (
            <>
              <button
                className="button secondary"
                aria-pressed={groups}
                onClick={() => {
                  setGroups(!groups);
                  setFilters({ page: 1, search: "", status: "all" });
                  setSearch("");
                }}
              >
                {" "}
                {groups ? "Xem các mục" : "Quản lý nhóm"}
              </button>
              {!groups && (
                <label className={css.statusFilter}>
                  Nhóm
                  <select
                    value={filters.groupId ?? ""}
                    onChange={(e) =>
                      setFilters((p) => ({
                        ...p,
                        groupId: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                        page: 1,
                      }))
                    }
                  >
                    <option value="">Tất cả nhóm</option>
                    {groupOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                        {!g.isActive ? " (ngừng dùng)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
          <button
            className={css.iconButton}
            aria-label="Làm mới danh mục"
            disabled={resource.loading}
            onClick={() => {
              resource.reload();
              options.reload();
              snapshot.reload();
            }}
          >
            <RotateCcw size={16} />
          </button>
          {tab !== "intensity" && tab !== "review" && (
            <button
              className={`button primary ${css.primaryButton}`}
              onClick={(e) => open(null, e.currentTarget)}
            >
              <Plus size={16} />
              {groups ? "Thêm nhóm" : "Thêm mới"}
            </button>
          )}
        </AdminToolbar>
        {options.error && (
          <p className={c.hint} role="status">
            Không tải được lựa chọn taxonomy. Chỉnh sửa metadata/nhóm sẽ tạm
            khóa.{" "}
            <button className="button secondary" onClick={options.reload}>
              Tải lại lựa chọn
            </button>
          </p>
        )}
        {resource.error ? (
          <AdminEmptyState
            error
            title="Không thể tải danh mục"
            description={
              resource.error +
              " Backend có thể chưa triển khai endpoint hoặc migration Phase B."
            }
            action={
              <button className="button secondary" onClick={resource.reload}>
                Thử lại
              </button>
            }
          />
        ) : resource.loading ? (
          <p className={c.hint} role="status">
            Đang tải danh mục…
          </p>
        ) : rows.length === 0 ? (
          <AdminEmptyState
            title="Chưa có dữ liệu phù hợp"
            description="Thử đổi bộ lọc. Taxonomy có thể chưa được import trên môi trường này."
            action={
              <button
                className="button secondary"
                onClick={() => {
                  setSearch("");
                  setReview("");
                  setFilters({ page: 1, search: "", status: "all" });
                }}
              >
                Xóa bộ lọc
              </button>
            }
          />
        ) : (
          <div className={css.tableScroll}>
            <table className={c.table}>
              <caption className={c.srOnly}>
                Danh mục và số lượng sử dụng; thao tác mở chi tiết
              </caption>
              <thead>
                <tr>
                  <th>Tên / stable key</th>
                  <th>Mô tả</th>
                  {styles ? (
                    <>
                      <th>Nguồn / kiểm duyệt</th>
                      <th>MUA / dịch vụ</th>
                    </>
                  ) : grouped && !groups ? (
                    <th>Nhóm</th>
                  ) : null}
                  <th>Trạng thái</th>
                  <th>Thứ tự</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const style = row as CatalogStyle;
                  const term = row as CatalogTerm;
                  const id = recordId(row);
                  return (
                    <tr key={id}>
                      <td>
                        <strong>{recordLabel(row) || "Chưa có tên"}</strong>
                        <code>{row.key || "Chưa có key (legacy)"}</code>
                      </td>
                      <td>
                        <span
                          className={c.description}
                          title={row.description ?? ""}
                        >
                          {row.description || "—"}
                        </span>
                      </td>
                      {styles ? (
                        <>
                          <td>
                            {style.source || "LegacyUnknown"}
                            <small>
                              {style.reviewStatus || "Chưa có dữ liệu"}
                            </small>
                          </td>
                          <td>
                            <CatalogUsageView styles id={id} compact />
                          </td>
                        </>
                      ) : grouped && !groups ? (
                        <td>
                          {groupOptions.find((g) => g.id === term.groupId)
                            ?.label ??
                            (term.groupId
                              ? `Nhóm #${term.groupId}`
                              : "Chưa có nhóm")}
                        </td>
                      ) : null}
                      <td>
                        {row.archivedAt
                          ? "Archived"
                          : row.isActive
                            ? "Hoạt động"
                            : "Tạm ẩn"}
                      </td>
                      <td>{row.sortOrder ?? "—"}</td>
                      <td>
                        <button
                          className="button secondary"
                          onClick={(e) => open(id, e.currentTarget)}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!resource.error && !resource.loading && resource.data && (
          <Pagination
            page={filters.page}
            size={10}
            total={resource.data.total}
            count={rows.length}
            onPage={(page) => setFilters((p) => ({ ...p, page }))}
            server
          />
        )}
      </section>
      {panel && (
        <CatalogRecordPanel
          styles={styles}
          id={panel.id}
          kind={kind}
          terms={options.data}
          termsError={options.error}
          onReloadTerms={options.reload}
          onClose={close}
          onSaved={(message) => {
            setNotice(message);
            close();
            resource.reload();
          }}
        />
      )}
    </>
  );
}
