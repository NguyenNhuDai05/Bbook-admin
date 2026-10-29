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
- Dashboard: Admin-only `GET /api/admin/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD` provides database aggregates, equal-length previous-period comparisons and daily charts (Vietnam calendar dates, up to 366 days). Revenue is the stored platform fee of currently Completed/AutoCompleted bookings by CompletedAt, before accounting adjustments. Booking value, deposit collection and completed refunds are separate. User totals exclude Admin/deleted accounts and reflect the current directory; new registrations exclude accounts subsequently deleted. Operational cards, sidebar badges and the work bell now use database totals from GET /api/admin/work-summary. The daily table is visible and newest-first. Feedback is collected by the mobile app and managed through real Backend APIs. Deploy Backend with migration 20261006092242_AddUserFeedback before the updated admin and mobile app. See [dashboard and feedback report](audit/ADMIN-DASHBOARD-FEEDBACK.md).
- Independent identity approval, supplement requests, internal-note/checklist persistence, review/document-version history, private document retrieval, OCR and face match require Backend support. The UI does not fabricate these.
- Wallet/deposit exists but returns 410 Gone; it remains unavailable.

## Checks

npm run typecheck
npm run lint
npm test
npm run format:check
npm run build

Tests cover actual enum mappings, eligible financial action presentation, duplicate submission lock, malformed versus empty responses, permissions, sensitive-error sanitization, proxy allowlist and Origin policy. Runtime auth smoke tests use no credentials or business mutations. Authenticated module/mutation end-to-end tests still require a real Admin test session; this task does not claim they were exercised.

The original admin implementation left Backend and Customer/MUA files unchanged (see its historical SHA-256 baseline in audit/unchanged-check.json). The dashboard extension adds an Admin-only controller and date-range utility/tests to Backend. The current dashboard/feedback extension also adds the feedback migration and API, and a feedback submission screen to Customer/MUA mobile sources; existing API contracts remain compatible.

## Giao dịch

Tab **Giao dịch** tại `/transactions` hiển thị doanh thu app, số lượng theo trạng thái, tìm kiếm mã giao dịch/booking/đơn PayOS/tên khách, khoảng ngày thu tiền theo giờ Việt Nam, phân trang và liên kết chi tiết `/transactions/[id]`. Các thẻ đếm theo khoảng ngày và từ khóa; trạng thái được chọn lọc bảng. Bảng giãn theo nội dung, cuộn trang và có nút **Mở rộng bảng** để xem gần toàn màn hình. Bộ lọc nằm trên URL, được giữ khi mở chi tiết và quay lại. Các chỉ số giao dịch ở Tổng quan dẫn đến tab này.

Thẻ **Tổng doanh thu app** luôn lấy `lifetime.revenue` từ API Dashboard, giống thẻ Tổng doanh thu ở Tổng quan. Khi chọn khoảng ngày, dòng **Trong kỳ** bên dưới hiển thị `current.revenue` theo ngày hoàn thành booking; chọn Toàn bộ thì chỉ hiển thị tổng từ đầu đến nay. Từ khóa và trạng thái giao dịch không lọc doanh thu. Lỗi tải doanh thu không thay bằng 0 và không chặn danh sách giao dịch.

Trang dùng API hiện có `admin/dashboard/transactions`: **chỉ các khoản PayOS đã thu tiền**, bao gồm khoản đã hoàn hoặc khấu trừ cọc, không bao gồm thanh toán chờ/hủy/hết hạn hay chi trả MUA. Không suy diễn số tiền hoàn một phần hoặc số tiền thực thu từ trạng thái. Chi tiết hiển thị từng yêu cầu hoàn và liên kết đến trang xử lý hoàn tiền.

