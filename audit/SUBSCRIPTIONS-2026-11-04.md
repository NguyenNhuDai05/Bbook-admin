# Quản lý gói và giao diện mua gói — 04/11/2026

## Đã triển khai

- Admin `/plans`: tạo gói Customer/MUA; sửa tên, mô tả, giá, thời hạn MUA (30–360 ngày, bội số 30), trạng thái Draft/Published/Paused/Archived; xem trước thẻ gói, chi tiết, lịch sử có người sửa/lý do/before/after và phân trang lịch sử. Xóa/ngừng bán dùng archive, giữ nguyên chứng từ và quyền lợi cũ.
- Catalog database seed hai SKU đang dùng. Product/version/giá/tên/thời hạn được snapshot vào đơn; sửa gói tạo revision mới và yêu cầu xác nhận điều khoản phiên bản mới. Role/engine không đổi sau khi tạo gói.
- Đơn AI và MUA xác minh tiền bằng giá đã lưu trên đơn. Provider request không còn so sánh với giá catalog cố định. Đơn cũ tiếp tục được đối soát sau khi đổi giá hoặc archive sản phẩm.
- App và website mua từ catalog chung, dùng terms riêng của sản phẩm. App yêu cầu đồng ý lại nếu catalog đổi giá/version. Giữ adapter nhận diện hai SKU cũ.
- Gói MUA nhiều chu kỳ cấp đúng tổng thời hạn và một Facebook task cho mỗi chu kỳ 30 ngày; compound unique key ngăn nhân đôi task trong cùng grant/cycle.
- Admin xem đơn Customer/MUA có phân trang/lọc trạng thái, chi tiết snapshot/quyền lợi/lịch sử; Customer recover/revoke, MUA recover có lý do và bằng chứng. MUA recover chỉ đưa về hàng đợi fulfillment.
- Hàng đợi hỗ trợ Customer không còn bị che khi tắt cờ mở bán.
- Mobile `account-plans`, `PlanPurchase` và phần style payment được cập nhật tông hồng, thẻ bo góc, gradient CTA, icon, minh họa portrait từ asset sẵn có, trạng thái và lịch sử. Lấy hai ảnh làm hướng thiết kế, không cắt screenshot thành UI.
- BFF chỉ mở method/path cần thiết, dùng lại session/Origin policy; request resource hủy khi đổi lựa chọn, submit lock ngăn gửi lặp. Có validation runtime cho danh sách gói và đơn.

## Kiểm chứng

- Backend build thành công; còn 4 warning có sẵn ở ServiceController/MuaPromotionController/MuaService.
- 33 test Fact liên quan chạy tuần tự thành công qua `.verification/plan-catalog-runner`, gồm migration trên PostgreSQL riêng, mua nối tiếp và test giá/version/thu hồi/callback lặp/gói MUA 60 ngày. VSTest testhost timeout trong môi trường này nên dùng runner trực tiếp; không tuyên bố full backend suite đã chạy.
- EF `has-pending-model-changes`: không có sai khác model so với migration.
- Admin: typecheck, lint, test và production build đã qua. Build cần chạy ngoài sandbox do EPERM khi tạo thư mục `.next`.
- Mobile: typecheck; 4 test màn quyền lợi và 2 test PlanPurchase đã qua. Test xác nhận giá/terms theo sản phẩm và reset consent sau đổi giá.
- Website: 4 test account portal và build đã qua.
- PostgreSQL test dùng localhost:55446, database tạo/xóa bởi fixture; server thử nghiệm được dừng sau test. Không áp dụng migration lên database production.

## Triển khai

Migration mới: `20261103184714_AdminSubscriptionCatalog`, sau `20261103083108_NativeAppCommerce`. Migration backfill giá AI 20.000đ, thời hạn MUA 30 ngày, tên và version legacy; giữ nguyên AmountVnd thực lưu của MUA. Có trigger bảo vệ snapshot đã mua.

Thứ tự: backup/đối chiếu database staging → backend + migration → Admin → web/mobile hỗ trợ catalog động. Giữ flags mở bán hiện tại cho đến khi kiểm tra checkout và tài khoản thật trên staging. Không tự thay đổi `.env`, không build APK/phát hành app trong lượt này.

Rollback schema cần đối chiếu đơn có giá/SKU mới và task nhiều chu kỳ trước khi phục hồi constraint/index cũ; rollback giao diện không được xóa chứng từ hoặc grant.

## Phần còn lại của kế hoạch mở rộng

- Chưa thêm cấp quyền miễn phí, đổi/gia hạn/thu hồi grant MUA thủ công theo tài khoản; hiện điều chỉnh catalog và xử lý support theo các service có sẵn. Chưa có engine quyền lợi ngoài AI lifetime và MUA visibility.
- Chưa bổ sung dashboard tiền gói, danh sách ingress chưa ghép đơn và bộ lọc tìm tên/email ở UI.
- Chưa làm pagination/race cancellation hoàn chỉnh cho trang quảng bá MUA đang có; chỉ sửa lỗi lint tính thời điểm trong render.
- Chưa nghiệm thu giao diện trên thiết bị thật, screen reader hoặc E2E Admin đăng nhập thật; chưa triển khai production. Không coi build/unit test là bằng chứng visual QA.

Các thay đổi có sẵn trong working tree được giữ lại. Khi tạo scaffold ban đầu, EF dùng binary cũ; migration NativeAppCommerce đã được phục hồi từ artifact native-commerce-merge-be-20261103 trước khi tạo scaffold đúng. Migration cuối đã được áp dụng thành công trên database test riêng.
