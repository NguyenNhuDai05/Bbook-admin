"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  LoaderCircle,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { statusLabels, statusTone } from "@/lib/format";
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${statusTone(status)}`}>
      <i />
      {statusLabels[status] || status}
    </span>
  );
}
export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function State({
  loading,
  error,
  retry,
  empty,
}: {
  loading?: boolean;
  error?: string;
  retry?: () => void;
  empty?: string;
}) {
  if (loading)
    return (
      <div className="skeleton-list" aria-label="Đang tải dữ liệu">
        {[0, 1, 2, 3, 4].map((x) => (
          <div className="skeleton" key={x} />
        ))}
      </div>
    );
  return (
    <div className={`empty-state ${error ? "error-state" : ""}`}>
      {error ? <AlertCircle size={32} /> : <FileSearch size={32} />}
      <h3>{error ? "Không thể tải dữ liệu" : empty || "Chưa có dữ liệu"}</h3>
      {error && <p>{error}</p>}
      {retry && (
        <button className="button secondary" onClick={retry}>
          <RotateCcw size={16} />
          Thử lại
        </button>
      )}
    </div>
  );
}
export function Pagination({
  page,
  size,
  count,
  total,
  onPage,
  onSize,
  server = false,
}: {
  page: number;
  size: number;
  count: number;
  total?: number;
  onPage: (page: number) => void;
  onSize?: (size: number) => void;
  server?: boolean;
}) {
  const next =
    total !== undefined ? page * size < total : server ? count === size : false;
  return (
    <div className="pagination">
      <span>
        {count ? `${(page - 1) * size + 1}–${(page - 1) * size + count}` : "0"}
        {total !== undefined ? ` / ${total}` : " bản ghi"}
        {server && total === undefined
          ? " · Tổng số chưa được API cung cấp"
          : ""}
      </span>
      <div>
        {onSize && (
          <label>
            Số dòng{" "}
            <select
              value={size}
              onChange={(e) => {
                onSize(Number(e.target.value));
                onPage(1);
              }}
            >
              <option>10</option>
              <option>20</option>
              <option>50</option>
            </select>
          </label>
        )}
        <button
          className="icon-button"
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={17} />
        </button>
        <span className="page-number">{page}</span>
        <button
          className="icon-button"
          disabled={!next}
          onClick={() => onPage(page + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  footer,
  wide = false,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="modal-heading">
        <div>
          <h2 id="dialog-title">{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Đóng">
          <X size={20} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </dialog>
  );
}
export function SubmitButton({
  busy,
  children,
  ...props
}: {
  busy?: boolean;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`button primary ${props.className || ""}`}
      disabled={props.disabled || busy}
    >
      {busy ? <LoaderCircle size={16} className="spin" /> : null}
      {children}
    </button>
  );
}
export function DocumentView({
  url,
  label,
}: {
  url?: string | null;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    setOpen(false);
  }, [url]);
  const [zoom, setZoom] = useState(1);
  const [angle, setAngle] = useState(0);
  const viewer = useRef<HTMLDivElement>(null);
  const [fullscreenError, setFullscreenError] = useState("");
  return (
    <div className="document">
      <button
        className="document-preview"
        style={{
          width: "100%",
          border: 0,
          padding: 0,
          cursor: url && !failed ? "zoom-in" : "default",
        }}
        disabled={!url || failed}
        aria-label={`Xem ${label}`}
        onClick={() => {
          setZoom(1);
          setAngle(0);
          setOpen(true);
        }}
      >
        {url && !failed ? (
          <img
            src={url || undefined}
            alt={label}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="document-missing">
            <FileSearch size={28} />
            <span>{failed ? "Không thể tải ảnh" : "Chưa cung cấp ảnh"}</span>
          </div>
        )}
      </button>
      <div className="document-caption">
        <strong>{label}</strong>
        <button
          className="text-button"
          disabled={!url || failed}
          onClick={() => {
            setZoom(1);
            setAngle(0);
            setOpen(true);
          }}
        >
          <Maximize2 size={14} />
          Phóng to
        </button>
      </div>
      {open && (
        <Modal
          title={label}
          description="Thông tin nhạy cảm — chỉ sử dụng cho mục đích xác minh."
          wide
          onClose={() => setOpen(false)}
        >
          <div className="zoom-viewer" ref={viewer}>
            <div className="zoom-toolbar">
              <button
                className="icon-button"
                aria-label="Thu nhỏ"
                onClick={() => setZoom((x) => Math.max(0.5, x - 0.25))}
              >
                <Minus size={16} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                className="icon-button"
                aria-label="Phóng to ảnh"
                onClick={() => setZoom((x) => Math.min(4, x + 0.25))}
              >
                <Plus size={16} />
              </button>
              <button
                className="icon-button"
                aria-label="Xoay ảnh"
                onClick={() => setAngle((x) => x + 90)}
              >
                <RotateCcw size={16} />
              </button>
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    setFullscreenError("");
                    if (document.fullscreenElement)
                      await document.exitFullscreen();
                    else if (viewer.current?.requestFullscreen)
                      await viewer.current.requestFullscreen();
                    else
                      setFullscreenError(
                        "Trình duyệt này chưa hỗ trợ toàn màn hình. Bạn vẫn có thể phóng to ảnh.",
                      );
                  } catch {
                    setFullscreenError(
                      "Chưa thể mở toàn màn hình. Bạn vẫn có thể phóng to ảnh.",
                    );
                  }
                }}
              >
                <Maximize2 size={15} />
                Toàn màn hình
              </button>
            </div>
            <div className="zoom-canvas">
              <img
                src={url || undefined}
                alt={label}
                style={{ transform: `scale(${zoom}) rotate(${angle}deg)` }}
                referrerPolicy="no-referrer"
              />
            </div>
            {fullscreenError && (
              <p className="helper" role="status">
                {fullscreenError}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
