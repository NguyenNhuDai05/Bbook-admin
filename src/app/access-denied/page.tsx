import Link from "next/link";
export default function AccessDenied() {
  return (
    <main className="login-page">
      <section className="login-card">
        <h1>Không có quyền truy cập</h1>
        <p>Bạn không có quyền thực hiện thao tác này.</p>
        <Link className="button secondary" href="/login">
          Về trang đăng nhập
        </Link>
      </section>
    </main>
  );
}
