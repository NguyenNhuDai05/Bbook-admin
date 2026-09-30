# B-Book Web Admin

Next.js 16.3.8 / React / TypeScript. Desktop-first responsive Web Admin. Only real Backend data; no business fixtures, preview accounts or authentication bypass.

## Run

Use the same Backend API address configured for the existing Customer/MUA application. Configure server-only BACKEND_API_URL and APP_ORIGIN in .env.local. .env.example shows the local-development format; source code has no API URL fallback. This task copied only EXPO_PUBLIC_API_URL from the existing app into BACKEND_API_URL, without copying credentials or changing the Expo project.

Run npm install, npm run dev; open /login on the configured APP_ORIGIN (development port 3001). For production configure HTTPS origins, then npm run build and npm start. Old /preview links redirect to login.

## Architecture / security

Page → useResource/useSubmission → adminService → adminApi repository → existing request client → same-origin BFF → existing Backend.

The original Web Admin HttpOnly, SameSite=Strict JWT cookie is reused (Secure in production). Token is obtained from Auth/login and verified through User/profile on each protected request. No second native auth/client or TanStack Query system is introduced. 401 returns to login; 403 shows permission denied. BFF permits only audited routes and checks mutation Origin. Resource loads are cancellable, reject malformed responses, distinguish loading/error/empty, and refetch related resources after mutations. A synchronous submission lock prevents double clicks. No optimistic financial/review success, sensitive logging, document downloading, automatic bank transfer or biometric match claim.

Backend is authoritative for every action. Payout/Refund UI only records external processing. Explicit confirmations and reference/reconciliation inputs are required where supported. Notification idempotency keys survive unchanged-payload retries. Document URLs are used exactly as supplied; null/broken images show an honest state.

## Integration and gaps

See [initial audit](audit/PHASE-0.md) and [full implementation report](audit/REPORT.md) for all exact methods/routes/DTO contracts, changed files, gaps and validation limits.

- Applications: real server page/pageSize/status; no invented total or global search. Local name/area search clearly applies to the current page.
- Banks: full pending queue, approve/reject, activation date from approve response; no bank-history API.
- Payout: full current queue, real detail and actions; no Paid-history API.
- Refund: real status query, including Completed; real detail/start/complete/fail/retry. No invented pagination.
- Notifications: paginated history and recipient search; real creation with audience/idempotency/internal URL.
- Users: notification-recipient directory only (active Customer/MUA), real lock action; no all/locked-user list or safe unlock lookup.
- Booking: no Admin-wide list/detail/evidence. Dispute unavailable; existing overdue maintenance has an explicit confirmation.
- Styles: active list/create only; no fake update/delete/activation.
- Dashboard: no MUA total/24h count from first page; exact counts only for complete returned queues, no lifetime analytics.
- Independent identity approval, supplement requests, internal-note/checklist persistence, review/document-version history, private document retrieval, OCR and face match require Backend support. The UI does not fabricate these.
- Wallet/deposit exists but returns 410 Gone; it remains unavailable.

## Checks

npm run typecheck
npm run lint
npm test
npm run format:check
npm run build

Tests cover actual enum mappings, eligible financial action presentation, duplicate submission lock, malformed versus empty responses, permissions, sensitive-error sanitization, proxy allowlist and Origin policy. Runtime auth smoke tests use no credentials or business mutations. Authenticated module/mutation end-to-end tests still require a real Admin test session; this task does not claim they were exercised.

Backend files modified: NONE. Existing Customer/MUA files modified: NONE (SHA-256 baseline comparison recorded in audit/unchanged-check.json).
