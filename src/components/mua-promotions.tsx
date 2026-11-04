"use client";
import { useEffect, useState } from "react";
import { request } from "@/lib/client";

type Task = {
  id: string;
  muaId: string;
  name: string;
  state: string;
  cycleStartsAt: string;
  dueAt: string;
  draft: string;
  publishedUrl?: string;
  revisionRequest?: string;
  remedyNote?: string;
};
type Source = { title: string; imageUrls: string[] };
const date = (value: string) =>
  new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const states: Record<string, string> = {
  Preparing: "Đang chuẩn bị",
  Scheduled: "Đã lên lịch",
  Published: "Đã đăng",
  NeedsContent: "Cần bổ sung nội dung",
  RevisionRequested: "MUA yêu cầu sửa",
};
export function MuaPromotions() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluatedAt, setEvaluatedAt] = useState(0);
  async function load() {
    setLoading(true);
    try {
      setTasks(await request<Task[]>("admin/mua-promotions"));
      setEvaluatedAt(Date.now());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa tải được công việc.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function open(task: Task) {
    setSelected({ ...task });
    setSources([]);
    try {
      setSources(
        await request<Source[]>(`admin/mua-promotions/${task.id}/portfolio`),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa tải được portfolio.");
    }
  }
  async function save() {
    if (!selected || saving) return;
    setSaving(true);
    setError("");
    try {
      await request(`admin/mua-promotions/${selected.id}`, "PUT", {
        state: selected.state,
        draft: selected.draft,
        publishedUrl: selected.publishedUrl || null,
        remedyNote: selected.remedyNote || null,
      });
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa lưu được công việc.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section>
      <div className="page-title">
        <div>
          <h1>Quảng bá MUA</h1>
          <p>
            Đội BBook chủ động liên hệ MUA, biên tập và đăng bài Facebook cho
            mỗi chu kỳ 30 ngày từ portfolio được cho phép sử dụng. Nổi bật trong
            app được kích hoạt tự động, độc lập với tiến độ đăng bài.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => void load()}
          disabled={loading}
        >
          Làm mới
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>Đang tải công việc…</p>
      ) : !tasks.length ? (
        <div className="empty-state">
          Chưa có công việc quảng bá. Công việc chỉ được tạo sau khi quyền lợi
          đã cấp thành công.
        </div>
      ) : (
        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>MUA</th>
                <th>Chu kỳ bắt đầu</th>
                <th>Hạn đăng</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.name || task.muaId}</td>
                  <td>{date(task.cycleStartsAt)}</td>
                  <td>
                    {date(task.dueAt)}
                    {new Date(task.dueAt).getTime() < evaluatedAt &&
                      task.state !== "Published" && (
                        <strong> · Cần xử lý quá hạn</strong>
                      )}
                  </td>
                  <td>{states[task.state] || task.state}</td>
                  <td>
                    <button
                      className="button secondary"
                      onClick={() => void open(task)}
                    >
                      Biên tập
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div className="card" style={{ marginTop: 24, padding: 24 }}>
          <h2>{selected.name} · Bài Facebook BBook</h2>
          <p>
            Bài đăng thông thường, không gồm ngân sách chạy quảng cáo. Không cam
            kết doanh thu hoặc số booking.
          </p>
          {selected.revisionRequest && (
            <p>
              <strong>Yêu cầu sửa từ MUA:</strong> {selected.revisionRequest}
            </p>
          )}
          <label>
            Nội dung biên tập
            <textarea
              className="input"
              rows={7}
              maxLength={6000}
              value={selected.draft}
              onChange={(e) =>
                setSelected({ ...selected, draft: e.target.value })
              }
            />
          </label>
          <label>
            Trạng thái
            <select
              className="input"
              value={selected.state}
              onChange={(e) =>
                setSelected({ ...selected, state: e.target.value })
              }
            >
              {Object.entries(states).map(([key, name]) => (
                <option
                  key={key}
                  value={key}
                  disabled={key === "RevisionRequested"}
                >
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Liên kết bài Facebook đã đăng
            <input
              className="input"
              type="url"
              value={selected.publishedUrl || ""}
              placeholder="https://www.facebook.com/..."
              onChange={(e) =>
                setSelected({ ...selected, publishedUrl: e.target.value })
              }
            />
          </label>
          <label>
            Ghi nhận hỗ trợ / bù quyền lợi khi chậm hoặc thiếu
            <textarea
              className="input"
              maxLength={1000}
              value={selected.remedyNote || ""}
              onChange={(e) =>
                setSelected({ ...selected, remedyNote: e.target.value })
              }
            />
          </label>
          <p>
            Chỉ đánh dấu đã đăng sau khi kiểm tra bài thực tế. Không đăng trước
            ngày chu kỳ bắt đầu. Công việc quá hạn cần có ghi nhận cách xử lý.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="button primary"
              disabled={saving || selected.state === "RevisionRequested"}
              onClick={() => void save()}
            >
              {saving ? "Đang lưu…" : "Lưu công việc"}
            </button>
            <button
              className="button secondary"
              disabled={saving}
              onClick={() => setSelected(null)}
            >
              Đóng
            </button>
          </div>
          <h3 style={{ marginTop: 24 }}>Nguồn từ portfolio hiện tại</h3>
          {sources.map((source, i) => (
            <div key={i}>
              <p>{source.title}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {source.imageUrls.map((url) => (
                  <a href={url} target="_blank" rel="noreferrer" key={url}>
                    <img
                      src={url}
                      alt={source.title || "Ảnh portfolio MUA"}
                      width={100}
                      height={100}
                      style={{ objectFit: "cover", borderRadius: 8 }}
                    />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
