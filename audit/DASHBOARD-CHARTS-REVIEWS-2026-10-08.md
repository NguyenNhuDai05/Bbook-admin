# Dashboard charts and service reviews

Implemented in the local Admin and backend repositories on 2026-10-08.

- Revenue is a daily SVG line chart with hover, focus and touch values. Its existing definition remains platform fees recorded on completed bookings, using Vietnam calendar days.
- New accounts use a daily bar chart with tabs for all new users and new Makeup Artists. MUA counts use account creation dates for accounts currently carrying the MUA role; they do not represent verification approval dates.
- Recent reviews have a 280px independently scrollable list, 20-item pagination and clickable star filters. Filtering happens on the server before pagination, across the selected date range.
- A review opens a detail dialog with its full comment, attached image viewer, customer, MUA name/ID, booking ID, appointment, status, value, services and MUA reply. The existing review model supports one attached image.
- Removed and demo reviews remain excluded. Names of deleted accounts remain redacted.
- Added a top summary row with service review count, average score (empty periods display an em dash), and successful PayOS payment count. The count uses PaidAt within the Vietnam date range, excludes demo bookings and includes payments subsequently refunded, consistent with the existing depositsCollected metric. It counts payment records, not bookings, refunds, or wallet ledger entries. The dashboard API adds successfulTransactions to current/previous; deploy backend before this frontend because response validation requires the field.

## API and rollout

Added Admin-only, non-cacheable GET endpoints under `/api/admin/dashboard/reviews` and `/api/admin/dashboard/reviews/{id}`. The Admin BFF explicitly permits only these GET routes. No schema changes or migrations are required. Deploy the backend endpoints before or together with the updated Admin frontend. These changes have not been deployed to the live site.

## Validation

- Admin lint and TypeScript checks passed.
- Admin Node tests: 42 passed, including review proxy route authorization checks.
- Admin production build passed.
- Backend targeted dashboard tests: 10 passed, 2 existing PostgreSQL integration tests skipped because their dedicated test database is not configured.
- Review tests exercise date and star filtering before pagination, detail fields, image and reply, removed/missing reviews, deleted customer redaction, invalid inputs and Admin authorization metadata.
- Authenticated live browser interaction and production PostgreSQL execution were not verified in this session.

## Top KPI follow-up

The new transaction count has strict nonnegative integer validation in the frontend. The PostgreSQL statistics fixture covers paid and subsequently refunded payments, previous-period payments, demo bookings, the exclusive end boundary and pending payments. Backend build passed (three pre-existing warnings); the dashboard test filter passed 10 tests and skipped 3 database-dependent tests. No live deployment was performed.
