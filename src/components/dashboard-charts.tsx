"use client";
import { useState } from "react";
import type { DashboardData } from "@/lib/dashboard";
import { money } from "@/lib/format";
import { currencyAxis } from "@/lib/dashboard-presentation.mjs";
import s from "./dashboard.module.css";

function DailyChart({
  data,
  metric,
  line = false,
}: {
  data: DashboardData;
  metric: "revenue" | "newUsers" | "newMuas";
  line?: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(0, ...data.daily.map((x) => x[metric]));
  const ceiling =
    metric === "revenue"
      ? Math.max(
          1,
          max > 0
            ? Math.ceil(max / 10 ** Math.floor(Math.log10(max))) *
                10 ** Math.floor(Math.log10(max))
            : 1,
        )
      : Math.max(4, Math.ceil(max / 4) * 4);
  const interval = Math.max(1, Math.ceil(data.daily.length / 7));
  const format = (value: number) =>
    metric === "revenue"
      ? money(value)
      : `${value.toLocaleString("vi-VN")} ${metric === "newMuas" ? "MUA" : "người dùng"}`;
  const points = data.daily.map((x, i) => ({
    x: ((i + 0.5) / data.daily.length) * 1000,
    y: (1 - x[metric] / ceiling) * 240,
  }));
  const row = data.daily.find((x) => x.date === active);
  return (
    <div
      className={s.chart}
      role="group"
      aria-label={
        line
          ? "Biểu đồ đường doanh thu theo ngày"
          : "Biểu đồ cột tài khoản mới theo ngày"
      }
    >
      <div className={s.yAxis}>
        {[1, 0.75, 0.5, 0.25, 0].map((x) => (
          <span key={x}>
            {metric === "revenue"
              ? currencyAxis(ceiling * x)
              : (ceiling * x).toLocaleString("vi-VN")}
          </span>
        ))}
      </div>
      <div className={s.plot}>
        <div className={s.gridlines} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((x) => (
            <i key={x} />
          ))}
        </div>
        {line && (
          <svg
            className={s.linePlot}
            viewBox="0 0 1000 240"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="#d72e72"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
            {points
              .filter(
                (_, i) =>
                  data.daily.length <= 31 || data.daily[i].date === active,
              )
              .map((p) => (
                <circle key={p.x} cx={p.x} cy={p.y} r="3" fill="#d72e72" />
              ))}
          </svg>
        )}
        <div
          className={s.bars}
          style={{
            gap: line ? 0 : `${Math.min(3, 30 / data.daily.length)}%`,
            padding: 0,
          }}
        >
          {data.daily.map((x) => (
            <button
              type="button"
              key={x.date}
              className={s.barColumn}
              aria-label={`${x.date}: ${format(x[metric])}`}
              onMouseEnter={() => setActive(x.date)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(x.date)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(x.date)}
            >
              {!line && (
                <span style={{ height: `${(x[metric] / ceiling) * 100}%` }} />
              )}
            </button>
          ))}
        </div>
        <div className={s.xAxis}>
          {data.daily.map(
            (x, i) =>
              (i % interval === 0 || i === data.daily.length - 1) && (
                <span
                  key={x.date}
                  style={{ left: `${((i + 0.5) / data.daily.length) * 100}%` }}
                >
                  {x.date.slice(5).split("-").reverse().join("/")}
                </span>
              ),
          )}
        </div>
      </div>
      {row && (
        <div className={s.tooltip} role="status">
          {row.date.split("-").reverse().join("/")}
          <strong>{format(row[metric])}</strong>
        </div>
      )}
    </div>
  );
}
export function RevenueChart({ data }: { data: DashboardData }) {
  return (
    <section className={s.card}>
      <div className={s.heading}>
        <div>
          <h2>Doanh thu theo ngày</h2>
          <p>Phí nền tảng ghi nhận khi booking hoàn thành · VND</p>
        </div>
      </div>
      <DailyChart data={data} metric="revenue" line />
    </section>
  );
}
export function NewUsersChart({ data }: { data: DashboardData }) {
  const [tab, setTab] = useState<"newUsers" | "newMuas">("newUsers");
  return (
    <section className={s.card}>
      <div className={s.heading}>
        <div>
          <h2>Tài khoản mới theo ngày</h2>
          <p>
            Tính theo ngày tạo tài khoản; MUA là tài khoản hiện mang vai trò
            Makeup Artist
          </p>
        </div>
      </div>
      <div
        className={s.chartTabs}
        role="tablist"
        aria-label="Thống kê tài khoản mới"
      >
        {(["newUsers", "newMuas"] as const).map((key) => (
          <button
            type="button"
            role="tab"
            id={`chart-tab-${key}`}
            aria-controls="new-accounts-chart"
            aria-selected={tab === key}
            key={key}
            onClick={() => setTab(key)}
          >
            {key === "newUsers" ? "Người dùng mới" : "Makeup Artist mới"}
          </button>
        ))}
      </div>
      <div
        id="new-accounts-chart"
        role="tabpanel"
        aria-labelledby={`chart-tab-${tab}`}
      >
        <DailyChart key={tab} data={data} metric={tab} />
      </div>
    </section>
  );
}
