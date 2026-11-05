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
  calendarRange,
  vietnamToday,
} from "@/lib/dashboard-presentation.mjs";
import { useWorkSummary, workModules } from "./work-summary";
import { Pagination } from "./ui";
import s from "./dashboard.module.css";
import { RevenueChart, NewUsersChart } from "./dashboard-charts";
import { ServiceReviews } from "./dashboard-reviews";
import {
  demoDashboard,
  demoReviewDetails,
} from "@/features/outcome3/dashboard-adapter.mjs";
import {
  demoReport,
  days as demoDays,
  demoLabel,
} from "@/features/outcome3/demo.mjs";
import { useRouter } from "next/navigation";

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
export function OperationsDashboard({ demo = false }: { demo?: boolean } = {}) {
  const [preset, setPreset] = useState(demo ? "custom" : "week");
  const [range, setRange] = useState(() =>
    demo ? { from: demoDays[0], to: demoDays[6] } : presetRange("week"),
  );
  const [draft, setDraft] = useState(range);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const live = useResource<DashboardData>(
    demo
      ? {
          key: "demo:dashboard",
          enabled: false,
          load: async () => demoDashboard(range.from, range.to),
        }
      : adminService.dashboard(range.from, range.to),
    {
      retainData: true,
    },
  );
  const [revision, setRevision] = useState(0);
  const resource = demo
    ? {
        data: demoDashboard(range.from, range.to),
        loading: false,
        error: "",
        reload: () => setRevision((v) => v + 1),
      }
    : live;
  const data = resource.data;
  const demoStats = demo ? demoReport(range.from, range.to) : undefined;
  const router = useRouter();
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
          <h1>{demo ? "Outcome 3 — Tổng quan kết quả" : "Tổng quan"}</h1>
          <p>
            {demo
              ? "Dữ liệu mô phỏng hoạt động BBook từ 29/10/2026 đến 04/11/2026"
              : "Theo dõi hoạt động kinh doanh, vận hành và trải nghiệm người dùng B-Book"}
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
                  const next =
                    e.target.value === "pick-month"
                      ? calendarRange(range.from.slice(0, 7))!
                      : e.target.value === "pick-year"
                        ? calendarRange(range.from.slice(0, 4))!
                        : presetRange(e.target.value);
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
              <option value="this-year">Năm nay</option>
              <option value="pick-month">Chọn tháng</option>
              <option value="pick-year">Chọn năm</option>
              <option value="custom">Tùy chỉnh khoảng ngày</option>
            </select>
          </label>
          <button
            className="button secondary"
            disabled={resource.loading}
            onClick={() =>
              demo
                ? resource.reload()
                : invalidateResources([
                    "admin:dashboard:",
                    "admin:work-summary",
                  ])
            }
          >
            <RefreshCw size={15} />
            {resource.loading ? "Đang tải" : "Làm mới"}
          </button>
        </div>
      </header>
      {demo && (
        <div className={s.demoBanner} role="note">
          <strong>{demoLabel}</strong>
          <span>DỮ LIỆU MÔ PHỎNG — KHÔNG PHẢI GIAO DỊCH THỰC TẾ</span>
        </div>
      )}
      {data && (
        <>
          <div className={s.summaryHeading}>
            <h2>Tổng tích lũy</h2>
            <span>
              Người dùng và MUA: hiện tại · Doanh thu, đánh giá, giao dịch: từ
              đầu đến nay
            </span>
          </div>
          <div className={`${s.kpis} ${s.lifetimeKpis}`}>
            <section className={s.kpi}>
              <div className={s.kpiLabel}>
                <span className={s.icon}>
                  <Users size={16} />
                </span>
                Tổng người dùng
              </div>
              <strong>{num(data.users.total)}</strong>
              <span className={s.delta}>
                {demo
                  ? `${num(data.users.customers)} Customer · ${num(data.users.muas)} MUA`
                  : "Tài khoản hiện tại, gồm Customer và MUA"}
              </span>
            </section>
            <section className={s.kpi}>
              <div className={s.kpiLabel}>
                <span className={s.icon}>
                  <Sparkles size={16} />
                </span>
                Tổng Makeup Artist
              </div>
              <strong>{num(data.users.muas)}</strong>
              <span className={s.delta}>Tài khoản hiện mang vai trò MUA</span>
            </section>
            <section className={s.kpi}>
              <div className={s.kpiLabel}>
                <span className={s.icon}>
                  <Coins size={16} />
                </span>
                Tổng doanh thu
              </div>
              <strong>{money(data.lifetime.revenue)}</strong>
              {data.revenueScope === "BookingAndPlans" && (
                <span className={s.delta}>
                  Booking: {money(data.lifetime.bookingRevenue!)} · Gói:{" "}
                  {money(data.lifetime.planRevenue!)}
                </span>
              )}
            </section>
            <section className={s.kpi}>
              <div className={s.kpiLabel}>
                <span className={s.icon}>
                  <Star size={16} />
                </span>
                Tổng đánh giá dịch vụ
              </div>
              <strong>{num(data.lifetime.reviewCount)}</strong>
              <span className={s.delta}>
                Điểm bình quân:{" "}
                {data.lifetime.averageRating === null
                  ? "—"
                  : `${data.lifetime.averageRating.toLocaleString("vi-VN", { minimumFractionDigits: demo ? 2 : 0, maximumFractionDigits: demo ? 2 : 1 })} / 5`}
              </span>
            </section>
            <button
              type="button"
              className={`${s.kpi} ${s.clickableKpi}`}
              disabled={demo}
              onClick={() => {
                if (!demo) router.push("/transactions?scope=all");
              }}
            >
              <div className={s.kpiLabel}>
                <span className={s.icon}>
                  <ArrowLeftRight size={16} />
                </span>
                Tổng giao dịch thanh toán
              </div>
              <strong>{num(data.lifetime.successfulTransactions)}</strong>
              <span className={s.delta}>
                {demo ? (
                  "Giao dịch mô phỏng · Không mở dữ liệu thật"
                ) : (
                  <>
                    Xem lịch sử và chi tiết <ChevronRight size={14} />
                  </>
                )}
              </span>
            </button>
          </div>
        </>
      )}
      <div className={s.summaryHeading}>
        <h2>Thống kê theo kỳ</h2>
        <span>
          Bộ lọc ngày, tháng, năm áp dụng cho các số liệu và biểu đồ bên dưới
        </span>
      </div>
      {preset === "pick-month" && (
        <label className={s.calendarPicker}>
          Tháng thống kê{" "}
          <input
            type="month"
            value={range.from.slice(0, 7)}
            min="1970-01"
            onChange={(e) => {
              const next = calendarRange(e.target.value);
              if (next) {
                setRange(next);
                setDraft(next);
                setPage(1);
              }
            }}
          />
        </label>
      )}
      {preset === "pick-year" && (
        <label className={s.calendarPicker}>
          Năm thống kê{" "}
          <select
            value={range.from.slice(0, 4)}
            onChange={(e) => {
              const next = calendarRange(e.target.value);
              if (next) {
                setRange(next);
                setDraft(next);
                setPage(1);
              }
            }}
          >
            {Array.from(
              { length: Number(vietnamToday().slice(0, 4)) - 1969 },
              (_, i) => Number(vietnamToday().slice(0, 4)) - i,
            ).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      )}
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
              const delta = demo
                ? { direction: "neutral", text: "Chưa có dữ liệu so sánh" }
                : comparison(
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
          <div
            className={`${s.kpis} ${s.reviewKpis} ${demo ? s.demoReviewKpis : ""}`}
          >
            {demoStats && (
              <section className={s.kpi}>
                <div className={s.kpiLabel}>
                  <span className={s.icon}>
                    <Users size={16} />
                  </span>
                  Paid Users
                </div>
                <strong>{num(demoStats.paidUsers)}</strong>
                <span className={s.delta}>
                  Người thanh toán duy nhất trong kỳ
                </span>
              </section>
            )}
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
                  : `${data.serviceReviews.averageRating.toLocaleString("vi-VN", { minimumFractionDigits: demo ? 2 : 0, maximumFractionDigits: demo ? 2 : 1 })} / 5`}
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
                <button
                  className="text-button"
                  disabled={demo}
                  onClick={() =>
                    !demo &&
                    router.push(
                      `/transactions?from=${range.from}&to=${range.to}`,
                    )
                  }
                >
                  {demo ? (
                    "Giao dịch mô phỏng trong kỳ"
                  ) : (
                    <>
                      Xem lịch sử trong kỳ <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </span>
            </section>
          </div>
          <div className={s.analytics}>
            <RevenueChart data={data} demo={demo} />
            <NewUsersChart data={data} customersOnly={demo} />
          </div>
        </>
      )}
      <div className={s.operations}>
        <div className={s.operationsColumn}>
          {demo ? (
            <section className={s.card} id="work-queue">
              <div className={s.heading}>
                <div>
                  <h2>Công việc cần xử lý</h2>
                  <p>DEMO — Không sử dụng hàng đợi production</p>
                </div>
              </div>
              <p className={s.empty}>
                Không mô phỏng công việc vận hành. Các thao tác xử lý không khả
                dụng.
              </p>
            </section>
          ) : (
            <WorkQueue />
          )}
          {data && <BookingBreakdown data={data} />}
        </div>
        {data ? (
          <ServiceReviews
            key={`${range.from}:${range.to}:${demo ? revision : "real"}`}
            demoReviews={
              demo ? demoReviewDetails(range.from, range.to) : undefined
            }
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
          <section className={s.systemOverview}>
            <Users size={18} />
            <b>{num(data.users.total)} người dùng</b>
            <span>{num(data.users.customers)} Customer</span>
            <span>{num(data.users.muas)} MUA</span>
            <span>{num(data.users.locked)} bị khóa</span>
            <small>Tổng hiện tại</small>
          </section>
          <details className={s.daily} open={demo ? true : undefined}>
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
                    {demo && (
                      <>
                        <th>Paid users mới</th>
                        <th>Giao dịch thành công</th>
                        <th>Reviews</th>
                      </>
                    )}
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
                      {demo &&
                        (() => {
                          const row = demoStats?.daily.find(
                            (d) => d.date === x.date,
                          );
                          return (
                            <>
                              <td>{num(row?.paidUsers ?? 0)}</td>
                              <td>{num(row?.transactions ?? 0)}</td>
                              <td>{num(row?.reviews ?? 0)}</td>
                            </>
                          );
                        })()}
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
            {data.revenueScope === "BookingAndPlans"
              ? "Doanh thu = phí nền tảng của booking hoàn thành / tự hoàn thành + tiền gói AI và MUA đã xác minh thu. Booking tính theo ngày hoàn thành, gói tính theo ngày xác minh tiền (giờ Việt Nam). Gói đã hoàn tiền không cộng doanh thu; thu hồi quyền không tự trừ tiền. Phí booking chưa trừ điều chỉnh kế toán từ hoàn tiền."
              : "Backend hiện chỉ thống kê phí booking. Cần cập nhật backend để cộng doanh thu bán gói."}
          </p>
        </>
      )}
    </div>
  );
}
