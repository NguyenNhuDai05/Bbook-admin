"use client";
import { useState } from "react";
import { useResource } from "@/lib/client";
import { adminService } from "@/services/admin-service";
import { money, shortId, statusLabels } from "@/lib/format";
import { Modal, Pagination, State } from "./ui";
import s from "./dashboard.module.css";
import Link from "next/link";
import {
  paymentLabels,
  transactionKey,
  transactionLabel,
} from "@/lib/transactions.mjs";

const time = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
export function TransactionDetail({
  id,
  onClose,
  embedded = false,
  type,
}: {
  id: string;
  onClose: () => void;
  embedded?: boolean;
  type?: string;
}) {
  const resource = useResource(adminService.dashboardTransaction(id, type));
  const item = resource.data;
  const content = (
    <>
      {resource.loading || resource.error || !item ? (
        <State
          loading={resource.loading}
          error={resource.error}
          retry={resource.error ? resource.reload : undefined}
        />
      ) : (
        <div className={s.reviewDetail}>
          <strong className={s.transactionAmount}>{money(item.amount)}</strong>
          <p>
            {transactionLabel(item)} ·{" "}
            {paymentLabels[item.status] || item.status} · {item.provider}
          </p>
          <dl>
            <dt>Mã giao dịch</dt>
            <dd>{item.paymentId}</dd>
            <dt>Mã đơn PayOS</dt>
            <dd>{item.providerOrderCode || "—"}</dd>
            <dt>Mã đối soát</dt>
            <dd>{item.providerReference || "—"}</dd>
            <dt>Khách hàng</dt>
            <dd>
              {item.customerName || "Khách hàng"}
              <small>ID: {item.customerId}</small>
            </dd>
            {item.booking && (
              <>
                <dt>Makeup Artist</dt>
                <dd>
                  {item.muaName || "Makeup Artist"}
                  <small>ID: {item.booking.muaId}</small>
                </dd>
                <dt>Booking</dt>
                <dd>
                  <Link href={`/bookings/${item.bookingId}`}>
                    {item.bookingId}
                  </Link>
                </dd>
                <dt>Lịch hẹn</dt>
                <dd>
                  {new Intl.DateTimeFormat("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                    dateStyle: "short",
                  }).format(new Date(item.booking.bookingDate))}{" "}
                  · {item.booking.startTime.slice(0, 5)}
                </dd>
                <dt>Trạng thái booking</dt>
                <dd>
                  {statusLabels[item.booking.status] || item.booking.status}
                </dd>
                <dt>Giá trị booking</dt>
                <dd>{money(item.booking.totalAmount)}</dd>
                <dt>Dịch vụ</dt>
                <dd>
                  {item.booking.services.length
                    ? item.booking.services.map((x, i) => (
                        <div key={i}>
                          {x.serviceName} · {x.participantsCount} người
                        </div>
                      ))
                    : "Không có thông tin dịch vụ"}
                </dd>
              </>
            )}
            {!item.booking && (
              <>
                <dt>Gói đã mua</dt>
                <dd>{item.productName || transactionLabel(item)}</dd>
                <dt>Mã gói / phiên bản</dt>
                <dd>
                  {item.productId} · v{item.planVersion}
                </dd>
                <dt>Quyền lợi</dt>
                <dd>
                  {item.lifetime
                    ? "AI trọn đời"
                    : `${item.durationDays || 30} ngày quảng bá`}
                </dd>
                <dt>Nguồn mua</dt>
                <dd>
                  {item.origin === "NativeApp"
                    ? "Ứng dụng BBook"
                    : item.origin === "IndependentWebsite"
                      ? "Website BBook"
                      : item.origin || "—"}
                </dd>
                <dt>Tính trong doanh thu gói</dt>
                <dd>
                  {item.includedInRevenue
                    ? "Có · Đã xác minh thu tiền"
                    : "Không · Đã hoàn tiền"}
                </dd>
                {item.revokedAt && (
                  <>
                    <dt>Thu hồi quyền lợi</dt>
                    <dd>
                      {time(item.revokedAt)} · Thu hồi quyền không đồng nghĩa
                      hoàn tiền.
                    </dd>
                  </>
                )}
              </>
            )}
            <dt>Tạo thanh toán</dt>
            <dd>{time(item.createdAt)}</dd>
            <dt>Thu tiền</dt>
            <dd>{time(item.paidAt)}</dd>
            <dt>Yêu cầu hoàn</dt>
            <dd>{time(item.refundRequestedAt)}</dd>
            <dt>Hoàn tiền</dt>
            <dd>{time(item.refundedAt)}</dd>
            <dt>Cập nhật</dt>
            <dd>{time(item.updatedAt)}</dd>
          </dl>
          {item.booking && (
            <div className={s.reply}>
              <h3>Lịch sử hoàn tiền liên quan</h3>
              {item.refunds.length ? (
                item.refunds.map((r) => (
                  <p key={r.refundId}>
                    {money(r.amount)} · {statusLabels[r.status] || r.status}
                    <small>
                      #{r.refundId} · Tạo {time(r.createdAt)} · Hoàn tất{" "}
                      {time(r.completedAt)}
                    </small>
                    <Link href={`/refunds/${r.refundId}`}>
                      Xem yêu cầu hoàn tiền
                    </Link>
                  </p>
                ))
              ) : (
                <p>Không có yêu cầu hoàn tiền.</p>
              )}
            </div>
          )}
          {!item.booking && (
            <p>
              Lịch sử ghi nhận tiền theo đơn mua gói. Không cần thanh toán lại
              khi quyền lợi đang được xử lý.
            </p>
          )}
        </div>
      )}
    </>
  );
  return embedded ? (
    <section className="panel" style={{ padding: 24 }}>
      {content}
    </section>
  ) : (
    <Modal title="Chi tiết giao dịch thanh toán" onClose={onClose} wide>
      {content}
    </Modal>
  );
}
export function TransactionHistory({
  from,
  to,
  initialScope,
  onClose,
}: {
  from: string;
  to: string;
  initialScope: "all" | "period";
  onClose: () => void;
}) {
  const [scope, setScope] = useState(initialScope);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{
    id: string;
    type?: string;
  } | null>(null);
  const resource = useResource(
    adminService.dashboardTransactions(
      scope === "period" ? from : "",
      scope === "period" ? to : "",
      page,
    ),
  );
  return (
    <>
      <Modal title="Lịch sử giao dịch thanh toán" onClose={onClose} wide>
        <div
          className={s.chartTabs}
          role="group"
          aria-label="Phạm vi lịch sử giao dịch"
        >
          {(["all", "period"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={scope === value}
              onClick={() => {
                setScope(value);
                setPage(1);
              }}
            >
              {value === "all" ? "Từ đầu đến nay" : "Khoảng ngày đang chọn"}
            </button>
          ))}
        </div>
        <p className={s.footnote}>
          {scope === "all"
            ? "Toàn bộ thanh toán PayOS đã thu tiền"
            : `${from.split("-").reverse().join("/")} – ${to.split("-").reverse().join("/")}`}{" "}
          · Theo thời điểm thu tiền, giờ Việt Nam. Khoản đã hoàn tiền vẫn xuất
          hiện trong lịch sử.
        </p>
        {resource.loading || resource.error ? (
          <State
            loading={resource.loading}
            error={resource.error}
            retry={resource.error ? resource.reload : undefined}
          />
        ) : resource.data?.items.length ? (
          <>
            <div className={`table-wrap ${s.transactionTable}`}>
              <table>
                <thead>
                  <tr>
                    <th>Giao dịch / Booking</th>
                    <th>Khách hàng</th>
                    <th>Số tiền</th>
                    <th>Thu tiền</th>
                    <th>Trạng thái</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.items.map((x) => (
                    <tr key={transactionKey(x)}>
                      <td>
                        #{shortId(x.paymentId)}
                        <small>
                          {x.bookingId
                            ? `Booking #${shortId(x.bookingId)}`
                            : x.productName || transactionLabel(x)}
                        </small>
                        <small>{transactionLabel(x)}</small>
                      </td>
                      <td>{x.customerName || "Khách hàng"}</td>
                      <td>{money(x.amount)}</td>
                      <td>{time(x.paidAt)}</td>
                      <td>{paymentLabels[x.status] || x.status}</td>
                      <td>
                        <button
                          className="text-button"
                          aria-label={`Xem giao dịch ${shortId(x.paymentId)}`}
                          onClick={() =>
                            setSelected({
                              id: x.paymentId,
                              type: x.transactionType,
                            })
                          }
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <State empty="Không có giao dịch thanh toán trong phạm vi này" />
        )}
        {!resource.loading && !resource.error && resource.data && (
          <Pagination
            page={page}
            size={20}
            count={resource.data.items.length}
            total={resource.data.total}
            onPage={setPage}
          />
        )}
      </Modal>
      {selected && (
        <TransactionDetail
          key={`${selected.type}:${selected.id}`}
          id={selected.id}
          type={selected.type}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
