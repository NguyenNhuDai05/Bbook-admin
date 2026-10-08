"use client";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import {
  CalendarDays,
  Coins,
  UserRound,
  Sparkles,
  RefreshCw,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Users,
  Star,
  MessageSquare,
  ArrowLeftRight,
} from "lucide-react";
import { invalidateResources, useResource } from "@/lib/client";
import { adminService } from "@/services/admin-service";
import { money } from "@/lib/format";
import type { DashboardData } from "@/lib/dashboard";
import {
  bookingLabels,
  bookingColors,
  comparison,
  presetRange,
  validRange,
} from "@/lib/dashboard-presentation.mjs";
import { useWorkSummary, workModules } from "./work-summary";
import { Pagination } from "./ui";
import s from "./dashboard.module.css";
import { RevenueChart, NewUsersChart } from "./dashboard-charts";
import { ServiceReviews } from "./dashboard-reviews";

const num = (value: number) => value.toLocaleString("vi-VN");
const day = (value: string) => value.split("-").reverse().join("/");
function Skeleton() {
  return (
    <div
      className={s.skeletonLayout}
      aria-label="Đang tải thống kê"
      role="status"
    >
      <div className={s.kpis}>
        {[0, 1, 2, 3].map((x) => (
          <div className={s.skeletonKpi} key={x}>
            <i />
            <i />
            <i />
          </div>
        ))}
      </div>
      <div className={s.analytics}>
        <div className={s.skeletonChart} />
        <div className={s.skeletonChart} />
      </div>
    </div>
  );
}
function SectionError({
  retry,
  stale = false,
}: {
  retry: () => void;
  stale?: boolean;
}) {
  return (
    <div className={s.error} role="alert">
      Chưa tải được số liệu. {stale && "Đang hiển thị lần cập nhật gần nhất."}{" "}
      <button className="text-button" onClick={retry}>
        Thử lại
      </button>
    </div>
  );
}
function BookingBreakdown({ data }: { data: DashboardData }) {
  const total = data.current.totalBookings;
  return (
    <section className={s.card}>
      <div className={s.heading}>
        <div>
          <h2>Trạng thái booking</h2>
          <p>Trạng thái hiện tại của booking tạo trong kỳ</p>
        </div>
      </div>
      <div className={s.bookingTotal}>
        <strong>{num(total)}</strong>
        <span>Tổng booking</span>
      </div>
      {total === 0 ? (
        <p className={s.empty}>Chưa có booking trong khoảng thời gian này.</p>
      ) : (
        <div className={s.statusList}>
          {data.bookingStatuses.map((x) => (
            <div
              className={s.statusRow}
              key={x.status}
              style={
                {
                  "--status-color":
                    bookingColors[x.status as keyof typeof bookingColors] ||
                    "#667085",
                } as CSSProperties
              }
            >
              <div>
                <span>
                  {bookingLabels[x.status as keyof typeof bookingLabels] ||
                    x.status}
                </span>
                <b>{num(x.count)}</b>
                <small>
                  {((x.count / total) * 100).toLocaleString("vi-VN", {
                    maximumFractionDigits: 1,
                  })}
                  %
                </small>
              </div>
              <progress
                max={total}
                value={x.count}
                aria-label={`${bookingLabels[x.status as keyof typeof bookingLabels] || x.status}: ${x.count} booking`}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
function WorkQueue() {
  const work = useWorkSummary();
  return (
    <section className={s.card} id="work-queue">
      <div className={s.heading}>
        <div>
          <h2>
            Công việc cần xử lý{" "}
            {work.data && (
              <span className={work.data.total > 0 ? s.count : s.queueCount}>
                {num(work.data.total)} việc
              </span>
            )}
          </h2>
          <p>Số liệu hiện tại · Không phụ thuộc khoảng ngày</p>
        </div>
      </div>
      {work.error && <SectionError retry={work.reload} stale={!!work.data} />}
      {!work.data && work.loading ? (
        <div
          className={s.queueSkeleton}
          aria-label="Đang tải công việc"
          role="status"
        >
          {workModules.map((x) => (
            <i key={x.key} />
          ))}
        </div>
      ) : (
        work.data && (
          <div>
            {workModules.map((item) => (
              <Link
                className={s.queueRow}
                key={item.key}
                href={`/${item.key}${["payouts", "refunds"].includes(item.key) ? "?queue=action" : item.key === "feedback" ? "?status=Open" : ""}`}
              >
                <span className={s.icon}>
                  <item.icon size={18} />
                </span>
                <span className={s.queueLabel}>
                  <b>
                    {item.key === "feedback"
                      ? "Phản hồi người dùng"
                      : item.label}
                  </b>
                  <small>{item.unit}</small>
                </span>
                <span
                  className={`${s.queueCount} ${work.data!.counts[item.key] > 0 ? s.pending : ""}`}
                >
                  {num(work.data!.counts[item.key])}
                </span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        )
      )}
    </section>
  );
}
export function OperationsDashboard() {
  const [preset, setPreset] = useState("week");
  const [range, setRange] = useState(() => presetRange("week"));
  const [draft, setDraft] = useState(range);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const resource = useResource(adminService.dashboard(range.from, range.to), {
    retainData: true,
  });
  const data = resource.data;
  const days = (Date.parse(range.to) - Date.parse(range.from)) / 86400000 + 1;
  const daily = data
    ? [...data.daily].sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const visible = daily.slice((page - 1) * 10, page * 10);
  const metrics = data
    ? [
        {
          label: "Tổng booking",
          key: "totalBookings" as const,
          icon: CalendarDays,
        },
        { label: "Doanh thu nền tảng", key: "revenue" as const, icon: Coins },
        { label: "Người dùng mới", key: "newUsers" as const, icon: UserRound },
        { label: "Makeup Artist mới", key: "newMuas" as const, icon: Sparkles },
      ]
    : [];
  return (
    <div className={s.dashboard}>
      <header className={s.header}>
        <div>
          <h1>Tổng quan</h1>
          <p>
            Theo dõi hoạt động kinh doanh, vận hành và trải nghiệm người dùng
            B-Book
          </p>
        </div>
        <div className={s.actions}>
          <label className={s.rangeSelect}>
            <CalendarDays size={16} />
            <select
              aria-label="Khoảng thời gian"
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value);
                setError("");
                if (e.target.value !== "custom") {
                  const next = presetRange(e.target.value);
                  setRange(next);
                  setDraft(next);
                  setPage(1);
                }
              }}
            >
              <option value="today">Hôm nay</option>
              <option value="week">7 ngày gần đây</option>
              <option value="month">30 ngày gần đây</option>
              <option value="this-month">Tháng này</option>
              <option value="custom">Tùy chỉnh khoảng ngày</option>
            </select>
          </label>
          <button
            className="button secondary"
            disabled={resource.loading}
            onClick={() =>
              invalidateResources(["admin:dashboard:", "admin:work-summary"])
            }
          >
            <RefreshCw size={15} />
            {resource.loading ? "Đang tải" : "Làm mới"}
          </button>
        </div>
      </header>
      {preset === "custom" && (
        <form
          className={s.customRange}
          onSubmit={(e) => {
            e.preventDefault();
            if (!validRange(draft.from, draft.to)) {
              setError("Chọn khoảng ngày hợp lệ, tối đa 366 ngày.");
              return;
            }
            setError("");
            setRange({ ...draft });
            setPage(1);
          }}
        >
          <label>
            Từ ngày
            <input
              type="date"
              required
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              required
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </label>
          <button className="button" type="submit">
            Áp dụng
          </button>
          {error && <span role="alert">{error}</span>}
        </form>
      )}
      <p className={s.period}>
        {day(range.from)} – {day(range.to)} · Giờ Việt Nam
      </p>
      {resource.error && (
        <SectionError retry={resource.reload} stale={!!data} />
      )}
      {!data && resource.loading && <Skeleton />}
      {data && (
        <>
          <div className={s.kpis}>
            {metrics.map((item) => {
              const delta = comparison(
                data.current[item.key],
                data.previous[item.key],
                days,
              );
              return (
                <section className={s.kpi} key={item.key}>
                  <div className={s.kpiLabel}>
                    <span className={s.icon}>
                      <item.icon size={16} />
                    </span>
                    {item.label}
                  </div>
                  <strong>
                    {item.key === "revenue"
                      ? money(data.current[item.key])
                      : num(data.current[item.key])}
                  </strong>
                  <span
                    className={`${s.delta} ${delta.direction === "up" ? s.up : delta.direction === "down" ? s.down : ""}`}
                  >
                    {delta.direction === "up" ? (
                      <ArrowUp size={12} />
                    ) : delta.direction === "down" ? (
                      <ArrowDown size={12} />
                    ) : null}
                    {delta.text}
                  </span>
                </section>
              );
            })}
          </div>
          <div className={`${s.kpis} ${s.reviewKpis}`}>
            <section className={s.kpi}>
              <div className={s.kpiLabel}>
                <span className={s.icon}>
                  <MessageSquare size={16} />
                </span>
                Số lượt đánh giá
              </div>
              <strong>{num(data.serviceReviews.total)}</strong>
              <span className={s.delta}>
                Đánh giá dịch vụ được tạo trong kỳ
              </span>
            </section>
            <section className={s.kpi}>
              <div className={s.kpiLabel}>
                <span className={s.icon}>
                  <Star size={16} />
                </span>
                Điểm bình quân
              </div>
              <strong>
                {data.serviceReviews.averageRating === null
                  ? "—"
                  : `${data.serviceReviews.averageRating.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} / 5`}
              </strong>
              <span className={s.delta}>
                {data.serviceReviews.total
                  ? `Từ ${num(data.serviceReviews.total)} đánh giá trong kỳ`
                  : "Chưa có đánh giá trong kỳ"}
              </span>
            </section>
            <section className={s.kpi}>
              <div className={s.kpiLabel}>
                <span className={s.icon}>
                  <ArrowLeftRight size={16} />
                </span>
                Giao dịch thành công
              </div>
              <strong>{num(data.current.successfulTransactions)}</strong>
              <span className={s.delta}>
                Thanh toán PayOS đã thu tiền trong kỳ
              </span>
            </section>
          </div>
          <div className={s.analytics}>
            <RevenueChart data={data} />
            <NewUsersChart data={data} />
          </div>
        </>
      )}
      <div className={s.operations}>
        <WorkQueue />
        {data ? (
          <ServiceReviews
            key={`${range.from}:${range.to}`}
            data={data}
            from={range.from}
            to={range.to}
          />
        ) : resource.loading ? (
          <div className={s.skeletonChart} />
        ) : (
          <section className={s.card}>
            <h2>Đánh giá dịch vụ</h2>
            <SectionError retry={resource.reload} />
          </section>
        )}
      </div>
      {data && (
        <>
          <BookingBreakdown data={data} />
          <section className={s.systemOverview}>
            <Users size={18} />
            <b>{num(data.users.total)} người dùng</b>
            <span>{num(data.users.customers)} Customer</span>
            <span>{num(data.users.muas)} MUA</span>
            <span>{num(data.users.locked)} bị khóa</span>
            <small>Tổng hiện tại</small>
          </section>
          <details className={s.daily}>
            <summary>
              Số liệu từng ngày <span>Ngày mới nhất trước</span>
            </summary>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th aria-sort="descending">Ngày ↓</th>
                    <th>Booking mới</th>
                    <th>Doanh thu nền tảng</th>
                    <th>Người dùng mới</th>
                    <th>MUA mới</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((x) => (
                    <tr key={x.date}>
                      <td>{day(x.date)}</td>
                      <td>{num(x.bookings)}</td>
                      <td>{money(x.revenue)}</td>
                      <td>{num(x.newUsers)}</td>
                      <td>{num(x.newMuas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              size={10}
              count={visible.length}
              total={daily.length}
              onPage={setPage}
            />
          </details>
          <p className={s.footnote}>
            Doanh thu là phí lưu trên booking hoàn thành / tự hoàn thành, theo
            ngày hoàn thành; chưa trừ điều chỉnh kế toán từ hoàn tiền.
          </p>
        </>
      )}
    </div>
  );
}
