"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Máy chủ chưa sẵn sàng</h1>
        <p>
          Không thể kết nối backend để kiểm tra phiên đăng nhập. Vui lòng thử
          lại.
        </p>
        <button className="button primary" onClick={reset}>
          Thử lại
        </button>
        <Link className="text-button" href="/login">
          Về đăng nhập
        </Link>
      </section>
    </main>
  );
}
