# Phase C — Admin Makeup Catalog Management

Ngày: 18/10/2026. Phạm vi: chỉ `D:\EXE\bbook-admin`.

## Audit và quyết định triển khai

Đã đọc AGENTS.md, CLAUDE.md và tài liệu Next.js 16.3.8 đi kèm trong node_modules (forms, route handlers) trước khi sửa. Đọc trực tiếp backend DTOs, AdminMakeupStylesController, AdminMakeupCatalogController, MakeupCatalogService, AdminMakeupStyleService và StyleWriteExceptionFilter tại repo BeautyBook; không sửa backend.

Trang /styles trước đây chỉ có CRUD tên/mô tả và trạng thái. Đã giữ route, AdminApp, sidebar, server authentication boundary, proxy handler, Modal, SubmitButton, Pagination, AdminPageHeader/Toolbar/Notice/EmptyState và stylesheet reference hiện có. Tách nội dung danh mục thành component dùng chung cho styles/terms, thay vì nhân bản sáu trang. Styles export cũ vẫn tương thích.

useResource tiếp tục quản lý abort/stale requests, trạng thái loading/error và invalidation. useSubmission tiếp tục khóa gửi đồng thời. Repository/service mới theo cùng cách phân lớp của admin-service/admin-api. Không thêm dependency.

Phát hiện contract quan trọng:

- Danh sách styles không có usage counts; lấy endpoint usage cho từng hàng trong trang hiện tại (tối đa 10 request bổ sung, không tải usage toàn bộ catalog).
- Version conflict thực tế là CATALOG_VERSION_CONFLICT; cũng xử lý VERSION_CONFLICT và CATALOG_WRITE_CONFLICT.
- Review yêu cầu lý do cho cả Approved và Rejected. Chỉ source=MUA chưa archive được review. Pending vẫn có thể active ngay; approve không tự bật lại.
- LegacyUnknown là source, Archived là lifecycle filter, không gửi chúng như reviewStatus.
- Group là occasion-group/effect-group; không đưa nhóm vào metadata.
- Chưa có API mapping catalog effects sang engine; ghi rõ hỗ trợ engine chưa xác định. Không đoán effect mới được AI hỗ trợ.
- Chưa có merge, restore archive hoặc portfolio structured usage. Không tạo mutation giả.

Các thay đổi analytics/README/APK counters đã có trước vẫn được giữ nguyên; không đưa chúng vào phạm vi Phase C.

## Sáu tab hoàn thành

1. Phong cách makeup: server search/pagination, nguồn/trạng thái, tên/key/mô tả/thứ tự, số MUA/dịch vụ, detail, create/edit, metadata optional, status/archive/usage. Key khóa khi edit; bản ghi legacy chưa có key được hiển thị rõ. Không có editor SystemDefinition, ML rules, scoring hoặc baseline.
2. Dịp / sự kiện: lọc nhóm, quản lý nhóm riêng, CRUD label/description/key lúc tạo/order, nhóm và broader occasion, status/archive/usage.
3. Độ đậm nhạt: chỉ light/medium/bold từ API thật; sửa label/description/order theo DTO, không có create và không đổi key. Catalog trống không được tự seed giả.
4. Tông màu: danh sách/search/create/edit/status/archive/order. Không chỉnh bảng màu gốc của 20 styles.
5. Hiệu ứng makeup: lọc nhóm, CRUD và quản lý nhóm riêng, status/archive/usage. Có thông tin rõ về giới hạn engine.
6. Phong cách MUA tạo: lọc MUA Pending/Approved/Rejected/Archived và riêng LegacyUnknown; detail, usage, duyệt/từ chối với lý do, status và archive theo contract.

Mỗi mutation cập nhật bản ghi có expectedVersion lấy từ detail mới tải. Backend cũ thiếu version sẽ khóa thao tác chỉnh sửa/lifecycle. Metadata bỏ qua khi chưa chỉnh sửa, [] chỉ gửi khi chủ động bỏ hết; không xóa metadata vì options tải lỗi. Các metadata ngừng dùng đang liên kết vẫn hiển thị và có thể bỏ, nhưng không chọn mới. Chọn intensity thay thế mức độ cũ, không gửi hai mức độ.

