# B-Book Operations Dashboard — audit và validation

Ngày: 07/10/2026. Phạm vi: Dashboard/Tổng quan và thống kê phục vụ Dashboard.
Không commit, push, deploy; không thay auth, sidebar, mobile hay business logic booking/payment.

## A. CURRENT DASHBOARD AUDIT

Frontend trước thay đổi:
- `overview-pages.tsx::Dashboard`: PageTitle → 7 work cards → DashboardAnalytics → RecentFeedback → hồ sơ MUA chờ duyệt.
- `dashboard-analytics.tsx`: mặc định 30 ngày; 4 nút preset và 2 date inputs luôn hiện; KPI thiếu tổng booking/MUA mới; tổng user nằm ở KPI chính. Charts là CSS bars tự viết, không có chart library trong package.json.
- `adminService.dashboard` → `adminApi.dashboard` → proxy GET `admin/dashboard`; `useResource` hỗ trợ retainData nhưng Dashboard cũ chưa bật. WorkSummaryProvider đã có resource riêng dùng chung với shell/sidebar.
- Shared AdminContentLayout đã phân loại Dashboard là scrollable. Giữ nguyên shell, max-width, sidebar, footer và hành vi scroll.
- RecentFeedback là app feedback hiện hữu, không phải Customer review MUA; thống kê này không được dùng thay thế chất lượng dịch vụ.

Backend trước thay đổi:
- `AdminDashboardController`: Admin-only, current/previous equal-length periods, doanh thu/phí, completed bookings, new users, deposits, refunds, current user directory, daily revenue/registrations, actual booking statuses.
- Booking có 11 trạng thái: Pending, Approved, Completed, Cancelled, WaitingCustomer, PendingPayment, PendingConfirmation, Rejected, InProgress, Disputed, AutoCompleted.
- Revenue thật là SUM PlatformFeeAmount của booking hiện đang Completed/AutoCompleted và có CompletedAt trong kỳ. Không phải SUM TotalAmount, tiền cọc hoặc payout. Giữ cách tính, không gọi các metric tài chính khác là revenue.
- `AdminWorkSummaryController` đã aggregate verification, bank approvals, unresolved complaints, content reports, action-required payouts/refunds, app feedback; current state, không nhận date filter.
- Review có rating 1–5, Comment, BookingId, CustomerId, MUAId, CreatedAt, MUA reply. API public theo MUA, chưa có aggregate Dashboard.
- UserFeedback ĐÃ tồn tại cùng API create/list/detail/review, migration và trang `/feedback`; không có rating/sentiment. Không triển khai domain feedback mới trong task này.
- Không có global persisted audit/activity endpoint phù hợp. Trang `/activity` vẫn là PlannedPage; không dựng timeline từ các field cập nhật rời rạc.
- Phát hiện Review.Customer/MakeupArtistProfile navigation được EF convention map bằng shadow foreign keys; Dashboard dùng các ID nghiệp vụ thật để tránh hụt dữ liệu. Không đổi schema/navigation/business flow ngoài phạm vi.

## B. DATA AVAILABLE

| Metric | Nguồn và ý nghĩa |
|---|---|
| Tổng booking trong kỳ | Booking.CreatedAt, loại IsDemo |
| Booking hoàn thành | Completed/AutoCompleted, CompletedAt trong kỳ |
| Doanh thu nền tảng | PlatformFeeAmount trên các booking hoàn thành nói trên, đơn vị VND |
| Giá trị booking hoàn thành | TotalAmount, giữ field hiện hữu nhưng không đặt tên revenue |
| Tiền cọc đã thu | PayOS BookingPayment.PaidAt, giữ field hiện hữu |
| Hoàn tiền hoàn tất | Refund.CompletedAt, status Completed, giữ field hiện hữu |
| User mới / MUA mới | User.CreatedAt, role Customer/MUA; loại Admin, demo và đã xóa |
| Tổng user / Customer / MUA / bị khóa | Directory hiện tại, cùng điều kiện loại trừ |
| Booking/revenue/registrations/MUA theo ngày | Database GROUP BY ngày Việt Nam; ngày không phát sinh được bổ sung 0 từ kết quả aggregate |
| Booking breakdown | Trạng thái hiện tại của booking tạo trong kỳ, giữ từng trạng thái thật |
| Service review statistics | Review.CreatedAt trong kỳ; valid rating; liên kết booking/customer/MUA nhất quán; loại demo và review bị ContentReport Removed |
| Work queues | Endpoint current state hiện hữu, độc lập date range |
| Recent activity | Không có nguồn tổng hợp đáng tin cậy → không hiển thị |

Không dùng sentiment, trend giả, rating profile cache thay aggregate, hoặc full list download để tính KPI.

## C. BACKEND CHANGES

