# B-Book Admin — báo cáo triển khai Frontend

Ngày: 01/10/2026. Phạm vi: `D:\EXE\bbook-admin`. Audit trước khi code: [PHASE-0.md](PHASE-0.md).

## 1. FILES CHANGED

Các đường dẫn dưới đây tương đối với `D:\EXE\bbook-admin`; chỉ liệt kê file của lần triển khai này, không liệt kê build output/node_modules.

| File | Thay đổi |
|---|---|
| `.env.example` | Bỏ cấu hình preview; giải thích API server-only, không fallback trong source |
| `.env.local` | Tạo từ đúng EXPO_PUBLIC_API_URL hiện có của app; chỉ sao chép URL công khai, không sao chép JWT/credentials |
| `package.json` | Lint, smoke, format scripts; bản vá Next 16.3.8; ESLint |
| `package-lock.json` | Khóa dependency đã cài/cập nhật |
| `eslint.config.mjs` | Next/TypeScript lint; cho phép img trực tiếp với URL private/signed; giữ hook effect hiện có |
| `src/app/(admin)/[[...route]]/page.tsx` | Guard phân biệt thiếu phiên, không có quyền, lỗi Backend |
| `src/app/access-denied/page.tsx` | Trang thông báo không có quyền |
| `src/app/api/backend/[...path]/route.ts` | Trả 403 riêng cho non-Admin; dùng allowlist đã audit |
| `src/app/api/session/route.ts` | Thông báo quyền truy cập và 403 rõ ràng |
| `src/app/error.tsx` | Link đúng chuẩn Next, giữ retry lỗi kiểm tra phiên |
| `src/app/login/page.tsx` | Dùng session service + submission lock; bỏ link demo |
| `src/app/preview/[[...route]]/page.tsx` | Link preview cũ chỉ redirect login; không render tài khoản/dữ liệu giả |
| `src/components/admin-app.tsx` | Bỏ fake pending counts, preview mode và fetch trực tiếp; dùng session service |
| `src/components/overview-pages.tsx` | Repository/service queries; không lấy page đầu làm tổng MUA; scope KPI rõ ràng |
| `src/components/verification-detail.tsx` | API service thật; lock/invalidation; reset checklist khi hồ sơ tải lại; avatar/status/ảnh dịch vụ thật; supplement disabled |
| `src/components/finance-pages.tsx` | API service thật, thời điểm kích hoạt từ approve response; bỏ phân trang client; Refund lọc status từ BE; bỏ Paid-history giả; chống gửi trùng |
| `src/components/other-pages.tsx` | Bỏ booking/audit mẫu; API notification/style/user thật; phân trang người nhận; URL thông báo nội bộ; overdue action thật có xác nhận |
| `src/components/ui.tsx` | Click ảnh mở preview; null/broken-image states; zoom/fullscreen giữ nguyên |
| `src/lib/client.ts` | Dùng lại client/useResource; query descriptor, abort, targeted invalidation, phân biệt lỗi/empty; submission lock |
| `src/lib/contracts.mjs` | Enum, action presentation, response guards, message sanitizer, duplicate-submit lock |
| `src/lib/format.ts` | Enum mapping thật, bank PENDING_ADMIN, MUA Listed, nullable fields |
| `src/lib/policy.mjs` | GUID allowlist chặt; chỉ thêm route overdue có trong BE; không mở wallet/dispute thiếu dữ liệu |
| `src/lib/server.ts` | Bỏ URL fallback; validate env; phân biệt authorization failure |
| `src/lib/types.ts` | Nullable DTO fields, request contracts, bank approval response và financial provider metadata |
| `src/repositories/admin-api.ts` | Exact routes/query/body và response validation ở API layer |
| `src/services/admin-service.ts` | Domain queries/mutations và targeted invalidation; không optimistic success |
| `src/services/session-service.ts` | Networking cho login/logout, tách khỏi screen |
| `tests/contracts.test.mjs` | Thêm 7 tests quan trọng cho enum/state/contract/error/lock |
| `tests/policy.test.mjs` | Mở rộng test allowlist/GUID/overdue/block unsupported writes |
| `scripts/smoke.mjs` | 10 HTTP checks không credentials, không business writes, không mock Backend |
| `README.md` | Cấu hình, kiến trúc, tích hợp và giới hạn kiểm thử thực tế |
| `audit/PHASE-0.md` | Bảng audit và kế hoạch trước implementation |
| `audit/untouched-baseline.json` | SHA-256 baseline của Backend và Customer/MUA |
| `audit/unchanged-check.json` | Kết quả đối chiếu file không thay đổi |
| `audit/REPORT.md` | Báo cáo này |

