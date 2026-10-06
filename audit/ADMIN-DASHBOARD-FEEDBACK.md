# Dashboard, số đếm công việc và feedback — 06/10/2026

## Dữ liệu và API

- `GET /api/admin/work-summary`: tổng số hồ sơ MUA, tài khoản nhận tiền, khiếu nại, báo cáo nội dung, chi trả, hoàn tiền và feedback chưa xử lý xong. Đếm trên database, độc lập phân trang và khoảng ngày dashboard. Các điều kiện tài chính kiểm tra cả bản ghi liên kết để khớp hàng đợi thật.
- `POST /api/feedback`: Customer/MUA gửi góp ý, báo lỗi hoặc phản hồi khác. Nội dung 10–2.000 ký tự, giới hạn 10 phản hồi/giờ/người dùng. Mã submission được lưu và có unique index để gửi lại không tạo bản trùng. Tài khoản demo không được gửi.
- `GET /api/admin/feedback`: tìm kiếm, phân trang, lọc trạng thái/loại/vai trò/khoảng ngày Việt Nam. `status=Open` bao gồm Mới và Đang xử lý.
- `GET /api/admin/feedback/{id}`: nội dung và lịch sử xử lý.
- `POST /api/admin/feedback/{id}/review`: cập nhật trạng thái, ghi chú nội bộ, kiểm tra version để ngăn ghi đè cập nhật của admin khác. Đóng feedback cần lý do.
- Các endpoint admin yêu cầu quyền Admin. Proxy giữ allowlist và kiểm tra Origin; không mở endpoint gửi feedback người dùng qua proxy admin.

## Giao diện

Dashboard đưa công việc cần xử lý lên trước số liệu kinh doanh; thẻ công việc, sidebar và chuông dùng một nguồn số liệu chung. Làm mới mỗi 60 giây khi tab hiển thị, khi quay lại tab và sau các thao tác admin. Lỗi API giữ số liệu cũ với cảnh báo, không thay thế bằng số 0.

Bảng số liệu từng ngày hiển thị trực tiếp, ngày mới nhất trước, 20 dòng/trang; biểu đồ giữ chiều thời gian từ cũ đến mới. Ngày không phát sinh vẫn giữ số 0 do API cung cấp.

Feedback có mục riêng ở sidebar và khối 5 phản hồi mới nhất ở dashboard. App Customer và phần cài đặt MUA có nút Góp ý & báo lỗi, gửi qua API thật. Giao diện chỉ xác nhận thành công sau phản hồi thành công của backend.

Badge tài chính không tính các khoản Processing vào số cần thao tác; số đang xử lý được hiển thị riêng. Chi trả Failed đã đối soát không nằm trong badge. Hoàn tiền AwaitingDestination đang chờ người dùng bổ sung tài khoản, vẫn xem được trong module hoàn tiền.

## Migration và phát hành

Migration `20261006092242_AddUserFeedback` chỉ tạo bảng `UserFeedbacks`, `FeedbackEvents`, index và foreign key. Không seed dữ liệu. Xóa tài khoản xóa feedback của chủ tài khoản, lịch sử nội bộ liên quan được cascade theo foreign key.

Phát hành backend trước để migration được áp dụng theo cơ chế startup production hiện có; sau đó phát hành admin web và app. Không trỏ app mới đến backend cũ chưa có API feedback.

## Xác minh

- Admin: typecheck, lint, production build và 19 tests hợp đồng/allowlist/sắp xếp/số đếm.
- Backend: 405 tests pass, 95 integration tests PostgreSQL được skip vì chưa cấu hình test database; bao gồm 4 tests mới sử dụng database SQLite riêng cho số đếm toàn hàng đợi, gửi lại, lịch sử, version, phân trang và loại demo.
- App: typecheck và 3 tests feedback pass; 2 tests cài đặt MUA pass. Lint các file feedback mới pass.
- 14 kiểm tra HTTP đăng nhập/allowlist/Origin pass trên bản admin production build chạy cục bộ; có kiểm tra các API số đếm và feedback mới. Server kiểm thử đã dừng.
- Chưa phát hành production, chưa chạy migration trên database thật, chưa kiểm chứng thao tác xuyên suốt bằng một phiên đăng nhập Admin thật. Không có dữ liệu mẫu hoặc cơ chế bỏ qua đăng nhập trong ứng dụng.
