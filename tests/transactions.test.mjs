import test from "node:test";
import assert from "node:assert/strict";
import {
  collectTransactions,
  filterTransactions,
} from "../src/lib/transactions.mjs";

const item = (id, status = "Paid") => ({
  paymentId: `payment-${id}`,
  bookingId: "shared-booking",
  amount: 100000,
  paidAt: "2026-10-28T18:00:00Z",
  status,
  providerOrderCode: 9000 + id,
  customerName: id === 1 ? "Nguyễn Văn An" : null,
});
const paged = (items, total, page = 1, pageSize = 20) => ({
  items,
  total,
  page,
  pageSize,
});

test("counts all pages without collapsing separate payments for one booking", async () => {
  const calls = [];
  const data = Array.from({ length: 47 }, (_, i) =>
    item(i, i > 30 ? "Refunded" : "Paid"),
  );
  const rows = await collectTransactions(async (page) => {
    calls.push(page);
    return paged(data.slice((page - 1) * 20, page * 20), 47, page);
  });
  assert.deepEqual(calls, [1, 2, 3]);
  assert.equal(rows.length, 47);
  assert.equal(filterTransactions(rows, "", "Refunded").length, 16);
  assert.equal(
    rows.reduce((sum, x) => sum + x.amount, 0),
    4700000,
  );
});

test("searches full IDs, provider codes and Vietnamese names before paginating", () => {
  const rows = [
    item(1),
    item(2, "PartiallyRefunded"),
    item(3, "RefundPending"),
  ];
  assert.equal(filterTransactions(rows, "  NGUYỄN VĂN AN  ").length, 1);
  assert.equal(filterTransactions(rows, "9002", "PartiallyRefunded").length, 1);
  assert.equal(filterTransactions(rows, "9002", "Paid").length, 0);
  assert.equal(filterTransactions(rows, "shared-booking").length, 3);
  assert.equal(
    filterTransactions(rows, "payment-3")[0].status,
    "RefundPending",
  );
  assert.equal(filterTransactions(rows, "no match").length, 0);
});

test("empty results complete without requesting another page", async () => {
  assert.deepEqual(
    await collectTransactions(async (page) => {
      assert.equal(page, 1);
      return paged([], 0);
    }),
    [],
  );
});

test("rejects changing totals, duplicate IDs and incomplete responses instead of showing partial counts", async () => {
  const first = Array.from({ length: 20 }, (_, i) => item(i));
  await assert.rejects(
    collectTransactions(async (page) =>
      page === 1 ? paged(first, 21) : paged([item(20)], 22, page),
    ),
    /vừa thay đổi/,
  );
  await assert.rejects(
    collectTransactions(async (page) =>
      page === 1 ? paged(first, 21) : paged([item(0)], 21, page),
    ),
    /vừa thay đổi/,
  );
  await assert.rejects(
    collectTransactions(async () => paged([], 1)),
    /vừa thay đổi/,
  );
});

test("limits large reports and propagates cancellation and failures", async () => {
  let calls = 0;
  await assert.rejects(
    collectTransactions(async () => {
      calls++;
      return paged([], 5001);
    }),
    /thu hẹp khoảng ngày/,
  );
  assert.equal(calls, 1);
  const error = new DOMException("Aborted", "AbortError");
  await assert.rejects(
    collectTransactions(async () => {
      throw error;
    }),
    error,
  );
  await assert.rejects(
    collectTransactions(async (page) => {
      if (page === 2) throw new Error("Backend unavailable");
      return paged(
        Array.from({ length: 20 }, (_, i) => item(i)),
        21,
      );
    }),
    /Backend unavailable/,
  );
});