Đã xóa: `src/lib/demo.ts`, `public/demo/id-front.svg`, `public/demo/id-back.svg`, `public/demo/portrait.svg`.

## 2. API INTEGRATION MATRIX

Tất cả URL dưới đây có prefix `/api` của Backend, cấu hình qua BACKEND_API_URL. **CONNECTED** nghĩa là đã nối code đúng contract source và có xử lý tải/lỗi/mutation; không đồng nghĩa đã thực hiện giao dịch hay quyết định thật khi kiểm thử. Mọi private API dùng JWT hiện tại qua BFF guard và authorization Backend.

| Admin page | API | Method | Status |
|---|---|---|---|
| Login/session | `/Auth/login`, `/User/profile` | POST, GET | CONNECTED |
| MUA/verification list | `/admin/mua-applications?status&page&pageSize` | GET | CONNECTED |
| MUA detail/CCCD/selfie/services/portfolio | `/admin/muas/{id}` | GET | CONNECTED |
| Approve MUA | `/admin/mua-applications/{id}/approve` | POST | CONNECTED |
| Reject MUA | `/admin/mua-applications/{id}/reject` | POST | CONNECTED |
| Suspension | `/admin/muas/{id}/suspension` | PATCH | CONNECTED |
| Active user directory | `/admin/notifications/users?search&role&page&pageSize` | GET | PARTIAL |
| Lock/unlock contract | `/admin/users/{id}/active` | PATCH | PARTIAL — lock từ row thật; unlock lookup blocked |
| Pending banks | `/admin/bank-accounts/pending` | GET | CONNECTED |
| Bank approval/rejection | `/admin/bank-accounts/{id}/approve`, `/reject` | POST | CONNECTED |
| Payout queue/detail | `/admin/payouts`, `/admin/payouts/{id}` | GET | CONNECTED |
| Payout start | `/admin/payouts/{id}/start-processing` | POST | CONNECTED |
| Payout complete | `/admin/payouts/{id}/complete` | POST | CONNECTED |
| Payout fail | `/admin/payouts/{id}/fail` | POST | CONNECTED |
| Refund queue/filter/detail | `/Refund?status`, `/Refund/{id}` | GET | CONNECTED |
| Refund start | `/Refund/{id}/start-processing` | POST | CONNECTED |
| Refund complete | `/Refund/{id}/complete` | POST | CONNECTED |
| Refund fail | `/Refund/{id}/fail` | POST | CONNECTED |
| Refund retry | `/Refund/{id}/retry` | POST | CONNECTED — chỉ Failed |
| Notification history/create | `/admin/notifications` | GET, POST | CONNECTED |
| Recipient search | `/admin/notifications/users` | GET | CONNECTED |
| Style active list/create | `/Mua/styles` | GET, POST | CONNECTED |
| Dashboard | Complete bank/payout/refund queues + 5 latest MUA rows | GET | PARTIAL — không có KPI toàn hệ thống |
| Booking list/detail | Không có Admin-wide GET; `/Booking` GET chỉ scoped current user | — | BLOCKED_BY_BACKEND |
| Dispute decision | `/Booking/{id}/resolve-dispute` tồn tại, thiếu Admin read/evidence | POST | BLOCKED_BY_BACKEND |
| Overdue maintenance | `/Booking/auto-complete-overdue` | POST | CONNECTED |
| Wallet deposit | `/Wallet/deposit` trả 410 Gone | POST | BLOCKED_BY_BACKEND — deprecated |
| Independent identity/supplement/notes/history | Không có contract tương ứng | — | BLOCKED_BY_BACKEND |
| Audit/settings persistence | Không có API tương ứng | — | BLOCKED_BY_BACKEND |

