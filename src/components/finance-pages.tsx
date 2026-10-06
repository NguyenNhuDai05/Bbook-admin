"use client";
import { FinancialQr } from "./financial-qr";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Landmark,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";
import { useResource, useSubmission } from "@/lib/client";
import { adminService as service } from "@/services/admin-service";
import { financialActions } from "@/lib/contracts.mjs";
import { date, maskAccount, money, shortId, statusName } from "@/lib/format";
import type { BankAccount } from "@/lib/types";
import type { PageProps } from "./admin-app";
import { Badge, Modal, PageTitle, State, SubmitButton } from "./ui";
export function BankAccounts() {
  const query = useResource(service.banks());
  const [selected, setSelected] = useState<BankAccount | null>(null),
    [review, setReview] = useState<"approve" | "reject" | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState("");
  const [rejectReason, setRejectReason] = useState("ACCOUNT_INFO_INCORRECT");
  const [rejectNote, setRejectNote] = useState("");
  const submission = useSubmission();
  const { busy } = submission;
  const rows =
    query.data?.filter((item) =>
      `${item.ownerName} ${item.bankName} ${item.accountHolderName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];
  async function act() {
    if (!selected || !review) return;
    if (review === "reject" && rejectReason === "OTHER" && !rejectNote.trim()) {
      setError("Lý do khác cần ghi chú.");
      return;
    }
    if (!submission.begin()) return;
    setError("");
    setNotice("");
    try {
      const result = await service.reviewBank(
        selected.id,
        review === "approve",
        {
          reviewToken: selected.reviewToken,
          ...(review === "reject"
            ? { reason: rejectReason, note: rejectNote.trim() || undefined }
            : {}),
        },
      );
      setNotice(
        review === "approve"
          ? `Đã duyệt tài khoản.${result?.activatedAt ? ` Có thể sử dụng từ ${date(result.activatedAt)}.` : " Thời gian kích hoạt do Backend quyết định."}`
          : "Đã từ chối tài khoản nhận tiền.",
      );
      setSelected(null);
      setReview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật.");
      setSelected(null);
      setReview(null);
      query.reload();
    } finally {
      submission.end();
    }
  }
  return (
    <>
      <PageTitle
        title="Tài khoản nhận tiền"
        description="Đối chiếu tài khoản ngân hàng và QR, độc lập với xác minh danh tính"
        action={
          <button className="button secondary" onClick={query.reload}>
            <RefreshCw size={15} />
            Làm mới
          </button>
        }
      />
      {error && !selected && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <div className="notice success" role="status">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}
      <div className="notice neutral">
        <Landmark size={17} />
        API hiện cung cấp danh sách chờ duyệt. Lịch sử tài khoản đã duyệt và bị
        từ chối chưa có API quản trị.
      </div>
      <section className="panel list-panel">
        <div className="tabs">
          <button className="selected">Chờ duyệt</button>
          <button disabled title="Chưa có API lịch sử">
            Đã duyệt
          </button>
          <button disabled title="Chưa có API lịch sử">
            Từ chối
          </button>
        </div>
        <div className="filters">
          <div className="input-search">
            <Search size={16} />
            <input
              aria-label="Tìm tài khoản"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder="Tìm chủ tài khoản, ngân hàng…"
            />
          </div>
        </div>
        {query.loading || query.error ? (
          <State
            loading={query.loading}
            error={query.error}
            retry={query.reload}
          />
        ) : rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Người sở hữu</th>
                  <th>Ngân hàng</th>
                  <th>Số tài khoản</th>
                  <th>Chủ tài khoản</th>
                  <th>Ngày gửi</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.ownerName || shortId(item.ownerId)}</strong>
                      <small className="cell-sub">
                        {shortId(item.ownerId)}
                      </small>
                    </td>
                    <td>{item.bankName || item.bankCode}</td>
                    <td>{maskAccount(item.accountNumber)}</td>
                    <td>{item.accountHolderName}</td>
                    <td>{date(item.createdAt)}</td>
                    <td>
                      <Badge status="PENDING_ADMIN" />
                    </td>
                    <td>
                      <button
                        className="button table-button"
                        onClick={() => {
                          setSelected(item);
                          setError("");
                        }}
                      >
                        Xem & đối chiếu
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <State empty="Không có tài khoản chờ duyệt" />
        )}
        <p className="helper inset">
          Hiển thị toàn bộ danh sách chờ duyệt API trả về. Backend không hỗ trợ
          phân trang hoặc lịch sử ngân hàng.
        </p>
      </section>
      {selected && (
        <Modal
          title={
            review
              ? review === "approve"
                ? "Duyệt tài khoản nhận tiền?"
                : "Từ chối tài khoản nhận tiền?"
              : "Đối chiếu tài khoản nhận tiền"
          }
          description={selected.ownerName || shortId(selected.ownerId)}
          onClose={() => {
            if (!busy) {
              setSelected(null);
              setReview(null);
            }
          }}
          footer={
            review ? (
              <>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setReview(null)}
                >
                  Quay lại
                </button>
                <SubmitButton busy={busy} onClick={act}>
                  {review === "approve" ? "Xác nhận duyệt" : "Xác nhận từ chối"}
                </SubmitButton>
              </>
            ) : (
              <>
                <button
                  className="button danger-outline"
                  onClick={() => {
                    setRejectNote("");
                    setRejectReason("ACCOUNT_INFO_INCORRECT");
                    setReview("reject");
                  }}
                >
                  Từ chối
                </button>
                <button
                  className="button primary"
                  onClick={() => setReview("approve")}
                >
                  Duyệt tài khoản
                </button>
              </>
            )
          }
        >
          <dl className="detail-facts">
            <div>
              <dt>Phương thức / Ngân hàng</dt>
              <dd>
                {selected.method === "MOMO"
                  ? "MoMo"
                  : selected.bankName || selected.bankCode}
              </dd>
            </div>
            <div>
              <dt>
                {selected.method === "MOMO"
                  ? "Số MoMo"
                  : "Số tài khoản đối chiếu"}
              </dt>
              <dd>{selected.accountNumber}</dd>
            </div>
            <div>
              <dt>Chủ tài khoản</dt>
              <dd>{selected.accountHolderName}</dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd>
                {selected.verificationStatus === "PENDING_ADMIN"
                  ? "Chờ duyệt"
                  : selected.verificationStatus}
              </dd>
            </div>
            <div>
              <dt>Mã người dùng</dt>
              <dd>{selected.ownerId}</dd>
            </div>
            <div>
              <dt>Mã ngân hàng / BIN</dt>
              <dd>
                {selected.bankCode} / {selected.bankBin}
              </dd>
            </div>
            <div>
              <dt>Ngày gửi</dt>
              <dd>{date(selected.createdAt)}</dd>
            </div>
          </dl>
          {selected.method === "MOMO" && selected.hasFinancialQr && (
            <FinancialQr
              key={selected.reviewToken}
              id={selected.id}
              context="bank"
            />
          )}
          {review === "reject" && (
            <div>
              <label>
                Lý do từ chối
                <select
                  aria-label="Lý do từ chối"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                >
                  <option value="ACCOUNT_INFO_INCORRECT">
                    Thông tin tài khoản không đúng
                  </option>
                  <option value="HOLDER_NAME_MISMATCH">
                    Tên chủ tài khoản không khớp
                  </option>
                  <option value="QR_INFO_MISMATCH">
                    Thông tin QR không khớp
                  </option>
                  <option value="QR_UNREADABLE">QR không đọc được</option>
                  <option value="OTHER">Khác</option>
                </select>
              </label>
              <label>
                Ghi chú nội bộ
                <textarea
                  aria-label="Ghi chú từ chối"
                  maxLength={500}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                />
              </label>
            </div>
          )}
          <div className="notice warning">
            Đối chiếu thông tin trước khi phê duyệt. Việc phê duyệt không đồng
            nghĩa BBook xác minh quyền sở hữu tài khoản với ngân hàng hoặc MoMo.
            Sau khi phê duyệt, tài khoản có thể được sử dụng để nhận tiền.
          </div>
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
export function MoneyList({ base, refund }: PageProps & { refund: boolean }) {
  const params = useSearchParams();
  const [actionOnly, setActionOnly] = useState(
    () => params.get("queue") === "action",
  );
  const [status, setStatus] = useState(""),
    [search, setSearch] = useState("");
  const query = useResource(service.moneyList(refund, refund ? status : ""));
  const rows =
    query.data?.filter(
      (item) =>
        (!actionOnly ||
          (["Pending", "ManualActionRequired", "Failed"].includes(
            statusName(item.status, refund),
          ) &&
            (refund ||
              statusName(item.status, refund) !== "Failed" ||
              !item.reconciledAt))) &&
        (!status || statusName(item.status, refund) === status) &&
        `${item.customerName || item.accountHolderName || ""} ${item.id || item.refundId || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];
  const values = [
    ["Pending", "Chờ xử lý"],
    ["Processing", "Đang xử lý"],
    ...(refund ? [["Completed", "Hoàn tất"]] : []),
    ["Failed", "Thất bại"],
  ];
  const visible = rows;
  return (
    <>
      <PageTitle
        title={refund ? "Hoàn tiền" : "Chi trả MUA"}
        description={
          refund
            ? "Theo dõi và ghi nhận xử lý hoàn tiền cho Customer"
            : "Theo dõi hàng đợi chi trả cho Makeup Artist"
        }
        action={
          <button className="button secondary" onClick={query.reload}>
            <RefreshCw size={15} />
            Làm mới
          </button>
        }
      />
      {actionOnly && (
        <div className="notice info">
          Đang hiển thị các khoản cần xử lý.
          <button className="text-button" onClick={() => setActionOnly(false)}>
            Xem tất cả
          </button>
        </div>
      )}
      <div className="notice info">
        <WalletCards size={17} />
        Thao tác admin ghi nhận kết quả xử lý. Không tự thực hiện giao dịch
        chuyển tiền ngân hàng.
      </div>
      <div className="kpi-grid compact">
        {values.map(([value, label]) => (
          <div className="kpi-card" key={value}>
            <span>{label}</span>
            <strong>
              {query.loading
                ? "…"
                : query.error
                  ? "—"
                  : query.data?.filter(
                      (x) => statusName(x.status, refund) === value,
                    ).length || 0}
            </strong>
            <small>
              {query.loading
                ? "Đang tải dữ liệu"
                : query.error
                  ? "Không tải được dữ liệu"
                  : money(
                      (query.data || [])
                        .filter((x) => statusName(x.status, refund) === value)
                        .reduce((sum, x) => sum + x.amount, 0),
                    )}
            </small>
          </div>
        ))}
      </div>
      <section className="panel list-panel">
        <div className="filters">
          <div className="input-search">
            <Search size={16} />
            <input
              aria-label="Tìm giao dịch"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder="Tìm mã hoặc người nhận…"
            />
          </div>
          <select
            aria-label="Trạng thái"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setActionOnly(false);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {[
              ...values,
              ["ManualActionRequired", "Cần xử lý thủ công"],
              ...(refund
                ? [["AwaitingDestination", "Chờ tài khoản nhận tiền"]]
                : []),
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        {query.loading || query.error ? (
          <State
            loading={query.loading}
            error={query.error}
            retry={query.reload}
          />
        ) : visible.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{refund ? "Mã hoàn tiền" : "Mã chi trả"}</th>
                  <th>{refund ? "Customer" : "Người nhận"}</th>
                  <th>Số tiền</th>
                  <th>{refund ? "Lý do" : "Ngân hàng"}</th>
                  <th>Ngày tạo</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const id = refund ? item.refundId! : item.id!;
                  return (
                    <tr key={id}>
                      <td>
                        <strong>
                          {refund ? "RF" : "PO"}-{shortId(id)}
                        </strong>
                      </td>
                      <td>
                        {item.customerName || item.accountHolderName || "—"}
                      </td>
                      <td className="amount-cell">{money(item.amount)}</td>
                      <td>
                        {refund
                          ? item.reason || "—"
                          : item.bankName || item.bankCode || "—"}
                      </td>
                      <td>{date(item.createdAt)}</td>
                      <td>
                        <Badge status={statusName(item.status, refund)} />
                      </td>
                      <td>
                        <Link
                          className="button table-button"
                          href={`${base}/${refund ? "refunds" : "payouts"}/${id}`}
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <State empty="Không có giao dịch trong bộ lọc này" />
        )}
        <p className="helper inset">
          Hiển thị toàn bộ kết quả của API hiện tại; không có phân trang phía
          Backend.
        </p>
      </section>
      <p className="helper">
        {refund
          ? "Không chọn trạng thái: API loại trừ khoản hoàn tất. Chọn Hoàn tất để tải dữ liệu Completed từ Backend. KPI chỉ tính trên kết quả truy vấn hiện tại."
          : "API chỉ trả hàng đợi Pending, ManualActionRequired, Processing và Failed chưa đối soát. Chưa có API lịch sử đã chi trả; KPI chỉ tính trên hàng đợi này."}
      </p>
    </>
  );
}
export function MoneyDetail({
  base,
  refund,
  id,
}: PageProps & { refund: boolean; id: string }) {
  const query = useResource(service.money(id, refund));
  const submission = useSubmission();
  const { busy } = submission;
  const [action, setAction] = useState(""),
    [reference, setReference] = useState(""),
    [failureCode, setFailureCode] = useState(""),
    [failureMessage, setFailureMessage] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function act() {
    if (
      !query.data ||
      !valid ||
      !financialActions(query.data.status, refund).includes(action)
    )
      return;
    if (!submission.begin()) return;
    setError("");
    setNotice("");
    try {
      await service.financialAction(
        id,
        refund,
        action,
        action === "complete"
          ? { reference: reference.trim() }
          : action === "fail"
            ? {
                failureCode: failureCode.trim(),
                failureMessage: failureMessage.trim(),
                ...(!refund ? { confirmedFundsNotSent: confirmed } : {}),
              }
            : action === "start-processing"
              ? { reference: reference.trim() || undefined }
              : {},
      );
      setAction("");
      setNotice("Đã cập nhật trạng thái từ backend.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật.");
    } finally {
      submission.end();
    }
  }
  if (query.loading || query.error || !query.data)
    return (
      <State loading={query.loading} error={query.error} retry={query.reload} />
    );
  const item = query.data,
    status = statusName(item.status, refund);
  const recipient = refund
    ? item.destinationAccountName || item.customerName
    : item.accountHolderName;
  const actions = [
    ...(["Pending", "ManualActionRequired"].includes(status)
      ? [["start-processing", "Bắt đầu xử lý"]]
      : []),
    ...(status === "Processing"
      ? [
          ["complete", refund ? "Xác nhận hoàn tất" : "Xác nhận đã chi trả"],
          ["fail", "Đánh dấu thất bại"],
        ]
      : []),
    ...(refund && status === "Failed" ? [["retry", "Thử lại"]] : []),
  ];
  const valid =
    action === "complete"
      ? reference.trim().length > 0 && confirmed
      : action === "fail"
        ? failureCode.trim().length > 0 &&
          failureMessage.trim().length > 0 &&
          confirmed
        : true;
  return (
    <>
      <Link
        className="text-button back-link"
        href={`${base}/${refund ? "refunds" : "payouts"}`}
      >
        <ArrowLeft size={16} />
        Quay lại danh sách
      </Link>
      <PageTitle
        title={`${refund ? "Hoàn tiền" : "Chi trả"} #${shortId(id)}`}
        description={`Tạo lúc ${date(item.createdAt)}`}
        action={<Badge status={status} />}
      />
      {notice && (
        <div className="notice success" role="status">
          {notice}
        </div>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="general-grid financial-grid">
        <section className="panel tab-content">
          <h2>Thông tin giao dịch</h2>
          <div className="large-amount">{money(item.amount)}</div>
          <dl className="detail-facts">
            {[
              ["Người nhận", recipient],
              [
                "Booking",
                item.bookingId || "API chưa cung cấp liên kết booking",
              ],
              [
                "Ngân hàng",
                refund
                  ? item.destinationBankName
                  : item.bankName || item.bankCode,
              ],
              [
                "Số tài khoản",
                refund
                  ? item.destinationAccountNumber ||
                    item.maskedDestinationAccountNumber
                  : item.accountNumber || item.maskedAccountNumber,
              ],
              ["Mã đối soát", item.providerReference],
              ["Mã giao dịch nhà cung cấp", item.providerPayoutId],
              ["Trạng thái nhà cung cấp", item.lastProviderState],
              [
                "Lần xử lý",
                item.attemptCount === undefined
                  ? undefined
                  : String(item.attemptCount),
              ],
              ["Lý do", item.reason],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "—"}</dd>
              </div>
            ))}
          </dl>
          {["Pending", "ManualActionRequired", "Processing"].includes(
            status,
          ) && (
            <FinancialQr
              id={id}
              context={refund ? "refund" : "payout"}
              amount={item.amount}
            />
          )}
        </section>
        <section className="panel tab-content">
          <h2>Tiến trình xử lý</h2>
          <div className="timeline">
            {[
              ["Đã tạo", item.createdAt],
              ["Bắt đầu xử lý", item.processingAt],
              ["Hoàn tất", item.completedAt || item.paidAt],
              ["Thất bại", item.failedAt],
            ]
              .filter(([, time]) => time)
              .map(([label, time]) => (
                <div key={label}>
                  <CheckCircle2 size={17} />
                  <div>
                    <strong>{label}</strong>
                    <p>{date(time)}</p>
                  </div>
                </div>
              ))}
          </div>
          {item.failureMessage && (
            <div className="notice danger">{item.failureMessage}</div>
          )}
          <div className="notice info">
            Hãy thực hiện chuyển tiền và đối soát bên ngoài trước khi xác nhận
            hoàn tất. Nút này chỉ ghi nhận trạng thái.
          </div>
          {refund && (
            <p className="helper">
              Backend có thể chặn xử lý thủ công khi nhà cung cấp đang xử lý
              hoặc tài khoản nhận tiền chưa đủ điều kiện. API chưa trả cờ cho
              phép từng thao tác; quyết định cuối cùng thuộc Backend.
            </p>
          )}
          <div className="vertical-actions">
            {actions.map(([value, label]) => (
              <button
                className={`button ${value === "fail" ? "danger-outline" : "primary"}`}
                key={value}
                disabled={busy}
                onClick={() => {
                  setNotice("");
                  setReference("");
                  setFailureCode("");
                  setFailureMessage("");
                  setAction(value);
                  setError("");
                  setConfirmed(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>
      {action && (
        <Modal
          title={
            actions.find(([value]) => value === action)?.[1] ||
            "Cập nhật giao dịch"
          }
          description={`${money(item.amount)} · ${recipient || "Người nhận chưa được cung cấp"}`}
          onClose={() => {
            if (!busy) setAction("");
          }}
          footer={
            <>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setAction("")}
              >
                Hủy
              </button>
              <SubmitButton busy={busy} disabled={!valid} onClick={act}>
                Xác nhận
              </SubmitButton>
            </>
          }
        >
          <dl className="detail-facts">
            <div>
              <dt>Mã giao dịch</dt>
              <dd>{id}</dd>
            </div>
            <div>
              <dt>Ngân hàng</dt>
              <dd>
                {refund
                  ? item.destinationBankName
                  : item.bankName || item.bankCode}
              </dd>
            </div>
            <div>
              <dt>Người nhận</dt>
              <dd>{recipient}</dd>
            </div>
          </dl>
          {["complete", "start-processing"].includes(action) && (
            <label className="form-field">
              Mã giao dịch / mã đối soát{" "}
              {action === "complete" ? "*" : "(không bắt buộc)"}
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={255}
              />
            </label>
          )}
          {action === "fail" && (
            <>
              <label className="form-field">
                Mã lỗi *
                <input
                  value={failureCode}
                  onChange={(e) => setFailureCode(e.target.value)}
                  maxLength={100}
                />
              </label>
              <label className="form-field">
                Lý do thất bại *
                <textarea
                  value={failureMessage}
                  onChange={(e) => setFailureMessage(e.target.value)}
                  maxLength={1000}
                />
              </label>
            </>
          )}
          {["complete", "fail"].includes(action) && (
            <label className="confirmation-check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              {action === "complete"
                ? "Tôi xác nhận tiền đã được chuyển thành công ngoài hệ thống."
                : "Tôi đã đối soát và xác nhận người nhận chưa nhận tiền."}
            </label>
          )}
          <p className="helper">Thao tác không tự chuyển tiền ngân hàng.</p>
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
