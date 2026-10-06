"use client";
import Link from "next/link";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useResource, useSubmission } from "@/lib/client";
import {
  moderationService as service,
  reportStatuses,
  reportTargets,
  reportReasons,
} from "@/services/moderation-service";
import { date, shortId } from "@/lib/format";
import { DocumentView, Modal, PageTitle, Pagination, State } from "./ui";
import type { PageProps } from "./admin-app";

export function Moderation({ base, id }: PageProps & { id?: string }) {
  return id ? (
    <ReportDetailPage key={id} base={base} id={id} />
  ) : (
    <ReportList base={base} />
  );
}
function ReportList({ base }: PageProps) {
  const [status, setStatus] = useState("Pending");
  const [page, setPage] = useState(1);
  const query = useResource(service.list(status, page));
  return (
    <>
      <PageTitle
        title="Báo cáo nội dung"
        description="Xem xét báo cáo người dùng, portfolio, bình luận, đánh giá và tin nhắn"
        action={
          <button className="button secondary" onClick={query.reload}>
            <RefreshCw size={16} />
            Làm mới
          </button>
        }
      />
      <section className="panel list-panel">
        <div className="filters moderation-toolbar">
          <label>
            Trạng thái
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả</option>
              {Object.entries(reportStatuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <span>
            {query.loading
              ? "Đang tải…"
              : query.error
                ? "—"
                : (query.data?.total ?? "—")}{" "}
            báo cáo
          </span>
        </div>
        {query.loading || query.error || !query.data?.items.length ? (
          <State
            loading={query.loading}
            error={query.error}
            retry={query.error ? query.reload : undefined}
            empty="Chưa có báo cáo"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Báo cáo</th>
                  <th>Loại nội dung</th>
                  <th>Lý do</th>
                  <th>Trạng thái</th>
                  <th>Ngày gửi</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>BC-{shortId(item.id)}</td>
                    <td>{reportTargets[item.targetType] ?? item.targetType}</td>
                    <td>{reportReasons[item.reason] ?? item.reason}</td>
                    <td>{reportStatuses[item.status] ?? item.status}</td>
                    <td>{date(item.createdAt)}</td>
                    <td>
                      <Link
                        className="button table-button"
                        href={`${base}/moderation/${item.id}`}
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          size={20}
          count={query.data?.items.length ?? 0}
          total={query.data?.total}
          onPage={setPage}
          server
        />
      </section>
    </>
  );
}
function ReportDetailPage({ base, id }: PageProps & { id: string }) {
  const query = useResource(service.detail(id));
  const submission = useSubmission();
  const [action, setAction] = useState("Dismissed");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [privateImage, setPrivateImage] = useState<string | null>(null);
  const report = query.data;
  async function loadImage() {
    if (!submission.begin()) return;
    try {
      setPrivateImage((await service.image(id)).url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải ảnh.");
    } finally {
      submission.end();
    }
  }
  async function submit() {
    if (!note.trim() || !submission.begin()) return;
    setError("");
    try {
      await service.decide(id, action, note.trim());
      setConfirm(false);
      setNotice("Đã lưu quyết định xử lý báo cáo.");
      query.reload();
    } catch (err) {
      setConfirm(false);
      setError(
        err instanceof Error ? err.message : "Không thể lưu quyết định.",
      );
    } finally {
      submission.end();
    }
  }
  if (query.loading || query.error || !report)
    return (
      <State loading={query.loading} error={query.error} retry={query.reload} />
    );
  return (
    <>
      <Link className="text-button" href={`${base}/moderation`}>
        ← Danh sách báo cáo
      </Link>
      <PageTitle
        title={`Báo cáo BC-${shortId(report.id)}`}
        description={`${reportTargets[report.targetType]} • ${date(report.createdAt)}`}
      />
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice success" role="status">
          {notice}
        </div>
      )}
      <div className="complaint-grid">
        <section className="panel complaint-panel">
          <h2>Thông tin báo cáo</h2>
          <dl className="complaint-facts">
            <dt>Trạng thái</dt>
            <dd>{reportStatuses[report.status]}</dd>
            <dt>Lý do</dt>
            <dd>{reportReasons[report.reason]}</dd>
            <dt>Mã nội dung</dt>
            <dd>{report.targetId}</dd>
          </dl>
          <p className="complaint-body">
            {report.description || "Không có mô tả bổ sung."}
          </p>
          <h2>Nội dung được báo cáo</h2>
          {report.targetOwnerId && (
            <Link
              className="button secondary"
              href={`${base}/users?search=${encodeURIComponent(report.targetOwnerId)}`}
            >
              Xem tài khoản bị báo cáo
            </Link>
          )}
          {report.imageUrls?.map((url, index) => (
            <DocumentView
              key={url}
              url={url}
              label={"Ảnh nội dung " + (index + 1)}
            />
          ))}
          {report.hasPrivateImage && (
            <>
              <button
                className="button secondary"
                disabled={submission.busy}
                onClick={loadImage}
              >
                Xem / Làm mới ảnh tin nhắn được báo cáo
              </button>
              {privateImage && (
                <DocumentView
                  url={privateImage}
                  label="Ảnh tin nhắn được báo cáo"
                />
              )}
            </>
          )}
          <p className="complaint-body">
            {report.contentAvailable
              ? report.content || "(Không có văn bản)"
              : "Nội dung không còn khả dụng."}
          </p>
          <p className="muted">
            Chỉ hiển thị nội dung của đối tượng bị báo cáo, không tải toàn bộ
            cuộc trò chuyện.
          </p>
        </section>
        <section className="panel complaint-panel">
          <h2>Quyết định kiểm duyệt</h2>
          {report.status === "Pending" ? (
            <>
              <label>
                Thao tác
                <select
                  value={action}
                  disabled={submission.busy}
                  onChange={(event) => setAction(event.target.value)}
                >
                  <option value="Dismissed">Không xác định vi phạm</option>
                  <option value="Reviewed">Đã xem xét</option>
                  {report.canRemove && (
                    <option value="Removed">Ẩn nội dung vi phạm</option>
                  )}
                </select>
              </label>
              <label>
                Căn cứ xử lý
                <textarea
                  maxLength={1000}
                  disabled={submission.busy}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              <p className="muted">
                Kiểm duyệt không thay đổi booking, hoàn tiền, khoản chi trả hoặc
                quyền truy cập tài khoản.
              </p>
              <button
                className="button primary"
                disabled={submission.busy || !note.trim()}
                onClick={() => setConfirm(true)}
              >
                Lưu quyết định
              </button>
            </>
          ) : (
            <>
              <p>
                {reportStatuses[report.status]} • {date(report.reviewedAt)}
              </p>
              <p className="complaint-body">{report.decisionNote}</p>
            </>
          )}
        </section>
      </div>
      {confirm && (
        <Modal
          title="Xác nhận xử lý báo cáo"
          onClose={() => {
            if (!submission.busy) setConfirm(false);
          }}
        >
          <p>{reportStatuses[action]}</p>
          <p className="complaint-body">{note}</p>
          <div className="complaint-toolbar">
            <button
              className="button secondary"
              disabled={submission.busy}
              onClick={() => setConfirm(false)}
            >
              Quay lại
            </button>
            <button
              className="button primary"
              disabled={submission.busy}
              onClick={submit}
            >
              {submission.busy ? "Đang lưu…" : "Xác nhận"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