Mở rộng GET `api/admin/dashboard`:
- current/previous thêm `totalBookings`, `newMuas`.
- daily thêm `bookings`, `newMuas`.
- DTO `serviceReviews` riêng: total, nullable averageRating, lowRatingCount, 5 rating buckets, reviewedCompletedBookings, eligibleCompletedBookings, 4 recent records.
- Count/Aggregate ở database; chỉ 5 rating buckets và tối đa 4 recent rows trả về để tính/trình bày. Không N+1; tên người dùng dùng correlated SQL theo ID thật. User đã xóa được ẩn tên.
- No-store response. Giữ Admin-only. Query tuần tự trên cùng DbContext để tránh EF concurrency lỗi.
- Không migration, API fake, thay đổi fee/payment/refund calculations, hoặc thay đổi feedback domain.

## D. DASHBOARD REDESIGN

- Header: title/subtitle, native compact range select, refresh. Mặc định 7 ngày; custom picker chỉ hiện khi chọn tùy chỉnh.
- 4 primary KPI: booking, platform revenue, new users, new MUA; icons nhỏ, card trắng khoảng 122px, comparison dựa current/previous thật; previous=0 hiện “Kỳ trước: 0”.
- Analytics khoảng 65/35: revenue bars 285px; axis K/M, tooltip VND đầy đủ; booking breakdown giữ actual statuses và tỷ lệ thật, màu semantic, không gộp mất nghĩa.
- WorkQueue compact rows dùng module metadata hiện hữu và resource shell dùng chung. Nonzero badge accent; zero neutral. Route thật cho từng queue. Không tạo “Xem tất cả”/drill-down giả.
- ServiceReviews riêng ở cột bên cạnh: điểm trung bình, distribution, low ratings, recent reviews hai dòng, coverage. Không lẫn app feedback/rating.
- Không recent activity khi nguồn global log chưa có.
- User directory chuyển xuống secondary overview. Daily details có pagination 10 ngày, mới nhất trước; chart vẫn chronological.
- Skeleton theo bố cục. Refresh cùng kỳ giữ data; lỗi ghi rõ stale. Kỳ mới lỗi không dựng KPI bằng 0. Queue lỗi độc lập statistics; aggregate statistics lỗi chung theo architecture hiện hữu. Không show raw exceptions.
- Keyboard, focus-visible, accessible money labels từng bar, keyboard tooltip, progress labels, reduced reliance on color. Booking reference là text vì trang chi tiết booking hiện vẫn placeholder.

## E. FEEDBACK STATISTICS — 2 DOMAIN ĐỘC LẬP

**Đánh giá dịch vụ:** Review.Rating 1–5, Comment, CreatedAt, booking/customer/MUA. Không có category/status xử lý riêng. Dùng rating trung bình, tổng review trong kỳ, distribution, <=2 sao, recent review và coverage. Không suy sentiment, không dùng UserFeedback làm rating.

**Phản hồi người dùng:** UserFeedback đã tồn tại, KHÔNG có rating; Category Bug/Suggestion/Other; Status New/InProgress/Resolved/Closed; CreatedAt/UpdatedAt/Version; có FeedbackEvents lịch sử xử lý. Không có resolvedAt. Chỉ giữ queue app feedback đã có (`New`/`InProgress`, API current state) và route `/feedback?status=Open`; không thêm domain, API hay statistics app feedback mới. Dashboard module/config có thể mở rộng khi cần.

## F. DATE RANGE SEMANTICS

- Calendar ngày Việt Nam UTC+7; `[from 00:00, to+1 00:00)` đổi sang UTC. Tối đa 366 ngày.
- Previous period bằng số ngày current và kết thúc ngay trước current. Ví dụ 01–07/10/2026 so với 24–30/09/2026.
- Booking KPI/breakdown/daily booking: CreatedAt. Revenue/completed: CompletedAt. Users/MUA: User.CreatedAt. Review total/distribution/recent: Review.CreatedAt.
- Review coverage: denominator là booking hoàn thành trong kỳ; numerator là số booking đó hiện có review hợp lệ, kể cả review gửi sau kỳ. Không chia tổng review tạo trong kỳ cho tổng booking hoàn thành khác cohort. Không có denominator → “—”.
- Work queues và current user directory không phụ thuộc range.
- Doanh thu chưa trừ điều chỉnh kế toán từ refund; footnote trình bày rõ. Không đổi business calculation để khớp reference.

## G. FILES CHANGED

Frontend (`D:/EXE/bbook-admin`):
- Add `src/components/dashboard-operations.tsx` — Header/KPI/chart/breakdown/queue/reviews/daily.
- Add `src/components/dashboard.module.css` — scoped layout/visual/responsive/focus.
- Add `src/lib/dashboard-presentation.mjs` — date, comparison, currency axis, booking labels/colors.
- Update `src/lib/dashboard.ts` — dashboard-ready DTO và validate strict; không fallback missing metrics thành 0.
- Update `src/components/overview-pages.tsx` — Dashboard delegation; bỏ fetch applications/recent app feedback khỏi Dashboard.
- Delete `src/components/dashboard-analytics.tsx` — thay Dashboard analytics cũ.
- Add `tests/dashboard-presentation.test.mjs` — date/comparison/currency/contract.
- Add báo cáo này.

Backend (`D:/EXE/BeautyBook`):
- Update `BeautyBookBackend/Controllers/AdminDashboardController.cs`.
- Update `BeautyBookBackend.Tests/DashboardDateRangeTests.cs`.
- Add `BeautyBookBackend.Tests/DashboardStatisticsTests.cs`.

