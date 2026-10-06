"use client";
import { useEffect, useRef, useState } from "react";
import { LockKeyhole, Plus, Search, Send, X } from "lucide-react";
import { useResource, useSubmission } from "@/lib/client";
import { adminService as service } from "@/services/admin-service";
import { date } from "@/lib/format";
import type { DirectoryUser } from "@/lib/types";
import type { PageProps } from "./admin-app";
import { Badge, Modal, PageTitle, Pagination, State, SubmitButton } from "./ui";
import { Person } from "./overview-pages";
export function Notifications() {
  const submission = useSubmission();
  const { busy } = submission;
  const [tab, setTab] = useState("history"),
    [page, setPage] = useState(1),
    [recipientPage, setRecipientPage] = useState(1),
    [url, setUrl] = useState(""),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [audience, setAudience] = useState("All"),
    [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [selected, setSelected] = useState<DirectoryUser[]>([]),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const key = useRef("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setRecipientPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    key.current = "";
  }, [title, body, audience, selected, url]);
  const campaigns = useResource(service.campaigns(page));
  const users = useResource(
    service.recipients(
      debounced,
      "",
      recipientPage,
      20,
      tab === "create" && audience === "SelectedUsers" && debounced.length >= 2,
    ),
  );
  const audiences: Record<string, string> = {
    All: "Tất cả người dùng",
    Customer: "Customer",
    MUA: "MUA",
    SelectedUsers: "Người dùng cụ thể",
  };
  async function send() {
    if (!valid) return;
    if (!submission.begin()) return;
    setError("");
    setNotice("");
    try {
      key.current ||= crypto.randomUUID();
      await service.notify({
        title: title.trim(),
        body: body.trim(),
        audience,
        userIds:
          audience === "SelectedUsers" ? selected.map((x) => x.userId) : [],
        idempotencyKey: key.current,
        url: url.trim() || undefined,
      });
      setNotice("Đã tạo thông báo và ghi vào hàng đợi gửi của backend.");
      setConfirm(false);
      setTitle("");
      setBody("");
      setUrl("");
      setSelected([]);
      setTab("history");
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi thông báo.");
    } finally {
      submission.end();
    }
  }
  const valid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (audience !== "SelectedUsers" || selected.length > 0) &&
    (!url.trim() ||
      (url.trim().startsWith("/") && !url.trim().startsWith("//")));
  return (
    <>
      <PageTitle
        title="Thông báo"
        description="Gửi thông báo và theo dõi lịch sử nội dung đã tạo"
        action={
          <button className="button primary" onClick={() => setTab("create")}>
            <Plus size={16} />
            Tạo thông báo
          </button>
        }
      />
      {notice && (
        <div className="notice success" role="status">
          {notice}
        </div>
      )}
      <section className="panel list-panel">
        <div className="tabs">
          <button
            className={tab === "history" ? "selected" : ""}
            onClick={() => setTab("history")}
          >
            Lịch sử
          </button>
          <button
            className={tab === "create" ? "selected" : ""}
            onClick={() => setTab("create")}
          >
            Tạo thông báo
          </button>
        </div>
        {tab === "history" ? (
          <>
            {campaigns.loading || campaigns.error ? (
              <State
                loading={campaigns.loading}
                error={campaigns.error}
                retry={campaigns.reload}
              />
            ) : campaigns.data?.items.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nội dung</th>
                      <th>Đối tượng</th>
                      <th>Người nhận</th>
                      <th>Ngày tạo</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.data.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.title}</strong>
                          <p className="notification-body">{item.body}</p>
                        </td>
                        <td>{audiences[item.audience] || item.audience}</td>
                        <td>{item.recipientCount}</td>
                        <td>{date(item.createdAt)}</td>
                        <td>
                          <Badge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <State empty="Chưa có thông báo" />
            )}
            <Pagination
              page={page}
              size={20}
              count={campaigns.data?.items.length || 0}
              total={campaigns.data?.total}
              onPage={setPage}
            />
            <p className="helper inset">
              “Hoàn tất” là đã tạo chiến dịch, không đảm bảo mọi thiết bị đã
              nhận push.
            </p>
          </>
        ) : (
          <div className="notification-form">
            <section>
              <label className="form-field">
                Tiêu đề *
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="Nhập tiêu đề thông báo"
                />
                <small className="counter">{title.length}/200</small>
              </label>
              <label className="form-field">
                Nội dung *
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={1000}
                  placeholder="Nội dung gửi đến người dùng…"
                />
                <small className="counter">{body.length}/1000</small>
              </label>
              <label className="form-field">
                Đường dẫn nội bộ (không bắt buộc)
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  maxLength={500}
                  placeholder="/(customer)/home"
                />
                <small className="helper">
                  Bắt đầu bằng /, không dùng // hoặc URL bên ngoài.
                </small>
              </label>
              <fieldset className="audience-field">
                <legend>Đối tượng nhận</legend>
                {Object.entries(audiences).map(([value, label]) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="audience"
                      value={value}
                      checked={audience === value}
                      onChange={() => setAudience(value)}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
              {audience === "SelectedUsers" && (
                <div className="recipient-picker">
                  <div className="input-search">
                    <Search size={16} />
                    <input
                      placeholder="Tìm tên hoặc email…"
                      aria-label="Tìm người nhận"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <p className="helper">
                    Chọn tối đa 100 người dùng đang hoạt động. Nhập ít nhất 2 ký
                    tự để tìm kiếm; dùng phân trang để xem thêm.
                  </p>
                  {debounced.length >= 2 && !users.loading && !users.error && (
                    <Pagination
                      page={recipientPage}
                      size={20}
                      count={users.data?.items.length || 0}
                      total={users.data?.total}
                      onPage={setRecipientPage}
                    />
                  )}
                  <div className="chip-list">
                    {selected.map((user) => (
                      <button
                        className="chip"
                        key={user.userId}
                        onClick={() =>
                          setSelected((current) =>
                            current.filter((x) => x.userId !== user.userId),
                          )
                        }
                      >
                        {user.fullName}
                        <X size={13} />
                      </button>
                    ))}
                  </div>
                  {debounced.length >= 2 &&
                    (users.error ? (
                      <State error={users.error} retry={users.reload} />
                    ) : users.loading ? (
                      <State loading />
                    ) : (
                      <div className="recipient-list">
                        {users.data?.items.map((user) => (
                          <label key={user.userId}>
                            <input
                              type="checkbox"
                              checked={selected.some(
                                (x) => x.userId === user.userId,
                              )}
                              disabled={
                                selected.length >= 100 &&
                                !selected.some((x) => x.userId === user.userId)
                              }
                              onChange={(e) =>
                                setSelected((current) =>
                                  e.target.checked
                                    ? [...current, user]
                                    : current.filter(
                                        (x) => x.userId !== user.userId,
                                      ),
                                )
                              }
                            />
                            <span>
                              <strong>{user.fullName}</strong>
                              <small>
                                {user.email} · {user.role}
                              </small>
                            </span>
                          </label>
                        ))}
                        {!users.data?.items.length && (
                          <p>Không tìm thấy người dùng.</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
              <button
                className="button primary"
                disabled={!valid || busy}
                onClick={() => {
                  setError("");
                  setConfirm(true);
                }}
              >
                <Send size={16} />
                Gửi thông báo
              </button>
            </section>
            <aside className="notification-preview">
              <span className="small-label">XEM TRƯỚC THÔNG BÁO</span>
              <div className="notification-mock">
                <div>
                  <span className="brand-mark small">b.</span>
                  <strong>B-Book</strong>
                  <small>Bây giờ</small>
                </div>
                <h3>{title || "Tiêu đề thông báo"}</h3>
                <p>{body || "Nội dung thông báo sẽ hiển thị tại đây."}</p>
              </div>
              <p className="helper">
                Thông báo được lưu trong inbox người nhận. Push phụ thuộc cấu
                hình và token của thiết bị.
              </p>
            </aside>
          </div>
        )}
      </section>
      {confirm && (
        <Modal
          title="Xác nhận gửi thông báo"
          description={
            audience === "SelectedUsers"
              ? `Gửi đến ${selected.length} người dùng đã chọn?`
              : `Gửi đến nhóm ${audiences[audience]}?`
          }
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
          footer={
            <>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Kiểm tra lại
              </button>
              <SubmitButton busy={busy} disabled={!valid} onClick={send}>
                Gửi thông báo
              </SubmitButton>
            </>
          }
        >
          <h3>{title}</h3>
          <p className="bio-text">{body}</p>
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
export function Directory() {
  const submission = useSubmission();
  const { busy } = submission;
  const [role, setRole] = useState(""),
    [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<DirectoryUser | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useResource(service.recipients(debounced, role, page));
  async function lock() {
    if (!selected) return;
    if (!submission.begin()) return;
    setError("");
    setNotice("");
    try {
      await service.activeUser(selected.userId, false);
      setSelected(null);
      setNotice("Đã khóa tài khoản.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể khóa tài khoản.",
      );
    } finally {
      submission.end();
    }
  }
  return (
    <>
      <PageTitle
        title="Người dùng"
        description="Tra cứu người dùng đang hoạt động và quản lý quyền truy cập"
      />
      {notice && (
        <div className="notice success" role="status">
          {notice}
        </div>
      )}
      <div className="notice neutral">
        Danh sách dùng API tìm người nhận thông báo, chỉ trả tài khoản đang hoạt
        động. Danh sách tài khoản đã khóa và hồ sơ người dùng chi tiết chưa có
        API.
      </div>
      <section className="panel">
        <div className="tabs">
          {[
            ["", "Đang hoạt động"],
            ["Customer", "Customer"],
            ["MUA", "MUA"],
          ].map(([value, label]) => (
            <button
              className={role === value ? "selected" : ""}
              key={label}
              onClick={() => {
                setRole(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
          <button disabled title="Chưa có API danh sách tài khoản đã khóa">
            Đã khóa
          </button>
        </div>
        <div className="filters">
          <div className="input-search">
            <Search size={16} />
            <input
              aria-label="Tìm người dùng"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, email hoặc số điện thoại…"
            />
          </div>
        </div>
        {query.loading || query.error ? (
          <State
            loading={query.loading}
            error={query.error}
            retry={query.reload}
          />
        ) : query.data?.items.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Email</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((user) => (
                  <tr key={user.userId}>
                    <td>
                      <Person item={user} />
                    </td>
                    <td>{user.role}</td>
                    <td>{user.email}</td>
                    <td>
                      <Badge status="Active" />
                    </td>
                    <td>
                      <button
                        className="text-button text-danger"
                        onClick={() => {
                          setSelected(user);
                          setError("");
                        }}
                      >
                        <LockKeyhole size={14} />
                        Khóa tài khoản
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <State empty="Không có người dùng phù hợp" />
        )}
        <Pagination
          page={page}
          size={20}
          count={query.data?.items.length || 0}
          total={query.data?.total}
          onPage={setPage}
        />
      </section>
      {selected && (
        <Modal
          title="Khóa tài khoản?"
          description={selected.fullName}
          onClose={() => {
            if (!busy) setSelected(null);
          }}
          footer={
            <>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Hủy
              </button>
              <SubmitButton busy={busy} onClick={lock}>
                Xác nhận khóa
              </SubmitButton>
            </>
          }
        >
          <p>Tài khoản sẽ bị vô hiệu hóa theo quy tắc backend.</p>
          <p className="helper">
            API mở khóa đã có, nhưng màn tra cứu tài khoản đã khóa cần API bổ
            sung để sử dụng an toàn.
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
export function PlannedPage({ kind }: { kind: string }) {
  const activity = kind === "activity";
  return (
    <>
      <PageTitle
        title={activity ? "Nhật ký hoạt động" : "Cài đặt"}
        description={
          activity ? "Theo dõi thao tác quản trị" : "Cấu hình kết nối quản trị"
        }
      />
      <section className="panel">
        <State
          empty={
            activity
              ? "Backend chưa cung cấp API nhật ký Admin."
              : "Backend chưa cung cấp API xem/lưu cài đặt hệ thống."
          }
        />
      </section>
      {!activity && (
        <div className="notice neutral">
          Kết nối API được cấu hình bằng BACKEND_API_URL phía server. Đăng nhập
          sử dụng JWT Backend trong cookie HttpOnly. Không có chức năng lưu cài
          đặt giả.
        </div>
      )}
    </>
  );
}
export function Bookings({ id }: PageProps & { id?: string }) {
  const submission = useSubmission();
  const { busy } = submission;
  const [confirm, setConfirm] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function completeOverdue() {
    if (!submission.begin()) return;
    setError("");
    setNotice("");
    try {
      const result = await service.autoComplete();
      setNotice(
        `Backend đã xử lý ${result.completedBookings} booking quá hạn.`,
      );
      setConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xử lý.");
    } finally {
      submission.end();
    }
  }
  return (
    <>
      <PageTitle
        title={id ? "Chi tiết Booking" : "Booking"}
        description="Quản lý đơn đặt lịch và tranh chấp"
      />
      <section className="panel">
        <State empty="Chức năng quản lý danh sách booking cần API hỗ trợ." />
      </section>
      <p className="helper">
        GET /Booking và GET /Booking/{"{id}"} chỉ trả booking liên quan đến tài
        khoản đang đăng nhập. Backend chưa cung cấp danh sách, chi tiết hoặc
        bằng chứng tranh chấp cho Admin trên toàn hệ thống.
      </p>
      <button
        className="button secondary"
        disabled
        title="Cần dữ liệu booking tranh chấp thực tế trước khi quyết định"
      >
        Giải quyết tranh chấp
      </button>
      {!id && (
        <section className="panel tab-content">
          <h2>Xử lý booking quá hạn</h2>
          <p>
            Thực hiện tác vụ hoàn tất các booking đủ điều kiện theo quy tắc
            Backend. Đây là thao tác toàn hệ thống.
          </p>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              setError("");
              setNotice("");
              setConfirm(true);
            }}
          >
            Xử lý booking quá hạn
          </button>
        </section>
      )}
      {notice && (
        <p className="notice success" role="status">
          {notice}
        </p>
      )}
      {confirm && (
        <Modal
          title="Xử lý booking quá hạn?"
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
          footer={
            <>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Hủy
              </button>
              <SubmitButton busy={busy} onClick={completeOverdue}>
                Xác nhận xử lý
              </SubmitButton>
            </>
          }
        >
          <p>
            Backend sẽ tự kiểm tra điều kiện và hoàn tất các booking quá hạn hợp
            lệ. Không thể xem trước danh sách bị ảnh hưởng vì chưa có API Admin
            hỗ trợ.
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
