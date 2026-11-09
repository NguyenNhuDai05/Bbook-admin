// Local reporting fixtures only. Never send these records to a backend API.
export const days = [
  "2026-10-29",
  "2026-10-30",
  "2026-10-31",
  "2026-11-01",
  "2026-11-02",
  "2026-11-03",
  "2026-11-04",
];
const id = (kind, i) => `BBOOK_${kind}_${String(i + 1).padStart(3, "0")}`;
const at = (day, time) => `${days[day]}T${time}:00+07:00`;
export const users = [
  ...Array.from({ length: 32 }, (_, i) => ({
    id: id("CUSTOMER", i),
    role: "CUSTOMER",
    displayName: `Khách hàng ${String(i + 1).padStart(2, "0")}`,
    createdAt: at(i < 15 ? 0 : 1 + (i % 6), "07:00"),
    isActive: true,
    isDeleted: false,
    source: "DEMO",
  })),
  ...Array.from({ length: 7 }, (_, i) => ({
    id: id("MUA", i),
    role: "MUA",
    displayName: `Chuyên viên ${String(i + 1).padStart(2, "0")}`,
    createdAt: at(i, "07:00"),
    isActive: true,
    isDeleted: false,
    source: "DEMO",
  })),
];
export const bookings = Array.from({ length: 16 }, (_, i) => {
  const day = Math.floor((i * 7) / 16);
  const bookingTotal = 500000 + i * 50000;
  return {
    bookingId: id("BOOKING", i),
    customerId: id("CUSTOMER", i % 15),
    muaId: id("MUA", day),
    bookingTotal,
    depositAmount: bookingTotal * 0.3,
    platformFee: bookingTotal * 0.08,
    createdAt: at(day, "08:00"),
    paymentConfirmedAt: at(day, "09:00"),
    completedAt: at(day, "15:00"),
    status: "COMPLETED",
    source: "DEMO",
  };
});
export const transactions = [
  ...bookings.map((b, i) => ({
    transactionId: id("PAYMENT", i),
    userId: b.customerId,
    bookingId: b.bookingId,
    transactionType: "BOOKING_DEPOSIT",
    amount: b.depositAmount,
    createdAt: b.createdAt,
    confirmedAt: b.paymentConfirmedAt,
    status: "SUCCESS",
    source: "DEMO",
    currency: "VND",
  })),
  ...Array.from({ length: 13 }, (_, i) => {
    const day = i < 7 ? i : i - 6;
    return {
      transactionId: id("VISIBILITY", i),
      userId: id("MUA", i % 7),
      bookingId: null,
      packageReference: "VISIBILITY_30_DAYS",
      transactionType: "VISIBILITY",
      amount: 75000,
      createdAt: at(day, "10:00"),
      confirmedAt: at(day, "10:05"),
      status: "SUCCESS",
      source: "DEMO",
      currency: "VND",
    };
  }),
];
const content = [
  [
    5,
    "Chuyên viên đến đúng giờ, thao tác nhẹ nhàng và lớp nền giữ đẹp đến cuối buổi.",
  ],
  [
    4,
    "Makeup đẹp và phục vụ chu đáo, mình mong khâu chuẩn bị dụng cụ nhanh hơn một chút.",
  ],
  [5, "Màu mắt rất hợp trang phục, bạn tư vấn kỹ và làm việc chuyên nghiệp."],
  [
    5,
    "Mình rất hài lòng với lớp nền mỏng nhẹ, chụp ảnh lên tự nhiên và không bị xuống tông.",
  ],
  [
    4,
    "Tay nghề tốt, lần sau mình muốn trao đổi kỹ hơn về phong cách trước khi bắt đầu.",
  ],
  [
    5,
    "Bạn đến sớm để chuẩn bị, lắng nghe mong muốn và trang điểm đúng kiểu mình thích.",
  ],
  [
    5,
    "Lớp nền bền suốt tiệc, phần mắt được chăm chút và thái độ phục vụ rất dễ chịu.",
  ],
  [
    4,
    "Trải nghiệm khá tốt, nếu báo trước thời gian từng bước thì mình sẽ dễ sắp xếp hơn.",
  ],
  [
    5,
    "Da mình khá khô nhưng được xử lý nền rất kỹ, tổng thể tươi tắn và thoải mái.",
  ],
  [
    3,
    "Kết quả ở mức ổn, phần nền tương đối đều nhưng màu mắt chưa sát mong muốn. Mong bạn trao đổi kỹ hơn trước khi thực hiện.",
  ],
  [
    5,
    "Makeup nhẹ mà vẫn nổi bật, bạn chỉnh sửa tận tình và hoàn thành đúng giờ hẹn.",
  ],
  [
    4,
    "Mình hài lòng với kết quả, chỉ muốn màu son dịu hơn một chút cho buổi chụp ban ngày.",
  ],
  [
    5,
    "Đường kẻ mắt gọn đẹp, nền giữ tốt nhiều giờ và chuyên viên rất thân thiện.",
  ],
  [
    5,
    "Bạn phối màu hài hòa, vệ sinh dụng cụ cẩn thận và tư vấn cách giữ lớp trang điểm rất hữu ích.",
  ],
  [
    4,
    "Dịch vụ tốt và đúng hẹn, mình mong được xem thêm vài mẫu makeup khi tư vấn ban đầu.",
  ],
  [
    5,
    "Kiểu trang điểm hợp khuôn mặt, lớp nền vẫn đẹp cuối ngày và mình được hỗ trợ rất nhiệt tình.",
  ],
];
export const reviews = bookings.map((b, i) => ({
  reviewId: id("REVIEW", i),
  bookingId: b.bookingId,
  customerId: b.customerId,
  muaId: b.muaId,
  rating: content[i][0],
  comment: content[i][1],
  createdAt: b.completedAt.replace("15:00", "17:00"),
  source: "DEMO",
}));
const localDay = (timestamp) =>
  new Date(Date.parse(timestamp) + 7 * 3600000).toISOString().slice(0, 10);
