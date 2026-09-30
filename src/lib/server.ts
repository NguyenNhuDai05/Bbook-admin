import { cookies } from "next/headers";
import type { AdminUser } from "./types";
import { isAdmin } from "./policy.mjs";
export const SESSION_COOKIE = "bbook_admin_session";
export function backendUrl() {
  const configured = process.env.BACKEND_API_URL;
  if (!configured) throw new Error("Chưa cấu hình BACKEND_API_URL.");
  const url = new URL(configured);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Cấu hình API không hợp lệ.");
  return configured.replace(/\/$/, "");
}
export class AuthorizationError extends Error {
  constructor() {
    super("Bạn không có quyền thực hiện thao tác này.");
  }
}
export function requestOrigin(request: Request) {
  if (process.env.APP_ORIGIN) return process.env.APP_ORIGIN;
  const url = new URL(request.url);
  // Next dev normalizes request.url to localhost even when opened via 127.0.0.1.
  // Host is the browser's requested origin; deployments should pin APP_ORIGIN.
  const host = request.headers.get("host");
  return host ? `${url.protocol}//${host}` : url.origin;
}
export async function upstream(
  path: string,
  token?: string,
  init: RequestInit = {},
) {
  return fetch(`${backendUrl()}/${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}
export async function currentAdmin(): Promise<{
  token: string;
  user: AdminUser;
} | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const response = await upstream("User/profile", token);
  if (response.status === 401) return null;
  if (response.status === 403) throw new AuthorizationError();
  if (!response.ok)
    throw new Error("Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.");
  const user = (await response.json()) as AdminUser;
  if (!isAdmin(user.role)) throw new AuthorizationError();
  return { token, user };
}
