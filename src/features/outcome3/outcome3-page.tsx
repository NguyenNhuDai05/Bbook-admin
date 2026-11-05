"use client";
import { useState } from "react";
import { useResource } from "@/lib/client";
import { adminService } from "@/services/admin-service";
import { ServiceReviews } from "@/components/dashboard-reviews";
import { State } from "@/components/ui";
import { validRange } from "@/lib/dashboard-presentation.mjs";
import { days, demoLabel, demoReport } from "./demo.mjs";
import s from "@/components/dashboard.module.css";

const ratingText = (rating: number | null) =>
  rating === null
    ? "—"
    : `${rating.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / 5`;
function DemoReport({ from, to }: { from: string; to: string }) {
  const report = demoReport(from, to);
  return (
    <section className={s.card}>
      <h2>{demoLabel}</h2>
      <p role="note">DỮ LIỆU MÔ PHỎNG — KHÔNG PHẢI GIAO DỊCH THỰC TẾ</p>
      <dl>
        {Object.entries({
          "Customer mới": report.customers,
          "MUA mới": report.muas,
          "Người dùng mới": report.users,
          "Paid users": report.paidUsers,
          "Giao dịch thành công": report.successfulTransactions,
          "Booking hoàn thành": report.completedBookings,
          "Đánh giá dịch vụ": report.reviews.total,
          "Average Rating": ratingText(report.reviews.averageRating),
          "Low Ratings (≤ 2 stars)": report.reviews.lowRatingCount,
          "Doanh thu nền tảng (VND)": report.revenue.toLocaleString("vi-VN"),
        }).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <h3>Phân bố rating</h3>
      <div className={s.ratingDistribution}>
        {report.reviews.distribution.map((row) => (
          <div key={row.rating}>
            {row.rating} sao{" "}
            <progress
              aria-label={`${row.rating} sao`}
              max={Math.max(1, report.reviews.total)}
              value={row.count}
            />{" "}
            {row.count}
          </div>
        ))}
      </div>
      <h3>Reviews by Day</h3>
      {report.reviews.daily.map((row) => (
        <div key={row.date}>
          {row.date}{" "}
          <progress
            aria-label={`Reviews ${row.date}`}
            max={Math.max(1, ...report.reviews.daily.map((d) => d.count))}
            value={row.count}
          />{" "}
          {row.count}
        </div>
      ))}
      <h3>Daily Statistics Table</h3>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              {[
                "Ngày",
                "Customer mới",
                "MUA mới",
                "Paid users mới",
                "Giao dịch",
                "Booking hoàn thành",
                "Reviews",
                "Doanh thu (VND)",
              ].map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.daily.map((row) => (
              <tr key={row.date}>
                {Object.values(row).map((value, i) => (
                  <td key={i}>
                    {typeof value === "number"
                      ? value.toLocaleString("vi-VN")
                      : value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Recent Reviews — Mô phỏng</h3>
      {report.reviews.recent.map((review) => (
        <article key={review.reviewId}>
          <strong>
            {review.rating} / 5 · {review.customerId} → {review.muaId}
          </strong>
          <p>{review.comment}</p>
          <small>
            {review.bookingId} ·{" "}
            {new Date(review.createdAt).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}
          </small>
        </article>
      ))}
    </section>
  );
}
function RealReport({ from, to }: { from: string; to: string }) {
  const resource = useResource(adminService.dashboard(from, to));
  return (
    <section className={s.card}>
      <h2>REAL — Dữ liệu thực tế</h2>
      <button onClick={resource.reload}>Làm mới dữ liệu thật</button>
      {resource.error || !resource.data ? (
        <State
          loading={resource.loading}
          error={resource.error}
          retry={resource.reload}
        />
      ) : (
        <>
          <p>
            Customers (tổng): {resource.data.users.customers} · MUA (tổng):{" "}
            {resource.data.users.muas}
          </p>
          <p>
            Giao dịch trong kỳ: {resource.data.current.successfulTransactions} ·
            Booking hoàn thành: {resource.data.current.completedBookings} ·
            Doanh thu: {resource.data.current.revenue.toLocaleString("vi-VN")}{" "}
            VND
          </p>
          <ServiceReviews data={resource.data} from={from} to={to} />
        </>
      )}
    </section>
  );
}
export function Outcome3Page() {
  const [mode, setMode] = useState("REAL");
  const [from, setFrom] = useState(days[0]);
  const [to, setTo] = useState(days[6]);
  const valid = validRange(from, to);
  return (
    <div className={s.dashboard}>
      <header>
        <h1>Outcome 3 — Performance Report</h1>
        <p>Thống kê kết quả hoạt động và thanh toán BBook · UTC+7</p>
      </header>
      <div className={s.customRange}>
        <label>
          Chế độ
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="REAL">Thực tế</option>
            <option value="DEMO">Demo</option>
            <option value="COMPARE">So sánh</option>
          </select>
        </label>
        <label>
          Từ ngày
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      {!valid ? (
        <p role="alert">Chọn khoảng ngày hợp lệ.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
            gap: 20,
          }}
        >
          {mode !== "DEMO" && (
            <RealReport key={`real:${from}:${to}`} from={from} to={to} />
          )}
          {mode !== "REAL" && <DemoReport from={from} to={to} />}
        </div>
      )}
    </div>
  );
}
