import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesFinancialQr } from "../src/lib/financial-qr.mjs";
import { allowedApiPath } from "../src/lib/policy.mjs";
const image = {
  payoutId: "A",
  amount: 12345,
  imageDataUrl: "data:image/png;base64,AAAA",
  kind: "BANK_GENERATED",
  containsPayoutAmount: true,
};
test("financial QR never crosses payout IDs, amounts or arbitrary/public image URLs", () => {
  assert.equal(matchesFinancialQr(image, "payout", "A", 12345), true);
  assert.equal(matchesFinancialQr(image, "payout", "B", 12345), false);
  assert.equal(matchesFinancialQr(image, "payout", "A", 54321), false);
  for (const url of [
    "https://test/object/public/qr.jpg",
    "data:image/svg+xml;base64,AAAA",
  ])
    assert.equal(
      matchesFinancialQr({ ...image, imageDataUrl: url }, "payout", "A", 12345),
      false,
    );
});
test("MoMo original explicitly declares amount not embedded and refunds use own context", () => {
  const momo = { ...image, kind: "MOMO_ORIGINAL", containsPayoutAmount: false };
  assert.equal(matchesFinancialQr(momo, "payout", "A", 12345), true);
  assert.equal(
    matchesFinancialQr(
      { ...momo, containsPayoutAmount: true },
      "payout",
      "A",
      12345,
    ),
    false,
  );
  assert.equal(matchesFinancialQr(momo, "refund", "A", 12345), false);
  assert.equal(
    matchesFinancialQr(
      {
        ...momo,
        payoutId: undefined,
        refundId: "A",
        containsRefundAmount: false,
      },
      "refund",
      "A",
      12345,
    ),
    true,
  );
});
test("financial proxy exposes only scoped read operations", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  for (const path of [
    "admin/bank-accounts/" + id + "/financial-qr",
    "admin/payouts/" + id + "/transfer-qr",
    "admin/refunds/" + id + "/transfer-qr",
  ]) {
    assert.equal(allowedApiPath("GET", path), true);
    assert.equal(allowedApiPath("POST", path), false);
  }
  assert.equal(
    allowedApiPath("GET", "financial-media/" + id + "/preview"),
    false,
  );
});
