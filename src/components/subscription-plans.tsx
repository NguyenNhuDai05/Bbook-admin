"use client";
import { useState } from "react";
import { request, useResource, useSubmission } from "@/lib/client";
import css from "./subscription-plans.module.css";
import { readPlans, readOrderPage } from "@/lib/subscription-contracts.mjs";
import { subscriptionError } from "@/lib/subscription-errors.mjs";
import { subscriptionStates } from "@/lib/subscription-status.mjs";
import {
  MuaOrderFulfillment,
  type MuaGrant,
  type MuaFulfillment,
  type MuaPromotionTask,
} from "./mua-order-fulfillment";

type Plan = {
  id: string;
  role: string;
  name: string;
  amountVnd: number;
  days: number | null;
  description: string;
  state: string;
  version: number;
};
type Change = {
  id: string;
  actorId: string;
  action: string;
  reason: string;
  createdAt: string;
  beforeJson: string;
  afterJson: string;
};
type Detail = { plan: Plan; history: Change[]; total: number; page: number };
type Order = {
  id: string;
  userId: string;
  productName: string;
  amountVnd: number;
  state: string;
  createdAt: string;
};
type OrderDetail = {
  order: Record<string, unknown>;
  allowedActions: string[];
  history: Record<string, unknown>[];
  grants?: MuaGrant[];
  fulfillment?: MuaFulfillment;
  promotionTasks?: MuaPromotionTask[];
  supportHistory?: Record<string, unknown>[];
};
const money = (n: number) => n.toLocaleString("vi-VN") + "đ";
const labels: Record<string, string> = {
  id: "Mã",
  role: "Đối tượng",
  name: "Tên gói",
  amountVnd: "Giá trị",
  days: "Số ngày",
  description: "Mô tả",
  state: "Trạng thái",
  version: "Phiên bản",
  userId: "Tài khoản",
  muaId: "MUA",
  productId: "Mã gói",
  productName: "Gói đã mua",
  planVersion: "Phiên bản đã mua",
  durationDays: "Thời hạn (ngày)",
  createdAt: "Ngày tạo",
  expiresAt: "Hạn thanh toán",
  paidAt: "Đã xác minh tiền",
  verifiedPaidAt: "Đã xác minh tiền",
  revokedAt: "Ngày thu hồi",
  revocationReason: "Lý do thu hồi",
  origin: "Nguồn",
  startsAt: "Bắt đầu",
  endsAt: "Kết thúc",
  sourceReference: "Nguồn quyền lợi",
  kind: "Loại",
  action: "Thao tác",
  reference: "Tham chiếu",
  receivedAt: "Ngày ghi nhận",
  source: "Nguồn sự kiện",
};
function Info({ value }: { value?: Record<string, unknown> }) {
  return (
    <dl className={css.info}>
      {Object.entries(value || {})
        .filter(([key]) => key !== "evidenceHash")
        .map(([key, v]) => (
          <div key={key}>
            <dt>{labels[key] || key}</dt>
            <dd>
              {v === null || v === ""
                ? "—"
                : key === "state" && typeof v === "string"
                  ? subscriptionStates[v] || v
                  : key === "amountVnd" && typeof v === "number"
                    ? money(v)
                    : /At$/.test(key) && typeof v === "string"
                      ? new Date(v).toLocaleString("vi-VN", {
                          timeZone: "Asia/Ho_Chi_Minh",
                        })
                      : String(v)}
            </dd>
          </div>
        ))}
    </dl>
  );
}
function Snapshot({ json }: { json: string }) {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    value = json;
  }
  return value && typeof value === "object" ? (
    <Info
      value={Object.fromEntries(
        Object.entries(value).map(([key, v]) => [
          key[0].toLowerCase() + key.slice(1),
          v,
        ]),
      )}
    />
  ) : (
    <p>Chưa có dữ liệu</p>
  );
}
const blank: Plan = {
  id: "",
  role: "Customer",
  name: "",
  amountVnd: 20000,
  days: null,
  description: "",
  state: "Draft",
  version: 0,
};
export function SubscriptionPlans() {
  const [tab, setTab] = useState("plans");
  const [revision, refresh] = useState(0);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [detailId, setDetailId] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [kind, setKind] = useState("Customer");
  const [page, setPage] = useState(1);
  const [state, setState] = useState("");
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useSubmission();
  const plans = useResource<Plan[]>({
    key: `plans:${revision}`,
    load: (signal) =>
      request<Plan[]>("admin/plans", "GET", undefined, signal)
        .then(readPlans)
        .catch((error) => {
          throw subscriptionError(error);
        }),
  });
  const detail = useResource<Detail>({
    key: `plan:${detailId}:${historyPage}:${revision}`,
    enabled: !!detailId,
    load: (signal) =>
      request(
        `admin/plans/${detailId}?page=${historyPage}`,
        "GET",
        undefined,
        signal,
      ),
  });
  const orders = useResource<{ items: Order[]; total: number }>({
    key: `orders:${kind}:${page}:${state}:${revision}`,
    enabled: tab === "orders",
    load: (signal) =>
      request<{ items: Order[]; total: number }>(
        `admin/commerce/orders?kind=${kind}&page=${page}${state ? `&state=${state}` : ""}`,
        "GET",
        undefined,
        signal,
      ).then(readOrderPage),
  });
  const order = useResource<OrderDetail>({
    key: `order:${kind}:${orderId}:${revision}`,
    enabled: !!orderId,
    load: (signal) =>
      request(
        `admin/commerce/orders/${kind}/${orderId}`,
        "GET",
        undefined,
        signal,
      ),
  });
  async function mutate(path: string, method: string, body: unknown) {
    if (!lock.begin()) return;
    setBusy(true);
    setError("");
    try {
      await request(path, method, body);
      refresh((v) => v + 1);
      setEditing(null);
      setReason("");
      setEvidence("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa lưu được thay đổi.");
      refresh((v) => v + 1);
    } finally {
      setBusy(false);
      lock.end();
    }
  }
  return (
    <section className={css.page}>
      <header className={css.hero}>
        <div className={css.heroCopy}>
          <span>QUẢN LÝ SUBSCRIPTION</span>
          <h1>Gói & quyền lợi</h1>
          <p>
            Quản lý sản phẩm, theo dõi đơn và chăm sóc quyền lợi của từng tài
            khoản.
          </p>
        </div>
        <button
          className="button primary"
          disabled={plans.loading || !!plans.error}
          onClick={() => {
            setEditing({ ...blank });
            setReason("");
          }}
        >
          + Tạo gói mới
        </button>
      </header>
      <div className={css.tabs}>
        {[
          ["plans", "Danh mục gói"],
          ["orders", "Giao dịch & quyền lợi"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? css.active : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <button onClick={() => refresh((v) => v + 1)}>Làm mới</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {tab === "plans" && (
        <>
          {plans.loading ? (
            <p>Đang tải…</p>
          ) : plans.error ? (
            <p role="alert">{plans.error}</p>
          ) : (
            <div className={css.grid}>
              {plans.data?.length === 0 && (
                <p>
                  Danh mục chưa có gói nào. Cần kiểm tra đồng bộ hai gói
                  Visibility và AI trước khi tạo thêm gói.
                </p>
              )}
              {plans.data?.map((p) => (
                <article className={css.card} key={p.id}>
                  <div className={css.top}>
                    <span>
                      {p.role === "MUA"
                        ? "✦ Dành cho MUA"
                        : "✦ Dành cho khách hàng"}
                    </span>
                    <small>
                      {p.state} · v{p.version}
                    </small>
                  </div>
                  <h2>{p.name}</h2>
                  <strong className={css.price}>
                    {money(p.amountVnd)}{" "}
                    <small>/ {p.days ? `${p.days} ngày` : "trọn đời"}</small>
                  </strong>
                  <p>
                    {p.description ||
                      (p.role === "MUA"
                        ? "Quảng bá trong Khám phá và một bài Facebook cho mỗi chu kỳ."
                        : "Mở khóa AI theo tài khoản. Đồng bộ trên các thiết bị.")}
                  </p>
                  <code>{p.id}</code>
                  <div className={css.actions}>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setEditing({ ...p });
                        setReason("");
                      }}
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setDetailId(p.id);
                        setHistoryPage(1);
                      }}
                    >
                      Chi tiết & lịch sử
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setEditing({ ...p, state: "Archived" });
                        setReason("");
                      }}
                    >
                      Xóa / ngừng bán
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {editing && (
        <form
          className={css.editor}
          onSubmit={(e) => {
            e.preventDefault();
            void mutate(
              `admin/plans${editing.version ? `/${editing.id}` : ""}`,
              editing.version ? "PUT" : "POST",
              { ...editing, reason },
            );
          }}
        >
          <h2>{editing.version ? "Chỉnh sửa gói" : "Tạo gói mới"}</h2>
          <p>
            Thay đổi áp dụng cho đơn mới. Gói đã có giao dịch được lưu trữ khi
            xóa; đơn và quyền lợi cũ vẫn được giữ.
          </p>
          <div className={css.fields}>
            <label>
              Mã gói
              <input
                required
                pattern="[a-z0-9_]{3,64}"
                disabled={!!editing.version}
                value={editing.id}
                onChange={(e) => setEditing({ ...editing, id: e.target.value })}
              />
            </label>
            <label>
              Đối tượng
              <select
                disabled={!!editing.version}
                value={editing.role}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    role: e.target.value,
                    days: e.target.value === "MUA" ? 30 : null,
                  })
                }
              >
                <option>Customer</option>
                <option>MUA</option>
              </select>
            </label>
            <label>
              Tên gói
              <input
                required
                maxLength={120}
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </label>
            <label>
              Giá VND
              <input
                type="number"
                required
                min={1000}
                max={100000000}
                step={1}
                value={editing.amountVnd}
                onChange={(e) =>
                  setEditing({ ...editing, amountVnd: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Trạng thái
              <select
                value={editing.state}
                onChange={(e) =>
                  setEditing({ ...editing, state: e.target.value })
                }
              >
                {["Draft", "Published", "Paused", "Archived"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Thời hạn
              {editing.role === "MUA" ? (
                <select
                  value={editing.days || 30}
                  onChange={(e) =>
                    setEditing({ ...editing, days: Number(e.target.value) })
                  }
                >
                  {Array.from({ length: 12 }, (_, i) => (i + 1) * 30).map(
                    (days) => (
                      <option key={days} value={days}>
                        {days} ngày · {days / 30} chu kỳ
                      </option>
                    ),
                  )}
                </select>
              ) : (
                <input readOnly value="AI trọn đời" />
              )}
            </label>
          </div>
          <label>
            Mô tả
            <textarea
              maxLength={1000}
              value={editing.description}
              onChange={(e) =>
                setEditing({ ...editing, description: e.target.value })
              }
            />
          </label>
          <label>
            Lý do thay đổi
            <textarea
              required
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className={css.preview}>
            <small>XEM TRƯỚC</small>
            <h3>{editing.name || "Tên gói"}</h3>
            <strong>
              {money(editing.amountVnd)} /{" "}
              {editing.days ? `${editing.days} ngày` : "trọn đời"}
            </strong>
            <p>{editing.description}</p>
          </div>
          <div className={css.actions}>
            <button disabled={busy} className="button primary">
              {busy ? "Đang lưu…" : "Xác nhận lưu"}
            </button>
            <button
              type="button"
              disabled={busy}
              className="button secondary"
              onClick={() => setEditing(null)}
            >
              Đóng
            </button>
          </div>
        </form>
      )}
      {detailId && (
        <article className={css.editor}>
          <h2>Chi tiết & lịch sử gói</h2>
          <button onClick={() => setDetailId("")}>Đóng</button>
          {detail.loading ? (
            <p>Đang tải…</p>
          ) : detail.error ? (
            <p role="alert">{detail.error}</p>
          ) : (
            <>
              <Info
                value={detail.data?.plan ? { ...detail.data.plan } : undefined}
              />
              {detail.data?.history.map((h) => (
                <div className={css.event} key={h.id}>
                  <strong>
                    {h.action} · {new Date(h.createdAt).toLocaleString("vi-VN")}
                  </strong>
                  <p>{h.reason}</p>
                  <small>Admin: {h.actorId}</small>
                  <details>
                    <summary>Trước / sau</summary>
                    <h4>Trước thay đổi</h4>
                    <Snapshot json={h.beforeJson} />
                    <h4>Sau thay đổi</h4>
                    <Snapshot json={h.afterJson} />
                  </details>
                </div>
              ))}
              <div className={css.actions}>
                <button
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage((p) => p - 1)}
                >
                  Trước
                </button>
                <span>
                  Trang {historyPage} · {detail.data?.total} thay đổi
                </span>
                <button
                  disabled={historyPage * 25 >= (detail.data?.total || 0)}
                  onClick={() => setHistoryPage((p) => p + 1)}
                >
                  Sau
                </button>
              </div>
            </>
          )}
        </article>
      )}
      {tab === "orders" && (
        <article className={css.editor}>
          <h2>Giao dịch & quyền lợi</h2>
          <div className={css.actions}>
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setPage(1);
                setOrderId("");
                setState("");
              }}
            >
              <option>Customer</option>
              <option>MUA</option>
            </select>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setPage(1);
              }}
            >
              {[
                "",
                "PaymentPending",
                "PaidAwaitingFulfillment",
                "ManualReview",
                "Fulfilled",
                "Cancelled",
                "Revoked",
                "Refunded",
              ]
                .filter((s) =>
                  kind === "Customer"
                    ? !["PaidAwaitingFulfillment", "Refunded"].includes(s)
                    : s !== "Revoked",
                )
                .map((s) => (
                  <option key={s} value={s}>
                    {subscriptionStates[s] || s || "Tất cả trạng thái"}
                  </option>
                ))}
            </select>
          </div>
          {orders.loading ? (
            <p>Đang tải…</p>
          ) : orders.error ? (
            <p role="alert">{orders.error}</p>
          ) : (
            <>
              {!orders.data?.items.length && <p>Chưa có giao dịch.</p>}
              {orders.data?.items.map((o) => (
                <button
                  className={css.order}
                  key={o.id}
                  onClick={() => {
                    setOrderId(o.id);
                    setReason("");
                    setEvidence("");
                  }}
                >
                  <span>
                    <strong>{o.productName}</strong>
                    <small>{o.id}</small>
                    <small>Tài khoản: {o.userId}</small>
                  </span>
                  <span>
                    {money(o.amountVnd)}
                    <small>{subscriptionStates[o.state] || o.state}</small>
                  </span>
                </button>
              ))}
              <div className={css.actions}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Trước
                </button>
                <span>
                  Trang {page} · {orders.data?.total || 0} đơn
                </span>
                <button
                  disabled={page * 25 >= (orders.data?.total || 0)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sau
                </button>
              </div>
            </>
          )}
        </article>
      )}
      {orderId && (
        <article className={css.editor}>
          <h2>Chi tiết giao dịch</h2>
          <button onClick={() => setOrderId("")}>Đóng</button>
          {order.loading ? (
            <p>Đang tải…</p>
          ) : order.error ? (
            <p role="alert">{order.error}</p>
          ) : (
            <>
              <Info value={order.data?.order} />
              {order.data?.grants && (
                <MuaOrderFulfillment
                  grants={order.data.grants}
                  fulfillment={order.data.fulfillment}
                  promotionTasks={order.data.promotionTasks}
                />
              )}
              <details>
                <summary>Lịch sử giao dịch</summary>
                {order.data?.supportHistory?.map((h, i) => (
                  <div key={`support-${i}`} className={css.event}>
                    <Info value={h} />
                  </div>
                ))}
                {order.data?.history.map((h, i) => (
                  <div key={i} className={css.event}>
                    <Info value={h} />
                  </div>
                ))}
              </details>
              {!!order.data?.allowedActions.length && (
                <>
                  <label>
                    Bằng chứng đối soát
                    <input
                      value={evidence}
                      maxLength={120}
                      onChange={(e) => setEvidence(e.target.value)}
                    />
                  </label>
                  <label>
                    Lý do
                    <textarea
                      value={reason}
                      maxLength={1000}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <p>
                    {kind === "MUA"
                      ? "Thử kích hoạt lại chỉ xử lý thời hạn nổi bật trong app từ khoản tiền đã xác minh, không thu tiền lần nữa và không đánh dấu đã đăng bài. Khôi phục xử lý đưa đơn cần kiểm tra vào hàng đợi."
                      : "Thu hồi quyền không phải hoàn tiền."}
                  </p>
                  <div className={css.actions}>
                    {order.data.allowedActions.map((action) => (
                      <button
                        className="button secondary"
                        key={action}
                        disabled={busy || !reason.trim() || !evidence.trim()}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Xác nhận ${action === "retry" ? "thử kích hoạt nổi bật trong app" : action === "recover" ? "khôi phục xử lý" : "thu hồi quyền"} cho đơn ${orderId}?`,
                            )
                          )
                            void mutate(
                              `admin/commerce/orders/${kind}/${orderId}/resolve`,
                              "POST",
                              { action, reason, evidenceReference: evidence },
                            );
                        }}
                      >
                        {action === "retry"
                          ? "Thử kích hoạt lại trong app"
                          : action === "recover"
                            ? "Khôi phục xử lý"
                            : "Thu hồi quyền"}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </article>
      )}
    </section>
  );
}
