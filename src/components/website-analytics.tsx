"use client";
import { useId, useState, type ReactNode } from "react";
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
import { PageTitle } from "./ui";
import s from "./website-analytics.module.css";

const count = (value: number) => value.toLocaleString("vi-VN");
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
}: {
  label: string;
  subtitle: string;
  metric?: AnalyticsKpi;
  icon: ReactNode;
  state: string;
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
          count(metric.value)
        ) : state === "loading" ? (
          <span className={s.skeleton} aria-label="Đang tải" />
        ) : (
          "—"
        )}
      </strong>
      {metric ? (
        <div
          className={`${s.delta} ${delta !== null && delta !== undefined && delta < 0 ? s.negative : s.positive}`}
          title={`Kỳ trước: ${count(metric.previous)}`}
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
            {delta === null
              ? "Kỳ trước bằng 0 · chưa có tỷ lệ"
              : `${delta && delta > 0 ? "+" : ""}${percent(delta)} so với kỳ trước`}
          </span>
        </div>
      ) : (
        <span className={s.metricStatus}>
          {state === "loading"
            ? "Đang lấy dữ liệu GA4"
            : state === "not_connected"
              ? "Chưa kết nối GA4"
              : "Chưa có số liệu"}
        </span>
      )}
    </section>
  );
}
function Chart({ daily }: { daily: AnalyticsReady["daily"] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const gradient = useId().replaceAll(":", "");
  const ceiling = Math.max(
    4,
    Math.ceil(Math.max(...daily.map((day) => day.users), 0) / 4) * 4,
  );
  const points = daily.map((day, index) => ({
    x: ((index + 0.5) / daily.length) * 1000,
    y: 230 - (day.users / ceiling) * 220,
  }));
  const current = selected === null ? null : daily[selected];
  const active = selected === null ? null : points[selected];
  return (
    <>
      <div
        className={s.chart}
        role="group"
        aria-label="Người truy cập theo ngày"
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
              Math.min(
                daily.length - 1,
                Math.max(
                  0,
                  Math.floor(
                    ((event.clientX - rect.left) / rect.width) * daily.length,
                  ),
                ),
              ),
            );
          }}
          onPointerLeave={() => setSelected(null)}
        >
          <div className={s.gridlines} aria-hidden="true">
            {[0, 1, 2, 3, 4].map((n) => (
              <i key={n} />
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
            {points.length > 1 && (
              <polygon
                points={`${points[0].x},240 ${points.map((point) => `${point.x},${point.y}`).join(" ")} ${points[points.length - 1].x},240`}
                fill={`url(#${gradient})`}
              />
            )}
            <polyline
              points={points.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="#ee4f8f"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
            {points.length === 1 && (
              <circle cx={points[0].x} cy={points[0].y} r="4" fill="#ee4f8f" />
            )}
          </svg>
          {current && active && (
            <>
              <div className={s.guide} style={{ left: `${active.x / 10}%` }} />
              <div
                className={s.tooltip}
                role="status"
                style={{
                  left: `clamp(82px, ${active.x / 10}%, calc(100% - 82px))`,
                }}
              >
                {dateLabel(current.date)}
                <strong>{count(current.users)} người truy cập</strong>
              </div>
            </>
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
                      left: `clamp(20px, ${((i + 0.5) / daily.length) * 100}%, calc(100% - 20px))`,
                    }}
                  >
                    {day.date.slice(5).split("-").reverse().join("/")}
                  </span>
                ),
            )}
          </div>
        </div>
      </div>
      <details className={s.details}>
        <summary>Xem dữ liệu theo ngày</summary>
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Người truy cập</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((day) => (
                <tr key={day.date}>
                  <td>{dateLabel(day.date)}</td>
                  <td>{count(day.users)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
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
  const campaignRows = data?.campaigns || [];
  const [campaignLimit, setCampaignLimit] = useState(10);
  const [pageLimit, setPageLimit] = useState(10);
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
  }
  return (
    <div className={s.page} aria-busy={resource.loading}>
      <PageTitle
        title="Website Analytics"
        description="Theo dõi lượt truy cập website và hiệu quả tải ứng dụng."
        action={
          <button
            className="button secondary"
            onClick={resource.reload}
            disabled={resource.loading}
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
      <div className={s.kpis}>
        <Metric
          label="Total Visitors"
          subtitle="Tổng người truy cập · totalUsers"
          icon={<Users size={20} />}
          metric={data?.kpis.users}
          state={status}
        />
        <Metric
          label="Sessions"
          subtitle="Phiên truy cập"
          icon={<Activity size={20} />}
          metric={data?.kpis.sessions}
          state={status}
        />
        <Metric
          label="APK Download Clicks"
          subtitle="Lượt nhấn tải APK"
          icon={<Download size={20} />}
          metric={data?.kpis.apk}
          state={status}
        />
        <Metric
          label="Play Store Clicks"
          subtitle="Lượt nhấn Google Play"
          icon={<ExternalLink size={20} />}
          metric={data?.kpis.play}
          state={status}
        />
      </div>
      <div className={s.grid}>
        <Panel
          title="Traffic Overview"
          subtitle="Người truy cập theo ngày"
          className={s.wide}
        >
          {data ? (
            data.daily.some((day) => day.users > 0) ? (
              <Chart key={`${range.start}:${range.end}`} daily={data.daily} />
            ) : (
              <div className={s.placeholder}>
                <Activity size={26} />
                <p>GA4 chưa ghi nhận người truy cập trong khoảng ngày này.</p>
              </div>
            )
          ) : (
            placeholder
          )}
          <p className={s.note}>
            Một người có thể truy cập nhiều ngày; không cộng các điểm thành tổng
            người dùng duy nhất.
          </p>
        </Panel>
        <Panel
          title="Top Traffic Sources"
          subtitle="Nguồn của phiên · tỷ trọng trên tổng người truy cập"
        >
          {data ? (
            <div className={s.sources}>
              {data.sources.map((source, i) => (
                <div className={s.source} key={source.name}>
                  <div>
                    <span>
                      <i className={s.sourceDot}>
                        {["D", "f", "@", "♪", "G", "↗"][i]}
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
                    max={Math.max(1, data.kpis.users.value, source.users)}
                    value={source.users}
                  />
                </div>
              ))}
            </div>
          ) : (
            placeholder
          )}
          <p className={s.note}>
            Một người có thể thuộc nhiều nguồn; tỷ lệ không bắt buộc cộng thành
            100%. Social chưa rõ nguồn nằm trong Other sources.
          </p>
        </Panel>
        <Panel
          title="Campaign Performance"
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
                          "Campaign",
                          "UTM Content",
                          "Sessions",
                          "APK Clicks",
                          "Click-through Rate",
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
                                {percent(campaign.clickRate)}
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
              placeholder
            )
          ) : (
            placeholder
          )}
          <p className={s.note}>
            CTR = lượt nhấn APK / sessions. Có thể vượt 100% nếu nhấn nhiều lần;
            không phải tỷ lệ cài đặt. Không có sessions thì tỷ lệ là —.
          </p>
        </Panel>
        <Panel
          title="Download Actions"
          subtitle="Hai đường tải ứng dụng song song"
        >
          <div className={s.landing}>
            <span>Landing Page Visitors</span>
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
          title="Top Landing Pages"
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
            placeholder
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