Contract đã xác minh: application list trả array với page/pageSize clamp 1–50, không total; notification/recipient trả `{items,total,page,pageSize}`; banks/payout/refund trả toàn bộ kết quả query, không server pagination. Refund default loại Completed; status=Completed trả history tương ứng. Payout queue chỉ Pending/ManualActionRequired/Processing/Failed chưa reconciled. Role numeric 0=Admin, 1=Customer, 2=MUA. Payout 0–4; Refund 0–5 (Completed khác Paid, có AwaitingDestination).

Bodies: reject `{reason,reasonCodes,items}`, reason 5–1000, reasonCodes ≥1; suspension `{suspended}`; user `{isActive}`; start `{reference?}` max255; complete `{reference}` required max255; fail `{failureCode,failureMessage}` max100/1000, payout thêm `confirmedFundsNotSent`; retry/approve không cần business body. Notification `{title,body,audience,userIds,url?,idempotencyKey}`, max200/1000/500, selected users ≤100, audiences All/Customer/MUA/SelectedUsers. Style `{name,description?}` max100/255. Bank reject và PATCH actions trả 204; approve bank trả activatedAt/cooling-down metadata.

## 3. REMOVED HARDCODE

- Tất cả fixture MUA/user/avatar/CCCD/selfie/bank/payout/refund/campaign/style trong demo.ts.
- Booking mẫu, tên/số tiền/trạng thái giả và nhật ký admin mẫu trong other-pages.tsx.
- Tài khoản Admin giả, số pending 5/4, nhánh request trả fixture và fake-success preview.
- Nút/link đưa tới Admin bằng dữ liệu mẫu không cần JWT.
- URL Backend fallback trong source; cấu hình lấy từ env của ứng dụng hiện tại.
- KPI tổng MUA/chờ trên 24h suy ra từ page đầu; Paid-history card suy ra từ queue không chứa Paid.
- Phân trang client làm hàng đợi tài chính/ngân hàng trông như API phân trang toàn database.

UI constants còn lại chỉ là labels, icons, presentation mappings, menus và theme. Notification preview chỉ hiển thị chính title/body đang nhập, không phải lịch sử giả. Không có token/Admin ID hardcoded trong source sản phẩm.

## 4. BACKEND GAPS

Mỗi gap dưới đây có **Backend modified: NO**.

| Gap | Missing / issue thực tế | Impact | Frontend handling |
|---|---|---|---|
| #01 Dashboard | Không API analytics/MUA total/24h count; application array không total | Không thể suy ra tổng từ trang đầu | KPI MUA unavailable; chỉ đếm đầy đủ các queue trả về và ghi đúng phạm vi |
| #02 Application search | Không totalCount/totalPages/global search/area query | Không global search hay đánh số tổng trang chính xác | Server page/pageSize/status thật; local filter ghi rõ; Next khi page đầy, không bịa total |
| #03 Identity workflow | Chỉ duyệt toàn bộ MUA; không independent identity/supplement API/status | Không thể xác minh CCCD riêng hoặc gửi supplement độc lập | Nút duyệt ghi đúng toàn hồ sơ, supplement disabled |
| #04 Notes/history | Không persist internal notes/checklist/document-version/review log | Không audit trail đầy đủ | Notes chỉ tạm trong màn; rejection gửi reason thật; history chỉ timestamps/result gần nhất |
| #05 Identity re-review | Sửa giấy tờ sau Approved chưa tự reset trạng thái | Không thể đảm bảo phiên xét duyệt gắn revision | Báo giới hạn; checklist reset khi tải lại; không sửa logic BE |
| #06 Identity files/OCR | Không DOB/CCCD number/cropped face/face match hoặc private document read contract | Không OCR/AI score; FE không thể làm URL public thành private | Dùng URL thật, manual review, missing/broken-image states; không download button |
| #07 Bank history | Chỉ pending list, không Admin history/detail lookup | Không duyệt lại/xem approved/rejected history | Tab history disabled; pending complete array; activation dùng response thật |
| #08 Users | Không all/locked/Admin-user list/detail/status lookup | Không quản trị đầy đủ/mở khóa an toàn từ list | Active recipient directory được ghi rõ; lock row thật; locked tab/unlock lookup unavailable |
| #09 Booking | GET Booking/list/detail scoped owner; không Admin-wide list/detail/evidence | Dispute không có đủ hồ sơ thực tế để enable | Unavailable list, dispute disabled; chỉ nối overdue maintenance có confirmation |
| #10 Payout history | Queue không gồm Paid/Failed reconciled; không history pagination | Không lịch sử toàn bộ tiền đã chi trả | Không giả Paid total/history; detail URL thật vẫn dùng được nếu có ID |
| #11 Action capability | Refund DTO không trả ProviderReferenceId/manual-action eligibility; nhiều điều kiện destination/provider/booking ở service | FE không thể biết toàn bộ eligibility trước POST | Chỉ gợi ý action theo enum đã audit; BE quyết định; conflict/error hiển thị và refetch, không fake status |
| #12 Style CRUD | GET active + POST create; không Admin update/delete/activation tag | Không full CRUD | Chỉ list/create, ghi rõ phần thiếu |
| #13 Audit/settings | Không admin audit or settings persistence API | Không logs hoặc save thật | Unavailable state, không dữ liệu/lưu mẫu |
| #14 Wallet | Deposit controller luôn trả 410 WALLET_DEPOSIT_DEPRECATED | Không nạp ví mới | Không mở proxy/UI thao tác nạp ví |

