"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import {
  ArrowUpRight,
  ShieldCheck,
  Landmark,
  WalletCards,
  RotateCcw,
  MessageCircleWarning,
  MessageSquare,
  Bell,
} from "lucide-react";
import { useResource } from "@/lib/client";
import { workService } from "@/services/work-service";
import { badgeText } from "@/lib/work-contracts.mjs";
import { date } from "@/lib/format";
import { State } from "./ui";

export const workModules = [
  {
    key: "verification",
    label: "Xác minh MUA",
    unit: "hồ sơ chờ duyệt",
    icon: ShieldCheck,
  },
  {
    key: "bank-accounts",
    label: "Tài khoản nhận tiền",
    unit: "tài khoản chờ duyệt",
    icon: Landmark,
  },
  {
    key: "complaints",
    label: "Khiếu nại",
    unit: "khiếu nại chưa kết thúc",
    icon: MessageCircleWarning,
  },
  {
    key: "moderation",
    label: "Báo cáo nội dung",
    unit: "báo cáo chờ xử lý",
    icon: MessageCircleWarning,
  },
  {
    key: "payouts",
    label: "Chi trả MUA",
    unit: "khoản cần xử lý",
    icon: WalletCards,
  },
  {
    key: "refunds",
    label: "Hoàn tiền",
    unit: "khoản cần xử lý",
    icon: RotateCcw,
  },
  {
    key: "feedback",
    label: "Feedback người dùng",
    unit: "phản hồi chưa xử lý xong",
    icon: MessageSquare,
  },
];
type WorkResource = ReturnType<
  typeof useResource<import("@/services/work-service").WorkSummary>
>;
const WorkContext = createContext<WorkResource | null>(null);
export function WorkSummaryProvider({ children }: { children: ReactNode }) {
  const resource = useResource(workService.summary(), { retainData: true });
  const { reload } = resource;
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") reload();
    };
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [reload]);
  return (
    <WorkContext.Provider value={resource}>{children}</WorkContext.Provider>
  );
}
export function useWorkSummary() {
  const resource = useContext(WorkContext);
  if (!resource) throw new Error("Thiếu WorkSummaryProvider");
  return resource;
}
export function WorkBadge({ module }: { module: string }) {
  const resource = useWorkSummary();
  const count = resource.data?.counts[module];
  if (count === undefined || count === 0) return null;
  return (
    <b
      className={`nav-count ${resource.error ? "stale" : ""}`}
      aria-label={`${count} việc chưa xử lý${resource.error ? ", chưa cập nhật được" : ""}`}
    >
      {badgeText(count)}
    </b>
  );
}
export function WorkOverview() {
  const resource = useWorkSummary();
  return (
    <section className="operations-section" id="work-queue">
      <div className="panel-heading">
        <div>
          <h2>Công việc cần xử lý</h2>
          <p>
            {resource.data
              ? `${resource.data.total} công việc · Cập nhật ${date(resource.data.updatedAt)}`
              : "Đang tải số liệu vận hành"}
          </p>
        </div>
        <Bell size={20} />
      </div>
      {resource.error && (
        <p className="inline-error" role="alert">
          {resource.error}{" "}
          {resource.data && "Số liệu bên dưới là lần cập nhật gần nhất."}
          <button className="text-button" onClick={resource.reload}>
            Thử lại
          </button>
        </p>
      )}
      {!resource.data ? (
        <State
          loading={resource.loading}
          error={resource.error}
          retry={resource.reload}
        />
      ) : (
        <>
          <div className="work-grid">
            {workModules.map((item) => (
              <Link
                className="work-card"
                href={`/${item.key}${["payouts", "refunds"].includes(item.key) ? "?queue=action" : item.key === "feedback" ? "?status=Open" : ""}`}
                key={item.key}
              >
                <div className="work-card-top">
                  <item.icon size={20} />
                  <ArrowUpRight size={15} />
                </div>
                <strong>{resource.data!.counts[item.key]}</strong>
                <span>{item.label}</span>
                <small>{item.unit}</small>
              </Link>
            ))}
          </div>
          <p className="small-label work-note">
            Đang xử lý: {resource.data.processingPayouts} khoản chi trả ·{" "}
            {resource.data.processingRefunds} khoản hoàn tiền. Số công việc
            không phụ thuộc bộ lọc ngày.
          </p>
        </>
      )}
    </section>
  );
}
export function WorkNotifications() {
  const resource = useWorkSummary();
  return (
    <div className="work-popover">
      <div className="panel-heading">
        <h2>Thông báo công việc</h2>
        <button className="text-button" onClick={resource.reload}>
          Làm mới
        </button>
      </div>
      {!resource.data ? (
        <State
          loading={resource.loading}
          error={resource.error}
          retry={resource.reload}
        />
      ) : (
        <>
          <p className="small-label">
            {resource.data.total} công việc chưa xử lý ·{" "}
            {date(resource.data.updatedAt)}
          </p>
          {resource.error && (
            <p role="alert" className="text-danger">
              Chưa cập nhật được số liệu.
            </p>
          )}
          {workModules
            .filter((item) => resource.data!.counts[item.key] > 0)
            .map((item) => (
              <Link
                className="work-notification-row"
                href={`/${item.key}${["payouts", "refunds"].includes(item.key) ? "?queue=action" : item.key === "feedback" ? "?status=Open" : ""}`}
                key={item.key}
              >
                <item.icon size={18} />
                <span>
                  {item.label}
                  <small>{item.unit}</small>
                </span>
                <b>{resource.data!.counts[item.key]}</b>
              </Link>
            ))}
          {resource.data.total === 0 && (
            <p className="work-note">Hiện không có công việc chờ xử lý.</p>
          )}
        </>
      )}
    </div>
  );
}
