import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import {
  comparison,
  currencyAxis,
  presetRange,
  validRange,
  vietnamToday,
  bookingLabels,
  calendarRange,
} from "../src/lib/dashboard-presentation.mjs";
test("Vietnam calendar and inclusive presets cross month boundaries", () => {
  assert.equal(vietnamToday(Date.parse("2026-09-30T18:00:00Z")), "2026-10-01");
  assert.deepEqual(presetRange("today", "2026-10-07"), {
    from: "2026-10-07",
    to: "2026-10-07",
  });
  assert.deepEqual(presetRange("week", "2026-10-07"), {
    from: "2026-10-01",
    to: "2026-10-07",
  });
  assert.deepEqual(presetRange("month", "2026-10-07"), {
    from: "2026-09-08",
    to: "2026-10-07",
  });
  assert.deepEqual(presetRange("this-month", "2026-10-07"), {
    from: "2026-10-01",
    to: "2026-10-07",
  });
});
test("custom date validation preserves backend range limit", () => {
  assert.equal(validRange("2026-02-31", "2026-03-05"), false);
  assert.equal(validRange("2024-01-01", "2024-12-31"), true);
  assert.equal(validRange("2024-01-01", "2025-01-01"), false);
  assert.equal(validRange("2026-10-07", "2026-10-01"), false);
  assert.equal(validRange("invalid", "2026-10-01"), false);
});
test("calendar month and year filters include the full period and leap day", () => {
  assert.deepEqual(calendarRange("2024-02"), {
    from: "2024-02-01",
    to: "2024-02-29",
  });
  assert.deepEqual(calendarRange("2026-12"), {
    from: "2026-12-01",
    to: "2026-12-31",
  });
  assert.deepEqual(calendarRange("2024"), {
    from: "2024-01-01",
    to: "2024-12-31",
  });
  assert.deepEqual(presetRange("this-year", "2026-10-08"), {
    from: "2026-01-01",
    to: "2026-10-08",
  });
  assert.equal(
    validRange(calendarRange("2024").from, calendarRange("2024").to),
    true,
  );
  for (const value of ["2026-00", "2026-13", "1969", "abc", "2026-1"])
    assert.equal(calendarRange(value), null);
});
test("dashboard contract rejects missing metrics and inconsistent reviews instead of showing zero", async () => {
  const source = await readFile(
    new URL("../src/lib/dashboard.ts", import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const { validateDashboard } = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  );
  const period = {
    revenue: 6400000,
    bookingValue: 10000000,
    completedBookings: 1,
    newUsers: 2,
    newMuas: 1,
    totalBookings: 1,
    depositsCollected: 300000,
    refundsCompleted: 0,
    successfulTransactions: 1,
  };
  const reviews = {
    total: 1,
    averageRating: 2,
    lowRatingCount: 1,
    distribution: [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: rating === 2 ? 1 : 0,
    })),
    reviewedCompletedBookings: 1,
    eligibleCompletedBookings: 1,
    recent: [],
  };
  const data = {
    lifetime: {
      revenue: 6400000,
      reviewCount: 1,
      averageRating: 2,
      successfulTransactions: 1,
    },
    current: period,
    previous: period,
    users: { total: 2, customers: 1, muas: 1, locked: 0 },
    daily: [
      {
        date: "2026-10-01",
        revenue: 6400000,
        newUsers: 2,
        newMuas: 1,
        bookings: 1,
      },
    ],
    bookingStatuses: [{ status: "Completed", count: 1 }],
    serviceReviews: reviews,
  };
  assert.equal(validateDashboard(data), data);
  assert.throws(() => validateDashboard({ ...data, lifetime: undefined }));
  assert.throws(() =>
    validateDashboard({
      ...data,
      lifetime: { ...data.lifetime, averageRating: 0 },
    }),
  );
  assert.throws(() =>
    validateDashboard({
      ...data,
      lifetime: { ...data.lifetime, successfulTransactions: 1.5 },
    }),
  );
  for (const successfulTransactions of [undefined, -1, 1.5, NaN]) {
    assert.throws(() =>
      validateDashboard({
        ...data,
        current: { ...period, successfulTransactions },
      }),
    );
  }
  assert.throws(() =>
    validateDashboard({ ...data, current: { ...period, newMuas: undefined } }),
  );
  assert.throws(() => validateDashboard({ ...data, bookingStatuses: [] }));
  assert.throws(() =>
    validateDashboard({
      ...data,
      serviceReviews: { ...reviews, averageRating: NaN },
    }),
  );
  assert.throws(() =>
    validateDashboard({
      ...data,
      serviceReviews: { ...reviews, lowRatingCount: 0 },
    }),
  );
  assert.throws(() =>
    validateDashboard({ ...data, serviceReviews: undefined }),
  );
});
test("comparison uses real values and does not divide by zero", () => {
  assert.deepEqual(comparison(10, 0, 7), {
    text: "Kỳ trước: 0",
    direction: "neutral",
  });
  assert.deepEqual(comparison(0, 0, 7), {
    text: "Kỳ trước: 0",
    direction: "neutral",
  });
  assert.equal(comparison(120, 100, 7).text, "+20% so với 7 ngày trước");
  assert.equal(comparison(0, 100, 30).direction, "down");
});
test("currency axis retains the VND unit rather than scaling payload", () => {
  assert.equal(currencyAxis(6400000), "6,4M");
  assert.equal(currencyAxis(9000), "9K");
  assert.equal(currencyAxis(0), "0");
  assert.equal(Object.keys(bookingLabels).length, 11);
});
