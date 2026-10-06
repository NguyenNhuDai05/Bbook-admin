import { NextRequest, NextResponse } from "next/server";
import {
  AuthorizationError,
  currentAdmin,
  requestOrigin,
  upstream,
} from "@/lib/server";
import { allowedApiPath, isSameOrigin } from "@/lib/policy.mjs";
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  if (!allowedApiPath(request.method, path))
    return NextResponse.json(
      { message: "API chưa được hỗ trợ." },
      { status: 404 },
    );
  if (
    request.method !== "GET" &&
    !isSameOrigin(request.headers.get("origin"), requestOrigin(request))
  )
    return NextResponse.json(
      { message: "Yêu cầu không hợp lệ." },
      { status: 403 },
    );
  try {
    const session = await currentAdmin();
    if (!session)
      return NextResponse.json(
        { message: "Phiên đăng nhập đã hết hạn hoặc không có quyền Admin." },
        { status: 401 },
      );
    const response = await upstream(
      `${path}${request.nextUrl.search}`,
      session.token,
      {
        method: request.method,
        ...(request.method !== "GET" ? { body: await request.text() } : {}),
      },
    );
    if (response.status === 204) return new NextResponse(null, { status: 204 });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") || "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError)
      return NextResponse.json({ message: error.message }, { status: 403 });
    return NextResponse.json(
      { message: "Không thể kết nối máy chủ. Vui lòng thử lại." },
      { status: 503 },
    );
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