Form có giới hạn độ dài, kiểm tra key đúng regex backend, số nguyên sortOrder 0..100000, nhóm bắt buộc, giới hạn 100 metadata. Backend tiếp tục xác minh duplicate/cycle/permissions. Có xác nhận trước status/archive/review, thành công/thất bại, khóa submit và khóa đóng modal trong khi gửi. Có reload rõ ràng khi conflict (bỏ thay đổi chưa lưu). Native dialog trap focus/Escape; focus vào ô đầu sau khi mở, trả về trigger khi đóng; vùng lỗi role=alert.

## API và bảo mật

Chỉ mở các method/path sau trong allowlist, giữ nguyên server-side currentAdmin, same-origin cho mutation, session HttpOnly, cache private/no-store và error sanitization:

| Endpoint | Method |
| --- | --- |
| /api/makeup-catalog | GET |
| /api/admin/makeup-styles | GET, POST |
| /api/admin/makeup-styles/{id} | GET, PUT |
| /api/admin/makeup-styles/{id}/status | PATCH |
| /api/admin/makeup-styles/{id}/usage | GET |
| /api/admin/makeup-styles/{id}/archive | POST |
| /api/admin/makeup-styles/{id}/review | POST |
| /api/admin/makeup-catalog/terms | GET, POST |
| /api/admin/makeup-catalog/terms/{id} | GET, PUT |
| /api/admin/makeup-catalog/terms/{id}/status | PATCH |
| /api/admin/makeup-catalog/terms/{id}/usage | GET |
| /api/admin/makeup-catalog/terms/{id}/archive | POST |

ID phải là số nguyên dương. Không có DELETE/merge/import hoặc proxy wildcard. Query search encode bằng URLSearchParams. UI không truy cập database. ApiError giữ status/code trong client nhưng vẫn dùng apiMessage hiện có để lọc thông báo nhạy cảm. 401 giữ hành vi chuyển login; 403 giữ thông báo từ chối; 404/500 không thay bằng dữ liệu mẫu. Catalog/options rỗng, archived/inactive, version thiếu, lỗi tải usage được xử lý riêng. portfolioCount=null luôn hiển thị **Chưa hỗ trợ**, không hiển thị 0.

## Files Phase C

Đã sửa:

- src/components/admin-app.tsx — nhãn navigation/breadcrumb Danh mục Makeup.
- src/components/styles-page.tsx — giữ export Styles và route hiện có, dùng catalog component.
- src/lib/client.ts — ApiError giữ status/code, giữ transport/session behavior.
- src/lib/policy.mjs — allowlist cụ thể Phase B.

Đã tạo:

- src/components/makeup-catalog.tsx — sáu tab, filters, bảng, server pagination và modal host.
- src/components/makeup-catalog-panel.tsx — detail/form/lifecycle/review/usage, focus và version.
- src/components/makeup-catalog.module.css — bảng/responsive/form theo reference theme.
- src/lib/catalog-types.ts — DTO/types Phase B.
- src/lib/catalog-contracts.mjs — validation/query/filter/review/conflict helpers.
- src/repositories/catalog-api.ts — exact API paths/methods/payload và full paginated term options.
- src/services/catalog-service.ts — queries và invalidation sau mutation thành công.
- tests/catalog-management.test.mjs — contract/form/interaction/proxy/validation tests.
- tests/fixtures/catalog-backend.mjs — test-only in-memory loopback backend, không được src import.
- scripts/catalog-smoke.mjs — HTTP integration với fixture local, không dùng config production.
- docs/MAKEUP-CATALOG-PHASE-C.md — tài liệu bàn giao này.
- audit/phase-c-desktop.jpg — ảnh UI desktop sử dụng dữ liệu fixture test.

## Kiểm thử thực tế