## H. TEST RESULTS

- `dotnet build ... --no-restore -p:UseAppHost=false`: PASS, 0 errors. Có 3 warnings cũ ở ServiceController/MuaService, ngoài scope.
- Backend focused suite `Dashboard|AdminWorkAndFeedbackTests`: 18/18 PASS, không skipped, PostgreSQL local thật. Sau bổ sung daily booking/MUA: 2/2 DashboardStatisticsTests rerun PASS.
- Test ranh giới UTC+7, today/7/30/custom, current/previous, zero/empty, revenue 6.408.000 VND và daily 6.400.000 VND, tổng statuses, review distribution/low/coverage, loại demo/removed, independent queues, HTTP 401/403/Admin OK/no-store/invalid range.
- Frontend typecheck PASS; ESLint PASS; 41/41 node tests PASS; production build PASS; git diff --check PASS ở hai repos.
- Browser production build: initial skeleton/loaded/empty; 4 presets; custom valid/invalid qua keyboard; refresh; daily descending; navigation refund queue.
- Nonzero UI test dùng database LOCAL RIÊNG `dashboard_ui_test_20261007`, record/tên/comment ghi rõ KIỂM THỬ; API/EF PostgreSQL thật, không mock API hay hardcode numbers frontend. Xác nhận rating 4/5 từ 4 reviews [5,4,2,5], distribution 2/1/0/1/0, low=1, coverage=4/4. Đây là FIXTURES, KHÔNG số liệu kinh doanh.
- Tooltip 6.450.000 ₫ đúng; Tab sang bar tiếp theo hiển thị 650.000 ₫. Review clamp=2, height=38.4px.
- Controlled backend outage: refresh giữ KPI nonzero + queue 1 có stale warning; đổi kỳ lỗi không dựng KPI 0. Retry/khôi phục thành công. Console healthy runs không warning/error; HTTP failures trong outage là tình huống chủ động kiểm thử.
- Preview đã trả về database local ban đầu `style_lifecycle_preview`; không có booking/review ở DB đó nên empty states/0 hợp lệ. Không dùng production database.

## I. RESPONSIVE RESULTS

| Viewport | KPI | Height | Chart | Horizontal page/main overflow |
|---|---|---|---|---|
| 1920×1080 | 4/cột cùng hàng | 123px | 285px | Không |
| 1536×864 | 4/cột cùng hàng | 122px | 285px | Không |
| 1440×900 | 4/cột cùng hàng | 122px | 285px | Không |
| 1366×768 | 4/cột cùng hàng | 122px | 285px | Không |
| 1280×720 | 4/cột cùng hàng | 122px | 285px | Không |
| 768×1024 | 2×2 | 122px | 285px | Không |
| 390×844 | 1/cột | 122px | 280px | Không |

Đo cả empty và nonzero qua browser. Main overflow-y auto, scroll dọc hợp lệ; không nested vertical card scroll. Sidebar giữ nguyên.

Proof artifacts ngoài repo ở `D:/EXE/.verification/`:
- `dashboard-final-1440x900.jpg`: database local ban đầu, empty thật.
- `dashboard-TEST-{width}x{height}.jpg`: dữ liệu kiểm thử PostgreSQL, không business numbers.
- `dashboard-TEST-tooltip.jpg`, `dashboard-TEST-reviews.jpg`, `dashboard-error-TEST.jpg`.
- `dashboard-responsive.json`, `dashboard-TEST-responsive.json`.
- `dashboard-ui-seed/`: helper chỉ để tạo database UI test riêng, không thuộc code deploy.

## J. RISKS / TODO

- Khi có một yêu cầu deploy riêng sau này, backend có DTO mới cần được cập nhật trước frontend. Task này KHÔNG deploy.
- Chưa có global activity log: section bị bỏ, không giả hoặc link đến PlannedPage.
- Booking/review management drill-down đầy đủ chưa có; Dashboard chỉ reference booking ID, không tạo affordance giả. Không thêm trang khác.
- Shadow navigation của Review là vấn đề hiện hữu ngoài Dashboard; truy vấn mới không phụ thuộc nó. Có thể audit riêng repository/service Review sau này, không tự mở scope.
- Revenue là stored fee, không phải net accounting revenue sau refund adjustments. Current status/rating visibility là current persisted state, không historical snapshots.
- Statistics vẫn dùng một aggregate endpoint, nên lỗi query trong aggregate báo lỗi statistics chung; work queue có resource/error riêng. Không rewrite backend architecture.
- Chưa benchmark production latency hoặc production dataset; kiểm thử chỉ local/test. Không đưa fixture vào code production.

## K. GIT DIFF SUMMARY

- Frontend: thay Dashboard cũ bằng module operations, CSS scoped, strict DTO, utility/test và audit report.
- Backend: endpoint mở rộng additive fields và Review aggregate; không schema change.
- Tổng: 11 repo files (8 frontend, 3 backend), tất cả unstaged; không commit/push/deploy. Helper và screenshot nằm ngoài 2 repos.
