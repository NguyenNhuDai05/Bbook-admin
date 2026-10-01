"use client";
import { useState } from "react";
import { useResource } from "@/lib/client";
import { adminService } from "@/services/admin-service";
import { money } from "@/lib/format";
import { State } from "./ui";

function vietnamToday() {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}
function shift(day: string, days: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
function change(now: number, before: number) {
  if (!before) return now ? "Kỳ trước bằng 0" : "Không thay đổi";
  const percent = ((now - before) / before) * 100;
  return `${percent > 0 ? "+" : ""}${percent.toFixed(1)}% so với kỳ trước`;
}
function Chart({
  title,
  rows,
  financial,
}: {
  title: string;
  rows: { date: string; value: number }[];
  financial?: boolean;
}) {
  const max = Math.max(1, ...rows.map((x) => x.value));
  return (
    <section className="panel analytics-chart">
      <div className="panel-heading">
        <h2>{title}</h2>
      </div>
      {rows.every((x) => x.value === 0) && (
        <p className="small-label">Không phát sinh trong kỳ đã chọn</p>
      )}
      <div
        className="analytics-bars"
        role="img"
        aria-label={`${title}, ${rows.length} ngày. Chi tiết trong bảng bên dưới.`}
      >
        {rows.map((x) => (
          <div
            key={x.date}
            className="analytics-bar-column"
            title={`${x.date}: ${financial ? money(x.value) : x.value}`}
          >
            <div
              className="analytics-bar"
              style={{ height: `${(x.value / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="analytics-axis">
        <span>{rows[0]?.date}</span>
        <span>
          {financial
            ? money(max === 1 && rows.every((x) => !x.value) ? 0 : max)
            : max}
        </span>
        <span>{rows.at(-1)?.date}</span>
      </div>
      <details>
        <summary>Xem số liệu từng ngày</summary>
        <div className="analytics-table">
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>{title}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.date}>
                  <td>{x.date}</td>
                  <td>{financial ? money(x.value) : x.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
export function DashboardAnalytics() {
  const [range, setRange] = useState(() => ({
    from: shift(vietnamToday(), -29),
    to: vietnamToday(),
  }));
  const [draft, setDraft] = useState(range);
  const [error, setError] = useState("");
  const resource = useResource(adminService.dashboard(range.from, range.to));
  const data = resource.data;
  function preset(days: number) {
    const to = vietnamToday();
    const next = {
      from: days === 0 ? `${to.slice(0, 7)}-01` : shift(to, 1 - days),
      to,
    };
    setDraft(next);
    setRange(next);
    setError("");
  }
  return (
    <section className="analytics-section">
      <form
        className="analytics-filters"
        onSubmit={(event) => {
          event.preventDefault();
          const length =
            (Date.parse(draft.to) - Date.parse(draft.from)) / 86400000;
          if (!Number.isFinite(length) || length < 0 || length > 365) {
            setError("Chọn khoảng ngày hợp lệ, tối đa 366 ngày.");
            return;
          }
          setError("");
          setRange({ ...draft });
        }}
      >
        {[1, 7, 30, 0].map((days, i) => (
          <button
            className="button secondary"
            type="button"
            key={days}
            onClick={() => preset(days)}
          >
            {["Hôm nay", "7 ngày", "30 ngày", "Tháng này"][i]}
          </button>
        ))}
        <label>
          Từ ngày{" "}
          <input
            type="date"
            required
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </label>
        <label>
          Đến ngày{" "}
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
        <button
          className="button secondary"
          type="button"
          onClick={resource.reload}
        >
          Làm mới thống kê
        </button>
      </form>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <p className="small-label">
        Kỳ {range.from} — {range.to} · Giờ Việt Nam · Tổng người dùng là số hiện
        tại, không phụ thuộc bộ lọc.
      </p>
      {resource.loading || resource.error || !data ? (
        <State
          loading={resource.loading}
          error={resource.error}
          retry={resource.reload}
        />
      ) : (
        <>
          <div className="kpi-grid">
            {[
              {
                label: "Doanh thu phí nền tảng",
                value: money(data.current.revenue),
                hint: change(data.current.revenue, data.previous.revenue),
              },
              {
                label: "Người dùng mới",
                value: data.current.newUsers,
                hint: change(data.current.newUsers, data.previous.newUsers),
              },
              {
                label: "Booking hoàn thành",
                value: data.current.completedBookings,
                hint: change(
                  data.current.completedBookings,
                  data.previous.completedBookings,
                ),
              },
              {
                label: "Tổng người dùng",
                value: data.users.total,
                hint: `${data.users.customers} khách hàng · ${data.users.muas} MUA · ${data.users.locked} bị khóa`,
              },
            ].map((x) => (
              <div className="kpi-card" key={x.label}>
                <div className="kpi-top">{x.label}</div>
                <strong>{x.value}</strong>
                <div className="kpi-bottom">{x.hint}</div>
              </div>
            ))}
          </div>
          <div className="dashboard-grid">
            <Chart
              title="Doanh thu theo ngày"
              financial
              rows={data.daily.map((x) => ({ date: x.date, value: x.revenue }))}
            />
            <Chart
              title="Đăng ký mới theo ngày"
              rows={data.daily.map((x) => ({
                date: x.date,
                value: x.newUsers,
              }))}
            />
          </div>
          <div className="panel analytics-notes">
            <p>
              Giá trị booking hoàn thành:{" "}
              <b>{money(data.current.bookingValue)}</b> · Tiền cọc thu trong kỳ:{" "}
              <b>{money(data.current.depositsCollected)}</b> · Hoàn tiền hoàn
              tất trong kỳ: <b>{money(data.current.refundsCompleted)}</b>
            </p>
            <p>
              Doanh thu là phí lưu trên booking hoàn thành / tự hoàn thành, tính
              theo ngày hoàn thành; chưa trừ điều chỉnh kế toán từ hoàn tiền.
              Không bao gồm booking hủy hoặc đang tranh chấp. Người dùng không
              gồm Admin và tài khoản đã xóa.
            </p>
            <p>
              Trạng thái hiện tại của booking được tạo trong kỳ:{" "}
              {data.bookingStatuses.length
                ? data.bookingStatuses
                    .map(
                      (x) =>
                        `${({ Completed: "Hoàn thành", AutoCompleted: "Tự hoàn thành", Cancelled: "Đã hủy", Pending: "Chờ duyệt", Approved: "Đã duyệt", Rejected: "Từ chối", PendingPayment: "Chờ thanh toán", PendingConfirmation: "Chờ xác nhận", InProgress: "Đang thực hiện", WaitingCustomer: "Chờ khách xác nhận", Disputed: "Tranh chấp" } as Record<string, string>)[x.status] || x.status}: ${x.count}`,
                    )
                    .join(" · ")
                : "Chưa có booking"}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
