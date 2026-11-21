"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  MessageSquareText,
  RefreshCw,
  Star,
} from "lucide-react";
import { useResource, invalidateResources } from "@/lib/client";
import { adminService } from "@/services/admin-service";
import { money, shortId } from "@/lib/format";
import { bookingLabels } from "@/lib/dashboard-presentation.mjs";
import { reviewFilters, reviewHref } from "@/lib/reporting-range.mjs";
import type { DashboardReviewDetail } from "@/lib/dashboard";
import { ReportRangeFilter, RangeCaption } from "./report-range";
import { DocumentView, Modal, Pagination, State } from "./ui";
import s from "./reporting.module.css";

const timestamp = (value: string, time = true) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    ...(time ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
function Stars({ rating }: { rating: number }) {
  return (
    <span className={s.stars} aria-label={`${rating} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          aria-hidden="true"
          className={n <= rating ? s.starFilled : s.starEmpty}
        />
      ))}
    </span>
  );
}
export function ReviewDetails({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const resource = useResource(adminService.dashboardReview(id));
  const review = resource.data;
  return (
    <Modal
      title="Chi tiết đánh giá"
      description="Nhận xét của khách hàng sau khi sử dụng dịch vụ"
      onClose={onClose}
      wide
      className={s.reviewModal}
    >
      {!review || resource.error ? (
        <State
          loading={resource.loading}
          error={resource.error}
          retry={resource.error ? resource.reload : undefined}
        />
      ) : (
        <ReviewContent review={review} />
      )}
    </Modal>
  );
}
function ReviewContent({ review }: { review: DashboardReviewDetail }) {
  return (
    <div className={s.detailGrid}>
      <div className={s.detailMain}>
        <section className={s.detailSection}>
          <div className={s.detailRating}>
            <div>
              <strong>
                {review.rating}
                <small> / 5</small>
              </strong>
              <Stars rating={review.rating} />
            </div>
            <time dateTime={review.createdAt}>
              {timestamp(review.createdAt)}
            </time>
          </div>
          <div className={s.reviewPeople}>
            <div>
              <span>Khách hàng</span>
              <b>{review.customerName || "Khách hàng"}</b>
            </div>
            <div>
              <span>Makeup Artist</span>
              <b>{review.muaName || "Makeup Artist"}</b>
            </div>
          </div>
          <h3>Nhận xét của khách hàng</h3>
          <p className={s.comment}>
            {review.comment || "Khách hàng không để lại nhận xét."}
          </p>
        </section>
        {review.imageUrl && (
          <section className={s.detailSection}>
            <h3>Ảnh đính kèm</h3>
            <DocumentView
              url={review.imageUrl}
              label="Ảnh đính kèm đánh giá"
              description="Ảnh do khách hàng đính kèm khi đánh giá dịch vụ."
            />
          </section>
        )}
        <section className={s.detailSection}>
          <h3>Phản hồi từ Makeup Artist</h3>
          {review.muaReply ? (
            <>
              <p className={s.comment}>{review.muaReply}</p>
              {review.muaReplyAt && (
                <time className={s.meta} dateTime={review.muaReplyAt}>
                  {timestamp(review.muaReplyAt)}
                </time>
              )}
            </>
          ) : (
            <p className={s.emptyReply}>Chưa có phản hồi cho đánh giá này.</p>
          )}
        </section>
      </div>
      <aside className={s.bookingAside}>
        <h3>Booking liên quan</h3>
        <Link href={`/bookings/${review.bookingId}`} className={s.bookingCode}>
          #{shortId(review.bookingId)}
          <ChevronRight size={15} />
        </Link>
        <dl>
          <dt>Lịch hẹn</dt>
          <dd>
            {timestamp(review.booking.bookingDate, false)} ·{" "}
            {review.booking.startTime.slice(0, 5)}
          </dd>
          <dt>Trạng thái</dt>
          <dd>
            {bookingLabels[
              review.booking.status as keyof typeof bookingLabels
            ] || review.booking.status}
          </dd>
          <dt>Giá trị booking</dt>
          <dd className={s.amount}>{money(review.booking.totalAmount)}</dd>
          <dt>Dịch vụ</dt>
          <dd>
            {review.booking.services.length
              ? review.booking.services.map((service, i) => (
                  <div className={s.serviceItem} key={i}>
                    <b>{service.serviceName}</b>
                    <span>{service.participantsCount} người</span>
                  </div>
                ))
              : "Chưa có thông tin dịch vụ"}
          </dd>
        </dl>
        <div className={s.detailId}>
          <span>Mã đánh giá</span>
          <code>{review.reviewId}</code>
        </div>
      </aside>
    </div>
  );
}
export function ReviewsPage({ id }: { id?: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const filters = reviewFilters(params);
  const { range, rating, page } = filters;
  const summary = useResource(adminService.dashboard(range.from, range.to), {
    retainData: true,
  });
  const reviews = useResource(
    adminService.dashboardReviews(range.from, range.to, rating, page),
    { retainData: true },
  );
  const stats = summary.data?.serviceReviews;
  const change = (patch: Partial<typeof filters>) =>
    router.replace(reviewHref({ ...filters, ...patch }), { scroll: false });
  return (
    <div className={s.page}>
      <header className={s.pageHeader}>
        <div>
          <div className={s.eyebrow}>QUẢN LÝ</div>
          <h1>Đánh giá</h1>
          <p>Lắng nghe khách hàng, theo dõi chất lượng dịch vụ.</p>
        </div>
        <button
          className={s.button}
          disabled={reviews.loading || summary.loading}
          onClick={() => invalidateResources(["admin:dashboard:"])}
        >
          <RefreshCw size={15} />
          Làm mới
        </button>
      </header>
      <section className={s.reviewOverview} aria-label="Tổng quan đánh giá">
        <div className={s.reviewScore}>
          <span>Điểm trung bình</span>
          <div>
            <strong>
              {stats?.averageRating == null
                ? "—"
                : stats.averageRating.toLocaleString("vi-VN", {
                    maximumFractionDigits: 2,
                  })}
            </strong>
            <span>/ 5</span>
          </div>
          {stats?.averageRating != null && (
            <Stars rating={Math.round(stats.averageRating)} />
          )}
          <small>
            {stats
              ? `${stats.total.toLocaleString("vi-VN")} đánh giá trong khoảng ngày đã chọn`
              : summary.error
                ? "Chưa tải được số liệu"
                : "Đang tải số liệu…"}
          </small>
        </div>
        <div className={s.distribution} aria-label="Phân bố số sao">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats?.distribution.find(
              (row) => row.rating === star,
            )?.count;
            return (
              <button
                key={star}
                aria-pressed={rating === star}
                aria-label={`Lọc ${star} sao${count == null ? "" : `: ${count} đánh giá`}`}
                onClick={() =>
                  change({ rating: rating === star ? 0 : star, page: 1 })
                }
              >
                <span>
                  {star}
                  <Star size={12} />
                </span>
                <progress
                  max={Math.max(1, stats?.total || 0)}
                  value={count ?? 0}
                  aria-hidden="true"
                />
                <b>{count ?? "—"}</b>
              </button>
            );
          })}
        </div>
        <div className={s.reviewInsight}>
          <MessageSquareText size={20} />
          <h2>Chất lượng dịch vụ</h2>
          <strong>
            {stats ? stats.lowRatingCount.toLocaleString("vi-VN") : "—"}
          </strong>
          <span>đánh giá từ 1–2 sao</span>
          <p>Ưu tiên xem những trải nghiệm cần được cải thiện.</p>
        </div>
      </section>
      {summary.error && (
        <div className={s.notice} role="alert">
          {summary.error}
          <button onClick={summary.reload}>Thử lại</button>
        </div>
      )}
      <section className={s.reviewTablePanel}>
        <div className={s.reviewToolbar}>
          <div>
            <h2>
              Danh sách đánh giá{" "}
              {reviews.data && (
                <span className={s.count}>
                  {reviews.data.total.toLocaleString("vi-VN")}
                </span>
              )}
            </h2>
            <RangeCaption range={range} />
          </div>
          <div className={s.tableFilters}>
            <label className={s.selectControl}>
              <Star size={15} aria-hidden="true" />
              <select
                aria-label="Lọc theo số sao"
                value={rating}
                onChange={(e) =>
                  change({ rating: Number(e.target.value), page: 1 })
                }
              >
                <option value="0">Tất cả số sao</option>
                {[5, 4, 3, 2, 1].map((star) => (
                  <option key={star} value={star}>
                    {star} sao
                  </option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </label>
            <ReportRangeFilter
              value={range}
              onChange={(next) => change({ range: next, page: 1 })}
            />
          </div>
        </div>
        {reviews.error ? (
          <State error={reviews.error} retry={reviews.reload} />
        ) : reviews.loading && !reviews.data ? (
          <State loading />
        ) : !reviews.data?.items.length ? (
          <State
            empty={
              rating
                ? `Không có đánh giá ${rating} sao trong khoảng ngày này`
                : "Chưa có đánh giá trong khoảng ngày này"
            }
          />
        ) : (
          <>
            <div className={s.reviewTableWrap}>
              <table className={s.reviewTable}>
                <caption className={s.srOnly}>
                  Đánh giá dịch vụ, sắp xếp từ mới nhất
                </caption>
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Makeup Artist</th>
                    <th>Đánh giá</th>
                    <th>Nội dung nhận xét</th>
                    <th aria-sort="descending">Ngày đánh giá</th>
                    <th>
                      <span className={s.srOnly}>Chi tiết</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.data.items.map((review) => (
                    <tr key={review.reviewId}>
                      <td>
                        <div className={s.customerCell}>
                          <span className={s.personAvatar}>
                            {(review.customerName || "K")
                              .trim()
                              .split(/\s+/)
                              .at(-1)
                              ?.slice(0, 1)}
                          </span>
                          <div>
                            <b>{review.customerName || "Khách hàng"}</b>
                            <Link href={`/bookings/${review.bookingId}`}>
                              #{shortId(review.bookingId)}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td>{review.muaName || "Makeup Artist"}</td>
                      <td>
                        <div className={s.tableRating}>
                          <b>
                            {review.rating}
                            <span> / 5</span>
                          </b>
                          <Stars rating={review.rating} />
                        </div>
                      </td>
                      <td className={s.commentCell}>
                        <p>{review.comment || "Không kèm nhận xét"}</p>
                        {review.hasImage && (
                          <span className={s.imageLabel}>
                            <ImageIcon size={13} />
                            Có ảnh đính kèm
                          </span>
                        )}
                      </td>
                      <td>
                        <time dateTime={review.createdAt}>
                          {timestamp(review.createdAt, false)}
                          <small>
                            {new Intl.DateTimeFormat("vi-VN", {
                              timeZone: "Asia/Ho_Chi_Minh",
                              timeStyle: "short",
                            }).format(new Date(review.createdAt))}
                          </small>
                        </time>
                      </td>
                      <td>
                        <Link
                          href={reviewHref(filters, review.reviewId)}
                          scroll={false}
                          className={s.viewDetail}
                          aria-label={`Xem đánh giá của ${review.customerName || "khách hàng"}`}
                        >
                          Xem chi tiết
                          <ChevronRight size={14} />
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
              count={reviews.data.items.length}
              total={reviews.data.total}
              onPage={(next) => change({ page: next })}
            />
          </>
        )}
      </section>
      {id && (
        <ReviewDetails
          key={id}
          id={id}
          onClose={() => router.replace(reviewHref(filters), { scroll: false })}
        />
      )}
    </div>
  );
}
