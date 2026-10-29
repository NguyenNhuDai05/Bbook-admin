/** @type {Record<string, string>} */
export const paymentLabels = {
  Paid: "Đã thanh toán",
  Refunded: "Đã hoàn tiền",
  PartiallyRefunded: "Hoàn tiền một phần",
  RefundPending: "Đang chờ hoàn tiền",
  Forfeited: "Đã khấu trừ cọc",
};

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
    new Set(items.map((x) => x.paymentId)).size !== first.total
  )
    throw new Error(
      "Danh sách giao dịch vừa thay đổi. Vui lòng làm mới dữ liệu.",
    );
  return items;
}

/** @param {import('./dashboard').DashboardTransaction[]} items */
export function filterTransactions(items, search = "", status = "") {
  const term = search.trim().toLocaleLowerCase("vi-VN");
  return items.filter(
    (x) =>
      (!status || x.status === status) &&
      `${x.paymentId} ${x.bookingId} ${x.providerOrderCode} ${x.customerName || ""}`
        .toLocaleLowerCase("vi-VN")
        .includes(term),
  );
}
