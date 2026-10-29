"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { adminService } from "@/services/admin-service";
import { useResource } from "@/lib/client";
import { money, shortId } from "@/lib/format";
import { filterTransactions, paymentLabels } from "@/lib/transactions.mjs";
import { presetRange, validRange } from "@/lib/dashboard-presentation.mjs";
import { PageTitle, Pagination, State } from "./ui";
import { TransactionDetail } from "./dashboard-transactions";
import s from "./transactions-page.module.css";

const time = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
const label = (status: string) => paymentLabels[status] || status;

export function TransactionsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultRange = presetRange("month");
  const all = params.get("scope") === "all";
  const useDefault = !params.has("from") && !params.has("to");
  const from = all
    ? ""
    : (params.get("from") ?? (useDefault ? defaultRange.from : ""));
  const to = all
    ? ""
    : (params.get("to") ?? (useDefault ? defaultRange.to : ""));
  const search = params.get("q") || "";
  const status = params.get("status") || "";
  const valid = all || validRange(from, to);
  const resource = useResource(adminService.transactions(from, to, valid));
  const ready =
    valid && !resource.loading && !resource.error && !!resource.data;
  const searched = filterTransactions(resource.data || [], search);
  const rows = filterTransactions(searched, "", status);
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
    // Materialize the default range so shared links keep the same dates.
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
  const detailParams = new URLSearchParams(params.toString());
  if (!all) {
    detailParams.set("from", from);
    detailParams.set("to", to);
  }
  detailParams.set("page", String(page));
  return (
    <>
      <PageTitle
        title="Giao dịch"
        description="Tra cứu thanh toán và lịch sử hoàn tiền theo từng giao dịch"
        action={
          <button
            className="button secondary"
            disabled={!valid || resource.loading}
            onClick={resource.reload}
          >
            <RefreshCw size={15} />
            Làm mới
          </button>
        }
      />
      <p className={s.scope}>
        Dữ liệu PayOS đã thu tiền, bao gồm các khoản đã hoàn hoặc khấu trừ cọc.
        Chưa bao gồm thanh toán đang chờ, hủy, hết hạn và chi trả MUA. Khoảng
        ngày tính theo thời điểm thu tiền, giờ Việt Nam.
      </p>
      <div
        className={s.summary}
        aria-label="Số lượng giao dịch theo trạng thái"
      >
        {["", ...statuses].map((value) => (
          <button
            key={value}
            aria-pressed={status === value}
            onClick={() => update({ status: value })}
          >
            <span>{value ? label(value) : "Tổng giao dịch đã thu"}</span>
            <strong>
              {ready
                ? (value
                    ? searched.filter((x) => x.status === value).length
                    : searched.length
                  ).toLocaleString("vi-VN")
                : "—"}
            </strong>
          </button>
        ))}
      </div>
      <section className="panel list-panel">
        <form
          key={`${from}:${to}:${search}:${status}`}
          className={s.filters}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const start = String(data.get("from"));
            const end = String(data.get("to"));
            update({
              scope: !start && !end ? "all" : "",
              from: start,
              to: end,
              q: String(data.get("q")).trim(),
              status: String(data.get("status")),
            });
          }}
        >
          <label className={s.search}>
            Tìm giao dịch
            <input
              name="q"
              defaultValue={search}
              placeholder="Mã giao dịch, booking, mã PayOS, tên khách"
            />
          </label>
          <label>
            Từ ngày thu tiền
            <input name="from" type="date" defaultValue={from} />
          </label>
          <label>
            Đến ngày thu tiền
            <input name="to" type="date" defaultValue={to} />
          </label>
          <label>
            Trạng thái
            <select name="status" defaultValue={status}>
              <option value="">Tất cả</option>
              {statuses.map((x) => (
                <option key={x} value={x}>
                  {label(x)}
                </option>
              ))}
            </select>
          </label>
          <button className="button" type="submit">
            Áp dụng
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              update({ q: "", status: "", scope: "", ...defaultRange })
            }
          >
            Đặt lại
          </button>
        </form>
        <div className={s.filters} role="group" aria-label="Khoảng ngày nhanh">
          {[
            ["today", "Hôm nay"],
            ["week", "7 ngày"],
            ["this-month", "Tháng này"],
          ].map(([value, text]) => (
            <button
              className="button secondary"
              key={value}
              onClick={() => update({ scope: "", ...presetRange(value) })}
            >
              {text}
            </button>
          ))}
          <button
            className="button secondary"
            onClick={() => update({ scope: "all", from: "", to: "" })}
          >
            Toàn bộ
          </button>
          <span className={s.scope}>
            {all ? "Từ đầu đến nay" : `${from} – ${to}`}
          </span>
        </div>
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
            <div className={s.totals} role="status">
              {rows.length.toLocaleString("vi-VN")} giao dịch khớp bộ lọc · Tổng
              tiền thu ban đầu:{" "}
              <strong>
                {money(rows.reduce((sum, x) => sum + x.amount, 0))}
              </strong>{" "}
              · Chưa trừ hoàn tiền. Các thẻ đếm theo khoảng ngày và từ khóa;
              chọn trạng thái để lọc bảng.
            </div>
            {visible.length ? (
              <div className={`table-wrap ${s.table}`}>
                <table>
                  <thead>
                    <tr>
                      <th>Giao dịch / Booking</th>
                      <th>Khách hàng</th>
                      <th>Mã đơn PayOS</th>
                      <th>Số tiền</th>
                      <th>Thu tiền</th>
                      <th>Trạng thái</th>
                      <th>Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((x) => (
                      <tr key={x.paymentId}>
                        <td>
                          <span title={x.paymentId}>
                            #{shortId(x.paymentId)}
                          </span>
                          <small>
                            <Link href={`/bookings/${x.bookingId}`}>
                              Booking #{shortId(x.bookingId)}
                            </Link>
                          </small>
                        </td>
                        <td>{x.customerName || "Khách hàng"}</td>
                        <td>{x.providerOrderCode}</td>
                        <td>{money(x.amount)}</td>
                        <td>{time(x.paidAt)}</td>
                        <td>
                          <span
                            className={`badge ${x.status === "Paid" ? "success" : "info"}`}
                          >
                            {label(x.status)}
                          </span>
                        </td>
                        <td>
                          <Link
                            className="text-button"
                            aria-label={`Xem giao dịch ${x.paymentId}`}
                            href={`/transactions/${x.paymentId}?${detailParams}`}
                          >
                            Xem chi tiết
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
      </section>
    </>
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
        <Link href={back}>← Danh sách giao dịch</Link>
        <State error="Mã giao dịch không hợp lệ." />
      </>
    );
  return (
    <>
      <PageTitle
        title="Chi tiết giao dịch"
        description={id}
        action={
          <Link className="button secondary" href={back}>
            ← Danh sách giao dịch
          </Link>
        }
      />
      <TransactionDetail key={id} id={id} embedded onClose={() => {}} />
    </>
  );
}
