import type { AnalyticsResponse } from "@/lib/analytics-types";
export async function readWebsiteAnalytics(
  start: string,
  end: string,
  signal: AbortSignal,
): Promise<AnalyticsResponse> {
  const response = await fetch(
    `/api/analytics?${new URLSearchParams({ start, end })}`,
    { credentials: "same-origin", cache: "no-store", signal },
  );
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401)
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    if (response.status === 403)
      throw new Error("Bạn không có quyền xem Website Analytics.");
    throw new Error(
      typeof result?.message === "string"
        ? result.message
        : "Không thể tải Website Analytics.",
    );
  }
  if (!result || !["ready", "not_connected"].includes(result.status))
    throw new Error("Dữ liệu Analytics không hợp lệ.");
  return result as AnalyticsResponse;
}
