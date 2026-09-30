import { test } from "node:test";
import assert from "node:assert/strict";
import {
  apiMessage,
  assertArray,
  assertPaged,
  createSubmissionLock,
  financialActions,
  financialStatus,
} from "../src/lib/contracts.mjs";

test("numeric financial enums follow payout/refund DTOs and preserve their different terminal states", () => {
  assert.equal(financialStatus(3), "Paid");
  assert.equal(financialStatus(3, true), "Completed");
  assert.equal(financialStatus(5, true), "AwaitingDestination");
  assert.equal(financialStatus(5), "Unknown");
  for (const value of [6, -1, "Approved", "UNKNOWN"])
    assert.equal(financialStatus(value, true), "Unknown");
});
test("only eligible statuses offer manual actions; no payout retry or terminal completion", () => {
  assert.deepEqual(financialActions(0), ["start-processing"]);
  assert.deepEqual(financialActions("ManualActionRequired", true), [
    "start-processing",
  ]);
  assert.deepEqual(financialActions(2, true), ["complete", "fail"]);
  assert.deepEqual(financialActions(4), []);
  assert.deepEqual(financialActions(4, true), ["retry"]);
  for (const value of [3, 5, 99])
    assert.deepEqual(financialActions(value, true), []);
});
test("synchronous lock blocks duplicate submits before React can rerender and releases after completion/error", () => {
  const lock = createSubmissionLock();
  assert.equal(lock.acquire(), true);
  assert.equal(lock.acquire(), false);
  lock.release();
  assert.equal(lock.acquire(), true);
  lock.release();
});
test("empty array is legitimate while null, failure envelope and malformed records are not an empty success", () => {
  assert.deepEqual(assertArray([], ["id"]), []);
  for (const value of [null, {}, { message: "failure" }, [{}]])
    assert.throws(() => assertArray(value, ["id"]));
});
test("paged endpoints require real total/page/pageSize; arrays cannot pretend to be server pagination", () => {
  assert.deepEqual(
    assertPaged({ items: [], total: 0, page: 1, pageSize: 20 }, ["id"]).items,
    [],
  );
  for (const value of [
    [],
    { items: [] },
    { items: [], total: -1, page: 1, pageSize: 20 },
    { items: [], total: 0, page: 0, pageSize: 20 },
  ])
    assert.throws(() => assertPaged(value, ["id"]));
});
test("403 is a permission failure; 401 is a session failure, not an empty result", () => {
  assert.equal(
    apiMessage(403, { message: "ignored" }),
    "Bạn không có quyền thực hiện thao tác này.",
  );
  assert.equal(apiMessage(401, null), "Phiên đăng nhập đã hết hạn.");
});
test("safe backend validation messages survive but sensitive URLs/traces and server exceptions do not", () => {
  assert.equal(
    apiMessage(400, { Message: "Lý do là bắt buộc." }),
    "Lý do là bắt buộc.",
  );
  assert.equal(
    apiMessage(400, { errors: { reason: ["Nhập ít nhất 5 ký tự."] } }),
    "Nhập ít nhất 5 ký tự.",
  );
  for (const payload of [
    { Message: "https://private.invalid/document" },
    { message: "Npgsql Exception" },
    { message: "Bearer token" },
  ])
    assert.equal(
      apiMessage(400, payload),
      "Không thể thực hiện thao tác. Vui lòng thử lại.",
    );
  assert.equal(
    apiMessage(500, { message: "internal detail" }),
    "Không thể thực hiện thao tác. Vui lòng thử lại.",
  );
});
