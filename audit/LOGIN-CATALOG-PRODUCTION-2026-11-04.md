# Kiểm tra production: đăng nhập và danh mục gói

## Kết quả HTTP trực tiếp ngày 04/11/2026

- `https://admin.bbookmakeup.com/login`: 200.
- `GET /api/session` không có cookie: 401 đúng dự kiến.
- `POST /api/session` với input rỗng: 400 trước khi gọi backend.
- Một lần thử bằng tài khoản ngẫu nhiên `example.invalid` qua Admin và trực tiếp backend đều trả 401; không dùng thông tin đăng nhập của người dùng. Chưa tái hiện được 429 trong ảnh tại thời điểm kiểm tra.
- Backend `https://beautybook-v3bi.onrender.com`: `/health/ready` trả 200, database connected; `/api/admin/dashboard` và `/api/me/commerce/catalog` trả 401 khi chưa xác thực; `/api/admin/plans` và `/api/admin/commerce/orders` trả 404 với body rỗng.

Do đó bản backend đang phục vụ public chưa có endpoint Admin subscription. Lỗi trên trang không chứng minh hai gói bị mất hoặc chưa tạo. Nếu bảng thiếu sau khi controller đã deploy thì thường là lỗi database/500, khác với 404 route đang quan sát.

## Source đã có

BE main `bf3f45c`: AdminPlansController, AdminCommerceController, seed hai SKU cũ trong migration `20261103184714_AdminSubscriptionCatalog`, snapshot bảo toàn giá/quyền lợi/đơn cũ. Backend production trong source bắt buộc áp dụng migration khi startup trước khi nhận traffic. Không yêu cầu tạo lại hai gói bằng Admin.

## Sửa Admin

- 429 có thông báo giới hạn đăng nhập riêng; giữ Retry-After và số giây chờ; UI khóa submit và đếm ngược thay vì khuyến khích gửi tiếp.
- 401 đăng nhập hiển thị sai email/mật khẩu, không nhầm với phiên hết hạn.
- Null input bị từ chối trước upstream.
- 404 danh mục hiển thị cần triển khai backend; không trình bày như danh mục trống, không dựng hai gói giả phía frontend, không cho tạo thêm gói trong lúc API danh mục không hoạt động.

## Phần cần hoàn tất trên Render

Kiểm tra service gắn với `beautybook-v3bi.onrender.com` đang dùng đúng repo BE, nhánh và commit `bf3f45c` hoặc mới hơn; xem deployment events/build/startup logs. Deploy commit đó và xác nhận migration thành công. Sau deploy, kiểm tra không xác thực hai route mới phải trả 401 thay vì 404; rồi dùng phiên Admin thật xác nhận hai SKU cũ, giá và lịch sử.

Theo yêu cầu của người dùng, phạm vi bàn giao là commit, push và merge code; người dùng tự deploy Render. Chưa thay đổi cấu hình hoặc thực hiện deploy Render. Không thay đổi cờ rate limit backend, mật khẩu hoặc quyền tài khoản.

Kiểm chứng bản sửa: typecheck, lint và 123 test Admin đã qua; bao gồm Retry-After dạng giây/ngày HTTP, phản hồi 429 không tạo cookie, input null bị từ chối trước upstream và phân biệt API chưa deploy với danh mục rỗng.
