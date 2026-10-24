"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import { RealtimeActivity } from "./analytics-realtime";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  ExternalLink,
  Globe,
  RefreshCw,
  Users,
} from "lucide-react";
import { useResource } from "@/lib/client";
import {
  analyticsRange,
  analyticsToday,
  shiftDate,
} from "@/lib/analytics-contracts.mjs";
import type { AnalyticsKpi, AnalyticsReady } from "@/lib/analytics-types";
import { websiteAnalyticsQuery } from "@/services/analytics-service";
import { websiteApkQuery } from "@/services/analytics-service";
import type { ApkDailyReady } from "@/lib/analytics-types";
import { PageTitle } from "./ui";
import s from "./website-analytics.module.css";

const count = (value: number | null) =>
  value === null ? "—" : value.toLocaleString("vi-VN");
const decimal = (value: number | null) =>
  value === null
    ? "—"
    : value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const seconds = (value: number | null) =>
  value === null ? "—" : decimal(value) + " giây";
const percent = (value: number | null) =>
  value === null
    ? "—"
    : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
const dateLabel = (value: string) => value.split("-").reverse().join("/");
function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${s.panel} ${className}`}>
      <div className={s.panelHeading}>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children}
    </section>
  );
}
function Metric({
  label,
  subtitle,
  metric,
  icon,
  state,
  format = count,
}: {
  label: string;
  subtitle: string;
  metric?: AnalyticsKpi;
  icon: ReactNode;
  state: string;
  format?: (value: number | null) => string;
}) {
  const delta = metric?.change ?? null;
  return (
    <section className={s.metric}>
      <div className={s.metricHeading}>
        <h2>{label}</h2>
        <span className={s.metricIcon}>{icon}</span>
      </div>
      <p>{subtitle}</p>
      <strong className={s.metricValue}>
        {metric ? (
          format(metric.value)
        ) : state === "loading" ? (
          <span className={s.skeleton} aria-label="Đang tải" />
        ) : (
          "—"
        )}
      </strong>
      {metric ? (
        <div
          className={`${s.delta} ${delta !== null && delta !== undefined && delta < 0 ? s.negative : s.positive}`}
          title={`Kỳ trước: ${format(metric.previous)}`}
        >
          {delta !== null &&
            delta !== undefined &&
            delta !== 0 &&
            (delta < 0 ? (
              <ArrowDownRight size={15} />
            ) : (
              <ArrowUpRight size={15} />
            ))}
          <span>
            {metric.value === null
              ? "GA4 chưa cung cấp chỉ số"
              : delta === null
                ? "Chưa có tỷ lệ so sánh hợp lệ"
                : `${delta && delta > 0 ? "+" : ""}${percent(delta)} so với kỳ trước`}
          </span>
        </div>
      ) : (
        <span className={s.metricStatus}>
          {state === "loading"
            ? "Đang lấy dữ liệu GA4"
            : state === "not_connected"
              ? "Chưa kết nối GA4"
              : state === "error"
                ? "Không tải được dữ liệu"
                : "Chưa có số liệu"}
        </span>
      )}
    </section>
  );
}
function Chart({
  daily: gaDaily,
  placeholder,
  apk,
  apkPlaceholder,
}: {
  daily: AnalyticsReady["daily"];
  placeholder: ReactNode;
  apk?: ApkDailyReady;
  apkPlaceholder: ReactNode;
}) {
  const [realtime, setRealtime] = useState<"users" | "views" | null>(null);
  const [metric, setMetric] = useState<"users" | "sessions" | "apkClicks">(
    "users",
  );
  const [selected, setSelected] = useState<number | null>(null);
  const counts = new Map(apk?.daily.map((row) => [row.date, row.clicks]));
  const daily = (
    metric === "apkClicks"
      ? (apk?.daily.map((row) => ({
          date: row.date,
          users: null,
          sessions: null,
          apkClicks: row.clicks,
        })) ?? [])
      : gaDaily
  ).map((row) => ({ ...row, apkClicks: counts.get(row.date) ?? null }));
  const gradient = useId().replaceAll(":", "");
  const labels = {
    users: "Người truy cập",
    sessions: "Phiên truy cập",
    apkClicks: "Lượt nhấn APK",
  };
  const ceiling = Math.max(
    4,
    Math.ceil(Math.max(...daily.map((day) => day[metric] ?? 0), 0) / 4) * 4,
  );
  const points = daily.map((day, i) => ({
    x: ((i + 0.5) / daily.length) * 1000,
    y:
      day[metric] === null
        ? null
        : 230 - ((day[metric] as number) / ceiling) * 220,
  }));
  const segments: { x: number; y: number }[][] = [];
  let segment: { x: number; y: number }[] = [];
  for (const point of points) {
    if (point.y === null) {
      if (segment.length) segments.push(segment);
      segment = [];
    } else segment.push({ x: point.x, y: point.y });
  }
  if (segment.length) segments.push(segment);
  const current = selected === null ? null : daily[selected];
  return (
    <>
      <div className={s.chartTabs} role="group" aria-label="Chỉ số biểu đồ">
        {(["users", "sessions", "apkClicks"] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={!realtime && metric === key}
            onClick={() => {
              setMetric(key);
              setRealtime(null);
              setSelected(null);
            }}
          >
            {labels[key]}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={realtime === "users"}
          onClick={() => setRealtime("users")}
        >
          Người hoạt động
        </button>
        <button
          type="button"
          aria-pressed={realtime === "views"}
          onClick={() => setRealtime("views")}
        >
          Lượt xem trang
        </button>
      </div>
      {realtime ? (
        <RealtimeActivity key={realtime} mode={realtime} />
      ) : (
        <>
          {!daily.length ? (
            metric === "apkClicks" ? (
              apkPlaceholder
            ) : (
              placeholder
            )
          ) : daily.every((day) => day[metric] === null) ? (
            <div className={s.placeholder}>
              {metric === "apkClicks"
                ? "Chưa ghi nhận lượt nhấn nội bộ trong khoảng ngày này."
                : `GA4 chưa cung cấp ${labels[metric].toLowerCase()}; không hiển thị đường biểu đồ giả.`}
            </div>
          ) : (
            <div
              className={s.chart}
              role="group"
              aria-label={labels[metric] + " theo ngày"}
            >
              <div className={s.yAxis}>
                {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                  <span key={ratio}>{count(ceiling * ratio)}</span>
                ))}
              </div>
              <div
                className={s.plot}
                onPointerMove={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setSelected(
                    Math.max(
                      0,
                      Math.min(
                        daily.length - 1,
                        Math.floor(
                          ((event.clientX - rect.left) / rect.width) *
                            daily.length,
                        ),
                      ),
                    ),
                  );
                }}
                onPointerLeave={() => setSelected(null)}
              >
                <div className={s.gridlines} aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <i key={i} />
                  ))}
                </div>
                <svg
                  viewBox="0 0 1000 240"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
                      <stop stopColor="#ff5c9a" stopOpacity=".28" />
                      <stop offset="1" stopColor="#ff5c9a" stopOpacity=".02" />
                    </linearGradient>
                  </defs>
                  {segments.map((part, i) => (
                    <g key={i}>
                      {part.length > 1 ? (
                        <>
                          <polygon
                            points={
                              part[0].x +
                              ",240 " +
                              part.map((p) => p.x + "," + p.y).join(" ") +
                              " " +
                              part[part.length - 1].x +
                              ",240"
                            }
                            fill={"url(#" + gradient + ")"}
                          />
                          <polyline
                            points={part.map((p) => p.x + "," + p.y).join(" ")}
                            fill="none"
                            stroke="#ee4f8f"
                            strokeWidth="2.5"
                            vectorEffect="non-scaling-stroke"
                          />
                        </>
                      ) : (
                        <circle
                          cx={part[0].x}
                          cy={part[0].y}
                          r="4"
                          fill="#ee4f8f"
                        />
                      )}
                    </g>
                  ))}
                </svg>
                {current && (
                  <div
                    className={s.tooltip}
                    role="status"
                    style={{
                      left:
                        "clamp(82px, " +
                        ((selected! + 0.5) / daily.length) * 100 +
                        "%, calc(100% - 82px))",
                    }}
                  >
                    {dateLabel(current.date)}
                    <strong>
                      {count(current[metric])} · {labels[metric]}
                    </strong>
                  </div>
                )}
                <div className={s.xAxis}>
                  {daily.map(
                    (day, i) =>
                      (i === 0 ||
                        i === daily.length - 1 ||
                        i % Math.max(1, Math.ceil(daily.length / 5)) === 0) && (
                        <span
                          key={day.date}
                          style={{
                            left:
                              "clamp(20px, " +
                              ((i + 0.5) / daily.length) * 100 +
                              "%, calc(100% - 20px))",
                          }}
                        >
                          {day.date.slice(5).split("-").reverse().join("/")}
                        </span>
                      ),
                  )}
                </div>
              </div>
            </div>
          )}
          <details className={s.details}>
            <summary>Xem dữ liệu theo ngày</summary>
            <div className={s.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Người truy cập</th>
                    <th>Phiên</th>
                    <th>Lượt nhấn APK</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((day) => (
                    <tr key={day.date}>
                      <td>{dateLabel(day.date)}</td>
                      <td>{count(day.users)}</td>
                      <td>{count(day.sessions)}</td>
                      <td>{count(day.apkClicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          {metric === "apkClicks" ? (
            <p className={s.note}>
              Đếm nội bộ · cập nhật khoảng 45 giây.{" "}
              {apk?.trackingStartedAt
                ? `Bắt đầu ghi nhận ${new Date(apk.trackingStartedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. Ngày bắt đầu có thể chưa đủ cả ngày.`
                : "Chưa có lượt nhấn được ghi nhận."}{" "}
              Dấu — là chưa có dữ liệu, không cộng với GA4.
            </p>
          ) : (
            <p className={s.note}>
              Một người có thể truy cập nhiều ngày; không cộng các điểm thành
              tổng người dùng duy nhất.
            </p>
          )}
        </>
      )}
    </>
  );
}
export function WebsiteAnalytics() {
  const [preset, setPreset] = useState("30");
  const [range, setRange] = useState(() => ({
    start: shiftDate(analyticsToday(), -29),
    end: analyticsToday(),
  }));
  const [draft, setDraft] = useState(range);
  const [dateError, setDateError] = useState("");
  const resource = useResource(websiteAnalyticsQuery(range.start, range.end));
  const counter = useResource(websiteApkQuery(range.start, range.end), {
    retainData: true,
  });
  const apk =
    !counter.error && counter.data?.source === "first_party"
      ? counter.data
      : undefined;
  const { reload: reloadCounter, loading: counterLoading } = counter;
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden && !counterLoading) reloadCounter();
    };
    const timer = setInterval(refresh, 45000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [reloadCounter, counterLoading]);
  const apkPlaceholder = (
    <div className={s.placeholder} role="status">
      {counterLoading
        ? "Đang đọc lượt nhấn APK nội bộ…"
        : counter.error || "Chưa có lượt nhấn nội bộ được ghi nhận."}
    </div>
  );
  const data = resource.data?.status === "ready" ? resource.data : undefined;
  const status = resource.loading
    ? "loading"
    : resource.error
      ? "error"
      : resource.data?.status || "error";
  const stateLabel =
    status === "loading"
      ? "Đang lấy dữ liệu Google Analytics…"
      : status === "not_connected"
        ? "Kết nối Google Analytics để xem dữ liệu."
        : status === "error"
          ? "Dữ liệu chưa tải được. Vui lòng thử lại."
          : "Chưa có dữ liệu trong khoảng ngày này.";
  const placeholder = (
    <div className={s.placeholder}>
      {status === "loading" ? (
        <div className={s.panelSkeleton}>
          <i />
          <i />
          <i />
        </div>
      ) : (
        <>
          <Globe size={24} />
          <p>{stateLabel}</p>
        </>
      )}
    </div>
  );
  const reportPlaceholder = (...ids: string[]) =>
    ids.some((id) => data?.availability[id]?.state === "unavailable") ? (
      <div className={s.placeholder}>
        GA4 chưa cung cấp báo cáo này. Xem lý do ở thông báo phía trên; không
        coi dữ liệu thiếu là số 0.
      </div>
    ) : (
      placeholder
    );
  const campaignRows = data?.campaigns || [];
  const [campaignLimit, setCampaignLimit] = useState(10);
  const [pageLimit, setPageLimit] = useState(10);
  const [trafficLimit, setTrafficLimit] = useState(15);
  const [sourceFilter, setSourceFilter] = useState("all");
  const trafficRows = (data?.traffic || []).filter(
    (row) => sourceFilter === "all" || row.category === sourceFilter,
  );
  function setPeriod(value: string) {
    setPreset(value);
    setDateError("");
    if (value === "custom") return;
    const end = analyticsToday();
    const next = { start: shiftDate(end, 1 - Number(value)), end };
    setRange(next);
    setDraft(next);
    setCampaignLimit(10);
    setPageLimit(10);
    setTrafficLimit(15);
  }
  return (
    <div className={s.page} aria-busy={resource.loading}>
      <PageTitle
        title="Website Analytics"
        description="Theo dõi lượt truy cập website và hiệu quả tải ứng dụng."
        action={
          <button
            className="button secondary"
            onClick={() => {
              resource.reload();
              reloadCounter();
            }}
            disabled={resource.loading || counterLoading}
          >
            <RefreshCw size={16} />
            {resource.loading ? "Đang tải" : "Tải lại"}
          </button>
        }
      />
      <div className={s.filterBar}>
        <div className={s.presets} role="group" aria-label="Khoảng thời gian">
          {["7", "30", "90", "custom"].map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={preset === value}
              className={preset === value ? s.selectedPreset : ""}
              onClick={() => setPeriod(value)}
            >
              {value === "custom" ? (
                <>
                  <CalendarDays size={15} />
                  Tùy chỉnh
                </>
              ) : (
                `${value} ngày`
              )}
            </button>
          ))}
        </div>
        <span>
          {dateLabel(range.start)} — {dateLabel(range.end)}
        </span>
      </div>
      {preset === "custom" && (
        <form
          className={s.customRange}
          onSubmit={(event) => {
            event.preventDefault();
            try {
              analyticsRange(draft.start, draft.end);
              setDateError("");
              if (draft.start !== range.start || draft.end !== range.end)
                setRange({ ...draft });
              setCampaignLimit(10);
              setPageLimit(10);
              setTrafficLimit(15);
            } catch {
              setDateError(
                "Chọn khoảng ngày hợp lệ, tối đa 366 ngày và không vượt ngày hiện tại.",
              );
            }
          }}
        >
          <label>
            Từ ngày
            <input
              type="date"
              required
              value={draft.start}
              max={draft.end}
              onChange={(e) => setDraft({ ...draft, start: e.target.value })}
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              required
              min={draft.start}
              max={analyticsToday()}
              value={draft.end}
              onChange={(e) => setDraft({ ...draft, end: e.target.value })}
            />
          </label>
          <button className="button">Áp dụng</button>
          {dateError && <p role="alert">{dateError}</p>}
        </form>
      )}
      {resource.error && (
        <div className={`${s.notice} ${s.error}`} role="alert">
          <strong>Không thể tải Website Analytics</strong>
          <p>{resource.error}</p>
          <button className="button secondary" onClick={resource.reload}>
            Thử lại
          </button>
        </div>
      )}
      {counter.error && (
        <div className={`${s.notice} ${s.error}`} role="alert">
          <strong>Không thể tải lượt nhấn APK nội bộ</strong>
          <p>{counter.error}</p>
          <button
            className="button secondary"
            onClick={reloadCounter}
            disabled={counterLoading}
          >
            Thử lại bộ đếm APK
          </button>
        </div>
      )}
      {resource.data?.status === "not_connected" && (
        <div className={s.notice} role="status">
          <strong>Chưa kết nối Google Analytics</strong>
          <p>{resource.data.message}</p>
          <p>
            Measurement ID thu thập dữ liệu trên website; dashboard cần Property
            ID và quyền đọc từ service account.
          </p>
        </div>
      )}
      {data?.warnings.map((warning) => (
        <p className={s.warning} role="status" key={warning}>
          {warning}
        </p>
      ))}
      {data?.empty && (
        <p className={s.notice} role="status">
          GA4 trả báo cáo tổng rỗng: chưa ghi nhận dữ liệu trong khoảng ngày
          này. Không xác nhận rằng việc xử lý đã hoàn tất.
        </p>
      )}
      <div className={s.kpis}>
        <Metric
          label="Tổng người truy cập"
          subtitle="Tổng người dùng theo GA4"
          icon={<Users size={20} />}
          metric={data?.kpis.users}
          state={status}
        />
        <Metric
          label="Người dùng mới"
          subtitle="Người truy cập lần đầu"
          icon={<Users size={20} />}
          metric={data?.kpis.newUsers}
          state={status}
        />
        <Metric
          label="Phiên truy cập"
          subtitle="Phiên bắt đầu trên website"
          icon={<Activity size={20} />}
          metric={data?.kpis.sessions}
          state={status}
        />
        <Metric
          label="Tổng lượt xem trang"
          subtitle="Bao gồm các lần xem lại"
          icon={<Globe size={20} />}
          metric={data?.kpis.views}
          state={status}
        />
        <Metric
          label="Lượt nhấn tải APK"
          subtitle={
            apk?.trackingStartedAt
              ? `Đếm nội bộ từ ${new Date(apk.trackingStartedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
              : "Theo ngày · đếm nội bộ"
          }
          icon={<Download size={20} />}
          metric={
            apk?.total !== null && apk?.total !== undefined
              ? { value: apk.total, previous: null, change: null }
              : undefined
          }
          state={counterLoading ? "loading" : counter.error ? "error" : "ready"}
        />
        <Metric
          label="Tỷ lệ tương tác"
          subtitle="Phiên có tương tác / tổng phiên"
          icon={<Activity size={20} />}
          metric={data?.kpis.engagementRate}
          state={status}
          format={percent}
        />
        <Metric
          label="Thời gian tương tác trung bình"
          subtitle="Trên mỗi người dùng hoạt động"
          icon={<Activity size={20} />}
          metric={data?.kpis.averageEngagementTime}
          state={status}
          format={seconds}
        />
        <Metric
          label="Lượt nhấn Google Play"
          subtitle="Lượt nhấn mở cửa hàng"
          icon={<ExternalLink size={20} />}
          metric={data?.kpis.play}
          state={status}
        />
      </div>
      <div className={s.grid}>
        <Panel
          title="Xu hướng truy cập"
          subtitle="Theo ngày hoặc người hoạt động gần đây"
          className={s.wide}
        >
          <Chart
            apk={apk}
            apkPlaceholder={apkPlaceholder}
            key={range.start + ":" + range.end}
            daily={data?.daily ?? []}
            placeholder={placeholder}
          />
        </Panel>
        <Panel
          title="Nguồn truy cập"
          subtitle="Nguồn của phiên · tỷ trọng trên tổng người truy cập"
        >
          {data ? (
            <div className={s.sources}>
              {data.sources.map((source, i) => (
                <div className={s.source} key={source.name}>
                  <div>
                    <span>
                      <i className={s.sourceDot}>
                        {["D", "f", "@", "♪", "G", "↗", "?", "–"][i]}
                      </i>
                      {source.name}
                    </span>
                    <strong>
                      {count(source.users)}{" "}
                      <small>{percent(source.share)}</small>
                    </strong>
                  </div>
                  <progress
                    aria-label={`${source.name}: ${count(source.users)} người truy cập`}
                    max={Math.max(
                      1,
                      data.kpis.users.value ?? 0,
                      source.users ?? 0,
                    )}
                    value={source.users ?? 0}
                  />
                </div>
              ))}
            </div>
          ) : (
            placeholder
          )}
          <p className={s.note}>
            Một người có thể thuộc nhiều nguồn; tỷ lệ không bắt buộc cộng thành
            100%. Nguồn chưa có attribution và (not set) được hiển thị riêng.
          </p>
        </Panel>
        <Panel
          title="Hiệu quả nguồn truy cập"
          subtitle="Traffic Source Performance · tổng hợp theo source/medium, không chia campaign"
          className={s.full}
        >
          <label className={s.sourceFilter}>
            Nhóm nguồn{" "}
            <select
              value={sourceFilter}
              onChange={(event) => {
                setSourceFilter(event.target.value);
                setTrafficLimit(15);
              }}
            >
              {[
                "all",
                "Facebook",
                "TikTok",
                "Threads",
                "Google",
                "Direct",
                "Other",
                "(data not available)",
                "(not set)",
              ].map((name) => (
                <option key={name} value={name}>
                  {name === "all" ? "Tất cả" : name}
                </option>
              ))}
            </select>
          </label>
          {data ? (
            trafficRows.length ? (
              <>
                <div className={s.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Source / Medium",
                          "Nhóm nguồn",
                          "Phiên",
                          "Tổng người dùng",
                          "Lượt nhấn APK",
                          "Lượt nhấn APK / phiên",
                        ].map((name) => (
                          <th key={name}>{name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trafficRows.slice(0, trafficLimit).map((row, i) => (
                        <tr key={i}>
                          <td>
                            <strong>{row.source || "(not set)"}</strong>
                            <small>{row.medium || "(not set)"}</small>
                          </td>
                          <td>{row.category}</td>
                          <td>{count(row.sessions)}</td>
                          <td>{count(row.users)}</td>
                          <td>{count(row.apkClicks)}</td>
                          <td>{decimal(row.clicksPerSession)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {trafficRows.length > trafficLimit && (
                  <button
                    className={s.more}
                    onClick={() => setTrafficLimit((n) => n + 20)}
                  >
                    Xem thêm
                  </button>
                )}
              </>
            ) : (
              <div className={s.placeholder}>
                {["trafficSessions", "trafficClicks"].some(
                  (id) => data.availability[id]?.state === "unavailable",
                )
                  ? "GA4 chưa cung cấp dữ liệu nguồn truy cập; xem lý do ở thông báo phía trên."
                  : "Chưa có dòng dữ liệu cho nhóm nguồn này."}
              </div>
            )
          ) : (
            placeholder
          )}
          <p className={s.note}>
            Users được GA4 tính trực tiếp theo source/medium, không cộng từ
            campaign. Một người có thể thuộc nhiều nguồn. Lượt nhấn APK / phiên
            là số lần nhấn trung bình trên phiên, không phải tỷ lệ chuyển đổi. —
            nghĩa là chưa có chỉ số hợp lệ.
          </p>
        </Panel>
        <Panel
          title="Chiến dịch UTM chi tiết"
          subtitle="Session attribution · theo dõi UTM source, medium, campaign và content"
          className={s.full}
        >
          {data ? (
            campaignRows.length ? (
              <>
                <div className={s.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Source / Medium",
                          "Chiến dịch",
                          "Nội dung UTM",
                          "Phiên",
                          "Lượt nhấn APK",
                          "Lượt nhấn APK / phiên",
                        ].map((label) => (
                          <th key={label}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {campaignRows
                        .slice(0, campaignLimit)
                        .map((campaign, index) => (
                          <tr key={index}>
                            <td>
                              <strong>{campaign.source}</strong>
                              <small>{campaign.medium}</small>
                            </td>
                            <td>{campaign.campaign}</td>
                            <td>{campaign.content}</td>
                            <td>{count(campaign.sessions)}</td>
                            <td>{count(campaign.apkClicks)}</td>
                            <td>
                              <span className={s.rate}>
                                {decimal(campaign.clicksPerSession)}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {campaignRows.length > campaignLimit && (
                  <button
                    className={s.more}
                    onClick={() => setCampaignLimit((n) => n + 20)}
                  >
                    Xem thêm ({count(campaignRows.length - campaignLimit)})
                  </button>
                )}
              </>
            ) : (
              reportPlaceholder("campaignSessions", "campaignClicks")
            )
          ) : (
            reportPlaceholder("campaignSessions", "campaignClicks")
          )}
          <p className={s.note}>
            APK Clicks per Session = lượt nhấn APK / phiên. Giá trị có thể lớn
            hơn 1 khi nhấn nhiều lần; không phải tỷ lệ chuyển đổi hoặc cài đặt.
            Không có phiên thì chỉ số là —.
          </p>
        </Panel>
        <Panel
          title="Hành động tải ứng dụng"
          subtitle="Hai đường tải ứng dụng song song"
        >
          <div className={s.landing}>
            <span>Người xem trang chính</span>
            <strong>{data ? count(data.actions.visitors) : "—"}</strong>
            <small>Người xem trang chính /</small>
          </div>
          <div className={s.branchLines} aria-hidden="true">
            <i />
            <i />
          </div>
          <div className={s.branches}>
            {[
              {
                label: "APK",
                icon: Download,
                clicks: data?.actions.apkClicks,
                users: data?.actions.apkUsers,
                rate: data?.actions.apkRate,
              },
              {
                label: "Google Play",
                icon: ExternalLink,
                clicks: data?.actions.playClicks,
                users: data?.actions.playUsers,
                rate: data?.actions.playRate,
              },
            ].map((branch) => (
              <div key={branch.label}>
                <branch.icon size={19} />
                <h3>{branch.label}</h3>
                <strong>
                  {branch.clicks !== undefined ? count(branch.clicks) : "—"}{" "}
                  <small>clicks</small>
                </strong>
                <span>
                  {branch.users !== undefined ? count(branch.users) : "—"} người
                  đã nhấn
                </span>
                <b>{percent(branch.rate ?? null)}</b>
              </div>
            ))}
          </div>
          <p className={s.note}>
            Tỷ lệ = người đã nhấn / người xem trang chính, trong cùng khoảng
            ngày. Người dùng có thể nhấn cả hai nhánh. Chưa xác nhận tải hoàn
            tất hoặc cài đặt.
          </p>
        </Panel>
        <Panel
          title="Top Pages · Trang được xem nhiều"
          subtitle="Lượt xem theo đường dẫn trang thực tế"
          className={s.wide}
        >
          {data && data.pages.length ? (
            <>
              <div className={s.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Page path</th>
                      <th>Views</th>
                      <th>Tỷ trọng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pages.slice(0, pageLimit).map((page) => (
                      <tr key={page.path}>
                        <td>
                          <span className={s.pagePath}>{page.path}</span>
                        </td>
                        <td>{count(page.views)}</td>
                        <td>
                          <div className={s.pageShare}>
                            <progress
                              max={100}
                              value={page.share || 0}
                              aria-label={`Tỷ trọng ${page.path}`}
                            />
                            <span>{percent(page.share)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.pages.length > pageLimit && (
                <button
                  className={s.more}
                  onClick={() => setPageLimit((n) => n + 20)}
                >
                  Xem thêm
                </button>
              )}
            </>
          ) : (
            reportPlaceholder("pages")
          )}
          <p className={s.note}>
            Views = screenPageViews theo pagePath; đây là lượt xem trang, không
            phải số phiên bắt đầu tại trang.
          </p>
        </Panel>
      </div>
      <p className={s.footer}>
        Múi giờ Asia/Ho_Chi_Minh · Dữ liệu GA4 có độ trễ xử lý; ngày hiện tại
        chưa hoàn tất.
        {data && (
          <>
            {" "}
            Cập nhật{" "}
            {new Date(data.fetchedAt).toLocaleString("vi-VN", {
              timeZone: data.timezone,
            })}{" "}
            · Cache 20 phút · Website: {data.hosts.join(", ")}.
          </>
        )}
      </p>
    </div>
  );
}
