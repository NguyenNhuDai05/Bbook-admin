import { apiMessage } from "@/lib/contracts.mjs";
import { LoginRateLimitError, retryAfterSeconds } from "@/lib/login-errors.mjs";
async function session(method: string, body?: unknown) {
  const response = await fetch("/api/session", {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (response.status === 429)
    throw new LoginRateLimitError(retryAfterSeconds(response.headers, data));
  if (method === "POST" && response.status === 401)
    throw new Error("Email hoặc mật khẩu không chính xác.");
  if (!response.ok) throw new Error(apiMessage(response.status, data));
}
export const sessionService = {
  login: (email: string, password: string) =>
    session("POST", { email, password }),
  logout: () => session("DELETE"),
};
