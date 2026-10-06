"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function SessionUnavailable() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <main className="login-page">
      <section className="login-card" role="alert">
        <h1>Chưa thể kiểm tra phiên đăng nhập</h1>
        <p>
          Máy chủ xác thực hiện chưa sẵn sàng. Vui lòng thử lại sau ít phút.
        </p>
        <button
          className="button primary"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
        >
          {pending ? "Đang kiểm tra…" : "Thử lại"}
        </button>
        <Link className="button secondary" href="/login">
          Về trang đăng nhập
        </Link>
      </section>
    </main>
  );
}
