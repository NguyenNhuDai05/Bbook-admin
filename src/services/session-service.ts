import { apiMessage } from "@/lib/contracts.mjs";
async function session(method: string, body?: unknown) {
  const response = await fetch("/api/session", {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(apiMessage(response.status, data));
}
export const sessionService = {
  login: (email: string, password: string) =>
    session("POST", { email, password }),
  logout: () => session("DELETE"),
};
