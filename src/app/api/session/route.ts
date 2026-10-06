import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  currentAdmin,
  AuthorizationError,
  requestOrigin,
  SESSION_COOKIE,
  upstream,
  verifyAdminToken,
} from "@/lib/server";
import { isAdmin, isSameOrigin } from "@/lib/policy.mjs";
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers.get("origin"), requestOrigin(request)))
    return NextResponse.json(
      { message: "Yêu cầu không hợp lệ." },
      { status: 403 },
    );
  try {
    const input = await request.json();
    if (
      typeof input.email !== "string" ||
      typeof input.password !== "string" ||
      input.email.length > 254 ||
      input.password.length > 1024
    )
      return NextResponse.json(
        { message: "Thông tin đăng nhập không hợp lệ." },
        { status: 400 },
      );
    const response = await upstream("Auth/login", undefined, {
      method: "POST",
      body: JSON.stringify({
        email: input.email.trim(),
        password: input.password,
      }),
    });
    if (!response.ok)
      return NextResponse.json(
        {
          message:
            response.status === 401
              ? "Email hoặc mật khẩu không chính xác."
              : "Chưa thể đăng nhập. Vui lòng thử lại.",
        },
        { status: response.status },
      );
    const auth = await response.json();
    if (!isAdmin(auth.role) || typeof auth.token !== "string")
      return NextResponse.json(
        { message: "Bạn không có quyền thực hiện thao tác này." },
        { status: 403 },
      );
    const profile = await verifyAdminToken(auth.token);
    if (!profile)
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại." },
        { status: 401 },
      );
    const seconds = Math.floor(
      (new Date(auth.expiration).getTime() - Date.now()) / 1000,
    );
    if (!Number.isFinite(seconds) || seconds <= 0)
      return NextResponse.json(
        { message: "Phiên đăng nhập không hợp lệ." },
        { status: 502 },
      );
    (await cookies()).set(SESSION_COOKIE, auth.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: Math.min(seconds, 86400),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthorizationError)
      return NextResponse.json({ message: error.message }, { status: 403 });
    return NextResponse.json(
      { message: "Không thể kết nối máy chủ. Kiểm tra cấu hình backend." },
      { status: 503 },
    );
  }
}
export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request.headers.get("origin"), requestOrigin(request)))
    return NextResponse.json(
      { message: "Yêu cầu không hợp lệ." },
      { status: 403 },
    );
  (await cookies()).delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
export async function GET() {
  try {
    const session = await currentAdmin();
    return session
      ? NextResponse.json(session.user)
      : NextResponse.json({ message: "Cần đăng nhập." }, { status: 401 });
  } catch (error) {
    if (error instanceof AuthorizationError)
      return NextResponse.json({ message: error.message }, { status: 403 });
    return NextResponse.json(
      { message: "Máy chủ chưa sẵn sàng." },
      { status: 503 },
    );
  }
}
