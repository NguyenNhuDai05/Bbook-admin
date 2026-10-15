"use client";
import { useEffect, useState } from "react";
import s from "./website-analytics.module.css";

type LiveData = {
  status: "ready";
  active5?: number;
  active30?: number;
  views5?: number;
  views30?: number;
  minutes: { minutesAgo: number; users?: number; views?: number }[];
  fetchedAt: string;
};
export function RealtimeActivity({
  mode = "users",
}: {
  mode?: "users" | "views";
}) {
  const views = mode === "views";
  const label = views ? "Lượt xem trang" : "Người hoạt động";
  const unit = views ? "lượt xem" : "người";
  const [data, setData] = useState<LiveData>();
  const [message, setMessage] = useState(`Đang lấy ${label.toLowerCase()}…`);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    async function refresh() {
      if (document.hidden || busy || controller.signal.aborted) return;
      busy = true;
      try {
        const response = await fetch(
          views ? "/api/analytics/realtime/views" : "/api/analytics/realtime",
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok || result.status !== "ready") {
          setData(undefined);
          setMessage(
            result.message ||
              "Không thể tải dữ liệu realtime. Đang chờ thử lại.",
          );
          return;
        }
        setData(result);
        setMessage("");
      } catch {
        if (!controller.signal.aborted) {
          setData(undefined);
          setMessage("Không thể tải dữ liệu realtime. Đang chờ thử lại.");
        }
      } finally {
        busy = false;
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [views]);
  if (!data)
    return (
      <div className={s.placeholder} role="status">
        {message}
      </div>
    );
  const points = data.minutes.map((point) => ({
    minutesAgo: point.minutesAgo,
    value: (views ? point.views : point.users)!,
  }));
  const total5 = (views ? data.views5 : data.active5)!;
  const total30 = (views ? data.views30 : data.active30)!;
  const ceiling = Math.max(1, ...points.map((point) => point.value));
  return (
    <div>
      <div className={s.liveTotals} aria-live="polite">
        <div>
          <strong>{total5.toLocaleString("vi-VN")}</strong>
          <span>{unit} trong 5 phút gần đây</span>
        </div>
        <div>
          <strong>{total30.toLocaleString("vi-VN")}</strong>
          <span>{unit} trong 30 phút gần đây</span>
        </div>
      </div>
      <svg
        className={s.liveChart}
        viewBox="0 0 1000 230"
        role="img"
        aria-label={`${label} từng phút trong 30 phút gần đây`}
      >
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1="35"
              x2="995"
              y1={195 - ratio * 180}
              y2={195 - ratio * 180}
              stroke="#ede5e9"
            />
            <text x="0" y={199 - ratio * 180} fontSize="12" fill="currentColor">
              {Math.ceil(ceiling * ratio)}
            </text>
          </g>
        ))}
        {points.map((point, i) => (
          <rect
            key={point.minutesAgo}
            x={40 + i * 31.5}
            y={195 - (point.value / ceiling) * 180}
            width="22"
            height={(point.value / ceiling) * 180}
            rx="3"
            fill="#ee4f8f"
          >
            <title>
              {`${point.minutesAgo === 0 ? "Phút hiện tại" : `${point.minutesAgo} phút trước`}: ${point.value} ${unit}`}
            </title>
          </rect>
        ))}
        <text x="40" y="220" fontSize="13" fill="currentColor">
          29 phút trước
        </text>
        <text x="915" y="220" fontSize="13" fill="currentColor">
          Hiện tại
        </text>
      </svg>
      <details className={s.details}>
        <summary>Xem dữ liệu theo phút</summary>
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>{label}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.minutesAgo}>
                  <td>
                    {point.minutesAgo === 0
                      ? "Phút hiện tại"
                      : `${point.minutesAgo} phút trước`}
                  </td>
                  <td>{point.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className={s.note}>
        {views ? (
          "Tính cả lượt xem lại được GA4 ghi nhận của người mới và quay lại. Cửa sổ 5/30 phút không phụ thuộc khoảng ngày phía trên và không cộng vào tổng lượt xem theo ngày. Cập nhật mỗi 30 giây; dữ liệu phụ thuộc consent và độ trễ GA4."
        ) : (
          <>
            Bao gồm người mới và quay lại được GA4 ghi nhận, không cần đăng
            nhập. Số người trong khoảng thời gian được tính riêng, không cộng
            các cột theo phút. Cập nhật mỗi 30 giây; GA4 có độ trễ và phụ thuộc
            quyền thu thập Analytics.
          </>
        )}
      </p>
      <p className={s.note}>
        Cập nhật lúc {new Date(data.fetchedAt).toLocaleTimeString("vi-VN")}
      </p>
    </div>
  );
}
