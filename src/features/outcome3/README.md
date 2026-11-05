# Outcome 3: demo service reviews

Route: `/outcome-3`, within the existing authenticated administrator catch-all route.
Default mode is REAL. DEMO and COMPARE visibly label simulated records and do not
merge them into actual business results. No fixtures are sent to an API.

`demo.mjs` holds deterministic users, completed bookings, successful transactions
and exactly 16 reviews. The shared review selector drives the average, rating
distribution, low-rating count, recent list and daily statistics. The official
period is 29 October–4 November 2026 in UTC+7. Reviews cover all seven days and
follow their corresponding booking completion times.

Expected full-period values: 32 customers, 7 MUA, 39 users, 17 unique paid users,
18 successful transactions, 16 completed bookings and 16 reviews. Ratings:
10 five-star, 5 four-star, 1 three-star, no one- or two-star records. The computed
average is 4.5625, displayed with two Vietnamese decimal places.

Demo revenue: 1,120,000 VND booking platform fees plus 150,000 VND Visibility
payments = 1,270,000 VND. Booking fee recognition follows the existing backend
dashboard's completed-booking PlatformFeeAmount approach. Deposits are not added
to platform revenue. This is a demonstration calculation, not audited real revenue.

REAL reads the existing dashboard and reviews APIs. Refresh fetches current API
results for the selected dates; later payments require selecting their date range.
No automatic polling or webhook changes are introduced. The existing REAL review
presentation is preserved. REAL unique paid users and the complete original
Outcome 3 feature specification are outside this service-review update: the
existing dashboard response does not expose unique paid users. No synthetic
fallback is used on API errors.

Verification: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`.
Before release, check the authenticated page in all three modes on desktop and
tablet, verify date filtering and refresh against a test backend, and confirm
that production results remain unchanged. This change does not deploy, migrate
or write to production. Rollback removes the Outcome 3 import, menu and route
branch in admin-app.tsx, plus this feature directory and outcome3.test.mjs.
