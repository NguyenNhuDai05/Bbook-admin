"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Maximize2, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { adminService } from "@/services/admin-service";
import { useResource } from "@/lib/client";
import { money, shortId } from "@/lib/format";
import {
  filterTransactions,
  paymentLabels,
  transactionLabel,
  transactionKey,
  transactionHref,
} from "@/lib/transactions.mjs";
import { presetRange, validRange } from "@/lib/dashboard-presentation.mjs";
import { reportPreset } from "@/lib/reporting-range.mjs";
import { ReportRangeFilter, RangeCaption } from "./report-range";
import { Modal, PageTitle, Pagination, State } from "./ui";
import { TransactionDetail } from "./dashboard-transactions";
import s from "./transactions-page.module.css";

const time = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
const label = (status: string) => paymentLabels[status] || status;
const compactLabels: Record<string, string> = {
  Fulfilled: "Đã kích hoạt",
  PaidAwaitingFulfillment: "Chờ kích hoạt",
  ManualReview: "Cần kiểm tra",
  Cancelled: "Đã hủy",
  Revoked: "Đã thu hồi quyền",
  RefundPending: "Chờ hoàn tiền",
};
const statusText = (status: string) => compactLabels[status] || label(status);
const tone = (status: string) =>
  ["Paid", "Fulfilled"].includes(status)
    ? "success"
    : ["RefundPending", "ManualReview", "PaidAwaitingFulfillment"].includes(
          status,
        )
      ? "warning"
      : "neutral";

