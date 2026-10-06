"use client";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { useResource, useSubmission } from "@/lib/client";
import { adminService } from "@/services/admin-service";
import type { Style } from "@/lib/types";
import {
  normalizeStyleName,
  stylePagination,
  stylePageButtons,
} from "@/lib/style-contracts.mjs";
import { Modal, SubmitButton } from "./ui";
import {
  AdminEmptyState,
  AdminNotice,
  AdminPageHeader,
  AdminToolbar,
  RowActionMenu,
  StatusLabel,
} from "./admin-reference-ui";
import css from "./admin-reference.module.css";
type Filter = "all" | "active" | "inactive";
type Panel =
  { kind: "create" } | { kind: "edit" | "detail" | "status"; style: Style };
export function Styles() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({
    search: "",
    status: "all" as Filter,
    page: 1,
  });
  const [panel, setPanel] = useState<Panel | null>(null);
  const [notice, setNotice] = useState("");
  const restoreFocus = useRef<(() => void) | null>(null);
  const addTrigger = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const resource = useResource(
    adminService.adminStyles(query.page, query.search, query.status),
    { retainData: true },
  );
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setQuery((p) =>
          p.search === search.trim()
            ? p
            : { ...p, search: search.trim(), page: 1 },
        ),
      300,
    );
    return () => clearTimeout(timer);
  }, [search]);
  const total = resource.data?.total;
  const pagination = stylePagination(total ?? 0, query.page);
  useEffect(() => {
    if (
      !resource.loading &&
      !resource.error &&
      total !== undefined &&
      query.page > pagination.pages
    )
      setQuery((p) => ({ ...p, page: pagination.pages }));
  }, [total, resource.loading, resource.error, query.page, pagination.pages]);
  function close() {
    setPanel(null);
    requestAnimationFrame(() => {
      restoreFocus.current?.();
      if (document.activeElement === document.body)
        searchInput.current?.focus();
    });
  }
  function open(next: Panel, focus: () => void) {
    restoreFocus.current = focus;
    setPanel(next);
  }
  function clearFilters() {
    setSearch("");
    setQuery({ search: "", status: "all", page: 1 });
  }
  function saved(message: string) {
    setNotice(message);
    close();
    resource.reload();
  }
  const addButton = (
    <button
      type="button"
      ref={addTrigger}
      className={`button primary ${css.primaryButton}`}
      onClick={() =>
        open({ kind: "create" }, () => addTrigger.current?.focus())
      }
    >
      <Plus size={16} />
      Thêm phong cách
    </button>
  );
  const rows = resource.data?.items ?? [];
  return (
    <div className={css.page}>
      <AdminPageHeader
        title="Phong cách makeup"
        description="Quản lý danh mục phong cách được MUA sử dụng trong hồ sơ"
        action={addButton}
      />
      {notice && (
        <AdminNotice onDismiss={() => setNotice("")}>{notice}</AdminNotice>
      )}
      <section
        className={css.tablePanel}
        aria-label="Danh sách phong cách makeup"
      >
        <AdminToolbar>
          <div className={css.search}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              ref={searchInput}
              aria-label="Tìm phong cách"
              placeholder="Tìm theo tên phong cách…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label="Xóa tìm kiếm"
                onClick={() => {
                  setSearch("");
                  setQuery((p) => ({ ...p, search: "", page: 1 }));
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <label className={css.statusFilter}>
            Trạng thái
            <select
              aria-label="Trạng thái phong cách"
              value={query.status}
              onChange={(e) =>
                setQuery((p) => ({
                  ...p,
                  status: e.target.value as Filter,
                  page: 1,
                }))
              }
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Tạm ẩn</option>
            </select>
          </label>
          <button
            type="button"
            className={css.iconButton}
            aria-label="Làm mới danh sách phong cách"
            disabled={resource.loading}
            onClick={resource.reload}
          >
            <RotateCcw size={16} className={resource.loading ? "spin" : ""} />
          </button>
        </AdminToolbar>
        {resource.error ? (
          <AdminEmptyState
            error
            title="Không thể tải danh sách phong cách."
            description={resource.error}
            action={
              <button className="button secondary" onClick={resource.reload}>
                Thử lại
              </button>
            }
          />
        ) : resource.loading ? (
          <StyleTableSkeleton />
        ) : rows.length === 0 ? (
          <AdminEmptyState
            title={
              query.search
                ? "Không tìm thấy phong cách"
                : query.status === "inactive"
                  ? "Không có phong cách tạm ẩn."
                  : query.status === "active"
                    ? "Không có phong cách hoạt động."
                    : "Chưa có phong cách makeup"
            }
            description={
              query.search
                ? `Không có kết quả phù hợp với “${query.search}”.`
                : query.status === "all"
                  ? "Tạo phong cách đầu tiên để MUA có thể lựa chọn phong cách phù hợp với mình."
                  : undefined
            }
            action={
              query.search || query.status !== "all" ? (
                <button className="button secondary" onClick={clearFilters}>
                  Xóa bộ lọc
                </button>
              ) : (
                addButton
              )
            }
          />
        ) : (
          <div className={css.tableScroll}>
            <table
              className={`${css.styleTable} ${css.catalogTable}`}
              aria-label="Phong cách makeup"
            >
              <thead>
                <tr>
                  <th>Phong cách</th>
                  <th>Mô tả</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((style) => (
                  <tr key={style.styleId}>
                    <td>
                      <span className={css.styleName}>
                        {style.name || "Chưa có tên"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={css.catalogDescription}
                        title={style.description || undefined}
                      >
                        {style.description || "Chưa có mô tả"}
                      </span>
                    </td>
                    <td>
                      <StatusLabel active={style.isActive} />
                    </td>
                    <td>
                      <RowActionMenu
                        label={style.name || "phong cách"}
                        active={style.isActive}
                        onView={(focus) =>
                          open({ kind: "detail", style }, focus)
                        }
                        onEdit={(focus) => open({ kind: "edit", style }, focus)}
                        onStatus={(focus) =>
                          open({ kind: "status", style }, focus)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!resource.error && !resource.loading && total !== undefined && (
          <div className={css.catalogPagination}>
            <span>
              {pagination.from}–{pagination.to} / {total} phong cách
            </span>
            {pagination.pages > 1 && (
              <nav aria-label="Phân trang phong cách">
                <button
                  className={css.iconButton}
                  disabled={query.page <= 1}
                  aria-label="Trang trước"
                  onClick={() => setQuery((p) => ({ ...p, page: p.page - 1 }))}
                >
                  <ChevronLeft size={16} />
                </button>
                {stylePageButtons(query.page, pagination.pages).map(
                  (page, index) =>
                    typeof page === "number" ? (
                      <button
                        key={page}
                        className={css.pageButton}
                        aria-current={page === query.page ? "page" : undefined}
                        aria-label={`Trang ${page}`}
                        onClick={() => setQuery((p) => ({ ...p, page }))}
                      >
                        {page}
                      </button>
                    ) : (
                      <span key={`ellipsis-${index}`} aria-hidden="true">
                        …
                      </span>
                    ),
                )}
                <button
                  className={css.iconButton}
                  disabled={query.page >= pagination.pages}
                  aria-label="Trang sau"
                  onClick={() => setQuery((p) => ({ ...p, page: p.page + 1 }))}
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </div>
        )}
      </section>
      {panel?.kind === "create" && (
        <StyleForm
          onClose={close}
          onSaved={(style) => saved(`Đã thêm phong cách “${style.name}”.`)}
        />
      )}
      {panel?.kind === "edit" && (
        <StyleEditor
          id={panel.style.styleId}
          onClose={close}
          onSaved={(style) => saved(`Đã lưu thay đổi cho “${style.name}”.`)}
        />
      )}
      {panel?.kind === "detail" && (
        <StyleDetail
          id={panel.style.styleId}
          onClose={close}
          onEdit={(style) => setPanel({ kind: "edit", style })}
          onStatus={(style) => setPanel({ kind: "status", style })}
        />
      )}
      {panel?.kind === "status" && (
        <StyleStatus
          style={panel.style}
          onClose={close}
          onSaved={(style) =>
            saved(
              `“${style.name}” đã được ${style.isActive ? "kích hoạt" : "tạm ẩn"}.`,
            )
          }
        />
      )}
    </div>
  );
}
function StyleTableSkeleton() {
  return (
    <div
      className={css.tableScroll}
      role="status"
      aria-label="Đang tải danh sách phong cách"
    >
      <table
        className={`${css.styleTable} ${css.catalogTable}`}
        aria-hidden="true"
      >
        <thead>
          <tr>
            <th>Phong cách</th>
            <th>Mô tả</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }, (_, index) => (
            <tr key={index}>
              <td>
                <span className={css.skeleton} />
              </td>
              <td>
                <span className={css.skeleton} />
              </td>
              <td>
                <span className={css.skeleton} />
              </td>
              <td>
                <span className={css.skeleton} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function StyleEditor({
  id,
  onClose,
  onSaved,
}: {
  id: number;
  onClose: () => void;
  onSaved: (style: Style) => void;
}) {
  const resource = useResource(adminService.adminStyle(id));
  if (resource.data && !resource.error)
    return (
      <StyleForm
        key={id}
        style={resource.data}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  return (
    <Modal
      className={css.dialog}
      title="Chỉnh sửa phong cách"
      onClose={onClose}
    >
      {resource.error ? (
        <AdminEmptyState
          error
          title="Không thể tải phong cách."
          description={resource.error}
          action={
            <button className="button secondary" onClick={resource.reload}>
              Thử lại
            </button>
          }
        />
      ) : (
        <p role="status">Đang tải phong cách…</p>
      )}
    </Modal>
  );
}
function StyleDetail({
  id,
  onClose,
  onEdit,
  onStatus,
}: {
  id: number;
  onClose: () => void;
  onEdit: (style: Style) => void;
  onStatus: (style: Style) => void;
}) {
  const resource = useResource(adminService.adminStyle(id));
  const style = resource.data;
  return (
    <Modal
      className={css.dialog}
      title="Thông tin phong cách"
      onClose={onClose}
      footer={
        style && !resource.error ? (
          <>
            <button
              className="button secondary"
              onClick={() => onStatus(style)}
            >
              {style.isActive ? "Tạm ẩn" : "Kích hoạt"}
            </button>
            <button
              className={`button primary ${css.primaryButton}`}
              onClick={() => onEdit(style)}
            >
              Chỉnh sửa
            </button>
          </>
        ) : undefined
      }
    >
      {resource.error ? (
        <AdminEmptyState
          error
          title="Không thể tải phong cách."
          description={resource.error}
          action={
            <button className="button secondary" onClick={resource.reload}>
              Thử lại
            </button>
          }
        />
      ) : style ? (
        <div className={css.styleDetails}>
          <h3>{style.name || "Chưa có tên"}</h3>
          <StatusLabel active={style.isActive} />
          <dl>
            <dt>Mô tả</dt>
            <dd>{style.description || "Chưa có mô tả"}</dd>
          </dl>
        </div>
      ) : (
        <p role="status">Đang tải phong cách…</p>
      )}
    </Modal>
  );
}
function StyleForm({
  style,
  onClose,
  onSaved,
}: {
  style?: Style;
  onClose: () => void;
  onSaved: (style: Style) => void;
}) {
  const [name, setName] = useState(style?.name || "");
  const [description, setDescription] = useState(style?.description || "");
  const [error, setError] = useState("");
  const submission = useSubmission();
  async function save() {
    const normalized = normalizeStyleName(name);
    if (!normalized || normalized.length > 100 || name.length > 100) {
      setError("Tên phong cách bắt buộc và tối đa 100 ký tự.");
      return;
    }
    if (description.length > 255) {
      setError("Mô tả tối đa 255 ký tự.");
      return;
    }
    if (!submission.begin()) return;
    setError("");
    try {
      onSaved(
        await adminService.saveAdminStyle(
          style?.styleId ?? null,
          normalized,
          description.trim(),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu phong cách.");
    } finally {
      submission.end();
    }
  }
  return (
    <Modal
      className={css.dialog}
      title={style ? "Chỉnh sửa phong cách" : "Thêm phong cách makeup"}
      description={
        style ? undefined : "Tạo phong cách để MUA sử dụng trong hồ sơ."
      }
      onClose={() => {
        if (!submission.busy) onClose();
      }}
      footer={
        <>
          <button
            type="button"
            className="button secondary"
            disabled={submission.busy}
            onClick={onClose}
          >
            Hủy
          </button>
          <SubmitButton
            className={css.primaryButton}
            form="makeup-style-form"
            type="submit"
            busy={submission.busy}
            disabled={!name.trim()}
          >
            {submission.busy
              ? "Đang lưu…"
              : style
                ? "Lưu thay đổi"
                : "Thêm phong cách"}
          </SubmitButton>
        </>
      }
    >
      <form
        id="makeup-style-form"
        className={css.styleForm}
        aria-busy={submission.busy}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label htmlFor="style-name">
          Tên phong cách <span aria-hidden="true">*</span>
        </label>
        <input
          id="style-name"
          autoFocus
          required
          maxLength={100}
          value={name}
          disabled={submission.busy}
          aria-describedby="style-name-count"
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
        />
        <p id="style-name-count" className={css.fieldHint}>
          {name.length} / 100
        </p>
        <label htmlFor="style-description">Mô tả</label>
        <textarea
          id="style-description"
          rows={4}
          maxLength={255}
          value={description}
          disabled={submission.busy}
          aria-describedby="style-description-count"
          onChange={(e) => {
            setDescription(e.target.value);
            setError("");
          }}
        />
        <p id="style-description-count" className={css.fieldHint}>
          {description.length} / 255
        </p>
        {error && (
          <p className={css.formError} role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
function StyleStatus({
  style,
  onClose,
  onSaved,
}: {
  style: Style;
  onClose: () => void;
  onSaved: (style: Style) => void;
}) {
  const submission = useSubmission();
  const [error, setError] = useState("");
  async function change() {
    if (!submission.begin()) return;
    setError("");
    try {
      onSaved(
        await adminService.statusAdminStyle(style.styleId, !style.isActive),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thể cập nhật trạng thái.",
      );
    } finally {
      submission.end();
    }
  }
  return (
    <Modal
      className={css.dialog}
      title={`${style.isActive ? "Tạm ẩn" : "Kích hoạt"} “${style.name}”?`}
      onClose={() => {
        if (!submission.busy) onClose();
      }}
      footer={
        <>
          <button
            className="button secondary"
            disabled={submission.busy}
            onClick={onClose}
          >
            Hủy
          </button>
          <SubmitButton
            className={style.isActive ? css.warningButton : css.primaryButton}
            busy={submission.busy}
            onClick={() => void change()}
          >
            {style.isActive ? "Tạm ẩn" : "Kích hoạt"}
          </SubmitButton>
        </>
      }
    >
      <p>
        {style.isActive
          ? "Phong cách này sẽ không còn xuất hiện trong danh sách để MUA lựa chọn mới. Các liên kết phong cách trong hồ sơ MUA đã có sẽ không bị xóa."
          : "Phong cách này sẽ xuất hiện trở lại trong danh sách để MUA lựa chọn."}
      </p>
      {error && (
        <p className={css.formError} role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
