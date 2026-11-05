# Outcome 3 — reuse the production dashboard UI

`/outcome-3` renders the same `OperationsDashboard` as `/`, with `demo` enabled.
There is one dashboard layout, one set of KPI markup, one daily table, and the
existing `RevenueChart`, `NewUsersChart`, `ServiceReviews`, and booking-status
section. No duplicate report route, REAL/COMPARE switch or parallel dashboard UI
remains. The Outcome 3 sidebar entry and existing administrator authorization stay
in place.

`dashboard-adapter.mjs` maps static records to the existing `DashboardData` view
model. Production continues to consume its API view model unchanged. Lifetime
values cover all fixture records; period values follow the selected calendar
range. Registrations use createdAt, payments use confirmedAt, bookings use
createdAt for new/status metrics and completedAt for completion/revenue, reviews
use createdAt. Date boundaries are Vietnamese calendar dates (UTC+7).

Full-period demo totals (29 October–4 November 2026):

- 32 customers, 7 MUA, 39 users.
- 17 unique paid users: 15 customers and 2 MUA.
- 18 successful transactions: 16 deposits and 2 Visibility purchases.
- 16 completed bookings and 16 reviews covering all seven days.
- Ratings: ten 5-star, five 4-star, one 3-star; no ratings below 3.
- Computed average: 4.5625; display: 4,56 / 5.
- Booking platform fees: 1,120,000 VND; Visibility: 150,000 VND.
- Platform revenue: 1,270,000 VND. Deposit remains 30%, booking fee 8%.

The demo customer chart sums to 32; its MUA tab sums to 7. New-user KPI/table
retain the dashboard's definition including both roles (39). Charts and daily
rows aggregate the same records, including zero days when the filter extends
outside the fixture window. Lifetime totals do not change with the date filter.
Demo has no comparison period, so the UI says “Chưa có dữ liệu so sánh”.

A sticky simulation banner remains visible. Demo refresh recalculates local data
and resets review filters. Review filters, pagination and detail modal read local
records; disabled resource queries do not call reporting APIs. Transaction links
are disabled. The operational queue is an explicitly unavailable demo placeholder,
with no real counts and no processing actions. The ordinary authenticated admin
shell can still read its own work-summary/sidebar data outside the demo report.

Production keeps its existing queries, refresh invalidation, date controls,
navigation, error handling and rating precision. No backend, API contract, Android,
payOS, entitlements, database or migrations are changed. No deployment is performed.

Verification: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`.
UI tests render the real shared components with React, check API isolation,
refresh/navigation handlers, date and rating filters, local review details, charts,
seven table rows, and production behavior with a mocked API response. These are
not a live production API or end-to-end payment test.

Deployment: review the diff, pass the checks above, visually compare `/` and
`/outcome-3` in an authenticated staging Admin session at desktop/tablet widths,
then deploy the Admin using the existing hosting process. No backend deployment
or migration is needed. Rollback restores the previous Admin release or reverts
this rework commit; no data rollback is necessary.
