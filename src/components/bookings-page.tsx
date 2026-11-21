"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListFilter,
  RefreshCw,
  Search,
  Star,
} from "lucide-react";
import { useResource, useSubmission } from "@/lib/client";
import { adminService } from "@/services/admin-service";
import {
  bookingLabels,
  presetRange,
  validRange,
} from "@/lib/dashboard-presentation.mjs";
import {
  appointmentDate,
  bookingLabel,
  bookingPaymentLabels,
  bookingTime,
  bookingTone,
} from "@/lib/bookings.mjs";
import { paymentLabels } from "@/lib/transactions.mjs";
import { money, shortId } from "@/lib/format";
import { Modal, PageTitle, Pagination, State, SubmitButton } from "./ui";
import s from "./bookings-page.module.css";

function Status({ value }: { value: string }) {
  return (
    <span className={s.status} data-tone={bookingTone(value)}>
      {bookingLabel(value)}
    </span>
  );
}

function BookingSearch({
  initial,
  onSearch,
}: {
  initial: string;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  function submit(event: FormEvent) {
    event.preventDefault();
    onSearch(value.trim());
  }
  return (
    <form className={s.search} onSubmit={submit} role="search">
      <Search size={16} aria-hidden="true" />
      <input
        aria-label="Tìm booking"
        placeholder="Mã booking, khách hàng, MUA, dịch vụ…"
        value={value}
        maxLength={120}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit">Tìm</button>
    </form>
  );
}

function BookingTools({ onCompleted }: { onCompleted: () => void }) {
  const [confirm, setConfirm] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const submission = useSubmission();
  async function run() {
    if (!submission.begin()) return;
    setError("");
    try {
      const result = await adminService.autoComplete();
      setNotice(`Đã xử lý ${result.completedBookings} booking quá hạn.`);
      setConfirm(false);
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xử lý booking.");
    } finally {
      submission.end();
    }
  }
  return (
    <>
      {notice && (
        <p className="notice success" role="status">
          {notice}
        </p>
      )}
      <details className={s.tools}>
        <summary>Tác vụ quản lý</summary>
        <div className={s.toolBody}>
          <p>Hoàn tất các lịch hẹn quá hạn đã đủ điều kiện xác nhận.</p>
          <button
            className="button secondary"
            onClick={() => {
              setError("");
              setConfirm(true);
            }}
          >
            Xử lý booking quá hạn
          </button>
        </div>
      </details>
      {confirm && (
        <Modal
          title="Xử lý booking quá hạn?"
          onClose={() => {
            if (!submission.busy) setConfirm(false);
          }}
          footer={
            <>
              <button
                className="button secondary"
                disabled={submission.busy}
                onClick={() => setConfirm(false)}
              >
                Hủy
              </button>
              <SubmitButton busy={submission.busy} onClick={run}>
                Xác nhận xử lý
              </SubmitButton>
            </>
          }
        >
          <p>
            Thao tác áp dụng cho các booking đủ điều kiện trên toàn hệ thống.
            Các booking chưa đủ điều kiện sẽ được giữ nguyên.
          </p>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
    </>
  );
}

function BookingList() {
  const params = useSearchParams(),
    router = useRouter();
  const defaults = presetRange("month"),
    all = params.get("scope") === "all";
  const from = all ? "" : (params.get("from") ?? defaults.from),
    to = all ? "" : (params.get("to") ?? defaults.to);
  const status = params.get("status") || "",
    search = params.get("search") || "";
  const rawPage = Number(params.get("page") || 1),
    page =
      Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 100000
        ? rawPage
        : 1;
  const valid = all || validRange(from, to);
  const resource = useResource(
    adminService.bookings(from, to, status, search, page, valid),
    { retainData: true },
  );
  const data = resource.data;
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    if (!all) {
      next.set("from", from);
      next.set("to", to);
    }
    next.delete("page");
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`/bookings?${next}`, { scroll: false });
  }
  const selectedRange = all
    ? "all"
    : params.get("range") === "custom"
      ? "custom"
      : ["month", "week"].find((key) => {
          const range = presetRange(key);
          return from === range.from && to === range.to;
        }) || "custom";
  const linkParams = new URLSearchParams(params.toString());
  if (!all) {
    linkParams.set("from", from);
    linkParams.set("to", to);
  }
  return (
    <div className={s.page}>
      <PageTitle
        title="Booking"
        description="Quản lý lịch hẹn, thanh toán và đánh giá dịch vụ"
        action={
          <button
            className="button secondary"
            disabled={resource.loading || !valid}
            onClick={resource.reload}
          >
            <RefreshCw size={16} className={resource.loading ? "spin" : ""} />
            Làm mới
          </button>
        }
      />
      <div className={s.summary}>
        {[
          ["Tổng booking", data?.summary.total, CalendarDays],
          ["Hoàn thành", data?.summary.completed, CheckCircle2],
          ["Đang xử lý", data?.summary.active, Clock3],
          ["Đã hủy / Từ chối", data?.summary.cancelled, ListFilter],
        ].map(([label, count, Icon]) => {
          const MetricIcon = Icon as typeof CalendarDays;
          return (
            <div className={s.metric} key={String(label)}>
              <span>
                <MetricIcon size={17} />
                {String(label)}
              </span>
              <strong>
                {typeof count === "number"
                  ? count.toLocaleString("vi-VN")
                  : "—"}
              </strong>
            </div>
          );
        })}
      </div>
      <section className={s.card} aria-busy={resource.loading}>
        <div className={s.heading}>
          <h2>Danh sách booking</h2>
          <span className={s.muted}>
            {data
              ? `${data.total.toLocaleString("vi-VN")} kết quả`
              : "Lịch hẹn và thông tin thanh toán"}
          </span>
        </div>
        <div className={s.toolbar}>
          <BookingSearch
            key={search}
            initial={search}
            onSearch={(value) => update({ search: value })}
          />
          <select
            aria-label="Trạng thái booking"
            value={status}
            onChange={(e) => update({ status: e.target.value })}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(bookingLabels).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
          <select
            aria-label="Khoảng ngày booking"
            value={selectedRange}
            onChange={(e) => {
              if (e.target.value === "all")
                update({ scope: "all", range: "", from: "", to: "" });
              else if (e.target.value === "custom")
                update({
                  scope: "",
                  range: "custom",
                  from: from || defaults.from,
                  to: to || defaults.to,
                });
              else
                update({
                  scope: "",
                  range: "",
                  ...presetRange(e.target.value),
                });
            }}
          >
            <option value="month">30 ngày gần đây</option>
            <option value="week">7 ngày gần đây</option>
            <option value="all">Từ đầu đến nay</option>
            <option value="custom">Tùy chọn ngày</option>
          </select>
          {!all && (
            <div className={s.dates}>
              <input
                aria-label="Từ ngày"
                type="date"
                value={from}
                onChange={(e) =>
                  update({ range: "custom", from: e.target.value })
                }
              />
              <span className={s.muted}>–</span>
              <input
                aria-label="Đến ngày"
                type="date"
                value={to}
                onChange={(e) =>
                  update({ range: "custom", to: e.target.value })
                }
              />
            </div>
          )}
        </div>
        <p className={s.range}>Theo ngày tạo booking · Giờ Việt Nam</p>
        {!valid ? (
          <State error="Chọn khoảng ngày hợp lệ, tối đa 366 ngày." />
        ) : resource.error ? (
          <State error={resource.error} retry={resource.reload} />
        ) : !data ? (
          <State loading={resource.loading} />
        ) : data.items.length ? (
          <>
            <div className={s.table}>
              <table>
                <thead>
                  <tr>
                    <th>Booking / Dịch vụ</th>
                    <th>Khách hàng</th>
                    <th>Makeup Artist</th>
                    <th>Lịch hẹn</th>
                    <th>Giá trị / Tiền cọc</th>
                    <th>Trạng thái</th>
                    <th>
                      <span className="sr-only">Chi tiết</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => {
                    const href = `/bookings/${row.bookingId}?${linkParams}`;
                    return (
                      <tr key={row.bookingId}>
                        <td>
                          <div className={s.cell}>
                            <Link className={s.id} href={href}>
                              #{shortId(row.bookingId)}
                            </Link>
                            <span
                              className={s.service}
                              title={row.serviceNames.join(", ")}
                            >
                              {row.serviceNames.join(", ") || "Chưa có dịch vụ"}
                            </span>
                          </div>
                        </td>
                        <td>{row.customerName || "Khách hàng"}</td>
                        <td>{row.muaName || "Makeup Artist"}</td>
                        <td>
                          <div className={s.cell}>
                            <span>{appointmentDate(row.bookingDate)}</span>
                            <small>
                              {row.startTime.slice(0, 5)} –{" "}
                              {row.endTime.slice(0, 5)}
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className={s.cell}>
                            <span className={s.amount}>
                              {money(row.totalAmount)}
                            </span>
                            <small>Cọc {money(row.depositAmount)}</small>
                          </div>
                        </td>
                        <td>
                          <div className={s.cell}>
                            <Status value={row.status} />
                            <small>
                              {bookingPaymentLabels[row.paymentStatus] ||
                                "Chưa xác định"}
                            </small>
                          </div>
                        </td>
                        <td>
                          <Link
                            className={s.view}
                            href={href}
                            aria-label={`Xem booking ${shortId(row.bookingId)}`}
                          >
                            Xem
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={s.pagination}>
              <Pagination
                page={page}
                size={20}
                total={data.total}
                count={data.items.length}
                onPage={(value) => update({ page: String(value) })}
              />
            </div>
          </>
        ) : (
          <>
            <State empty="Không tìm thấy booking phù hợp với bộ lọc." />
            {page > 1 && (
              <div className={s.heading}>
                <button
                  className="text-button"
                  onClick={() => update({ page: "1" })}
                >
                  Về trang đầu
                </button>
              </div>
            )}
          </>
        )}
        {(status || search) && (
          <div className={s.heading}>
            <button
              className="text-button"
              onClick={() => update({ status: "", search: "" })}
            >
              Xóa bộ lọc tìm kiếm và trạng thái
            </button>
          </div>
        )}
      </section>
      <BookingTools onCompleted={resource.reload} />
    </div>
  );
}

const timelineLabel = (status: string) =>
  status === "Created"
    ? "Tạo booking"
    : status === "DepositPaid"
      ? "Đã nhận tiền cọc"
      : bookingLabel(status);

function BookingDetail({ id }: { id: string }) {
  const params = useSearchParams();
  const resource = useResource(adminService.booking(id), { retainData: true }),
    b = resource.data;
  const back = `/bookings${params.size ? `?${params}` : ""}`;
  return (
    <div className={s.page}>
      <Link className={s.back} href={back}>
        Danh sách booking
      </Link>
      <PageTitle
        title="Chi tiết booking"
        description={`Mã booking #${shortId(id)}`}
        action={
          <button
            className="button secondary"
            disabled={resource.loading}
            onClick={resource.reload}
          >
            <RefreshCw size={16} />
            Làm mới
          </button>
        }
      />
      {resource.error ? (
        <State error={resource.error} retry={resource.reload} />
      ) : !b ? (
        <State loading={resource.loading} />
      ) : (
        <>
          <section className={s.card}>
            <div className={s.detailHeading}>
              <div>
                <Status value={b.status} />
                <h2>
                  {appointmentDate(b.bookingDate)} · {b.startTime.slice(0, 5)} –{" "}
                  {b.endTime.slice(0, 5)}
                </h2>
                <p className={s.muted}>Tạo lúc {bookingTime(b.createdAt)}</p>
              </div>
              <div>
                <strong>{money(b.totalAmount)}</strong>
                <p className={s.muted}>
                  {bookingPaymentLabels[b.paymentStatus] || "Chưa xác định"}
                </p>
              </div>
            </div>
          </section>
          <div className={s.detailGrid}>
            <div className={s.column}>
              <section className={s.card}>
                <div className={s.heading}>
                  <h2>Dịch vụ và thanh toán</h2>
                  <span className={s.muted}>{b.totalDurationMinutes} phút</span>
                </div>
                <div className={`${s.table} ${s.detailTable}`}>
                  <table>
                    <thead>
                      <tr>
                        <th>Dịch vụ</th>
                        <th>Số người</th>
                        <th>Thời lượng</th>
                        <th>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.services.map((x, i) => (
                        <tr key={i}>
                          <td>{x.serviceName}</td>
                          <td>{x.participantsCount}</td>
                          <td>{x.durationMinutesSnapshot} phút</td>
                          <td className={s.amount}>
                            {money(x.priceSnapshot * x.participantsCount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={s.body}>
                  <dl className={s.totals}>
                    <div>
                      <dt>Tổng giá trị dịch vụ</dt>
                      <dd>{money(b.totalAmount)}</dd>
                    </div>
                    <div>
                      <dt>Tiền cọc</dt>
                      <dd>{money(b.depositAmount)}</dd>
                    </div>
                    <div>
                      <dt>Còn lại trả trực tiếp MUA</dt>
                      <dd>{money(b.remainingAmount)}</dd>
                    </div>
                    <div>
                      <dt>Phí nền tảng</dt>
                      <dd>{money(b.platformFeeAmount)}</dd>
                    </div>
                  </dl>
                </div>
              </section>
              <section className={s.card}>
                <div className={s.heading}>
                  <h2>Lịch sử thanh toán</h2>
                  <span className={s.muted}>{b.payments.length} giao dịch</span>
                </div>
                {b.payments.length ? (
                  <div className={`${s.table} ${s.detailTable}`}>
                    <table>
                      <thead>
                        <tr>
                          <th>Giao dịch</th>
                          <th>Số tiền</th>
                          <th>Thời gian</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.payments.map((p) => (
                          <tr key={p.paymentId}>
                            <td>
                              {p.paidAt ? (
                                <Link
                                  className={s.id}
                                  href={`/transactions/${p.paymentId}?type=Booking`}
                                >
                                  #{shortId(p.paymentId)}
                                </Link>
                              ) : (
                                `#${shortId(p.paymentId)}`
                              )}
                            </td>
                            <td className={s.amount}>{money(p.amount)}</td>
                            <td>{bookingTime(p.paidAt || p.createdAt)}</td>
                            <td>
                              {paymentLabels[p.status] ||
                                (
                                  {
                                    Pending: "Chờ thanh toán",
                                    Created: "Đã tạo",
                                    Expired: "Đã hết hạn",
                                    Failed: "Thất bại",
                                  } as Record<string, string>
                                )[p.status] ||
                                "Chưa xác định"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={s.body}>
                    <p className={s.muted}>Chưa có giao dịch thanh toán.</p>
                  </div>
                )}
              </section>
              <section className={s.card}>
                <div className={s.heading}>
                  <h2>Đánh giá dịch vụ</h2>
                  {b.review && (
                    <Link
                      className="text-button"
                      href={`/reviews/${b.review.reviewId}`}
                    >
                      Xem đánh giá
                    </Link>
                  )}
                </div>
                <div className={s.body}>
                  {b.review ? (
                    <>
                      <div className={s.rating}>
                        <Star size={16} fill="currentColor" />
                        <strong>{b.review.rating}/5</strong>
                        <span className={s.muted}>
                          · {bookingTime(b.review.createdAt)}
                        </span>
                      </div>
                      <p className={s.review}>
                        {b.review.comment || "Khách hàng đã chấm điểm dịch vụ."}
                      </p>
                    </>
                  ) : (
                    <p className={s.muted}>Booking chưa có đánh giá.</p>
                  )}
                </div>
              </section>
            </div>
            <div className={s.column}>
              <section className={s.card}>
                <div className={s.heading}>
                  <h2>Thông tin lịch hẹn</h2>
                </div>
                <div className={s.body}>
                  <dl className={s.people}>
                    <div>
                      <dt>Khách hàng</dt>
                      <dd>{b.customerName || "Khách hàng"}</dd>
                    </div>
                    <div>
                      <dt>Makeup Artist</dt>
                      <dd>{b.muaName || "Makeup Artist"}</dd>
                    </div>
                    <div>
                      <dt>Lịch hẹn</dt>
                      <dd>
                        {appointmentDate(b.bookingDate)}
                        <br />
                        {b.startTime.slice(0, 5)} – {b.endTime.slice(0, 5)}
                      </dd>
                    </div>
                    {b.address && (
                      <div>
                        <dt>Địa điểm</dt>
                        <dd>{b.address}</dd>
                      </div>
                    )}
                    {b.cancellationReason && (
                      <div>
                        <dt>Lý do hủy</dt>
                        <dd>{b.cancellationReason}</dd>
                      </div>
                    )}
                    {b.disputeReason && (
                      <div>
                        <dt>Nội dung tranh chấp</dt>
                        <dd>{b.disputeReason}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </section>
              <section className={s.card}>
                <div className={s.heading}>
                  <h2>Tiến trình booking</h2>
                </div>
                <div className={s.body}>
                  <ol className={s.timeline}>
                    {b.timeline.map((event, i) => (
                      <li key={i}>
                        <strong>{timelineLabel(event.status)}</strong>
                        <time dateTime={event.occurredAt}>
                          {bookingTime(event.occurredAt)}
                        </time>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function BookingsPage({ id }: { id?: string }) {
  return id ? <BookingDetail id={id} /> : <BookingList />;
}
