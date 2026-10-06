"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AlertCircle, MoreHorizontal, X } from "lucide-react";
import css from "./admin-reference.module.css";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={css.pageHeader}>
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function AdminToolbar({ children }: { children: ReactNode }) {
  return <div className={css.toolbar}>{children}</div>;
}
export function StatusLabel({ active }: { active: boolean }) {
  return (
    <span className={`${css.status} ${active ? css.active : css.inactive}`}>
      <span aria-hidden="true" />
      {active ? "Hoạt động" : "Tạm ẩn"}
    </span>
  );
}
export function AdminEmptyState({
  title,
  description,
  action,
  error = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  error?: boolean;
}) {
  return (
    <div className={css.emptyState} role={error ? "alert" : "status"}>
      {error && <AlertCircle size={21} aria-hidden="true" />}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function AdminNotice({
  children,
  onDismiss,
}: {
  children: ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div className={css.notice} role="status">
      <span>{children}</span>
      <button
        type="button"
        className={css.iconButton}
        aria-label="Đóng thông báo"
        onClick={onDismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}
export function RowActionMenu({
  label,
  onView,
  onEdit,
  onStatus,
  active = true,
}: {
  label: string;
  onView: (restoreFocus: () => void) => void;
  onEdit?: (restoreFocus: () => void) => void;
  onStatus?: (restoreFocus: () => void) => void;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    action.current?.focus();
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !container.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus();
  }
  function show() {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect)
      setPosition({
        top: Math.max(
          8,
          rect.bottom + 150 > window.innerHeight
            ? rect.top - 146
            : rect.bottom + 4,
        ),
        left: Math.max(8, Math.min(rect.right - 168, window.innerWidth - 176)),
      });
    setOpen(true);
  }
  return (
    <div
      className={css.rowMenu}
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className={css.iconButton}
        ref={trigger}
        aria-label={`Thao tác với ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            show();
          }
        }}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div
          className={css.rowMenuPanel}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            right: "auto",
            bottom: "auto",
            width: 168,
          }}
          role="menu"
          id={id}
          aria-label={`Thao tác với ${label}`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
            } else if (
              ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
            ) {
              event.preventDefault();
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  '[role="menuitem"]',
                ),
              );
              const current = items.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? items.length - 1
                    : (current +
                        (event.key === "ArrowUp" ? -1 : 1) +
                        items.length) %
                      items.length;
              items[next]?.focus();
            } else if (event.key === "Tab") setOpen(false);
          }}
        >
          <button
            type="button"
            role="menuitem"
            ref={action}
            onClick={() => {
              setOpen(false);
              onView(() => trigger.current?.focus());
            }}
          >
            Xem chi tiết
          </button>
          {onEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit(() => trigger.current?.focus());
              }}
            >
              Chỉnh sửa
            </button>
          )}
          {onStatus && (
            <>
              <div role="separator" className={css.menuSeparator} />
              <button
                type="button"
                role="menuitem"
                className={active ? css.warningAction : ""}
                onClick={() => {
                  setOpen(false);
                  onStatus(() => trigger.current?.focus());
                }}
              >
                {active ? "Tạm ẩn" : "Kích hoạt"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
