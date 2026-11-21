"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronRight,
  Coins,
  RefreshCw,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { adminService } from "@/services/admin-service";
import { invalidateResources, useResource } from "@/lib/client";
import { money } from "@/lib/format";
import { bookingLabels } from "@/lib/dashboard-presentation.mjs";
import { reportPreset } from "@/lib/reporting-range.mjs";
import { RevenueChart, NewUsersChart } from "./dashboard-charts";
import { ReportRangeFilter, RangeCaption } from "./report-range";
import { useWorkSummary, workModules } from "./work-summary";
import { State } from "./ui";
import s from "./reporting.module.css";

const num = (n: number) => n.toLocaleString("vi-VN");
function Metric({
  label,
  value,
  note,
  icon,
  href,
}: {
  label: string;
  value: string;
  note: ReactNode;
  icon: ReactNode;
  href: string;
}) {
  return (
    <Link href={href} className={s.metric}>
      <div className={s.metricTop}>
        <span>{label}</span>
        <span className={s.metricIcon}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <div className={s.metricBottom}>
        <span>{note}</span>
        <ChevronRight size={15} aria-hidden="true" />
      </div>
    </Link>
  );
}
function WorkQueue() {
  const work = useWorkSummary();
  return (
    <section className={s.panel}>
      <div className={s.panelHeading}>
        <div>
          <h2>Công việc cần xử lý</h2>
          <p>Các yêu cầu đang chờ trong hệ thống</p>
        </div>
        {work.data && (
          <span className={s.count}>{num(work.data.total)} việc</span>
        )}
      </div>
      {work.error && (
        <div className={s.notice} role="alert">
          Chưa cập nhật được công việc.{" "}
          <button onClick={work.reload}>Thử lại</button>
        </div>
      )}
      {!work.data ? (
        <State loading={work.loading} error={work.error} />
      ) : (
        <div className={s.workGrid}>
          {workModules.map((item) => (
            <Link
              key={item.key}
              className={s.workItem}
              href={`/${item.key}${["payouts", "refunds"].includes(item.key) ? "?queue=action" : item.key === "feedback" ? "?status=Open" : ""}`}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
              <b>{num(work.data!.counts[item.key])}</b>
              <ChevronRight size={14} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
export function OverviewDashboard() {
  const [range, setRange] = useState(() => reportPreset("month"));
  // Totals use their own all-time query; changing chart dates cannot change them.
  const totals = useResource(adminService.dashboard("", ""), {
    retainData: true,
  });
  const trends = useResource(adminService.dashboard(range.from, range.to), {
    retainData: true,
  });
  const data = totals.data;
  const statuses = data?.bookingStatuses.filter((row) => row.count > 0) || [];
  return (
    <div className={s.page}>
      <header className={s.pageHeader}>
        <div>
          <div className={s.eyebrow}>B-BOOK WORKSPACE</div>
          <h1>Tổng quan</h1>
          <p>Bức tranh toàn hệ thống, những chỉ số quan trọng nhất.</p>
        </div>
        <button
          className={s.button}
          disabled={totals.loading || trends.loading}
          onClick={() =>
            invalidateResources(["admin:dashboard:", "admin:work-summary"])
          }
        >
          <RefreshCw size={15} />
          Làm mới
        </button>
      </header>
      <section aria-labelledby="overview-totals-title">
        <div className={s.sectionHeading}>
          <h2 id="overview-totals-title">Thống kê tổng</h2>
          <span>Từ đầu đến nay</span>
        </div>
        {totals.error && (
          <div className={s.notice} role="alert">
            {totals.error} {data && "Đang hiển thị lần cập nhật gần nhất."}
            <button onClick={totals.reload}>Thử lại</button>
          </div>
        )}
        {!data && totals.loading && (
          <div
            className={s.metrics}
            aria-label="Đang tải thống kê tổng"
            role="status"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={s.metricSkeleton} />
            ))}
          </div>
        )}
        {data && (
          <div className={s.metrics}>
            <Metric
              label="Tổng doanh thu"
              value={money(data.lifetime.revenue)}
              icon={<Coins size={18} />}
              href="/transactions?scope=all"
              note={
                data.revenueScope === "BookingAndPlans" ? (
                  <>
                    Booking {money(data.lifetime.bookingRevenue!)} · Gói{" "}
                    {money(data.lifetime.planRevenue!)}
                  </>
                ) : (
                  "Phí nền tảng từ booking hoàn thành"
                )
              }
            />
            <Metric
              label="Tổng người dùng"
              value={num(data.users.total)}
              icon={<Users size={18} />}
              href="/users"
              note={`${num(data.users.customers)} Customer · ${num(data.users.muas)} Makeup Artist`}
            />
            <Metric
              label="Tổng booking"
              value={num(data.current.totalBookings)}
              icon={<CalendarDays size={18} />}
              href="/bookings"
              note={`${num(data.current.completedBookings)} booking đã hoàn thành`}
            />
            <Metric
              label="Giao dịch thanh toán"
              value={num(data.lifetime.successfulTransactions)}
              icon={<ArrowLeftRight size={18} />}
              href="/transactions?scope=all"
              note="Các khoản thanh toán đã thu tiền"
            />
            <Metric
              label="Đánh giá dịch vụ"
              value={num(data.lifetime.reviewCount)}
              icon={<Star size={18} />}
              href="/reviews"
              note={
                data.lifetime.averageRating === null
                  ? "Chưa có điểm đánh giá"
                  : `Điểm trung bình ${data.lifetime.averageRating.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} / 5`
              }
            />
            <Metric
              label="Makeup Artist"
              value={num(data.users.muas)}
              icon={<Sparkles size={18} />}
              href="/muas"
              note="Tài khoản đang mang vai trò MUA"
            />
          </div>
        )}
      </section>
      <section aria-labelledby="overview-trends-title" className={s.trends}>
        <div className={s.trendsHeading}>
          <div>
            <h2 id="overview-trends-title">Xu hướng hoạt động</h2>
            <RangeCaption range={range} />
          </div>
          <ReportRangeFilter value={range} onChange={setRange} />
        </div>
        {trends.error && (
          <div className={s.notice} role="alert">
            {trends.error}
            <button onClick={trends.reload}>Thử lại</button>
          </div>
        )}
        {trends.loading && !trends.data && (
          <div
            className={s.chartGrid}
            role="status"
            aria-label="Đang tải biểu đồ"
          >
            <div className={s.chartSkeleton} />
            <div className={s.chartSkeleton} />
          </div>
        )}
        {trends.data && (
          <div className={s.chartGrid}>
            <RevenueChart data={trends.data} />
            <NewUsersChart data={trends.data} />
          </div>
        )}
      </section>
      <div className={s.bottomGrid}>
        <section className={s.panel}>
          <div className={s.panelHeading}>
            <div>
              <h2>Trạng thái booking</h2>
              <p>Toàn bộ booking trong hệ thống</p>
            </div>
            <Link href="/bookings" className={s.subtleLink}>
              Xem booking
              <ChevronRight size={14} />
            </Link>
          </div>
          {!data ? (
            <State
              loading={totals.loading}
              error={totals.error}
              retry={totals.error ? totals.reload : undefined}
            />
          ) : !statuses.length ? (
            <p className={s.empty}>Chưa có booking.</p>
          ) : (
            <div className={s.statusList}>
              {statuses.map((row) => (
                <div key={row.status} className={s.statusRow}>
                  <div>
                    <span>
                      {bookingLabels[
                        row.status as keyof typeof bookingLabels
                      ] || row.status}
                    </span>
                    <b>
                      {num(row.count)}
                      <small>
                        {Math.round(
                          (row.count / data.current.totalBookings) * 100,
                        )}
                        %
                      </small>
                    </b>
                  </div>
                  <progress
                    value={row.count}
                    max={data.current.totalBookings}
                    aria-label={`${bookingLabels[row.status as keyof typeof bookingLabels] || row.status}: ${row.count} booking`}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
        <WorkQueue />
      </div>
      <p className={s.footnote}>
        Doanh thu gồm phí nền tảng của booking hoàn thành và tiền gói đã xác
        minh thu. Gói đã hoàn tiền không được cộng vào doanh thu.
      </p>
    </div>
  );
}