- npm run typecheck: PASS.
- npm run lint: PASS, max-warnings=0.
- npm test: 96 passed, 0 failed, 0 skipped, gồm 14 tests mới.
- npm run build: PASS sau khi chạy ngoài sandbox; lần đầu sandbox gặp EPERM tạo .next/types. Không phải lỗi compile ứng dụng.
- node scripts/catalog-smoke.mjs: 20 HTTP checks PASS trên Next.js local + fixture RAM. Bao gồm anonymous denial, auth session, SSR sáu tab, usage null, allowlist, Origin denial kể cả đã đăng nhập, forwarding conflict code, logout.
- Browser: kiểm tra desktop 1280x720 và tablet 768x1024 với fixture local. Tablet document.scrollWidth=768 bằng viewport, table 850px cuộn trong vùng 640px, không tràn ngang toàn trang. Đã mở detail, form create/edit, quan sát conflict giữ form mở + reload, kiểm tra focus ô tên, portfolio unavailable, LegacyUnknown không có review, intensity 3 hàng không có add, effect engine notice, search debounce/empty.

Logs trong audit/phase-c-typecheck.log, phase-c-lint.log, phase-c-tests.log, phase-c-build.log, phase-c-http.log (các file .log theo ignore hiện có).

Giới hạn kiểm thử: HTTP fixture cố ý trả 409 cho mutations để kiểm tra conflict mà không persist; luồng save/review thành công được kiểm bằng tests component/adapter. Chưa kiểm chứng thao tác ghi end-to-end với backend Phase B thật hoặc dữ liệu production. Không gọi production backend/database. Chưa có audit accessibility bằng công cụ chuyên dụng hay toàn bộ tổ hợp kích thước/trình đọc màn hình.

## Chạy và kiểm tra local

Với backend Phase B đã sẵn sàng ở môi trường local được bạn quản lý: cấu hình BACKEND_API_URL trỏ API local, APP_ORIGIN tương ứng admin, chạy npm run dev và mở /styles. Không chạy backend chưa kiểm soát connection vì startup backend có thể tự migrate. Phase C không thay .env.local hoặc tự chạy backend.

Test UI tách biệt, không cần database (PowerShell, từ repo admin):

Terminal 1:

```powershell
node tests/fixtures/catalog-backend.mjs
```

Terminal 2:

```powershell
$env:BACKEND_API_URL='http://127.0.0.1:43187/api'
$env:APP_ORIGIN='http://127.0.0.1:43188'
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 43188
```

Terminal 3:

```powershell
node scripts/catalog-smoke.mjs
```

Browser http://127.0.0.1:43188/login; fixture chấp nhận catalog@example.test / local-fixture-only. Đây chỉ là dữ liệu test, không phải tài khoản thật. Không dùng fixture làm backend của deployment. Kết thúc bằng Ctrl+C ở hai terminal. Temporary viewport của công cụ đã reset; các server kiểm thử được dừng khi bàn giao.

## Chưa thể dùng và điều kiện trước deploy

- Backend production chưa migrate/import: taxonomy có thể rỗng, endpoints mới có thể 404/500; cần rollout backend Phase B riêng được phê duyệt. Không thực hiện migration/import trong Phase C.
- Real canonical import cần reviewed key → existing StyleId manifest, không tự suy đoán trong admin.
- Portfolio usage chưa có structured links nên unavailable; engine effect mapping chưa có API; merge/restore archive chưa được backend hỗ trợ.
- Usage theo hàng có chi phí request; nếu dữ liệu lớn nên có batch/list counts endpoint trong một phase backend riêng, không tự mở rộng Phase C.
- Trước deploy cần kiểm thử ghi trên backend staging/local thật đã migrate an toàn (create/edit/status/archive/review, concurrency 2 admin), kiểm tra dữ liệu import/legacy, xác thực role Admin và APP_ORIGIN/BACKEND_API_URL đúng môi trường, QA desktop/tablet với dữ liệu thật. Chưa tự deploy.

Không thay backend/schema/database/mobile/Advisor; không migration/import thật; không commit/push/merge/deploy; không thêm dependency. Dừng sau Phase C để người dùng kiểm tra.

