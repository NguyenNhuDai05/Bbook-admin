# /styles — audit và nghiệm thu bản tham chiếu

## 1. Audit hiện trạng

Next.js 16.3.8 App Router, React 19, TypeScript; UI tự xây dựng với lucide-react. Shared shell ở admin-app.tsx; Modal native dialog và SubmitButton ở ui.tsx. Styles trước đây ở other-pages.tsx. Proxy và admin-service là luồng dữ liệu thật, giữ nguyên xác thực và phân quyền.

GET /api/Mua/styles trả toàn bộ phong cách đang hoạt động, sắp theo Name; không hỗ trợ tìm kiếm/phân trang phía server. POST /api/Mua/styles (Admin) nhận name (bắt buộc, tối đa 100), description (tối đa 255). Backend chuẩn hóa NFKC/khoảng trắng và xử lý tên trùng. PUT Mua/styles cập nhật phong cách được chọn của MUA, không phải sửa danh mục.

## 2. Đã thay đổi

- Tách styles-page.tsx; bảng gọn, tên/mô tả cùng ô, trạng thái có chữ và dấu chấm, menu xem thông tin thật.
- admin-reference-ui.tsx cung cấp header, toolbar, empty/error, notice, status và menu hỗ trợ bàn phím.
- admin-reference.module.css cung cấp shell và giao diện trung tính chỉ được áp dụng cho /styles.
- Form giữ payload thật; giới hạn ký tự, chặn tên trùng, khóa gửi lặp, xử lý lỗi và làm mới danh sách sau lưu.
- Loading skeleton, không kết quả, danh sách rỗng, lỗi/retry; tìm kiếm cục bộ trên danh sách API trả về.
- ui.tsx chỉ thêm className tùy chọn cho Modal. admin-app.tsx định tuyến component mới; other-pages.tsx bỏ component cũ.

## 3. Backend chưa hỗ trợ

Không có API sửa/xóa/bật tắt phong cách, danh sách phong cách ngừng hoạt động hoặc tổng số MUA sử dụng. Vì vậy không dựng thao tác, bộ lọc hay số liệu giả cho các khả năng này. ArtistCount của Explore chỉ thuộc tập MUA công khai có điều kiện và top 30, không dùng làm tổng admin.

## 4. Kiểm tra

- Typecheck, ESLint: đạt.
- 21 Node tests: đạt, gồm kiểm tra tên trùng/chuẩn hóa và tìm kiếm giữ nguyên dữ liệu, thứ tự API.
- Production build: đạt; git diff --check: đạt.
- Phiên Admin do người dùng đăng nhập: danh sách 9 phong cách thật, tìm kiếm, không kết quả, xóa bộ lọc, xem thông tin bằng ArrowDown/Enter, Escape và phục hồi focus, form chặn tên trùng.
- Kiểm tra desktop 1440/1366/1280, tablet 768, mobile 390; bảng cuộn ngang trên mobile, trang không tràn ngang; sidebar thu gọn/mở rộng.
- Bản production /styles không ghi nhận console warning/error. Lỗi HMR lúc các file mới đang được tạo đã được giải quyết và kiểm tra lại bằng production.
- Ảnh nghiệm thu: styles-reference.jpg, dữ liệu thật.

## 5. Rủi ro / TODO

Chưa thực hiện POST tạo phong cách mới trên database thật trong kiểm tra trình duyệt. Các trạng thái lỗi API/rỗng chưa được gây lỗi chủ động trong phiên thật. Tên trùng đồng thời vẫn do backend quyết định; validation phía client chỉ hỗ trợ người dùng. Khi danh mục lớn cần backend bổ sung tìm kiếm/phân trang. Dừng ở /styles để review trước khi nhân rộng.

## 6. Git diff summary

3 file component hiện có được sửa; thêm 3 file component/CSS, 1 helper và 1 test, cùng tài liệu/ảnh nghiệm thu. Không thay dependencies, API service/proxy, auth, backend, migration hoặc ứng dụng mobile. Không commit hoặc deploy.
