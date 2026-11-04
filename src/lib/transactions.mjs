/** @type {Record<string, string>} */
export const paymentLabels = {
  Paid: "Đã thanh toán",
  Refunded: "Đã hoàn tiền",
  PartiallyRefunded: "Hoàn tiền một phần",
  RefundPending: "Đang chờ hoàn tiền",
  Forfeited: "Đã khấu trừ cọc",
  Fulfilled: "Đã cấp quyền lợi",
  PaidAwaitingFulfillment: "Đã thu tiền · Đang cấp quyền",
  ManualReview: "Đã thu tiền · Cần kiểm tra",
  Revoked: "Đã thu hồi quyền",
  Cancelled: "Đã hủy · Có ghi nhận thu tiền",
};

/** @param {import('./types').Paged<import('./dashboard').DashboardTransaction>} page */
export function readTransactionPage(page) {
  for (const row of page.items) {
    const type = row.transactionType || "Booking";
    if (
      !["Booking", "CustomerAi", "MuaPlan"].includes(type) ||
      (type === "Booking"
        ? typeof row.bookingId !== "string" || !row.bookingId
        : row.bookingId !== null || typeof row.productName !== "string") ||
      !Number.isFinite(row.amount) ||
      row.amount <= 0 ||
      !Number.isFinite(Date.parse(row.paidAt))
    )
      throw new Error(
        "Dữ liệu giao dịch booking/gói không hợp lệ. Vui lòng thử lại.",
      );
  }
  return page;
}

/** @param {import('./dashboard').DashboardTransaction} item */
export function transactionLabel(item) {
  return item.transactionType === "CustomerAi"
    ? "Gói AI Customer"
    : item.transactionType === "MuaPlan"
      ? "Gói Visibility MUA"
      : "Booking";
}
/** @param {import('./dashboard').DashboardTransaction} item */
export function transactionKey(item) {
  return `${item.transactionType || "Booking"}:${item.paymentId}`;
}
/** @param {import('./dashboard').DashboardTransaction} item */
export function transactionHref(item, query = "") {
  const params = new URLSearchParams(query);
  if (item.transactionType) params.set("type", item.transactionType);
  else params.delete("type");
  return `/transactions/${item.paymentId}${params.size ? `?${params}` : ""}`;
}

/**
 * Read the entire bounded result before filtering or counting. Never present
 * a page subtotal as a complete financial report.
 * @param {(page: number) => Promise<import('./types').Paged<import('./dashboard').DashboardTransaction>>} load
 */
export async function collectTransactions(load) {
  const first = await load(1);
  if (first.total > 5000)
    throw new Error(
      "Có hơn 5.000 giao dịch. Hãy thu hẹp khoảng ngày để xem thống kê và tìm kiếm đầy đủ.",
    );
  const items = [...first.items];
  const pages = Math.ceil(first.total / first.pageSize);
  for (let start = 2; start <= pages; start += 4) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(4, pages - start + 1) }, (_, i) =>
        load(start + i),
      ),
    );
    for (const page of batch) {
      if (page.total !== first.total || page.pageSize !== first.pageSize)
        throw new Error(
          "Danh sách giao dịch vừa thay đổi. Vui lòng làm mới dữ liệu.",
        );
      items.push(...page.items);
    }
  }
  if (
    items.length !== first.total ||
    new Set(items.map(transactionKey)).size !== first.total
  )
    throw new Error(
      "Danh sách giao dịch vừa thay đổi. Vui lòng làm mới dữ liệu.",
    );
  return items;
}

/** @param {import('./dashboard').DashboardTransaction[]} items */
export function filterTransactions(items, search = "", status = "", type = "") {
  const term = search.trim().toLocaleLowerCase("vi-VN");
  return items.filter(
    (x) =>
      (!status || x.status === status) &&
      (!type || (x.transactionType || "Booking") === type) &&
      `${x.paymentId} ${x.bookingId || ""} ${x.providerOrderCode || ""} ${x.customerName || ""} ${x.productId || ""} ${x.productName || ""} ${transactionLabel(x)}`
        .toLocaleLowerCase("vi-VN")
        .includes(term),
  );
}
