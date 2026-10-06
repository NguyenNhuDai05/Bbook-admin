"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Info,
  MapPin,
  MessageSquare,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useResource, useSubmission } from "@/lib/client";
import { adminService as service } from "@/services/admin-service";
import { date, experience, money, shortId } from "@/lib/format";
import type { PageProps } from "./admin-app";
import {
  Badge,
  DocumentView,
  Modal,
  PageTitle,
  State,
  SubmitButton,
} from "./ui";
const checklist = [
  "CCCD hiển thị rõ ràng",
  "Có đầy đủ mặt trước và mặt sau",
  "Thông tin giấy tờ có thể đọc được",
  "Ảnh khuôn mặt đủ rõ",
  "Khuôn mặt có vẻ tương đồng với ảnh CCCD",
  "Không phát hiện dấu hiệu bất thường rõ ràng",
];
const reasons = [
  ["IDENTITY_INVALID", "Giấy tờ không hợp lệ hoặc không rõ"],
  ["PORTRAIT_MISMATCH", "Ảnh khuôn mặt không phù hợp"],
  ["PERSONAL_INFO_INVALID", "Thông tin cá nhân không khớp"],
  ["SERVICE_INVALID", "Dịch vụ chưa đạt yêu cầu"],
  ["PORTFOLIO_INSUFFICIENT", "Portfolio cần bổ sung"],
  ["OTHER", "Lý do khác"],
];
export function VerificationDetail({ base, id }: PageProps & { id: string }) {
  const resource = useResource(service.mua(id));
  const [tab, setTab] = useState("identity"),
    [checked, setChecked] = useState<string[]>([]),
    [note, setNote] = useState(""),
    [decision, setDecision] = useState<
      "approve" | "reject" | "supplement" | null
    >(null),
    [reason, setReason] = useState(""),
    [codes, setCodes] = useState<string[]>([]),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  useEffect(() => {
    setChecked([]);
  }, [resource.data]);
  const submission = useSubmission();
  const { busy } = submission;
  const [suspending, setSuspending] = useState(false);
  const [suspendValue, setSuspendValue] = useState(false);
  if (resource.loading || resource.error || !resource.data)
    return (
      <>
        <Link href={`${base}/verification`} className="text-button">
          <ArrowLeft size={16} />
          Quay lại danh sách
        </Link>
        <State
          loading={resource.loading}
          error={
            resource.error || (!resource.loading ? "Không tìm thấy hồ sơ." : "")
          }
          retry={resource.reload}
        />
      </>
    );
  const { profile, verificationDocuments: docs, eligibility } = resource.data;
  const pending = eligibility.verificationStatus === "PendingReview";
  const ready =
    checked.length === checklist.length &&
    eligibility.requirements.length > 0 &&
    eligibility.requirements.every((x) => x.isMet) &&
    !!docs.identityFrontUrl &&
    !!docs.identityBackUrl &&
    !!docs.portraitUrl;
  async function review() {
    if (
      !pending ||
      decision === "supplement" ||
      (decision === "approve" && !ready) ||
      (decision === "reject" && (!codes.length || reason.trim().length < 5))
    )
      return;
    if (!submission.begin()) return;
    setError("");
    try {
      if (decision === "approve") await service.approveMua(id);
      else if (decision === "reject")
        await service.rejectMua(id, {
          reason: reason.trim(),
          reasonCodes: codes,
          items: codes.map((code) => ({
            section: "application",
            field: code,
            message: reason.trim(),
          })),
        });
      else throw new Error("Chức năng yêu cầu bổ sung chưa có API hỗ trợ.");
      setDecision(null);
      setChecked([]);
      setNote("");
      setSuccess(
        decision === "approve"
          ? "Đã duyệt toàn bộ hồ sơ MUA."
          : "Đã từ chối hồ sơ và gửi ghi chú cho MUA.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật.");
    } finally {
      submission.end();
    }
  }
  async function suspension() {
    if (!submission.begin()) return;
    setError("");
    try {
      await service.suspendMua(id, suspendValue);
      setSuspending(false);
      setSuccess(suspendValue ? "Đã đình chỉ MUA." : "Đã bỏ đình chỉ MUA.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật.");
    } finally {
      submission.end();
    }
  }
  function openDecision(value: "approve" | "reject" | "supplement") {
    setError("");
    setSuccess("");
    setCodes([]);
    setDecision(value);
    setReason(note);
  }
  return (
    <>
      <Link className="text-button back-link" href={`${base}/verification`}>
        <ArrowLeft size={16} />
        Quay lại danh sách
      </Link>
      <PageTitle
        title={`Xác minh MUA / ${profile.fullName || "MUA"}`}
        description={`MUA-${shortId(id)} · Ngày gửi: ${date(eligibility.submittedAt)}`}
        action={<Badge status={eligibility.verificationStatus} />}
      />
      {success && (
        <div className="notice success" role="status">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}
      <section className="panel verification-panel">
        <div className="tabs">
          {[
            ["general", "Thông tin"],
            ["identity", "CCCD & Khuôn mặt"],
            ["services", "Dịch vụ"],
            ["portfolio", "Portfolio"],
            ["history", "Lịch sử"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={tab === value ? "selected" : ""}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "identity" && (
          <>
            <div className="sensitive-banner">
              <ShieldCheck size={16} />
              Thông tin nhạy cảm — chỉ sử dụng cho mục đích xét duyệt danh tính.
            </div>
            <div className="comparison-workspace">
              <section className="document-column">
                <div className="section-heading">
                  <FileText size={18} />
                  <h2>Giấy tờ tùy thân</h2>
                </div>
                <p className="section-description">
                  Kiểm tra ảnh gốc, đầy đủ bốn góc và thông tin rõ ràng.
                </p>
                <DocumentView
                  url={docs.identityFrontUrl}
                  label="CCCD mặt trước"
                />
                <DocumentView url={docs.identityBackUrl} label="CCCD mặt sau" />
                <div className="document-information">
                  <h3>Thông tin đối chiếu</h3>
                  <dl>
                    <div>
                      <dt>Họ tên trên tài khoản</dt>
                      <dd>{profile.fullName}</dd>
                    </div>
                    <div>
                      <dt>Ngày sinh trên CCCD</dt>
                      <dd>Đối chiếu trực tiếp từ ảnh</dd>
                    </div>
                    <div>
                      <dt>Số CCCD</dt>
                      <dd>Chưa có dữ liệu trích xuất</dd>
                    </div>
                  </dl>
                  <p className="helper">
                    Hệ thống chưa OCR giấy tờ. Không tự suy đoán thông tin từ
                    tài khoản.
                  </p>
                </div>
              </section>
              <section className="face-column">
                <div className="section-heading">
                  <Eye size={18} />
                  <h2>Đối chiếu khuôn mặt</h2>
                </div>
                <p className="section-description">
                  Đối chiếu thủ công bởi Admin
                </p>
                <div className="face-comparison">
                  <DocumentView
                    url={docs.identityFrontUrl}
                    label="Ảnh trên CCCD (mặt trước)"
                  />
                  <DocumentView url={docs.portraitUrl} label="Ảnh khuôn mặt" />
                </div>
                <p className="helper">
                  Dùng phóng to để xem chân dung trên CCCD. Chưa có tính năng
                  trích xuất hoặc tự động so khớp khuôn mặt.
                </p>
                <div className="review-checklist">
                  <div className="review-checklist-title">
                    <h3>Checklist đối chiếu</h3>
                    <span>
                      {checked.length}/{checklist.length}
                    </span>
                  </div>
                  {checklist.map((item) => (
                    <label key={item}>
                      <input
                        type="checkbox"
                        checked={checked.includes(item)}
                        onChange={(e) =>
                          setChecked((current) =>
                            e.target.checked
                              ? [...current, item]
                              : current.filter((x) => x !== item),
                          )
                        }
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                  <p className="helper">
                    Checklist hỗ trợ quyết định của người kiểm duyệt, không phải
                    kết quả xác thực sinh trắc học tự động.
                  </p>
                </div>
              </section>
            </div>
          </>
        )}
        {tab === "general" && (
          <div className="general-grid">
            <section>
              <div className="profile-hero">
                <div className="avatar large-avatar">
                  {profile.avatarUrl ? (
                    <img
                      className="avatar large-avatar"
                      src={profile.avatarUrl}
                      alt={profile.fullName || "Avatar MUA"}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    profile.fullName?.slice(0, 1)
                  )}
                </div>
                <div>
                  <h2>{profile.fullName}</h2>
                  <p>
                    <MapPin size={14} />
                    {[profile.district, profile.city]
                      .filter(Boolean)
                      .join(", ") || "Chưa cập nhật"}
                  </p>
                </div>
              </div>
              <dl className="profile-facts">
                {[
                  ["Tên hiển thị", profile.fullName],
                  ["Email", profile.email],
                  ["Số điện thoại", profile.phoneNumber || "Chưa cung cấp"],
                  [
                    "Kinh nghiệm",
                    experience(
                      profile.experienceLevel,
                      profile.experienceYears,
                    ),
                  ],
                  [
                    "Khu vực hoạt động",
                    [profile.district, profile.city].filter(Boolean).join(", "),
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "—"}</dd>
                  </div>
                ))}
              </dl>
              <h3>Giới thiệu</h3>
              <p className="bio-text">
                {profile.bio || "Chưa có phần giới thiệu."}
              </p>
              <h3>Phong cách makeup</h3>
              <div className="chip-list">
                {profile.styles?.map((style) => (
                  <span className="chip" key={style}>
                    {style}
                  </span>
                ))}
              </div>
            </section>
            <aside className="profile-checklist">
              <h3>Hoàn thiện hồ sơ</h3>
              {eligibility.requirements.map((item) => (
                <div key={item.key}>
                  <CheckCircle2
                    size={17}
                    className={item.isMet ? "text-success" : "muted"}
                  />
                  <span>{item.label}</span>
                </div>
              ))}
              <p className="helper">
                Có đủ ảnh xác minh không đồng nghĩa với danh tính đã được admin
                duyệt. Ngân hàng được xử lý trong module riêng.
              </p>
              <Link href={`${base}/bank-accounts`} className="text-button">
                Tài khoản nhận tiền →
              </Link>
              <hr />
              <h3>Trạng thái hoạt động</h3>
              <Badge status={eligibility.profileStatus} />
              <p className="helper">
                {eligibility.canReceiveBookings
                  ? "Backend cho phép nhận booking."
                  : "Backend chưa cho phép nhận booking."}
              </p>
              <button
                className="button secondary"
                onClick={() => {
                  setSuspendValue(
                    String(eligibility.profileStatus).toUpperCase() !==
                      "SUSPENDED",
                  );
                  setError("");
                  setSuspending(true);
                }}
              >
                {String(eligibility.profileStatus).toUpperCase() === "SUSPENDED"
                  ? "Bỏ đình chỉ"
                  : "Đình chỉ MUA"}
              </button>
            </aside>
          </div>
        )}
        {tab === "services" && (
          <div className="tab-content">
            <h2>Dịch vụ & bảng giá</h2>
            {profile.services?.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Dịch vụ</th>
                      <th>Giá</th>
                      <th>Thời gian thực hiện</th>
                      <th>Hiển thị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.services.map((item) => (
                      <tr key={item.serviceId}>
                        <td>
                          <strong>{item.serviceName}</strong>
                          {item.description && (
                            <p className="helper">{item.description}</p>
                          )}
                          {!!item.imageUrls?.length && (
                            <div className="portfolio-grid">
                              {item.imageUrls.map((url, index) => (
                                <DocumentView
                                  key={index}
                                  url={url}
                                  label={`Ảnh dịch vụ ${index + 1}`}
                                />
                              ))}
                            </div>
                          )}
                        </td>
                        <td>{money(item.price)}</td>
                        <td>{item.durationMinutes} phút</td>
                        <td>{item.isActive ? "Đang hiển thị" : "Đã ẩn"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <State empty="Chưa có dịch vụ" />
            )}
          </div>
        )}
        {tab === "portfolio" && (
          <div className="tab-content">
            <h2>Portfolio</h2>
            <div className="portfolio-grid">
              {profile.portfolio?.flatMap((item) =>
                item.imageUrls.map((url, index) => (
                  <DocumentView
                    key={`${item.portfolioId}-${index}`}
                    url={url}
                    label={item.title || `Ảnh ${index + 1}`}
                  />
                )),
              )}
            </div>
            {!profile.portfolio?.length && <State empty="Chưa có portfolio" />}
          </div>
        )}
        {tab === "history" && (
          <div className="tab-content">
            <h2>Lịch sử xét duyệt</h2>
            <div className="timeline">
              <div>
                <Clock3 size={18} />
                <div>
                  <strong>Gửi hồ sơ xét duyệt</strong>
                  <p>{date(eligibility.submittedAt)}</p>
                </div>
              </div>
              {eligibility.reviewedAt && (
                <div>
                  <ShieldCheck size={18} />
                  <div>
                    <strong>
                      Kết quả gần nhất:{" "}
                      <Badge status={eligibility.verificationStatus} />
                    </strong>
                    <p>{date(eligibility.reviewedAt)}</p>
                    {eligibility.rejectionReason && (
                      <p>{eligibility.rejectionReason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
      {pending && (
        <>
          <section className="panel internal-notes">
            <label>
              <MessageSquare size={16} />
              Ghi chú đối chiếu
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                placeholder="Ghi nhận điểm cần kiểm tra hoặc nội dung cần MUA điều chỉnh…"
              />
            </label>
            <p className="helper">
              Ghi chú hiện chỉ giữ trong màn hình; khi từ chối, bạn có thể dùng
              làm nội dung gửi MUA. Backend chưa lưu ghi chú nội bộ riêng.
            </p>
          </section>
          <div className="decision-bar">
            <div>
              <Info size={16} />
              <span>
                {ready
                  ? "Đã hoàn thành checklist đối chiếu"
                  : "Hoàn thành checklist trước khi duyệt"}
              </span>
            </div>
            <div className="decision-buttons">
              <button
                className="button danger-outline"
                disabled={busy}
                onClick={() => openDecision("reject")}
              >
                <XCircle size={16} />
                Từ chối
              </button>
              <button
                className="button secondary"
                disabled
                title="Backend chưa hỗ trợ yêu cầu bổ sung riêng"
                onClick={() => openDecision("supplement")}
              >
                Yêu cầu bổ sung
              </button>
              <button
                className="button primary"
                disabled={!ready || busy}
                onClick={() => openDecision("approve")}
              >
                <ShieldCheck size={16} />
                Duyệt hồ sơ MUA
              </button>
            </div>
          </div>
          <p className="helper decision-helper">
            BE hiện duyệt toàn bộ hồ sơ MUA. Trạng thái xác minh danh tính độc
            lập chưa được hỗ trợ.
          </p>
        </>
      )}
      {decision && (
        <Modal
          title={
            decision === "approve"
              ? "Xác nhận duyệt hồ sơ MUA"
              : decision === "supplement"
                ? "Yêu cầu bổ sung"
                : "Từ chối hồ sơ MUA"
          }
          description={
            decision === "approve"
              ? `Bạn đã đối chiếu giấy tờ và khuôn mặt của ${profile.fullName}.`
              : "Chọn nội dung cần điều chỉnh và giải thích rõ cho MUA."
          }
          onClose={() => {
            if (!busy) setDecision(null);
          }}
          footer={
            <>
              <button
                className="button secondary"
                onClick={() => setDecision(null)}
                disabled={busy}
              >
                Hủy
              </button>
              <SubmitButton
                busy={busy}
                disabled={
                  decision === "supplement" ||
                  (decision === "approve" && !ready) ||
                  (decision === "reject" &&
                    (!codes.length || reason.trim().length < 5))
                }
                onClick={review}
              >
                {decision === "approve"
                  ? "Xác nhận duyệt hồ sơ"
                  : decision === "supplement"
                    ? "Gửi yêu cầu"
                    : "Xác nhận từ chối"}
              </SubmitButton>
            </>
          }
        >
          {decision === "approve" ? (
            <p>
              Duyệt hồ sơ sẽ kích hoạt MUA đủ điều kiện và mở lịch mặc định
              08:00–22:00 cho các ngày chưa có lịch.
            </p>
          ) : (
            <>
              <div className="checkbox-grid">
                {(decision === "supplement"
                  ? [
                      ["IDENTITY_FRONT", "CCCD mặt trước"],
                      ["IDENTITY_BACK", "CCCD mặt sau"],
                      ["PORTRAIT", "Ảnh khuôn mặt"],
                      ["PERSONAL_INFO", "Thông tin cá nhân"],
                    ]
                  : reasons
                ).map(([code, label]) => (
                  <label key={code}>
                    <input
                      type="checkbox"
                      checked={codes.includes(code)}
                      onChange={(e) =>
                        setCodes((current) =>
                          e.target.checked
                            ? [...current, code]
                            : current.filter((x) => x !== code),
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <label className="form-field">
                Nội dung gửi MUA
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={1000}
                  placeholder="Mô tả cụ thể cần sửa điều gì…"
                />
              </label>
              {decision === "supplement" && (
                <div className="notice warning">
                  Chưa có API và trạng thái “Cần bổ sung” riêng. Bạn có thể dùng
                  “Từ chối” kèm ghi chú để MUA sửa và gửi lại; nút gửi yêu cầu
                  riêng chưa khả dụng.
                </div>
              )}
            </>
          )}
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
      {suspending && (
        <Modal
          title={
            suspendValue
              ? "Đình chỉ Makeup Artist?"
              : "Bỏ đình chỉ Makeup Artist?"
          }
          description={profile.fullName || undefined}
          onClose={() => {
            if (!busy) setSuspending(false);
          }}
          footer={
            <>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setSuspending(false)}
              >
                Hủy
              </button>
              <SubmitButton busy={busy} onClick={suspension}>
                Xác nhận
              </SubmitButton>
            </>
          }
        >
          <p>
            {suspendValue
              ? "MUA sẽ bị chặn nhận booking theo quy tắc backend."
              : "MUA chỉ được nhận booking nếu đáp ứng các điều kiện backend."}
          </p>
          <p className="helper">API hiện chưa hỗ trợ lưu lý do đình chỉ.</p>
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