export function TransactionsPage() {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter(),
    params = useSearchParams();
  const defaultRange = presetRange("month"),
    all = params.get("scope") === "all";
  const useDefault = !params.has("from") && !params.has("to");
  const from = all
    ? ""
    : (params.get("from") ?? (useDefault ? defaultRange.from : ""));
  const to = all
    ? ""
    : (params.get("to") ?? (useDefault ? defaultRange.to : ""));
  const search = params.get("q") || "",
    status = params.get("status") || "",
    type = params.get("kind") || "";
  const inferredPreset =
    ["today", "week", "month", "quarter", "this-month", "this-year"].find(
      (key) => {
        const range = reportPreset(key);
        return range.from === from && range.to === to;
      },
    ) || "custom";
  const range = {
    preset: all ? "all" : params.get("range") || inferredPreset,
    from,
    to,
  };
  const valid = all || validRange(from, to);
  const resource = useResource(adminService.transactions(from, to, valid));
  const revenue = useResource(
    adminService.dashboard(
      all ? defaultRange.from : from,
      all ? defaultRange.to : to,
      valid,
    ),
  );
  const appRevenue = revenue.data?.lifetime.revenue;
  const ready =
    valid && !resource.loading && !resource.error && !!resource.data;
  const searched = filterTransactions(resource.data || [], search, "", type);
  const rows = filterTransactions(searched, "", status);
  const refunds = searched.filter((x) =>
    ["Refunded", "PartiallyRefunded"].includes(x.status),
  ).length;
  const pageValue = Number(params.get("page") || 1);
  const page = Math.min(
    Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1,
    Math.max(1, Math.ceil(rows.length / 20)),
  );
  const visible = rows.slice((page - 1) * 20, page * 20);
  const statuses = [
    ...new Set([
      ...Object.keys(paymentLabels),
      ...(resource.data || []).map((x) => x.status),
    ]),
  ];
  if (status && !statuses.includes(status)) statuses.push(status);
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    if (!next.has("scope") && !next.has("from")) {
      next.set("from", from);
      next.set("to", to);
    }
    next.delete("page");
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`/transactions?${next}`, { scroll: false });
  }
  const hasFilters = !!(
    search ||
    status ||
    type ||
    all ||
    from !== defaultRange.from ||
    to !== defaultRange.to
  );
  const detailParams = new URLSearchParams(params.toString());
  if (!all) {
    detailParams.set("from", from);
    detailParams.set("to", to);
  }
  detailParams.set("page", String(page));
  const list = (
    <>
      {!valid ? (
        <State error="Chọn đủ ngày bắt đầu và kết thúc hợp lệ, tối đa 366 ngày." />
      ) : resource.loading || resource.error ? (
        <State
          loading={resource.loading}
          error={resource.error}
          retry={resource.reload}
        />
      ) : (
        <>
          {visible.length ? (
            <div className={`table-wrap ${s.table}`}>
              <table>
                <thead>
                  <tr>
                    <th>Giao dịch / Đơn mua</th>
                    <th>Người thanh toán</th>
                    <th>Mã đơn thanh toán</th>
                    <th className={s.moneyColumn}>Số tiền</th>
                    <th>Thời gian thu tiền</th>
                    <th>Trạng thái</th>
                    <th>
                      <span className={s.srOnly}>Chi tiết</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((x) => (
                    <tr key={transactionKey(x)}>
                      <td>
                        <Link
                          className={s.transactionId}
                          title={x.paymentId}
                          href={transactionHref(x, detailParams.toString())}
                        >
                          #{shortId(x.paymentId)}
                        </Link>
                        <small>
                          {x.bookingId ? (
                            <Link href={`/bookings/${x.bookingId}`}>
                              Booking #{shortId(x.bookingId)}
                            </Link>
                          ) : (
                            <span>{x.productName || transactionLabel(x)}</span>
                          )}
                        </small>
                      </td>
                      <td>{x.customerName || "Khách hàng"}</td>
                      <td>
                        <span className={s.orderCode}>
                          {x.providerOrderCode || "—"}
                        </span>
                      </td>
                      <td className={s.moneyColumn}>
                        <strong>{money(x.amount)}</strong>
                      </td>
                      <td>
                        <time dateTime={x.paidAt}>{time(x.paidAt)}</time>
                      </td>
                      <td>
                        <span
                          className={s.status}
                          data-tone={tone(x.status)}
                          title={label(x.status)}
                        >
                          {statusText(x.status)}
                        </span>
                      </td>
                      <td>
                        <Link
                          className={s.viewDetail}
                          aria-label={`Xem giao dịch ${x.paymentId}`}
                          href={transactionHref(x, detailParams.toString())}
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <State empty="Không có giao dịch khớp bộ lọc" />
          )}
          <Pagination
            page={page}
            size={20}
            count={visible.length}
            total={rows.length}
            onPage={(value) => update({ page: String(value) })}
          />
        </>
      )}
    </>
  );
  return (
    <div className={s.page}>
      <PageTitle
        title="Giao dịch"
        description="Theo dõi thanh toán booking và các gói dịch vụ"
        action={
          <button
            className="button secondary"
            disabled={!valid || resource.loading || revenue.loading}
            onClick={() => {
              resource.reload();
              revenue.reload();
            }}
          >
            <RefreshCw size={15} />
            Làm mới
          </button>
        }
      />
      <div className={s.summary} aria-label="Thống kê giao dịch và doanh thu">
        <section
          className={s.metric}
          aria-label="Tổng doanh thu app"
          title="Phí booking hoàn tất và doanh thu gói, từ đầu đến nay."
        >
          <span>Tổng doanh thu app</span>
          <strong>
            {valid &&
            !revenue.loading &&
            !revenue.error &&
            appRevenue !== undefined
              ? money(appRevenue)
              : "—"}
          </strong>
          <small>
            {revenue.error
              ? "Không tải được doanh thu"
              : revenue.loading
                ? "Đang tải…"
                : !valid
                  ? "Chọn khoảng ngày hợp lệ"
                  : all
                    ? "Từ đầu đến nay"
                    : revenue.data
                      ? `Trong kỳ: ${money(revenue.data.current.revenue)}`
                      : "—"}
          </small>
          {revenue.error && (
            <button className="text-button" onClick={revenue.reload}>
              Thử lại
            </button>
          )}
        </section>
        <section className={s.metric} aria-label="Tổng giao dịch đã thu">
          <span>Giao dịch đã ghi nhận</span>
          <strong>
            {ready ? searched.length.toLocaleString("vi-VN") : "—"}
          </strong>
          <small>
            {all ? "Toàn bộ lịch sử thanh toán" : "Trong khoảng ngày đang chọn"}
          </small>
        </section>
        <section className={s.metric} aria-label="Giao dịch hoàn tiền">
          <span>Giao dịch hoàn tiền</span>
          <strong>{ready ? refunds.toLocaleString("vi-VN") : "—"}</strong>
          <small>Đã hoàn tiền hoặc hoàn một phần</small>
        </section>
      </div>
      <section className={s.panel}>
        <div className={s.panelHeading}>
          <div>
            <h2>
              Lịch sử thanh toán
              {ready && (
                <span className={s.count}>
                  {rows.length.toLocaleString("vi-VN")}
                </span>
              )}
            </h2>
            <RangeCaption range={range} />
          </div>
          <button className={s.expandButton} onClick={() => setExpanded(true)}>
            <Maximize2 size={15} />
            <span>Mở rộng bảng</span>
          </button>
        </div>
        <div className={s.filters}>
          <form
            key={`${search}:${status}:${type}`}
            className={s.searchForm}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const start = String(data.get("from") || ""),
                end = String(data.get("to") || "");
              update({
                scope: !start && !end ? "all" : "",
                from: start,
                to: end,
                q: String(data.get("q") || "").trim(),
                status: String(data.get("status") || ""),
                kind: String(data.get("kind") || ""),
              });
            }}
          >
            <input name="from" type="hidden" value={from} />
            <input name="to" type="hidden" value={to} />
            <label className={s.search}>
              <span className={s.srOnly}>Tìm giao dịch</span>
              <Search size={16} aria-hidden="true" />
              <input
                name="q"
                defaultValue={search}
                placeholder="Tìm mã giao dịch, đơn thanh toán, người mua…"
              />
              <button type="submit">Tìm</button>
            </label>
            <label className={s.select}>
              <span className={s.srOnly}>Loại giao dịch</span>
              <select
                name="kind"
                defaultValue={type}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                aria-label="Loại giao dịch"
              >
                <option value="">Tất cả loại giao dịch</option>
                <option value="Booking">Booking</option>
                <option value="CustomerAi">Gói AI Customer</option>
                <option value="MuaPlan">Gói Visibility MUA</option>
              </select>
            </label>
            <label className={s.select}>
              <span className={s.srOnly}>Trạng thái</span>
              <select
                name="status"
                defaultValue={status}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                aria-label="Trạng thái giao dịch"
              >
                <option value="">Tất cả trạng thái</option>
                {statuses.map((x) => (
                  <option key={x} value={x}>
                    {statusText(x)}
                  </option>
                ))}
              </select>
            </label>
          </form>
          <ReportRangeFilter
            value={range}
            allowAll
            onChange={(next) =>
              update({
                scope: next.preset === "all" ? "all" : "",
                range: next.preset,
                from: next.from,
                to: next.to,
              })
            }
          />
        </div>
        {hasFilters && (
          <div className={s.activeFilters}>
            <span>
              <SlidersHorizontal size={13} />
              {ready ? `${rows.length} kết quả` : "Bộ lọc đang áp dụng"}
            </span>
            {search && <span className={s.filterChip}>“{search}”</span>}
            {type && (
              <span className={s.filterChip}>
                {(
                  {
                    Booking: "Booking",
                    CustomerAi: "Gói AI",
                    MuaPlan: "Gói Visibility",
                  } as Record<string, string>
                )[type] || type}
              </span>
            )}
            {status && (
              <span className={s.filterChip}>{statusText(status)}</span>
            )}
            <button
              type="button"
              onClick={() =>
                update({
                  q: "",
                  status: "",
                  kind: "",
                  scope: "",
                  range: "month",
                  ...defaultRange,
                })
              }
            >
              Đặt lại
            </button>
          </div>
        )}
        {list}
      </section>
      {expanded && (
        <Modal
          title="Giao dịch"
          onClose={() => setExpanded(false)}
          className={s.expanded}
          wide
        >
          {list}
        </Modal>
      )}
    </div>
  );
}

export function TransactionPage({ id }: { id: string }) {
  const params = useSearchParams();
  const back = `/transactions?${params.toString()}`;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return (
      <>
        <Link href={back}>Danh sách giao dịch</Link>
        <State error="Mã giao dịch không hợp lệ." />
      </>
    );
  return (
    <div className={s.page}>
      <PageTitle
        title="Chi tiết giao dịch"
        description={`Mã giao dịch #${shortId(id)}`}
        action={
          <Link className="button secondary" href={back}>
            Danh sách giao dịch
          </Link>
        }
      />
      <TransactionDetail
        key={`${params.get("type")}:${id}`}
        id={id}
        type={params.get("type") || undefined}
        embedded
        onClose={() => {}}
      />
    </div>
  );
}
