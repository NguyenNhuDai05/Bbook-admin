"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  RefreshCw,
  Search,
} from "lucide-react";
import { invalidateResources, useResource } from "@/lib/client";
import { adminService as service } from "@/services/admin-service";
import { date, shortId, waitHours } from "@/lib/format";
import type { PageProps } from "./admin-app";
import { Badge, PageTitle, Pagination, State } from "./ui";
import { DashboardAnalytics } from "./dashboard-analytics";
import { WorkOverview } from "./work-summary";
import { RecentFeedback } from "./feedback-pages";
export function Dashboard({ base }: PageProps) {
  const applications = useResource(service.applications("PendingReview", 1, 5));
  const reload = () => invalidateResources(["admin:"]);
  return (
    <>
      <PageTitle
        title="Tổng quan"
        description="Theo dõi kinh doanh, phản hồi người dùng và công việc đang chờ"
        action={
          <button className="button secondary" onClick={reload}>
            <RefreshCw size={15} />
            Làm mới
          </button>
        }
      />
      <WorkOverview />
      <DashboardAnalytics />
      <RecentFeedback />
      <section className="panel recent-applications">
        <div className="panel-heading">
          <div>
            <h2>Hồ sơ MUA mới gửi</h2>
            <p>Những hồ sơ đang chờ xét duyệt</p>
          </div>
          <Link className="text-button" href={`${base}/verification`}>
            Xem tất cả
            <ArrowRight size={15} />
          </Link>
        </div>
        {applications.loading || applications.error ? (
          <State
            loading={applications.loading}
            error={applications.error}
            retry={applications.reload}
          />
        ) : applications.data?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Makeup Artist</th>
                  <th>Khu vực</th>
                  <th>Ngày gửi</th>
                  <th>Thời gian chờ</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {applications.data.map((item) => (
                  <tr key={item.muaId}>
                    <td>
                      <Person item={item} />
                    </td>
                    <td>{item.city || "—"}</td>
                    <td>{date(item.submittedAt)}</td>
                    <td>
                      <Waiting value={item.submittedAt} />
                    </td>
                    <td>
                      <Badge status={item.verificationStatus} />
                    </td>
                    <td>
                      <Link
                        className="text-button"
                        href={`${base}/verification/${item.muaId}`}
                      >
                        Xem hồ sơ
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <State empty="Không có hồ sơ chờ duyệt" />
        )}
      </section>
    </>
  );
}
export function Person({
  item,
}: {
  item: {
    fullName: string;
    avatarUrl?: string | null;
    muaId?: string;
    userId?: string;
  };
}) {
  return (
    <div className="person">
      {item.avatarUrl ? (
        <img className="avatar" src={item.avatarUrl} alt="" />
      ) : (
        <span className="avatar">
          {item.fullName?.split(" ").slice(-1)[0]?.slice(0, 1) || "M"}
        </span>
      )}
      <div>
        <strong>{item.fullName}</strong>
        <small>
          {item.muaId ? `MUA-${shortId(item.muaId)}` : shortId(item.userId)}
        </small>
      </div>
    </div>
  );
}
function Waiting({ value }: { value?: string | null }) {
  const hours = waitHours(value);
  return (
    <span className={hours >= 24 ? "waiting warning-text" : "muted"}>
      {hours >= 24 && <Clock3 size={13} />} {hours} giờ
    </span>
  );
}
export function Applications({
  base,
  management = false,
}: PageProps & { management?: boolean }) {
  const [status, setStatus] = useState(management ? "" : "PendingReview"),
    [page, setPage] = useState(1),
    [size, setSize] = useState(20),
    [search, setSearch] = useState(""),
    [city, setCity] = useState(""),
    [sort, setSort] = useState("newest");
  const resource = useResource(service.applications(status, page, size));
  const rows = resource.data
    ?.filter(
      (item) =>
        item.fullName.toLowerCase().includes(search.toLowerCase()) &&
        (!city || item.city === city),
    )
    .sort((a, b) =>
      sort === "oldest"
        ? new Date(a.submittedAt || 0).getTime() -
          new Date(b.submittedAt || 0).getTime()
        : new Date(b.submittedAt || 0).getTime() -
          new Date(a.submittedAt || 0).getTime(),
    );
  return (
    <>
      <PageTitle
        title={management ? "Makeup Artist" : "Xác minh MUA"}
        description={
          management
            ? "Theo dõi hồ sơ và trạng thái hoạt động của đối tác"
            : "Kiểm tra hồ sơ, giấy tờ và đối chiếu khuôn mặt Makeup Artist"
        }
        action={
          <button className="button secondary" onClick={resource.reload}>
            <RefreshCw size={15} />
            Làm mới
          </button>
        }
      />
      <section className="panel list-panel">
        <div className="tabs">
          {[
            ["", "Tất cả"],
            ["PendingReview", "Chờ duyệt"],
            ["Approved", "Đã duyệt"],
            ["Rejected", "Từ chối"],
            ["Draft", "Bản nháp"],
          ].map(([value, label]) => (
            <button
              key={label}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              className={status === value ? "selected" : ""}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="filters">
          <div className="input-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên trong trang hiện tại…"
              aria-label="Tìm MUA"
            />
          </div>
          <select
            aria-label="Khu vực"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">Tất cả khu vực</option>
            {Array.from(
              new Set(resource.data?.map((x) => x.city).filter(Boolean)),
            ).map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sắp xếp"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Chờ lâu nhất</option>
          </select>
        </div>
        {resource.loading || resource.error ? (
          <State
            loading={resource.loading}
            error={resource.error}
            retry={resource.reload}
          />
        ) : rows?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>MUA</th>
                  <th>Khu vực</th>
                  <th>Dịch vụ / Portfolio</th>
                  <th>Ngày gửi</th>
                  <th>Trạng thái hồ sơ</th>
                  <th>Thời gian chờ</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.muaId}>
                    <td>
                      <Person item={item} />
                    </td>
                    <td>{item.city || "—"}</td>
                    <td>
                      {item.activeServiceCount} dịch vụ{" "}
                      <span className="separator">·</span>{" "}
                      {item.publicPortfolioImageCount} ảnh
                    </td>
                    <td>{date(item.submittedAt)}</td>
                    <td>
                      <Badge status={item.verificationStatus} />
                    </td>
                    <td>
                      <Waiting value={item.submittedAt} />
                    </td>
                    <td>
                      <Link
                        href={`${base}/verification/${item.muaId}`}
                        className="button table-button"
                      >
                        Xem hồ sơ
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <State
            empty={
              search || city
                ? "Không có kết quả trong trang này"
                : "Không có hồ sơ trong trạng thái này"
            }
          />
        )}
        <Pagination
          page={page}
          size={size}
          count={resource.data?.length || 0}
          onPage={setPage}
          onSize={setSize}
          server
        />
      </section>
    </>
  );
}
