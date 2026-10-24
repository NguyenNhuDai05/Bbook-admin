# Deploy B-Book Admin lên Render

Repo riêng: https://github.com/NguyenNhuDai05/Bbook-admin

## Tạo Web Service

Trong Render chọn **New → Web Service → Git Provider**, kết nối GitHub và chọn repo Bbook-admin.
Admin dùng SSR, API proxy và cookie đăng nhập nên cần Web Service Node.

| Cấu hình | Giá trị |
| --- | --- |
| Name | bbook-admin |
| Branch | main |
| Root Directory | Để trống vì repo chứa trực tiếp project admin |
| Language | Node |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/login` |

Chọn compute plan phù hợp trong giao diện Render. Đặt các biến môi trường:

```text
NODE_ENV=production
NODE_VERSION=22.22.3
BACKEND_API_URL=https://beautybook-v3bi.onrender.com/api
APP_ORIGIN=https://bbook-admin-4nwp.onrender.com
```

`APP_ORIGIN` phải đúng URL HTTPS của Web Admin, không có `/login` hoặc dấu `/` cuối. Khi Render cấp domain thực tế, cập nhật biến này và chọn Save, rebuild, and deploy. Nếu đổi sang custom domain, cập nhật APP_ORIGIN tương ứng. Giá trị sai có thể gây lỗi 403 khi đăng nhập hoặc lưu dữ liệu.

Hai URL trên là backend/admin mới được cung cấp ngày 22/10/2026. Trên Render, sửa trong **service bbook-admin → Environment**, không phải Environment của backend. Chọn **Save, rebuild, and deploy** để áp dụng. `.env.local` trên máy vẫn giữ `APP_ORIGIN=http://localhost:3001` cho local development; thay file local không cập nhật được biến môi trường trên Render.

Kiểm tra không dùng tài khoản: `GET /api/session` phải trả 401. `POST /api/session` với Origin đúng domain admin và JSON `{}` phải trả 400 (thiếu thông tin), còn Origin khác phải trả 403. Nếu Origin đúng vẫn trả 403 với `Yêu cầu không hợp lệ.`, cần kiểm tra APP_ORIGIN đã được deploy đúng. Không tắt kiểm tra Origin để sửa lỗi này.

`BACKEND_API_URL` là địa chỉ BE hiện dùng của ứng dụng; nếu đổi BE, cập nhật biến này. `.env.local` chỉ dùng trên máy và không được commit. Render chạy `npm start` trên host `0.0.0.0`, cổng lấy từ biến `PORT` do Render cấp.

## Kiểm tra sau deploy

1. Mở URL Render tại `/login`.
2. Đăng nhập bằng tài khoản Admin thật.
3. Kiểm tra Dashboard, danh sách MUA và chi tiết hồ sơ.
4. Đăng xuất và thử mở lại URL quản trị để xác nhận chuyển về đăng nhập.

Chỉ kiểm tra thao tác duyệt, chi tiền và gửi thông báo bằng dữ liệu thử nghiệm phù hợp. Những thao tác này gọi BE thật.

## Cập nhật lần sau

```powershell
cd D:\EXE\bbook-admin
git add .
git commit -m "Update B-Book admin"
git push origin main
```

Khi bật Auto-Deploy, Render triển khai lại sau mỗi lần push lên nhánh main.

Tài liệu chính thức: https://render.com/docs/deploy-nextjs-app và https://render.com/docs/web-services.
