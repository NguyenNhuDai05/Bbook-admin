/** @type {Record<string, string>} */
export const subscriptionStates = {
  PaymentPending: "Chờ thanh toán",
  PaidAwaitingFulfillment: "Đã nhận tiền · Chờ kích hoạt nổi bật trong app",
  ManualReview: "Đã nhận tiền · Cần kiểm tra kích hoạt",
  Fulfilled: "Đã kích hoạt quyền lợi trong app",
  Cancelled: "Đã hủy",
  Revoked: "Đã thu hồi quyền trong app",
  Refunded: "Đã hoàn tiền",
};

/** @type {Record<string, string>} */
export const promotionStates = {
  Preparing: "Đội BBook đang chuẩn bị",
  Scheduled: "Đã lên lịch",
  Published: "Đã đăng bài",
  NeedsContent: "Cần bổ sung nội dung",
  RevisionRequested: "MUA yêu cầu sửa",
};
