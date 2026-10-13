# Website Analytics — BBook Admin

## Đã triển khai

Menu **Website Analytics** dẫn đến `/analytics`, trong shell/scroll/sidebar hiện tại. Trang có bảy KPI MVP và giữ KPI Play Store, bộ lọc 7/30/90 ngày (mặc định 30), khoảng tùy chỉnh tối đa 366 ngày, một biểu đồ chuyển giữa Users/Sessions/APK clicks theo ngày, có tooltip và bảng ngày, nguồn truy cập, chiến dịch UTM, hai nhánh APK/Google Play và lượt xem theo page path thực tế. Có loading, zero, empty, chưa kết nối, lỗi và Retry; không dùng dữ liệu demo trong production.

Audit: Admin là Next.js 16.3.8 App Router + React 19 + TypeScript + lucide-react. Không có thư viện chart; dashboard hiện có dùng SVG nên chart Analytics cũng dùng SVG. Các tokens pink, surface, border, font, buttons và scroll layout hiện tại được giữ. Endpoint `/api/analytics` lấy dữ liệu qua Google Analytics Data API ở server, không qua ASP.NET backend. Không thêm database/migration hoặc sửa authentication.

`currentAdmin()` dùng cookie HttpOnly và gọi `User/profile` trên backend để xác minh token và quyền Admin; không decode JWT tại frontend để quyết định quyền. Endpoint mới dùng đúng cơ chế này, kiểm tra quyền trước date validation/config/cache. Chưa đăng nhập trả 401; người không có quyền trả 403; backend auth không sẵn sàng trả 503. Không có endpoint GA4 public.

Ảnh tham khảo không có trong tệp đính kèm đã nhận; giao diện được triển khai theo design system hiện tại của Admin.

## Biến môi trường

| Biến                              | Ý nghĩa                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `GA4_PROPERTY_ID`                 | ID property **dạng số**, ví dụ trong GA4 Admin → Property details; không phải Measurement ID `G-...`                     |
| `GOOGLE_APPLICATION_CREDENTIALS`  | Đường dẫn tuyệt đối đến file JSON service account trên server (ưu tiên); Render Secret Files ở `/etc/secrets/<filename>` |
| `GA4_SERVICE_ACCOUNT_JSON_BASE64` | Cách cũ, **không bắt buộc**; chỉ dùng khi không đặt `GOOGLE_APPLICATION_CREDENTIALS`                                     |
| `GA4_HOSTNAMES`                   | Danh sách hostname cách nhau bởi dấu phẩy; mặc định `bbookmakeup.com,www.bbookmakeup.com`                                |
| `BACKEND_API_URL`                 | Giữ API backend hiện tại để xác minh Admin                                                                               |
| `APP_ORIGIN`                      | Giữ origin của Admin hiện tại                                                                                            |

Measurement ID đã có trên landing page chỉ phục vụ thu thập; **không đủ để đọc báo cáo GA4**. Không đặt credentials dưới biến `NEXT_PUBLIC_`, không đưa file key vào Git hoặc chat Codex.

Hỗ trợ ADC từ `GOOGLE_APPLICATION_CREDENTIALS` cho JSON loại `service_account`, đúng với Secret File của Render. Lớp OAuth server hiện có giữ scope `analytics.readonly`, ký JWT và đổi access token như trước; không thêm thư viện hoặc thay đổi metrics. Đây là hỗ trợ nguồn file service account qua biến ADC, không triển khai tìm credentials từ gcloud user login, metadata server hoặc Workload/Workforce Identity Federation. Nếu cả ADC file và base64 cùng có giá trị, ADC file được ưu tiên. File mất/quyền đọc bị từ chối/JSON sai sẽ trả lỗi đã chuẩn hóa, không fallback sang base64. Không trả nội dung file, private key, access token hoặc đường dẫn lỗi filesystem về frontend/log.

## Từng bước Google Analytics và Google Cloud

