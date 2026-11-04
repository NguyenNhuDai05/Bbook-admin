import test from "node:test";
import assert from "node:assert/strict";
import {
  collectTransactions,
  filterTransactions,
  transactionHref,
  transactionKey,
  readTransactionPage,
} from "../src/lib/transactions.mjs";

test("booking and plan ledgers keep distinct identities and searchable product metadata", async () => {
  const rows = [
    { ...item(1), paymentId: "same-id", transactionType: "Booking" },
    {
      ...item(2),
      paymentId: "same-id",
      bookingId: null,
      transactionType: "CustomerAi",
      productId: "ai_v2",
      productName: "AI trọn đời",
      status: "Fulfilled",
    },
    {
      ...item(3),
      paymentId: "same-id",
      bookingId: null,
      transactionType: "MuaPlan",
      productName: "Visibility 60 ngày",
      status: "PaidAwaitingFulfillment",
    },
  ];
  assert.equal(
    (await collectTransactions(async () => paged(rows, 3))).length,
    3,
  );
  assert.equal(new Set(rows.map(transactionKey)).size, 3);
  assert.equal(filterTransactions(rows, "ai_v2").length, 1);
  assert.equal(
    filterTransactions(rows, "visibility", "PaidAwaitingFulfillment", "MuaPlan")
      .length,
    1,
  );
  assert.equal(filterTransactions(rows, "", "", "Booking").length, 1);
  const href = transactionHref(rows[1], "scope=all&page=2");
  const query = new URL(href, "https://admin.test").searchParams;
  assert.equal(query.get("type"), "CustomerAi");
  assert.equal(query.get("page"), "2");
  assert.equal(
    new URL(transactionHref(rows[0]), "https://admin.test").searchParams.get(
      "type",
    ),
    "Booking",
  );
});

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

test("transaction contract rejects a plan without its source instead of showing a booking", () => {
  const book = item(1);
  assert.equal(readTransactionPage(paged([book], 1)).items[0], book);
  assert.throws(
    () => readTransactionPage(paged([{ ...book, bookingId: null }], 1)),
    /không hợp lệ/,
  );
  assert.throws(
    () =>
      readTransactionPage(paged([{ ...book, transactionType: "Unknown" }], 1)),
    /không hợp lệ/,
  );
  assert.doesNotThrow(() =>
    readTransactionPage(
      paged(
        [
          {
            ...book,
            bookingId: null,
            transactionType: "CustomerAi",
            productName: "AI",
          },
        ],
        1,
      ),
    ),
  );
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