## 5. BACKEND MODIFICATIONS

**Backend files modified: NONE**.

**Customer/MUA files modified: NONE**.

Đối chiếu SHA-256: 297 Backend files và 738 Customer/MUA files, `ChangedFiles: []`. Xem [unchanged-check.json](unchanged-check.json). Không tạo endpoint Backend, sửa DTO/controller/service/repository/entity/migration, đổi business logic hay Customer/MUA navigation.

## 6. TEST RESULTS

| Check | Result |
|---|---|
| TypeScript | PASS — strict tsc |
| Lint | PASS — Next/TypeScript ESLint, zero warnings |
| Existing + new tests | PASS — 11/11 (4 policy + 7 contract/lock/error tests) |
| Production Web Build | PASS — Next 16.3.8 webpack |
| Format | PASS — Prettier |
| Anonymous HTTP smoke | PASS — 10 checks: page/direct URL/preview redirect, session/API 401, unknown APIs 404, cross-origin 403, invalid login body 400 |
| Real Backend read | PASS — configured public GET /api/Mua/styles trả array styleId/name/isActive đúng contract, không ghi dữ liệu |
| Browser | Login và hide/show password đúng; mobile 390×844 không horizontal overflow; direct verification URL về login; preview link không còn |
| Dependency audit | npm install sau bản vá Next báo 0 vulnerabilities |
| Source verification | Không fetch/request trong screens/components; không demo business records, sensitive console logs hoặc hardcoded API origin trong src |

Các tests sử dụng dữ liệu đầu vào unit tối thiểu, không có mock Backend cho sản phẩm hay giả lập phiên Admin để tuyên bố feature hoạt động. Không đăng nhập bằng credentials tự đoán, không xét duyệt/khóa/tạo thông báo hay thực hiện hành động tài chính thật chỉ để test.

## 7. REMAINING ISSUES

- Các giới hạn Backend trong bảng gap vẫn tồn tại và đã được disable/hiển thị đúng phạm vi.
- Chưa có phiên Admin test thực để E2E toàn bộ private module: successful login, actual private loading/error/empty responses, approve/reject/refetch, mutation error, bank review, financial operations và notification sending. Code/contract/unit/anonymous runtime đã kiểm tra; không tuyên bố các quyết định thật đã chạy thành công.
- API triển khai đang dùng theo config Customer/MUA; private APIs chưa được xác minh runtime có cùng version với source local. Nếu deployment cũ thiếu route/field, FE hiển thị error thật, không fallback sang mock.
- Signed/private identity storage và review revision phải được giải quyết phía Backend trong một task riêng; lần này tuyệt đối không thay đổi Backend.