1. Mở [Google Analytics](https://analytics.google.com/), chọn đúng property chứa Web stream của `bbookmakeup.com`. Vào Admin → Property details, lấy Property ID dạng số.
2. Trong Property details, đặt reporting timezone Vietnam / `Asia/Ho_Chi_Minh`. `Asia/Saigon` cũng được chấp nhận vì là alias cùng múi giờ. Dashboard không âm thầm coi dữ liệu từ timezone khác là ngày Việt Nam.
3. Mở [Google Cloud Console](https://console.cloud.google.com/), chọn/tạo project. APIs & Services → Library → bật **Google Analytics Data API**.
4. IAM & Admin → Service Accounts → Create service account. Không cần cấp quyền Editor/Owner cho project chỉ để đọc GA4.
5. Trong service account → Keys → Add key → Create new key → JSON. Lưu ở thư mục riêng ngoài repository. Nếu tổ chức chặn tạo key, cần quản trị viên cấu hình phương thức credentials được phép; không làm yếu chính sách tổ chức.
6. Sao chép **email service account**. Quay lại GA4 → Admin → Property access management → Add users → nhập email đó → quyền **Viewer**. Quyền IAM trong Google Cloud không thay thế quyền đọc property GA4.
7. **Khuyến nghị trên Render:** lưu JSON trong Web Service → Environment → Secret Files; đặt `GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/<filename>`. Để trống hoặc bỏ `GA4_SERVICE_ACCOUNT_JSON_BASE64`. Khi chạy local, dùng đường dẫn tuyệt đối tới JSON nằm ngoài repository trong `.env.local`. Server chỉ đọc file lúc có yêu cầu Analytics đã xác thực, không cần đọc key trong production build.

   **Cách cũ tùy chọn:** nếu không dùng Secret File/ADC, chuyển JSON sang base64 bằng PowerShell trên máy của bạn (thay đường dẫn thực tế):

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\secure\ga4-service-account.json')) | Set-Clipboard
   ```

   Dán vào `GA4_SERVICE_ACCOUNT_JSON_BASE64` và không đặt `GOOGLE_APPLICATION_CREDENTIALS`. Không gửi giá trị này cho người khác. Base64 là mã hóa biểu diễn, không phải mã hóa bảo mật.

8. Xác nhận landing page đã deploy Google tag và có consent; nhấn APK để có event `apk_download_click`. Google Play hiện chưa có URL nên `play_store_click` bằng 0 là hợp lệ. Không tạo event giả để lấp số liệu.
9. Xem Realtime/DebugView của GA4 trước, rồi chờ xử lý báo cáo chuẩn (thường 24–48 giờ). Không bắt buộc đăng ký custom dimensions cho các dimension session attribution chuẩn dùng trong dashboard.

## Cấu hình Render và tự deploy

1. Mở Web Service **bbook-admin** hiện tại → Environment.
2. Cấu hình trường hợp hiện tại:

   ```dotenv
   GA4_PROPERTY_ID=558760053
   GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/bbook-analytics-1805c0b835ce.json
   ```

   Secret File phải có filename chính xác `bbook-analytics-1805c0b835ce.json` trên **Web Service bbook-admin**. Không cần `GA4_SERVICE_ACCOUNT_JSON_BASE64`; giữ nguyên `BACKEND_API_URL`, `APP_ORIGIN` và build/start hiện tại. `GA4_HOSTNAMES` mặc định đã gồm bbookmakeup.com và www.bbookmakeup.com. Giá trị Property ID phải chỉ có số, **không có ký tự `\` ở cuối** như có thể xuất hiện trong tin nhắn.

3. Tự triển khai phiên bản code mới và restart/deploy service để server dùng cấu hình. Chỉ redeploy artifact cũ chưa chứa thay đổi ADC sẽ không đủ. Secret File được mount ở runtime; không đặt file trong `public/`, repository hoặc Render Static Site của landing page.
4. Đăng nhập bằng tài khoản Admin và mở `/analytics`. Khi kết nối thành công, các số 0 thật vẫn được hiển thị; trạng thái “Chưa kết nối” biến mất.
5. Nếu báo sai timezone, đổi timezone property; nếu không có quyền, kiểm tra Data API đã bật và email service account có Viewer trên đúng property; nếu quota/timeout, thử lại sau. Không bật public endpoint để khắc phục authentication.

Hai biến trên đã đủ **về cấu hình xác thực cho code mới**, nếu Secret File là service-account JSON hợp lệ và runtime đọc được. Để đọc report thật còn cần Google Analytics Data API đã bật, service account có Viewer trên property **558760053**, timezone đúng và hệ thống đăng nhập Admin hoạt động. Không thể xác nhận các điều kiện Google/Render này chỉ từ tên biến; không cần cung cấp private key trong chat để kiểm tra. Theo [Render](https://render.com/docs/configure-environment-variables), Secret File được mount tại `/etc/secrets/<filename>`; đây cũng là nguồn [ADC qua biến môi trường](https://docs.cloud.google.com/docs/authentication/application-default-credentials) được Google mô tả.

Task này không chạy production build, không commit/push/merge/deploy và không sửa ASP.NET backend.

## Cách đọc đúng số liệu

- **Total Visitors** là GA4 `totalUsers` của các hostname cấu hình trong toàn khoảng ngày. **Sessions** là `sessions`; một người có thể có nhiều phiên. KPI không được lấy bằng cách cộng users theo ngày hoặc nguồn.
- Các KPI so sánh với kỳ trước **cùng số ngày**, kết thúc ngay trước ngày bắt đầu. Nếu kỳ trước bằng 0 mà hiện tại lớn hơn 0, tỷ lệ là không xác định (hiển thị giải thích), không tạo phần trăm tăng giả.
- Biểu đồ dùng `date + totalUsers + sessions` và report riêng `date + eventCount` lọc APK. Không cộng users theo ngày thành unique users toàn kỳ. Ngày có số 0 hợp lệ vẫn hiển thị 0; report có `emptyReason` dùng null/— và không vẽ dữ liệu giả qua khoảng thiếu.
- Nguồn giữ bộ lọc trên sessionSource để GA4 đếm users duy nhất trực tiếp từng nhóm; thêm (data not available) và (not set) riêng, loại chúng khỏi Other. Bảng Traffic Source Performance dùng sessionSource + sessionMedium, có Sessions, Total Users, APK event count và APK Clicks per Session. Không cộng users từ campaign hoặc alias; số users từng dòng không được cộng thành tổng users. Direct chỉ được phân loại khi source/medium phù hợp, không gán nguồn chưa rõ vào Direct.
- Chiến dịch giữ tuple `sessionSource`, `sessionMedium`, `sessionCampaignName`, `sessionManualAdContent`, với Sessions và APK event count lấy bằng report riêng rồi join đúng tuple. UI đổi tên thành Lượt nhấn APK / phiên (APK Clicks per Session), hiển thị số lần/phiên, không nhân 100 hoặc dùng ký hiệu %. Giá trị có thể lớn hơn 1; không có Sessions thì —. Trường `clickRate` cũ còn trong DTO để tương thích nhưng UI chỉ dùng `clicksPerSession`.
- Download Actions lấy `totalUsers` trên `pagePath=/` làm mẫu số, và users có custom event trên chính trang `/` làm tử số cho từng nhánh riêng. Không coi APK rồi Play là hai bước nối tiếp. Click count không xác nhận tải hoàn tất hoặc cài đặt.
- **Top Pages** hiển thị `pagePath` + `screenPageViews` (Views) của các trang thực tế. Đây là lượt xem theo trang, không phải báo cáo số phiên bắt đầu tại trang; không hardcode những route chưa tồn tại.
- Dashboard chỉ lọc hostname website, không trộn traffic mobile app hoặc localhost. Các dimension/metric/filter được kiểm tra compatibility với property trước khi đọc report.

Cache thành công 20 phút trong bộ nhớ server, tối đa 48 khoảng ngày; cùng query đang chạy được gộp. Thay filter thực sự mới gọi API client; abort bỏ response cũ khi đổi filter. Google report requests được batch tối đa 5/batch, tối đa hai batch đồng thời; compatibility cache 24 giờ. Request Google timeout 15 giây/lần, toàn bộ truy vấn tối đa 55 giây. Lỗi/quota không được cache thành dữ liệu 0. Response HTTP `private, no-store` và luôn kiểm tra quyền trước cache; cache riêng theo property/hosts/fingerprint credentials, reset khi restart service. Credentials, access token và Google error body không trả về UI hoặc log.

Với ADC, server đọc lại nguồn file trước cache lookup và fingerprint nội dung credentials như với cấu hình base64. Khi file/key đổi, token và report cache cũ không được sử dụng cho cấu hình mới. File lỗi không được che bởi dữ liệu cache cũ. Thời gian cache report/token và cơ chế authorization không thay đổi.

## Test local và trước deploy

1. Bổ sung biến trong `.env.local` của **Admin** theo `.env.example`, restart `npm run dev`.
2. Chạy `npm run typecheck`, `npm run lint`, `npm test`. Tests Google dùng fixture trong test, không gửi dữ liệu giả lên property production.
3. Khi dev server chạy, gọi không có cookie:

   ```powershell
   curl.exe -i 'http://127.0.0.1:3001/api/analytics?start=2026-10-01&end=2026-10-07'
   ```

   Phải trả 401; mở `/analytics` chưa đăng nhập phải redirect `/login`. Dùng tài khoản Customer/MUA phải bị từ chối quyền; token sai/hết hạn không được xem dữ liệu.

4. Sau đăng nhập Admin, thử 7/30/90 ngày và custom; header, KPI, biểu đồ, sources, campaigns, actions và pages phải theo cùng ngày. Custom sai hoặc hơn 366 ngày phải báo lỗi.
5. Tạm bỏ Property ID hoặc cả hai nguồn credentials rồi restart: trang vẫn có đầy đủ layout và báo “Chưa kết nối Google Analytics”, không có số demo. Khi thử ADC, đường dẫn không tồn tại/quyền đọc bị từ chối phải báo lỗi credentials file; JSON sai phải báo cấu hình không hợp lệ, không lộ nội dung file.
6. Kiểm tra desktop/mobile, menu đóng/mở, scroll sidebar/page và tooltip; có thể dùng bảng ngày thay thế tooltip khi kiểm tra trên mobile/keyboard.
7. Đối chiếu số liệu GA4 Explore/Reports với cùng dates, hostname, timezone và **total users** (không mặc định active users), session attribution. Chờ hết cache 20 phút nếu vừa có dữ liệu mới; nút Tải lại không bỏ qua cache server.
8. Kiểm tra Realtime/DebugView và test download như [hướng dẫn landing page](../bbook-web/GA4_SETUP.md). Consent/ad blockers ảnh hưởng dữ liệu đo được; dashboard không biểu thị toàn bộ khách truy cập chưa consent.
9. Trước deploy: kiểm tra credentials không xuất hiện trong Git, client source hoặc Network response; cấu hình `APP_ORIGIN` đúng; bật TLS; giữ xác thực Admin và kiểm tra các trang cũ.

## File thay đổi

- UI/menu: `src/components/admin-app.tsx`, `src/components/website-analytics.tsx`, `src/components/website-analytics.module.css`.
- API/data/auth adapter: `src/app/api/analytics/route.ts`, `src/lib/analytics-server.ts`, `src/lib/analytics-data.mjs`, `src/lib/analytics-handler.mjs`.
- Shared contract/repository/service: `src/lib/analytics-contracts.mjs`, `src/lib/analytics-types.ts`, `src/repositories/analytics-api.ts`, `src/services/analytics-service.ts`.
- Setup/tests: `.env.example`, `GA4_ANALYTICS_SETUP.md`, `tests/analytics.test.mjs`, `scripts/smoke.mjs`, `README.md`.

## MVP P1 — cập nhật 14/10/2026

Kết quả xác minh local: `npm run lint`, `npm run typecheck`, `npm test` (**66/66 đạt**) và `git diff --check` đạt. Có 5 regression tests mới cho KPI/attribution/metadata/compatibility và 2 tests render React với resource fixture cho zero/unavailable/error/chưa kết nối. Tests UI kiểm tra markup, không thay thế kiểm tra trực quan hoặc tương tác desktop/mobile trong phiên Admin thật. Không chạy production build hay đọc Secret File Render. Các file lần này: `src/lib/analytics-data.mjs`, `src/lib/analytics-contracts.mjs`, `src/lib/analytics-types.ts`, `src/components/website-analytics.tsx`, `src/components/website-analytics.module.css`, `tests/analytics.test.mjs`, `tests/analytics-ui.test.mjs`, `GA4_ANALYTICS_SETUP.md`.

- KPI: Total Users, New Users, Sessions, Total Page Views, APK Download Clicks, Engagement Rate, Average Engagement Time; giữ Play Store Clicks. UI tiếng Việt, cùng design tokens và responsive breakpoints cũ.
- Metrics tổng: totalUsers, sessions, newUsers, screenPageViews, engagementRate, userEngagementDuration, activeUsers. Engagement rate API là fraction, nhân 100 để hiển thị phần trăm; average engagement time = userEngagementDuration / activeUsers, đơn vị giây. Không chia cho totalUsers hoặc lấy trung bình các giá trị theo ngày. Không có activeUsers thì —.
- Bảng source/medium dùng ba reports độc lập: sessions, totalUsers và eventCount lọc apk_download_click. Giữ nguyên raw source/medium, nhóm Facebook/TikTok/Threads/Google/Direct/Other/(data not available)/(not set) chỉ để lọc và giải thích. Nếu API báo totalUsers theo source/medium không tương thích, cột Users là — và có cảnh báo; vẫn tải Sessions và APK clicks. Các lỗi quyền/quota không bị bỏ qua.
- Mỗi report có availability available/empty/unavailable và lý do emptyReason. Có rows chứa 0 là số 0 hợp lệ; report không có rows/không có emptyReason là empty và totals 0, kèm thông báo trống; report có emptyReason là unavailable, chỉ số null/—, không coi là zero. GA4 không cung cấp dấu xác nhận mọi dữ liệu lịch sử đã hoàn tất; không thể đảm bảo report empty là traffic thực tế bằng 0.
- Khoảng ngày có hôm nay được đánh dấu provisional và cảnh báo so sánh chưa hoàn tất. Thời gian fetchedAt chỉ là lúc server lấy report, không phải lúc GA4 xử lý xong. Cache 20 phút giữ nguyên.
- Daily: users/sessions và APK clicks; metric null tạo khoảng thiếu, không nối đường qua dữ liệu chưa có. Không thêm mock production.

### Xác minh production sau khi bạn tự triển khai

1. Không cần đổi Render variables hoặc credentials. Mở /analytics bằng tài khoản Admin; các trạng thái chưa đăng nhập/không có quyền giữ nguyên.
2. Đối chiếu property 558760053 với cùng hostname bbookmakeup.com/www, timezone Asia/Ho_Chi_Minh, và cùng ngày. Chọn kỳ kết thúc hôm qua hoặc trước đó để giảm dữ liệu đang xử lý; vẫn lưu ý độ trễ GA4.
3. GA4 Explore: sessionSource + sessionMedium, sessions + totalUsers; report khác cùng dimensions với eventName=apk_download_click và eventCount. So từng dòng bảng mới, không cộng users để đối chiếu tổng. Các campaign khác nhau của cùng source/medium phải nằm trong một dòng bảng nguồn; bảng UTM vẫn giữ chi tiết.
4. Kiểm tra KPI engagementRate, fraction→%, average engagement time theo activeUsers, total views và newUsers. Không đối chiếu Total Users với Active Users mặc định trong một số báo cáo GA4.
5. Thử 7/30/90/custom, ba lựa chọn biểu đồ, bộ lọc nguồn, ngày có hôm nay; kiểm tra các nguồn chưa rõ hiện riêng, số 0/— không bị lẫn. APK Clicks per Session không có % và không được gọi là cài đặt/chuyển đổi.
6. Chờ cache 20 phút nếu vừa có dữ liệu mới; Tải lại không ép bỏ cache. Không thay tracking/consent trên landing page để làm đẹp số liệu.

Trong lượt này chỉ sửa UI Analytics, contracts/DTO, GA4 report normalization/query/compatibility, tests và tài liệu này. Không sửa backend, bbook-web, authentication, Render; không build production, commit/push/deploy. Chưa có kết nối property thật được xác minh trong môi trường local; bộ test dùng fixture riêng, không gửi dữ liệu giả lên Google.

## Giới hạn xác minh

Cập nhật ADC ngày 13/10/2026: lint, typecheck, `git diff --check` và toàn bộ **59 tests** đạt (gồm 6 test ADC mới). Test bao phủ file ADC không cần base64, ưu tiên file, thiếu/quyền đọc lỗi/JSON sai, kiểm tra đường dẫn và Property ID, cache/token/coalescing, rotation và không đọc file khi chưa xác thực Admin. Các sửa đổi trong lần cập nhật này chỉ gồm `src/lib/analytics-data.mjs`, `src/lib/analytics-handler.mjs`, `tests/analytics.test.mjs`, `.env.example` và tài liệu này; giữ nguyên UI, metrics, nghiệp vụ và authorization. Không đọc Secret File thật, không production build, commit, push hoặc deploy.

Kiểm tra local ngày 13/10/2026: lint, typecheck và toàn bộ 53 unit tests đạt. HTTP smoke bằng Next dev xác nhận `/analytics` redirect `/login` (307), `/api/analytics` trả 401 khi không có phiên, kể cả khi tham số ngày không hợp lệ; API trả `Cache-Control: private, no-store`. Không chạy production build.

Theo thông tin người dùng, Render đã có Property ID và ADC Secret File như cấu hình ở trên. Không truy cập/đọc file secret thật trong task; tests ADC sử dụng reader giả với key sinh trong bộ nhớ và fixture filesystem không chứa key. Chưa xác nhận file mount/quyền đọc, live reports/compatibility/quyền Viewer của property Google thật hoặc đối chiếu số liệu production. Measurement ID đã có không thay thế các biến đọc báo cáo. Không yêu cầu private key trong chat. Kiểm tra trang sau đăng nhập và giao diện desktop/mobile vẫn cần phiên Admin thật.

Nguồn chính thức: [GA4 dimensions/metrics](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema), [checkCompatibility](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/checkCompatibility), [OAuth service account](https://developers.google.com/identity/protocols/oauth2/service-account).
