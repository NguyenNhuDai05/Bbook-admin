"use client";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { useResource, useSubmission } from "@/lib/client";
import { date } from "@/lib/format";
import {
  feedbackService,
  feedbackStatuses,
  feedbackCategories,
} from "@/services/feedback-service";
import { PageTitle, Pagination, State, SubmitButton } from "./ui";

function FeedbackStatus({ status }: { status: string }) {
  return (
    <span
      className={`badge ${status === "New" ? "warning" : status === "InProgress" ? "info" : status === "Resolved" ? "success" : "neutral"}`}
    >
      {feedbackStatuses[status] || status}
    </span>
  );
}
export function RecentFeedback() {
  const resource = useResource(feedbackService.list("", "", "", "", 1, 5));
  return (
    <section className="panel recent-feedback">
      <div className="panel-heading">
        <div>
          <h2>Feedback mới nhất</h2>
          <p>Góp ý và báo lỗi từ người dùng</p>
        </div>
        <Link className="text-button" href="/feedback">
          Xem tất cả <ArrowUpRight size={15} />
        </Link>
      </div>
      {resource.loading || resource.error ? (
        <State
          loading={resource.loading}
          error={resource.error}
          retry={resource.reload}
        />
      ) : resource.data?.items.length ? (
        <div className="feedback-list">
          {resource.data.items.map((item) => (
            <Link
              href={`/feedback/${item.id}`}
              key={item.id}
              className="feedback-row"
            >
              <span className="feedback-icon">
                <MessageSquare size={18} />
              </span>
              <div className="feedback-copy">
                <strong>
                  {item.userName}{" "}
                  <small>· {feedbackCategories[item.category]}</small>
                </strong>
                <p>{item.body}</p>
                <small>{date(item.createdAt)}</small>
              </div>
              <FeedbackStatus status={item.status} />
            </Link>
          ))}
        </div>
      ) : (
        <State empty="Chưa có feedback từ người dùng" />
      )}
    </section>
  );
}
export function FeedbackPage({ id }: { id?: string }) {
  return id ? <FeedbackDetailPage id={id} /> : <FeedbackListPage />;
}
function FeedbackListPage() {
  const params = useSearchParams();
  const [status, setStatus] = useState(() =>
    feedbackStatuses[params.get("status") || ""] ||
    params.get("status") === "Open"
      ? params.get("status")!
      : "",
  );
  const [category, setCategory] = useState("");
  const [role, setRole] = useState("");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dates, setDates] = useState({ from: "", to: "" });
  const [range, setRange] = useState(dates);
  const resource = useResource(
    feedbackService.list(
      status,
      category,
      role,
      search,
      page,
      20,
      range.from,
      range.to,
    ),
  );
  return (
    <>
      <PageTitle
        title="Feedback người dùng"
        description="Tiếp nhận góp ý, báo lỗi và theo dõi tiến độ xử lý"
        action={
          <button className="button secondary" onClick={resource.reload}>
            <RefreshCw size={15} />
            Làm mới
          </button>
        }
      />
      <section className="panel">
        <form
          className="feedback-filters"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(draft.trim());
            setRange(dates);
            setPage(1);
          }}
        >
          <label>
            Trạng thái
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="Open">Chưa xử lý xong</option>
              {Object.entries(feedbackStatuses).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Loại feedback
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả loại</option>
              {Object.entries(feedbackCategories).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Người gửi
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả người gửi</option>
              <option value="Customer">Khách hàng</option>
              <option value="MUA">MUA</option>
            </select>
          </label>
          <label>
            Tìm kiếm
            <input
              maxLength={200}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nội dung hoặc người gửi"
            />
          </label>
          <label>
            Từ ngày
            <input
              type="date"
              value={dates.from}
              required={!!dates.to}
              max={dates.to || undefined}
              onChange={(e) => setDates({ ...dates, from: e.target.value })}
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              value={dates.to}
              required={!!dates.from}
              min={dates.from || undefined}
              onChange={(e) => setDates({ ...dates, to: e.target.value })}
            />
          </label>
          <button className="button" type="submit">
            Áp dụng
          </button>
        </form>
        {resource.loading || resource.error ? (
          <State
            loading={resource.loading}
            error={resource.error}
            retry={resource.reload}
          />
        ) : resource.data?.items.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Người gửi</th>
                    <th>Feedback</th>
                    <th>Loại</th>
                    <th>Ngày gửi ↓</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {resource.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.userName}</strong>
                        <div className="small-label">
                          {item.role === "MUA" ? "MUA" : "Khách hàng"}
                        </div>
                      </td>
                      <td>
                        <p className="feedback-excerpt">{item.body}</p>
                      </td>
                      <td>{feedbackCategories[item.category]}</td>
                      <td>{date(item.createdAt)}</td>
                      <td>
                        <FeedbackStatus status={item.status} />
                      </td>
                      <td>
                        <Link
                          className="text-button"
                          href={`/feedback/${item.id}`}
                        >
                          Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              size={20}
              count={resource.data.items.length}
              total={resource.data.total}
              onPage={setPage}
            />
          </>
        ) : (
          <State empty="Không có feedback phù hợp" />
        )}
      </section>
    </>
  );
}
function FeedbackDetailPage({ id }: { id: string }) {
  const resource = useResource(feedbackService.detail(id));
  const submission = useSubmission();
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const item = resource.data;
  async function save() {
    if (!item || !submission.begin()) return;
    setError("");
    setNotice("");
    try {
      await feedbackService.review(
        id,
        status || item.status,
        note.trim(),
        item.version,
      );
      setNote("");
      setStatus("");
      setNotice("Đã cập nhật phản hồi.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể cập nhật phản hồi.",
      );
    } finally {
      submission.end();
    }
  }
  return (
    <>
      <Link className="text-button" href="/feedback">
        <ArrowLeft size={16} />
        Danh sách feedback
      </Link>
      <PageTitle
        title="Chi tiết feedback"
        action={
          <button className="button secondary" onClick={resource.reload}>
            <RefreshCw size={15} />
            Làm mới
          </button>
        }
      />
      {notice && (
        <p className="inline-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {resource.loading || resource.error || !item ? (
        <State
          loading={resource.loading}
          error={resource.error}
          retry={resource.reload}
        />
      ) : (
        <div className="dashboard-grid">
          <section className="panel feedback-detail">
            <div className="panel-heading">
              <div>
                <h2>{item.userName}</h2>
                <p>
                  {item.role === "MUA" ? "MUA" : "Khách hàng"} ·{" "}
                  {feedbackCategories[item.category]} · {date(item.createdAt)}
                </p>
              </div>
              <FeedbackStatus status={item.status} />
            </div>
            <p className="feedback-body">{item.body}</p>
            <form
              className="feedback-review"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <label>
                Trạng thái
                <select
                  disabled={submission.busy}
                  value={status || item.status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {Object.entries(feedbackStatuses).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ghi chú nội bộ
                <textarea
                  disabled={submission.busy}
                  maxLength={1000}
                  required={(status || item.status) === "Closed"}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi lại kết quả xử lý hoặc lý do đóng feedback"
                />
              </label>
              <SubmitButton busy={submission.busy}>Lưu cập nhật</SubmitButton>
            </form>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>Lịch sử xử lý</h2>
            </div>
            {item.events.length ? (
              <div className="feedback-history">
                {item.events.map((event) => (
                  <div key={event.id}>
                    <FeedbackStatus status={event.status} />
                    <p className="feedback-body">
                      {event.note || "Cập nhật trạng thái"}
                    </p>
                    <small>
                      {event.adminName} · {date(event.createdAt)}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <State empty="Chưa có thao tác xử lý" />
            )}
          </section>
        </div>
      )}
    </>
  );
}
