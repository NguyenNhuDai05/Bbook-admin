# Phase 0 — audit before implementation (2026-10-01)

Scope: bbook-admin. Backend and bbeauty-app are read-only. No backend endpoint, logic or Expo navigation will be changed.

Inspected all web source components, auth/networking, types and policy; Expo admin screens/layout, services, repositories, query hooks, types and API auth pattern; Backend AdminMua/AdminBankAccount/AdminNotification/Payout/Refund/Booking/Wallet/Mua/User controllers, request/response DTOs, enums, eligibility, notification and financial services. Web has its own HttpOnly BFF auth and useResource hook; Expo uses Axios/AsyncStorage/TanStack Query. Reuse web pattern; do not import native auth into this separate web project or add another API client/query system.

| Admin feature | UI hiện có | API hiện có | FE đã nối? | DTO khớp? | Có thể triển khai? |
|---|---|---|---|---|---|
| Auth | Login, logout, guarded pages/BFF | POST Auth/login; GET User/profile | Yes | TokenDto, UserProfileDto checked | Yes; distinguish 401/403/outage |
| Dashboard | Queue KPI, latest applications | Existing queues only | Yes | MUA count incorrectly derives page 1 | Partial; suppress MUA total, count full queues only |
| MUA list/detail | Table + 5 tabs, docs preview | GET admin/mua-applications; GET admin/muas/{id} | Yes | List is array, no total; detail profile/docs/eligibility | Yes, server pagination without invented total |
| Approve/reject/suspend | Confirm modals | POST application approve/reject; PATCH suspension | Yes | Reject reason 5–1000, reasonCodes min 1; approved whole profile | Yes; backend authoritative; add synchronous double-submit lock |
| Identity independent/supplement | Supplement modal, temporary notes | No independent status/action/notes/history | No | Missing contract | Disable; report gap |
| Banks | Pending + confirm | GET pending; POST approve/reject | Yes | Full pending array; approve returns activatedAt; reject 204 | Yes; use response activation date; cooldown 24h enforced in source |
| Payout | Queue/detail/manual actions | GET queue/detail; POST start/complete/fail | Yes | Queue PayoutDto, detail AdminPayoutDto; numeric enum 0–4 | Yes; no paid history in queue, no server pagination |
| Refund | Queue/detail/manual actions/retry | GET Refund?status; GET detail; POST 4 actions | Yes | Numeric 0–5; default queue excludes Completed | Yes; use status filter for completed; no client pretend pagination |
| Notifications | History/create/recipient picker | GET/POST admin/notifications; GET users | Yes | PagedResult items/total/page/pageSize; audience 4 values; idempotency GUID | Yes; add real recipient pagination and optional internal URL |
| Users | Active recipients + lock | GET notification users; PATCH user active | Partial | Search excludes inactive/deleted/Admin; no isActive field | Partial; explicitly limited active directory, no all/locked list |
| Booking | Preview fake list | GET Booking scoped to current Customer/MUA, not Admin-wide; POST resolve-dispute; POST auto-complete-overdue | No | Dispute requires real disputed/frozen booking | List/dispute blocked; global overdue maintenance API available |
| Styles | Active list/create | GET/POST Mua/styles | Yes | styleId int, nullable name/description; name100/description255 | Yes; no update/delete/admin activation |
| Wallet deposit | None | POST Wallet/deposit returns 410 | No | Deprecated regardless of DepositDto | Disabled; do not expose as active |
| Audit/settings | Placeholder + preview fake log | No admin history/settings APIs | No | Missing | Unavailable; remove fake rows |

Known gaps: totals/global search/area filter for applications; separate identity approval/supplement status; internal-note/checklist/document revision history; private document retrieval; OCR/face match results; bank history; full user list/detail/locked status; admin-wide booking list/detail/evidence; payout paid history; general dashboard analytics; audit/settings persistence; deprecated wallet deposit.

Implementation plan: remove preview fixtures/routes/assets; centralize exact API contracts in repository and domain service over existing client; reuse useResource with typed query descriptors and targeted invalidation; share mutation lock; correct real pagination/filter/KPI scope, authorization/error/empty handling and image failures; validate source contracts/tests/build/responsive; produce final report and unchanged-file hash comparison.
