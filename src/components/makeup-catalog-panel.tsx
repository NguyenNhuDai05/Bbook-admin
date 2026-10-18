"use client";
import { useEffect, useRef, useState } from "react";
import { ApiError, useResource, useSubmission } from "@/lib/client";
import { catalogService } from "@/services/catalog-service";
import type {
  CatalogStyle,
  CatalogTerm,
  CatalogWrite,
  TermKind,
} from "@/lib/catalog-types";
import {
  canActivate,
  canReview,
  catalogError,
  catalogValidation,
  portfolioUsageLabel,
} from "@/lib/catalog-contracts.mjs";
import { Modal, SubmitButton } from "./ui";
import css from "./admin-reference.module.css";
import c from "./makeup-catalog.module.css";
type RecordData = CatalogStyle | CatalogTerm;
export const recordId = (row: RecordData) =>
  "styleId" in row ? row.styleId : row.id;
export const recordLabel = (row: RecordData) =>
  "styleId" in row ? row.name : row.label;
function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? catalogError(error.status, { code: error.code }, error.message)
    : error instanceof Error
      ? error.message
      : "Không thể thực hiện thao tác.";
}
export function CatalogUsageView({
  styles,
  id,
  compact = false,
}: {
  styles: boolean;
  id: number;
  compact?: boolean;
}) {
  const resource = useResource(catalogService.usage(styles, id));
  if (resource.error)
    return (
      <span role="status">
        Chưa tải được usage{" "}
        <button className="button secondary" onClick={resource.reload}>
          Thử lại
        </button>
      </span>
    );
  if (!resource.data) return <span role="status">Đang tải usage…</span>;
  const usage = resource.data;
  if (compact)
    return (
      <span aria-label={`${usage.muaCount} MUA, ${usage.serviceCount} dịch vụ`}>
        {usage.muaCount} / {usage.serviceCount}
      </span>
    );
  return (
    <div className={c.usage} aria-label="Số lượng sử dụng">
      <span>
        MUA: <strong>{usage.muaCount}</strong>
      </span>
      <span>
        Dịch vụ: <strong>{usage.serviceCount}</strong>
      </span>
      <span>
        Portfolio: <strong>{portfolioUsageLabel(usage.portfolioCount)}</strong>
      </span>
      <span>
        {styles ? "Liên kết metadata" : "Phong cách liên kết"}:{" "}
        {usage.styleMetadataCount}
      </span>
      {!styles && <span>Mục con: {usage.childTermCount}</span>}
    </div>
  );
}
interface PanelProps {
  styles: boolean;
  id: number | null;
  kind: TermKind;
  terms?: CatalogTerm[];
  termsError: string;
  onReloadTerms: () => void;
  onClose: () => void;
  onSaved: (message: string) => void;
  onBusy?: (busy: boolean) => void;
}
export function CatalogRecordPanel(props: PanelProps) {
  const [busy, setBusy] = useState(false);
  if (props.id === null)
    return (
      <Modal
        title={props.kind.endsWith("-group") ? "Thêm nhóm" : "Thêm danh mục"}
        className={css.dialog}
        onClose={() => {
          if (!busy) props.onClose();
        }}
      >
        <CatalogForm {...props} onBusy={setBusy} />
      </Modal>
    );
  return <ExistingRecordPanel {...props} id={props.id} />;
}
function ExistingRecordPanel(props: PanelProps & { id: number }) {
  const resource = useResource(catalogService.detail(props.styles, props.id));
  const [mode, setMode] = useState("detail");
  const [busy, setBusy] = useState(false);
  const record = resource.data;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (mode !== "detail") return;
    const frame = requestAnimationFrame(() => heading.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [mode, record]);
  function reload() {
    setMode("detail");
    resource.reload();
    props.onReloadTerms();
  }
  return (
    <Modal
      title={
        mode === "edit"
          ? "Chỉnh sửa danh mục"
          : mode === "detail"
            ? "Chi tiết danh mục"
            : "Xác nhận thao tác"
      }
      className={css.dialog}
      onClose={() => {
        if (!busy) props.onClose();
      }}
    >
      {resource.error ? (
        <div role="alert" className={c.error}>
          {resource.error}
          <p>Backend có thể chưa hỗ trợ API Phase B.</p>
          <button className="button secondary" onClick={reload}>
            Tải lại
          </button>
        </div>
      ) : !record || resource.loading ? (
        <p role="status">Đang tải chi tiết…</p>
      ) : mode === "edit" ? (
        <CatalogForm
          key={`${props.id}:${record.version}`}
          {...props}
          onBusy={setBusy}
          record={record}
          onReload={reload}
          onCancel={() => setMode("detail")}
        />
      ) : mode !== "detail" ? (
        <LifecycleForm
          {...props}
          onBusy={setBusy}
          record={record}
          mode={mode}
          onReload={reload}
          onCancel={() => setMode("detail")}
        />
      ) : (
        <>
          <h3 ref={heading} tabIndex={-1}>
            {recordLabel(record) || "Chưa có tên"}
          </h3>
          <dl className={c.details}>
            <dt>Stable key</dt>
            <dd>{record.key || "Chưa có key (legacy)"}</dd>
            <dt>Mô tả</dt>
            <dd>{record.description || "Chưa có mô tả"}</dd>
            <dt>Trạng thái</dt>
            <dd>
              {record.archivedAt
                ? "Archived"
                : record.isActive
                  ? "Hoạt động"
                  : "Tạm ẩn"}
            </dd>
            <dt>Thứ tự</dt>
            <dd>{record.sortOrder ?? "Chưa có dữ liệu"}</dd>
            <dt>Phiên bản</dt>
            <dd>{record.version ?? "Backend cũ chưa cung cấp"}</dd>
            {"styleId" in record ? (
              <>
                <dt>Nguồn</dt>
                <dd>{record.source || "LegacyUnknown"}</dd>
                <dt>Kiểm duyệt</dt>
                <dd>{record.reviewStatus || "Chưa có dữ liệu"}</dd>
                <dt>Metadata</dt>
                <dd>
                  {record.metadata?.map((t) => t.label).join(", ") ||
                    "Chưa có metadata"}
                </dd>
              </>
            ) : (
              <>
                <dt>Loại</dt>
                <dd>{record.kind}</dd>
                <dt>Nhóm</dt>
                <dd>
                  {props.terms?.find((t) => t.id === record.groupId)?.label ??
                    (record.groupId ? `#${record.groupId}` : "—")}
                </dd>
                <dt>Dịp rộng hơn</dt>
                <dd>
                  {props.terms?.find((t) => t.id === record.broaderTermId)
                    ?.label ??
                    (record.broaderTermId ? `#${record.broaderTermId}` : "—")}
                </dd>
              </>
            )}
          </dl>
          <CatalogUsageView styles={props.styles} id={props.id} />
          {!Number.isSafeInteger(record.version) ? (
            <p className={c.error}>
              Backend chưa cung cấp version. Cần Phase B trước khi chỉnh sửa an
              toàn.
            </p>
          ) : (
            <div className={c.actions}>
              <button
                className="button secondary"
                onClick={() => setMode("edit")}
              >
                Chỉnh sửa
              </button>
              {!record.archivedAt && (
                <>
                  {(record.isActive || canActivate(record)) && (
                    <button
                      className="button secondary"
                      onClick={() => setMode("status")}
                    >
                      {record.isActive ? "Tạm ẩn" : "Kích hoạt"}
                    </button>
                  )}
                  <button
                    className="button secondary"
                    onClick={() => setMode("archive")}
                  >
                    Archive
                  </button>
                </>
              )}
              {canReview(record) && (
                <>
                  <button
                    className="button secondary"
                    onClick={() => setMode("approve")}
                  >
                    Duyệt
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => setMode("reject")}
                  >
                    Từ chối
                  </button>
                </>
              )}
            </div>
          )}
          <p className={c.hint}>
            Stable key được giữ nguyên. Không có thao tác xóa hoặc merge. Usage
            portfolio chưa có structured tagging.
          </p>
        </>
      )}
    </Modal>
  );
}
function CatalogForm(
  props: PanelProps & {
    record?: RecordData;
    onReload?: () => void;
    onCancel?: () => void;
  },
) {
  const { record, styles, terms } = props;
  const term = record && "kind" in record ? record : undefined;
  const style = record && "styleId" in record ? record : undefined;
  const [name, setName] = useState(record ? (recordLabel(record) ?? "") : "");
  const [key, setKey] = useState(record?.key ?? "");
  const [description, setDescription] = useState(record?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(record?.sortOrder ?? 0));
  const [groupId, setGroupId] = useState(term?.groupId ?? null);
  const [broaderTermId, setBroaderTermId] = useState(
    term?.broaderTermId ?? null,
  );
  const [metadata, setMetadata] = useState<number[]>(
    style?.metadata?.map((t) => t.id) ?? [],
  );
  const [metadataChanged, setMetadataChanged] = useState(false);
  const [error, setError] = useState("");
  const submission = useSubmission();
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => nameInput.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const kind = term?.kind ?? props.kind;
  const needsGroup = !styles && ["occasion", "effect"].includes(kind);
  const groups = (terms ?? []).filter((t) => t.kind === `${kind}-group`);
  const available = (terms ?? []).filter(
    (t) =>
      !t.kind.endsWith("-group") &&
      ((t.isActive &&
        !t.archivedAt &&
        (!t.groupId ||
          terms?.some(
            (g) => g.id === t.groupId && g.isActive && !g.archivedAt,
          ))) ||
        metadata.includes(t.id)),
  );
  // Preserve linked terms even if options fail or omit an older record.
  const metadataOptions = [
    ...available,
    ...(style?.metadata ?? []).filter(
      (t) => !available.some((a) => a.id === t.id),
    ),
  ];
  const needsOptions = needsGroup || kind === "occasion";
  async function save() {
    const body: CatalogWrite = {
      ...(styles ? { name } : { label: name, kind, groupId, broaderTermId }),
      description,
      sortOrder: sortOrder.trim() ? Number(sortOrder) : NaN,
      ...(!record && key ? { key } : {}),
      ...(record ? { expectedVersion: record.version } : {}),
      ...(styles && metadataChanged ? { metadataTermIds: metadata } : {}),
    };
    const validation = catalogValidation(body, styles, !record);
    if (validation) {
      setError(validation);
      return;
    }
    if (metadataChanged && metadata.length > 100) {
      setError("Chỉ chọn tối đa 100 metadata.");
      return;
    }
    if (!submission.begin()) return;
    props.onBusy?.(true);
    setError("");
    try {
      await catalogService.save(styles, record ? recordId(record) : null, body);
      props.onSaved("Đã lưu danh mục.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      submission.end();
      props.onBusy?.(false);
    }
  }
  const unavailable = needsOptions && !terms;
  return (
    <form
      className={c.form}
      aria-busy={submission.busy}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <fieldset disabled={submission.busy} className={c.form}>
        <legend>{record ? "Thông tin chỉnh sửa" : "Thông tin mới"}</legend>
        <label>
          Tên hiển thị
          <input
            ref={nameInput}
            autoFocus
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Stable key {styles && !record ? "(để trống để tự tạo)" : ""}
          <input
            disabled={!!record}
            required={!record && !styles}
            maxLength={100}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={record ? "Chưa có key (legacy)" : "vi-du-key"}
          />
        </label>
        <label>
          Mô tả
          <textarea
            rows={3}
            maxLength={styles ? 255 : 2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Thứ tự hiển thị
          <input
            type="number"
            required
            min={0}
            max={100000}
            step={1}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </label>
        {needsGroup && (
          <label>
            Nhóm
            <select
              required
              disabled={!terms}
              value={groupId ?? ""}
              onChange={(e) =>
                setGroupId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Chọn nhóm</option>
              {groups.map((g) => (
                <option
                  key={g.id}
                  value={g.id}
                  disabled={
                    (!g.isActive || !!g.archivedAt) && g.id !== term?.groupId
                  }
                >
                  {g.label}
                  {!g.isActive || g.archivedAt ? " (ngừng dùng)" : ""}
                </option>
              ))}
              {groupId && !groups.some((g) => g.id === groupId) && (
                <option value={groupId}>Nhóm #{groupId} (hiện tại)</option>
              )}
            </select>
          </label>
        )}
        {!styles && kind === "occasion" && (
          <label>
            Dịp rộng hơn (optional)
            <select
              disabled={!terms}
              value={broaderTermId ?? ""}
              onChange={(e) =>
                setBroaderTermId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Không có</option>
              {(terms ?? [])
                .filter((t) => t.kind === "occasion" && t.id !== term?.id)
                .map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={
                      (!t.isActive || !!t.archivedAt) &&
                      t.id !== term?.broaderTermId
                    }
                  >
                    {t.label}
                    {!t.isActive || t.archivedAt ? " (ngừng dùng)" : ""}
                  </option>
                ))}
            </select>
          </label>
        )}
        {styles && (
          <fieldset disabled={!terms}>
            <legend>Metadata có thể chỉnh sửa (optional)</legend>
            <p className={c.hint}>
              Các lựa chọn này không sửa baseline, bảng màu gốc hoặc quy tắc
              Advisor. Chỉ chọn tối đa một mức độ.
            </p>
            <div className={c.choices}>
              {metadataOptions.map((t) => (
                <label key={t.id}>
                  <input
                    type="checkbox"
                    disabled={
                      (!t.isActive ||
                        !!t.archivedAt ||
                        (!!t.groupId &&
                          !terms?.some(
                            (g) =>
                              g.id === t.groupId && g.isActive && !g.archivedAt,
                          ))) &&
                      !metadata.includes(t.id)
                    }
                    checked={metadata.includes(t.id)}
                    onChange={(e) => {
                      setMetadataChanged(true);
                      setMetadata((p) =>
                        e.target.checked
                          ? [
                              ...(t.kind === "intensity"
                                ? p.filter(
                                    (id) =>
                                      !metadataOptions.some(
                                        (a) =>
                                          a.id === id && a.kind === "intensity",
                                      ),
                                  )
                                : p),
                              t.id,
                            ]
                          : p.filter((id) => id !== t.id),
                      );
                    }}
                  />
                  {t.label} · {t.kind}
                  {!t.isActive || t.archivedAt ? " (ngừng dùng)" : ""}
                </label>
              ))}
            </div>
            {terms && !metadataOptions.length && (
              <p>Chưa có taxonomy để chọn.</p>
            )}
          </fieldset>
        )}
      </fieldset>
      {!terms && (
        <p className={c.hint}>
          {props.termsError || "Đang tải lựa chọn taxonomy…"}{" "}
          {styles
            ? "Metadata hiện có được giữ nguyên khi chưa chỉnh sửa."
            : "Cần tải lựa chọn trước khi sửa nhóm."}
          <button
            type="button"
            className="button secondary"
            onClick={props.onReloadTerms}
          >
            Tải lại lựa chọn
          </button>
        </p>
      )}
      {error && (
        <div className={c.error} role="alert">
          {error}
          {props.onReload && (
            <button
              type="button"
              disabled={submission.busy}
              className="button secondary"
              onClick={props.onReload}
            >
              Tải lại bản mới (bỏ thay đổi chưa lưu)
            </button>
          )}
        </div>
      )}
      <div className={c.actions}>
        <button
          type="button"
          className="button secondary"
          disabled={submission.busy}
          onClick={props.onCancel ?? props.onClose}
        >
          Hủy
        </button>
        <SubmitButton
          busy={submission.busy}
          disabled={unavailable || !name.trim()}
          type="submit"
        >
          Lưu danh mục
        </SubmitButton>
      </div>
    </form>
  );
}
function LifecycleForm(
  props: PanelProps & {
    record: RecordData;
    mode: string;
    onCancel: () => void;
    onReload: () => void;
  },
) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const submission = useSubmission();
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => reasonInput.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);
  const review = props.mode === "approve" || props.mode === "reject";
  const title =
    props.mode === "archive"
      ? "Archive"
      : props.mode === "approve"
        ? "Duyệt"
        : props.mode === "reject"
          ? "Từ chối"
          : props.record.isActive
            ? "Tạm ẩn"
            : "Kích hoạt";
  async function save() {
    if (review && !reason.trim()) {
      setError("Vui lòng nhập lý do kiểm duyệt.");
      return;
    }
    if (!submission.begin()) return;
    props.onBusy?.(true);
    setError("");
    try {
      await catalogService.lifecycle(
        props.styles,
        recordId(props.record),
        review ? "review" : props.mode === "archive" ? "archive" : "status",
        {
          expectedVersion: props.record.version,
          reason: reason.trim(),
          ...(review
            ? { status: props.mode === "approve" ? "Approved" : "Rejected" }
            : props.mode === "status"
              ? { isActive: !props.record.isActive }
              : {}),
        },
      );
      props.onSaved(`Đã ${title.toLowerCase()} danh mục.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      submission.end();
      props.onBusy?.(false);
    }
  }
  return (
    <form
      className={c.form}
      aria-busy={submission.busy}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h3>
        {title} “{recordLabel(props.record)}”?
      </h3>
      <p>
        {props.mode === "archive"
          ? "Mục sẽ được lưu trữ và ngừng dùng, không xóa lịch sử hoặc liên kết. Chưa có API khôi phục archive."
          : props.mode === "reject"
            ? "Mục sẽ bị tắt. Các liên kết và lịch sử vẫn được giữ nguyên."
            : props.mode === "approve"
              ? "Duyệt không tự kích hoạt lại phong cách đang tắt. Có thể bật riêng sau khi duyệt."
              : "Thay đổi chỉ ảnh hưởng khả năng lựa chọn mới; không xóa các liên kết hiện tại."}
      </p>
      <label>
        Lý do {review ? "(bắt buộc)" : "(optional)"}
        <textarea
          ref={reasonInput}
          autoFocus
          required={review}
          maxLength={500}
          value={reason}
          disabled={submission.busy}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {error && (
        <div className={c.error} role="alert">
          {error}
          <button
            type="button"
            className="button secondary"
            disabled={submission.busy}
            onClick={props.onReload}
          >
            Tải lại bản mới
          </button>
        </div>
      )}
      <div className={c.actions}>
        <button
          type="button"
          className="button secondary"
          disabled={submission.busy}
          onClick={props.onCancel}
        >
          Hủy
        </button>
        <SubmitButton busy={submission.busy} type="submit">
          {title}
        </SubmitButton>
      </div>
    </form>
  );
}
