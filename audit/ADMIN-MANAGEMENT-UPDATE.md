# Admin management update

## Behavior

- Bank accounts: approved/rejected tabs now call the authenticated backend history endpoint. Rejected inactive records remain visible; ordering is newest review first. History views have no approve/reject actions. Pending accounts whose owner was deleted are excluded, matching the work badge.
- Financial cards: reduced from approximately 122px to 91px in local browser measurement. Cards use a separate database aggregate, independent of list status/search filters. Waiting includes Pending, ManualActionRequired and (refunds only) AwaitingDestination. Completed maps to Completed refunds/Paid payouts. Loading shows ellipsis; unavailable/invalid statistics show a dash and retry, never fabricated zero. Genuine empty database aggregates still return zero.
- Users: dedicated paginated Admin directory for active or locked Customer/MUA accounts; excludes deleted, demo and Admin accounts. Name/email/UUID search. Existing lock endpoint is reused, with confirmations for lock and unlock. Backend denies changes to Admin/demo/deleted users. Existing JWT validation checks IsActive on requests, so locking blocks authenticated access.
- Reports: compact shared list toolbar/table actions, no retry button for a successful empty list, no fabricated total during loading/error. Detail returns target owner ID so the Admin can open the corresponding user account, review it and explicitly confirm a lock. Reports do not automatically suspend accounts.
- Removed persistent API/implementation banners and footnotes from finance, user, MUA list/history and report-related pages. Action errors, success feedback and material confirmation details remain visible.

## Real endpoints

- `GET /api/admin/bank-accounts/history?status=APPROVED|REJECTED`
- `GET /api/admin/management/users?search=...&role=Customer|MUA&active=true|false&page=1&pageSize=20`
- `GET /api/admin/management/financial-summary?refund=true|false`
- Existing `PATCH /api/admin/users/{userId}/active` for lock/unlock.
- Existing report-detail endpoint now includes `targetOwnerId`.

All new endpoints require Admin authorization. The Next BFF allowlist grants only the exact GET routes. Financial aggregates use the same persisted domain/demo eligibility predicates as work-summary, rather than counting a filtered frontend array. No schema or migration change.

## Validation

- Typecheck, ESLint, 36 Node tests, production build and diff whitespace checks passed.
- Backend build passed (three existing warnings outside this change). 21 focused backend tests passed; the updated seven work/management tests also passed after adding lock/unlock/Admin protection assertions.
- Tests cover inactive rejected bank history, status validation, active/locked directory filters, demo/deleted/Admin exclusion, UUID lookup, lock/unlock, protected Admin, and nonzero financial buckets including manual/awaiting/Paid states.
- Browser used the existing isolated PostgreSQL local database and real backend APIs: approved/rejected tabs and locked directory load without errors; financial summary translates/runs on PostgreSQL; financial cards measure 90.9px. Reports use the shared toolbar layout. Existing local management datasets are empty; populated history/account actions are covered by isolated database tests, not claimed as production verification.
- No production data or deploy settings changed, no mobile changes, no commit/push/deploy.

## Deployment

Deploy Backend first, then Admin, so the new reads exist before the frontend calls them. No migration is required. Until Backend is updated, new endpoints correctly show an error rather than placeholder business data.
