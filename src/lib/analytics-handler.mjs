import { analyticsRange } from "./analytics-contracts.mjs";
import { AnalyticsError } from "./analytics-data.mjs";
import { AuthorizationError } from "./admin-session.mjs";
const messages = {
  config:
    "Cấu hình GA4 không hợp lệ. Kiểm tra Property ID và service account trên máy chủ.",
  credentials:
    "Không có quyền đọc GA4. Kiểm tra credentials và quyền Viewer của service account.",
  credentials_file:
    "Không thể đọc file credentials GA4. Kiểm tra Secret File và GOOGLE_APPLICATION_CREDENTIALS trên máy chủ.",
  quota: "Google Analytics đang giới hạn truy vấn. Vui lòng thử lại sau.",
  busy: "Có nhiều yêu cầu Analytics đang xử lý. Vui lòng thử lại sau.",
  timezone:
    "Múi giờ property GA4 phải là Asia/Ho_Chi_Minh. Cập nhật trong GA4 Admin.",
  compatibility: "Dimensions và metrics chưa tương thích với property GA4 này.",
  truncated:
    "Báo cáo vượt giới hạn số dòng. Chọn khoảng ngày ngắn hơn để xem dữ liệu đầy đủ.",
  response:
    "Google Analytics trả dữ liệu chưa đúng định dạng. Vui lòng thử lại.",
  timeout: "Google Analytics phản hồi quá chậm. Vui lòng thử lại.",
  google: "Không thể kết nối Google Analytics. Vui lòng thử lại.",
};
export async function handleAnalyticsRequest(request, { authorize, load }) {
  const response = (body, status = 200) =>
    Response.json(body, {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        ...(status === 429 ? { "Retry-After": "60" } : {}),
      },
    });
  // Reverify the existing session and Admin role BEFORE date/config/cache access.
  try {
    if (!(await authorize()))
      return response(
        { status: "error", message: "Cần đăng nhập Admin." },
        401,
      );
  } catch (error) {
    return response(
      {
        status: "error",
        message:
          error instanceof AuthorizationError
            ? "Bạn không có quyền Admin."
            : "Không thể xác minh phiên đăng nhập. Vui lòng thử lại.",
      },
      error instanceof AuthorizationError ? 403 : 503,
    );
  }
  const query = new URL(request.url).searchParams;
  let range;
  try {
    if (query.getAll("start").length !== 1 || query.getAll("end").length !== 1)
      throw new Error("date");
    range = analyticsRange(query.get("start"), query.get("end"));
  } catch {
    return response(
      {
        status: "error",
        message:
          "Khoảng ngày không hợp lệ. Chọn tối đa 366 ngày và không vượt ngày hiện tại.",
      },
      400,
    );
  }
  try {
    return response(await load(range));
  } catch (error) {
    const code = error instanceof AnalyticsError ? error.code : "google";
    return response(
      { status: "error", message: messages[code] || messages.google },
      ["quota", "busy"].includes(code) ? 429 : code === "timeout" ? 504 : 502,
    );
  }
}
