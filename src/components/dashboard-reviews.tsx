"use client";
import { useState } from "react";
import { Star, Image as ImageIcon } from "lucide-react";
import { useResource } from "@/lib/client";
import { adminService } from "@/services/admin-service";
import type { DashboardData } from "@/lib/dashboard";
import { money, shortId, statusLabels } from "@/lib/format";
import { Modal, Pagination, DocumentView, State } from "./ui";
import s from "./dashboard.module.css";

const timestamp = (date: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
function ReviewDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const resource = useResource(adminService.dashboardReview(id));
  const review = resource.data;
  return (
    <Modal title="Chi tiết đánh giá dịch vụ" onClose={onClose} wide>
      {!review ? (
        <State
          loading={resource.loading}
          error={resource.error}
          retry={resource.error ? resource.reload : undefined}
        />
      ) : (
        <div className={s.reviewDetail}>
          <div className={s.rating}>
            {review.rating} / 5 <Star size={16} />
            <span>{timestamp(review.createdAt)}</span>
          </div>
          <p className={s.reviewContent}>
            {review.comment || "Đánh giá không kèm nhận xét"}
          </p>
          <dl>
            <dt>Khách hàng</dt>
            <dd>{review.customerName || "Khách hàng"}</dd>
            <dt>Makeup Artist</dt>
            <dd>
              {review.muaName || "Makeup Artist"}
              <small>ID: {review.muaId}</small>
            </dd>
            <dt>Booking</dt>
            <dd>#{review.bookingId}</dd>
            <dt>Lịch hẹn</dt>
            <dd>
              {new Intl.DateTimeFormat("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                dateStyle: "short",
              }).format(new Date(review.booking.bookingDate))}{" "}
              · Giờ bắt đầu: {review.booking.startTime.slice(0, 5)}
            </dd>
            <dt>Trạng thái</dt>
            <dd>
              {statusLabels[review.booking.status] || review.booking.status}
            </dd>
            <dt>Giá trị booking</dt>
            <dd>{money(review.booking.totalAmount)}</dd>
            <dt>Dịch vụ</dt>
            <dd>
              {review.booking.services.length
                ? review.booking.services.map((x, i) => (
                    <div key={i}>
                      {x.serviceName} · {x.participantsCount} người
                    </div>
                  ))
                : "Không có snapshot dịch vụ"}
            </dd>
          </dl>
          {review.imageUrl ? (
            <DocumentView
              url={review.imageUrl}
              label="Ảnh đính kèm đánh giá"
              description="Ảnh do khách hàng đính kèm trong đánh giá dịch vụ."
            />
          ) : (
            <p className={s.emptyImage}>Đánh giá không kèm ảnh.</p>
          )}
          {review.muaReply && (
            <div className={s.reply}>
              <h3>Phản hồi của Makeup Artist</h3>
              <p className={s.reviewContent}>{review.muaReply}</p>
              {review.muaReplyAt && (
                <small>{timestamp(review.muaReplyAt)}</small>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
export function ServiceReviews({
  data,
  from,
  to,
}: {
  data: DashboardData;
  from: string;
  to: string;
}) {
  const reviews = data.serviceReviews;
  const [rating, setRating] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const resource = useResource(
    adminService.dashboardReviews(from, to, rating, page),
  );
  const chooseRating = (value: number) => {
    setRating(value === rating ? 0 : value);
    setPage(1);
  };
  return (
    <section className={s.card}>
      <div className={s.heading}>
        <div>
          <h2>Đánh giá dịch vụ</h2>
          <p>Customer đánh giá MUA sau booking · Đánh giá được tạo trong kỳ</p>
        </div>
        <Star size={18} />
      </div>
      <div className={s.reviewSummary}>
        <div>
          <strong>
            {reviews.averageRating === null
              ? "—"
              : reviews.averageRating.toLocaleString("vi-VN", {
                  maximumFractionDigits: 1,
                })}
            <small> / 5</small>
          </strong>
          <span>{reviews.total.toLocaleString("vi-VN")} lượt đánh giá</span>
        </div>
        <div className={s.lowRating}>
          <b>{reviews.lowRatingCount}</b>
          <span>Đánh giá thấp ≤ 2 sao</span>
        </div>
      </div>
      <div className={s.ratingDistribution}>
        {reviews.distribution.map((x) => (
          <button
            type="button"
            key={x.rating}
            aria-pressed={rating === x.rating}
            onClick={() => chooseRating(x.rating)}
            aria-label={`Lọc ${x.rating} sao: ${x.count} đánh giá`}
          >
            <span>
              {x.rating} <Star size={12} aria-hidden="true" />
            </span>
            <progress
              max={Math.max(1, reviews.total)}
              value={x.count}
              aria-hidden="true"
            />
            <b>{x.count}</b>
          </button>
        ))}
      </div>
      <div className={s.recentHeading}>
        <span>Đánh giá gần đây{rating ? ` · ${rating} sao` : ""}</span>
        {rating > 0 && (
          <button className="text-button" onClick={() => chooseRating(0)}>
            Tất cả
          </button>
        )}
      </div>
      <div
        className={s.recentReviews}
        key={`${from}:${to}:${rating}:${page}`}
        role="region"
        aria-label="Danh sách đánh giá gần đây"
        tabIndex={0}
      >
        {resource.loading || resource.error ? (
          <State
            loading={resource.loading}
            error={resource.error}
            retry={resource.error ? resource.reload : undefined}
          />
        ) : resource.data?.items.length ? (
          resource.data.items.map((x) => (
            <button
              type="button"
              key={x.reviewId}
              className={s.reviewRow}
              onClick={() => setSelected(x.reviewId)}
              aria-label={`Xem đánh giá ${x.rating} sao, booking ${shortId(x.bookingId)}`}
            >
              <span className={s.reviewRowHeading}>
                <b>{x.customerName || "Khách hàng"}</b>
                <span className={s.rating}>
                  {x.rating} <Star size={12} />
                </span>
              </span>
              <p>{x.comment || "Đánh giá không kèm nhận xét"}</p>
              <small>
                {x.muaName || "Makeup Artist"} · {timestamp(x.createdAt)}
              </small>
              <span className={s.bookingLink}>
                Booking #{shortId(x.bookingId)}
                {x.hasImage && (
                  <>
                    <ImageIcon size={12} /> Có ảnh
                  </>
                )}
              </span>
            </button>
          ))
        ) : (
          <p className={s.reviewEmpty}>
            Không có đánh giá{rating ? ` ${rating} sao` : ""} trong khoảng ngày
            này.
          </p>
        )}
      </div>
      {resource.data && (
        <Pagination
          page={page}
          size={20}
          count={resource.data.items.length}
          total={resource.data.total}
          onPage={setPage}
        />
      )}
      <div className={s.coverage}>
        <span>Booking hoàn thành trong kỳ có đánh giá</span>
        <b>
          {reviews.eligibleCompletedBookings
            ? `${((reviews.reviewedCompletedBookings / reviews.eligibleCompletedBookings) * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`
            : "—"}
        </b>
        <small>
          {reviews.reviewedCompletedBookings} /{" "}
          {reviews.eligibleCompletedBookings} booking · Tính theo ngày hoàn
          thành; đánh giá có thể được gửi sau kỳ
        </small>
      </div>
      {selected && (
        <ReviewDetail
          key={selected}
          id={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
