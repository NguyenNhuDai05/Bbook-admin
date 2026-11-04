import Link from "next/link";
import { promotionStates } from "@/lib/subscription-status.mjs";
import css from "./subscription-plans.module.css";

export type MuaGrant = {
  id: string;
  startsAt: string;
  endsAt: string;
  revokedAt: string | null;
};
export type MuaFulfillment = {
  workersEnabled: boolean;
  sponsoredDeliveryEnabled: boolean;
  lastJob: {
    state: string;
    attempts: number;
    lastError: string | null;
    availableAt: string;
  } | null;
};
export type MuaPromotionTask = {
  id: string;
  state: string;
  cycleStartsAt: string;
  dueAt: string;
  publishedUrl: string | null;
  publishedAt: string | null;
};
const date = (value: string) =>
  new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export function MuaOrderFulfillment({
  grants,
  fulfillment,
  promotionTasks,
}: {
  grants: MuaGrant[];
  fulfillment?: MuaFulfillment;
  promotionTasks?: MuaPromotionTask[];
}) {
  return (
    <div className={css.fulfillment}>
      <section>
        <h3>1. Nổi bật trong app · Tự động</h3>
        <p>
          Hệ thống kích hoạt thời hạn sau khi xác minh thanh toán. Phần này
          không chờ đội BBook liên hệ hoặc đăng bài bên ngoài.
        </p>
        {grants.length ? (
          grants.map((g) => (
            <p key={g.id}>
              <strong>
                {g.revokedAt ? "Đã thu hồi" : "Đã ghi nhận thời hạn"}
              </strong>
              <br />
              {date(g.startsAt)} → {date(g.endsAt)}
            </p>
          ))
        ) : (
          <p>
            <strong>Chưa kích hoạt thời hạn nổi bật trong app.</strong>
          </p>
        )}
        {fulfillment && !fulfillment.workersEnabled && (
          <p role="alert">
            Xử lý tự động đang tắt trên backend. Cần bật
            MuaMonetization__WorkersEnabled trước khi thử kích hoạt lại.
          </p>
        )}
        {fulfillment && !fulfillment.sponsoredDeliveryEnabled && (
          <p role="alert">
            Hiển thị nổi bật đang tắt trên backend. Kiểm tra
            MuaMonetization__SponsoredDeliveryEnabled để gói hiển thị trong app.
          </p>
        )}
        {!grants.length && fulfillment?.lastJob && (
          <p>
            Xử lý kích hoạt: {fulfillment.lastJob.state} · Đã thử{" "}
            {fulfillment.lastJob.attempts} lần.
            {fulfillment.lastJob.lastError && (
              <> Mã kiểm tra: {fulfillment.lastJob.lastError}.</>
            )}
          </p>
        )}
        {!grants.length && fulfillment && !fulfillment.lastJob && (
          <p>Chưa có lượt xử lý kích hoạt được ghi nhận cho đơn này.</p>
        )}
      </section>
      <section>
        <h3>2. Quảng bá bên ngoài · Đội BBook thực hiện</h3>
        <p>
          Đội BBook chủ động liên hệ MUA, chuẩn bị nội dung và đăng bài
          Facebook. Hệ thống không tự liên hệ hoặc tự đăng bài. Kích hoạt trong
          app không có nghĩa là bài quảng bá đã được đăng.
        </p>
        {promotionTasks?.length ? (
          promotionTasks.map((task) => (
            <p key={task.id}>
              <strong>{promotionStates[task.state] || task.state}</strong>
              <br />
              Chu kỳ: {date(task.cycleStartsAt)} · Hạn đăng: {date(task.dueAt)}
              {task.publishedAt && (
                <> · Ghi nhận đăng: {date(task.publishedAt)}</>
              )}
              {task.publishedUrl && (
                <>
                  {" "}
                  ·{" "}
                  <a href={task.publishedUrl} target="_blank" rel="noreferrer">
                    Xem bài đã đăng
                  </a>
                </>
              )}
            </p>
          ))
        ) : (
          <p>
            {promotionTasks
              ? "Chưa có công việc quảng bá cho đơn này. Công việc được tạo khi kích hoạt trong app thành công."
              : "Thông tin công việc quảng bá được quản lý ở mục Quảng bá MUA."}
          </p>
        )}
        <Link href="/mua-promotions" className="text-button">
          Mở Quảng bá MUA để xử lý và ghi nhận bài đăng
        </Link>
      </section>
    </div>
  );
}
