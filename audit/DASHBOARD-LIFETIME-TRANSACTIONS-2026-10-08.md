# Lifetime dashboard and payment history

## Behavior

The top row shows fixed lifetime/current totals: current non-deleted Customer and MUA accounts, current MUA accounts, lifetime platform revenue, service review count with mean rating, and collected PayOS payments. Changing the date filter does not change these totals. Demo accounts are excluded from user counts; demo bookings are excluded from financial metrics; the existing visible-review rules exclude demo and removed reviews. Locked but non-deleted accounts remain part of current user counts.

Period metrics and charts remain below a separate heading. Filters include today, seven days, thirty days, this month, year to date, a selected calendar month, a selected calendar year and a custom range. Months include their final day; leap years include February 29. Periods use Vietnam calendar dates with an exclusive UTC end and the existing maximum of 366 days.

The lifetime payment box opens a paginated history. The period payment box opens the same history scoped to the selected dates. The history can switch between lifetime and the selected range, resetting pagination. Payment detail shows payment ID, order code, provider reference, customer and MUA, booking services/value/status/appointment, collection and refund timestamps, and related refund records. No raw webhook, checkout link, QR, credentials or bank account details are exposed by these endpoints.

Revenue remains PlatformFeeAmount on completed/auto-completed bookings, rather than collected deposits. Payment counts count PayOS records with PaidAt; refunded payments remain in collection history. Refunds and MUA payouts remain in their existing dedicated modules and are not added again to this payment count.

## API and rollout

The existing dashboard response adds `lifetime` with revenue, reviewCount, averageRating and successfulTransactions. New Admin-only, non-cacheable GET routes: `/api/admin/dashboard/transactions` (optional paired from/to dates, page and pageSize) and `/api/admin/dashboard/transactions/{id}`. The BFF permits only exact list/GUID GET routes. No migration is needed. Deploy backend first, then Admin; frontend validation requires the lifetime aggregate. No live deployment has been performed.

## Validation

- Admin lint, TypeScript and production build passed; 44 Node tests passed.
- Targeted backend dashboard tests: 12 passed; 3 PostgreSQL-dependent tests skipped because the dedicated database is not configured. Existing unrelated compiler warnings remain.
- SQLite tests cover lifetime/date-scoped pagination, Vietnam date boundaries, refunded versus pending/demo payments, linked booking/refund details, deleted account redaction, invalid inputs, and omitted provider payloads.
- The PostgreSQL statistics fixture now asserts lifetime aggregates remain identical across different selected date ranges; this database-dependent fixture was not executed.
- Local headless Chrome verification uses the actual React components and CSS with explicitly isolated data fixtures under `D:/EXE/.verification/dashboard-totals`. It verified stable lifetime totals when changing month/year, 366 daily points for a leap year, payment pagination/scope/detail, moving chart tooltip, mobile page width and absence of runtime errors. Desktop/mobile screenshots were visually inspected. This is not an authenticated production API test.
