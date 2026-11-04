export function retryAfterSeconds(headers, payload, now = Date.now()) {
  const header = headers.get("retry-after");
  let seconds;
  if (header && /^\d+$/.test(header.trim())) seconds = Number(header.trim());
  else if (header) seconds = Math.ceil((Date.parse(header) - now) / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0)
    seconds = Number(payload?.retryAfterSeconds);
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(86400, Math.max(1, Math.ceil(seconds)))
    : 60;
}

export function loginFailure(status, headers) {
  if (status === 429) {
    const seconds = retryAfterSeconds(headers);
    return {
      payload: {
        code: "LOGIN_RATE_LIMITED",
        message:
          "Hệ thống đang giới hạn yêu cầu đăng nhập. Vui lòng chờ rồi thử lại.",
        retryAfterSeconds: seconds,
      },
      headers: new Headers({
        "Cache-Control": "no-store",
        "Retry-After": String(seconds),
      }),
    };
  }
  return {
    payload: {
      message:
        status === 401
          ? "Email hoặc mật khẩu không chính xác."
          : status === 403
            ? "Yêu cầu đăng nhập bị từ chối. Vui lòng liên hệ hỗ trợ nếu lỗi tiếp diễn."
            : "Dịch vụ đăng nhập đang chưa sẵn sàng. Vui lòng thử lại sau.",
    },
    headers: new Headers({ "Cache-Control": "no-store" }),
  };
}

export class LoginRateLimitError extends Error {
  constructor(seconds) {
    super(
      "Hệ thống đang giới hạn yêu cầu đăng nhập. Vui lòng chờ rồi thử lại.",
    );
    this.retryAfterSeconds = seconds;
  }
}