export function aggregateReviews(records, from = days[0], to = days[6]) {
  const selected = records.filter(
    (r) => localDay(r.createdAt) >= from && localDay(r.createdAt) <= to,
  );
  return {
    total: selected.length,
    averageRating: selected.length
      ? selected.reduce((sum, r) => sum + r.rating, 0) / selected.length
      : null,
    lowRatingCount: selected.filter((r) => r.rating <= 2).length,
    distribution: [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: selected.filter((r) => r.rating === rating).length,
    })),
    recent: [...selected].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    ),
    daily: days
      .filter((day) => day >= from && day <= to)
      .map((date) => ({
        date,
        count: selected.filter((r) => localDay(r.createdAt) === date).length,
      })),
  };
}
export function demoReport(from = days[0], to = days[6]) {
  const within = (timestamp) =>
    localDay(timestamp) >= from && localDay(timestamp) <= to;
  const payments = transactions.filter(
    (t) => t.status === "SUCCESS" && within(t.confirmedAt),
  );
  const completed = bookings.filter((b) => within(b.completedAt));
  const registered = users.filter((u) => within(u.createdAt));
  const bookingRevenue = completed.reduce((sum, b) => sum + b.platformFee, 0);
  const visibilityRevenue = payments
    .filter((t) => t.transactionType === "VISIBILITY")
    .reduce((sum, t) => sum + t.amount, 0);
  const reviewStats = aggregateReviews(reviews, from, to);
  return {
    source: "DEMO",
    customers: registered.filter((u) => u.role === "CUSTOMER").length,
    muas: registered.filter((u) => u.role === "MUA").length,
    users: registered.length,
    paidUsers: new Set(payments.map((t) => t.userId)).size,
    successfulTransactions: payments.length,
    completedBookings: completed.length,
    bookingRevenue,
    visibilityRevenue,
    revenue: bookingRevenue + visibilityRevenue,
    reviews: reviewStats,
    daily: days
      .filter((day) => day >= from && day <= to)
      .map((date) => {
        const dayPayments = payments.filter(
          (t) => localDay(t.confirmedAt) === date,
        );
        return {
          date,
          customers: registered.filter(
            (u) => u.role === "CUSTOMER" && localDay(u.createdAt) === date,
          ).length,
          muas: registered.filter(
            (u) => u.role === "MUA" && localDay(u.createdAt) === date,
          ).length,
          paidUsers: new Set(
            dayPayments
              .filter(
                (t) =>
                  !transactions.some(
                    (other) =>
                      other.userId === t.userId &&
                      other.status === "SUCCESS" &&
                      Date.parse(other.confirmedAt) < Date.parse(t.confirmedAt),
                  ),
              )
              .map((t) => t.userId),
          ).size,
          transactions: dayPayments.length,
          bookings: completed.filter((b) => localDay(b.completedAt) === date)
            .length,
          reviews: reviewStats.daily.find((r) => r.date === date)?.count ?? 0,
          revenue:
            completed
              .filter((b) => localDay(b.completedAt) === date)
              .reduce((sum, b) => sum + b.platformFee, 0) +
            dayPayments
              .filter((t) => t.transactionType === "VISIBILITY")
              .reduce((sum, t) => sum + t.amount, 0),
        };
      }),
  };
}
