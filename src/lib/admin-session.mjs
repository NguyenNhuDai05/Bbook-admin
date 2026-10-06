import { isAdmin } from "./policy.mjs";

export class AuthorizationError extends Error {
  constructor() {
    super("Bạn không có quyền thực hiện thao tác này.");
  }
}

export class SessionUnavailableError extends Error {
  constructor(reason, status = null) {
    super("Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.");
    this.reason = reason;
    this.status = status;
  }
}

// Keep invalid credentials separate from unavailable/misconfigured upstreams.
export async function readAdminProfile(loadProfile) {
  let response;
  try {
    response = await loadProfile();
  } catch {
    throw new SessionUnavailableError("connection");
  }
  if (response.status === 401) return null;
  if (response.status === 403) throw new AuthorizationError();
  if (!response.ok) throw new SessionUnavailableError("http", response.status);
  let user;
  try {
    user = await response.json();
  } catch {
    throw new SessionUnavailableError("invalid-json", response.status);
  }
  if (
    !user ||
    typeof user.userId !== "string" ||
    !user.userId ||
    typeof user.fullName !== "string" ||
    typeof user.email !== "string" ||
    !["string", "number"].includes(typeof user.role)
  )
    throw new SessionUnavailableError("invalid-profile", response.status);
  if (!isAdmin(user.role)) throw new AuthorizationError();
  return user;
}