Mặc định tải 30 ngày gần nhất. Để đếm/tìm kiếm đầy đủ với API hiện có, trang tải từng lô 50 bản ghi, tối đa 4 yêu cầu đồng thời và 5.000 giao dịch; báo cáo lớn hơn yêu cầu thu hẹp khoảng ngày. Tải lỗi, thay đổi tổng hoặc trùng mã trong lúc tải sẽ hiển thị lỗi thay vì tổng một phần. Khi quy mô tăng, cần API backend lọc và tổng hợp server-side; việc bổ sung trạng thái chưa thu tiền cũng cần mở rộng backend. Không cần migration hoặc cấu hình mới cho phiên bản admin này.

## Website Analytics

**Lượt nhấn APK theo ngày cập nhật nhanh:** KPI APK và tab APK dùng bộ đếm nội bộ từ backend `/api/WebsiteMetrics/apk-daily`, qua proxy Admin `/api/analytics/apk-daily`. Tự làm mới 45 giây khi trang hiển thị, cache server 10 giây, không tải lại toàn bộ báo cáo GA4. Cần migration backend `20261015000000_AddWebsiteApkCounters`, `WebsiteMetrics__Enabled=true`, rồi bật `APK_COUNTER_API_URL` trên website. Không thêm secret mới vào Admin. Ngày trước lần ghi nhận đầu tiên là —; ngày bắt đầu có thể thiếu dữ liệu đầu ngày. Lỗi backend được báo rõ, không giả số 0 và không cộng với GA4. Deploy backend → admin → website; không cần build APK mới.

Tab **Lượt xem trang** trong Xu hướng truy cập hiển thị `screenPageViews` realtime cho cùng web stream: lượt xem 5/30 phút gần đây, biểu đồ và bảng chi tiết từng phút. Tính cả lượt xem lại đã được GA4 ghi nhận. API `/api/analytics/realtime/views` yêu cầu phiên Admin, dùng chung service account/`GA4_WEB_STREAM_ID`, cache 25 giây riêng theo metric và cập nhật giao diện mỗi 30 giây khi tab hiển thị. Không cộng dữ liệu này vào KPI **Tổng lượt xem trang** theo khoảng ngày. Không cần biến môi trường mới, migration hay sửa tracking website. Khi nghiệm thu production: đồng ý Analytics, tải lại trang, kiểm tra `page_view` trong GA4 Realtime và đối chiếu lượt xem mới sau chu kỳ cập nhật; cùng một người có thể tăng lượt xem mà số người không tăng. Tab đang mở lại không tự phát sinh lượt xem mới; dữ liệu còn phụ thuộc consent, ad blocker và độ trễ GA4.

Trang `/analytics` đọc dữ liệu GA4 qua API được bảo vệ bằng phiên Admin hiện tại. Cấu hình và kiểm thử theo [GA4_ANALYTICS_SETUP.md](GA4_ANALYTICS_SETUP.md); cần Property ID và service account server-side, ngoài Measurement ID của landing page.

Tab **Người hoạt động** trong Xu hướng truy cập dùng GA4 Realtime: số người duy nhất trong 5/30 phút gần đây và biểu đồ 30 cột theo phút. Cần thêm `GA4_WEB_STREAM_ID` (Stream ID dạng số tại GA4 → Admin → Data streams → website), không phải Measurement ID `G-...`. Realtime không hỗ trợ hostname nên lọc chính xác stream website và platform web; chọn đúng stream production. Tab dùng cùng service account hiện tại, chỉ Admin được đọc qua `/api/analytics/realtime`. Tự tải mỗi 30 giây khi tab đang mở và trang hiển thị; server cache 25 giây và gộp yêu cầu đồng thời. Không cộng người từng phút thành tổng 30 phút. Bao gồm người mới/quay lại, không cần đăng nhập website, nhưng vẫn phụ thuộc consent, chặn Analytics và độ trễ GA4. Thiếu stream/config, lỗi quyền hoặc quota hiển thị trạng thái riêng, không giả là 0 người. Không cần migration hoặc thêm kết nối PostgreSQL cho dữ liệu này.
