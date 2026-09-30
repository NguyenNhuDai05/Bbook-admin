"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  FileCheck2,
  Landmark,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  RotateCcw,
} from "lucide-react";
import { useResource } from "@/lib/client";
import { adminService as service } from "@/services/admin-service";
import { date, money, shortId, waitHours, statusName } from "@/lib/format";
import type { MoneyRecord } from "@/lib/types";
import type { PageProps } from "./admin-app";
import { Badge, PageTitle, Pagination, State } from "./ui";
export function Dashboard({ base }: PageProps) {
  const applications = useResource(service.applications("PendingReview", 1, 5)),
    banks = useResource(service.banks()),
    payouts = useResource(service.moneyList(false)),
    refunds = useResource(service.moneyList(true));
  const pending = (items?: MoneyRecord[], refund = false) =>
    items?.filter((x) =>
      ["Pending", "ManualActionRequired", "Processing", "Failed"].includes(
        statusName(x.status, refund),
      ),
    );
  const p = pending(payouts.data),
    r = pending(refunds.data, true);
  const cards = [
    {
      label: "Hồ sơ MUA chờ duyệt",
      value: undefined,
      icon: ShieldCheck,
      route: "verification",
      error: applications.error,
      loading: applications.loading,
      hint: "Chưa có dữ liệu tổng số · API chưa cung cấp KPI",
    },
    {
      label: "Tài khoản chờ duyệt",
      value: banks.data?.length,
      icon: Landmark,
      route: "bank-accounts",
      error: banks.error,
      loading: banks.loading,
      hint: "Tài khoản nhận tiền mới",
    },
    {
      label: "Chi trả cần xử lý",
      value: p?.length,
      icon: WalletCards,
      route: "payouts",
      error: payouts.error,
      loading: payouts.loading,
      hint: p
        ? money(p.reduce((total, x) => total + x.amount, 0))
        : "Chưa có dữ liệu",
    },
    {
      label: "Hoàn tiền cần xử lý",
      value: r?.length,
      icon: RotateCcw,
      route: "refunds",
      error: refunds.error,
      loading: refunds.loading,
      hint: r
        ? money(r.reduce((total, x) => total + x.amount, 0))
        : "Chưa có dữ liệu",
    },
  ];
  const reload = () =>
    [applications, banks, payouts, refunds].forEach((x) => x.reload());
  return (
    <>
      <PageTitle
        title="Tổng quan"
        description="Số liệu từ các hàng đợi Backend trả về; không phải thống kê toàn hệ thống"
        action={
          <button className="button secondary" onClick={reload}>
            <RefreshCw size={15} />
            Làm mới
          </button>
        }
      />
      <div className="kpi-grid">
        {cards.map((card) => (
          <Link
            className="kpi-card"
            key={card.route}
            href={`${base}/${card.route}`}
          >
            <div className="kpi-top">
              <span>{card.label}</span>
              <card.icon size={20} />
            </div>
            <strong>
              {card.loading ? "…" : card.error ? "—" : (card.value ?? "—")}
            </strong>
            <div className="kpi-bottom">
              <span className={card.error ? "text-danger" : ""}>
                {card.error ? "Không thể tải dữ liệu" : card.hint}
              </span>
              <ArrowUpRight size={16} />
            </div>
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Cần xử lý</h2>
              <p>Các công việc cần được ưu tiên</p>
            </div>
            <span className="small-label">VẬN HÀNH</span>
          </div>
          <div className="priority-list">
            {[
              {
                count: undefined,
                text: "hồ sơ MUA chờ lâu · chưa có thống kê tổng",
                route: "verification",
                icon: Clock3,
                tone: "warning",
              },
              {
                count: p?.filter((x) => statusName(x.status) === "Processing")
                  .length,
                text: "khoản chi trả đang xử lý",
                route: "payouts",
                icon: WalletCards,
                tone: "info",
              },
              {
                count: r?.filter((x) => statusName(x.status, true) === "Failed")
                  .length,
                text: "khoản hoàn tiền thất bại",
                route: "refunds",
                icon: RotateCcw,
                tone: "danger",
              },
              {
                count: banks.data?.length,
                text: "tài khoản nhận tiền chờ duyệt",
                route: "bank-accounts",
                icon: Landmark,
                tone: "neutral",
              },
            ].map((item) => (
              <Link
                href={`${base}/${item.route}`}
                className="priority-row"
                key={item.route}
              >
                <span className={`priority-icon ${item.tone}`}>
                  <item.icon size={19} />
                </span>
                <span>
                  <strong>{item.count ?? "—"}</strong> {item.text}
                </span>
                <ChevronRight size={17} />
              </Link>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Quy trình vận hành</h2>
              <p>Kiểm tra đúng bước, đúng trạng thái</p>
            </div>
            <FileCheck2 size={20} />
          </div>
          <div className="process-list">
            {[
              "Đối chiếu CCCD và khuôn mặt",
              "Kiểm tra dịch vụ và portfolio",
              "Duyệt tài khoản nhận tiền riêng",
              "Ghi nhận chi trả và hoàn tiền",
            ].map((text, index) => (
              <div key={text}>
                <span>{index + 1}</span>
                <p>{text}</p>
                <Check size={15} />
              </div>
            ))}
          </div>
          <div className="panel-note">
            Danh tính, hồ sơ nghề nghiệp và tài khoản nhận tiền được hiển thị
            riêng. Backend hiện xét duyệt toàn bộ hồ sơ MUA.
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Hồ sơ mới gửi</h2>
            <p>Những hồ sơ đang chờ admin xét duyệt</p>
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
                {applications.data.slice(0, 5).map((item) => (
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
      <section className="activity-teaser">
        <div>
          <h3>Nhật ký hoạt động</h3>
          <p>
            Backend chưa cung cấp lịch sử thao tác admin. Chưa có dữ liệu để
            hiển thị.
          </p>
        </div>
        <Link className="text-button" href={`${base}/activity`}>
          Xem module
          <ArrowRight size={15} />
        </Link>
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
      {management && (
        <div className="notice info">
          Danh sách sử dụng API hồ sơ MUA. Số booking, rating và lịch sử đình
          chỉ chưa được API này cung cấp.
        </div>
      )}
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
      <p className="helper">
        Tìm kiếm và bộ lọc khu vực áp dụng trong trang hiện tại. API hiện hỗ trợ
        phân trang và lọc trạng thái; chưa hỗ trợ tìm kiếm toàn bộ danh sách.
      </p>
    </>
  );
}
