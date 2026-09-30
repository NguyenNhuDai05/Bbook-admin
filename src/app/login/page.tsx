"use client";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { sessionService } from "@/services/session-service";
import { useSubmission } from "@/lib/client";
import { SubmitButton } from "@/components/ui";
export default function Login() {
  const submission = useSubmission();
  const { busy } = submission;
  const [error, setError] = useState(""),
    [visible, setVisible] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submission.begin()) return;
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await sessionService.login(
        String(form.get("email") || ""),
        String(form.get("password") || ""),
      );
      // Reload the server auth boundary after HttpOnly cookie creation.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đăng nhập.");
    } finally {
      submission.end();
    }
  }
  return (
    <main className="login-page">
      <div className="login-brand">
        <span className="brand-mark">b.</span>
        <strong>
          B-Book <span>Admin</span>
        </strong>
      </div>
      <section className="login-card">
        <div className="login-lock">
          <LockKeyhole size={25} />
        </div>
        <h1>Chào mừng trở lại</h1>
        <p>Đăng nhập để quản lý và vận hành B-Book.</p>
        <form onSubmit={login}>
          <label>
            Email quản trị
            <input
              name="email"
              type="email"
              autoComplete="username"
              placeholder="admin@example.com"
              required
              maxLength={254}
            />
          </label>
          <label>
            Mật khẩu
            <div className="password-input">
              <input
                name="password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                required
              />
              <button
                type="button"
                onClick={() => setVisible((x) => !x)}
                aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
          <SubmitButton busy={busy}>Đăng nhập</SubmitButton>
        </form>
        <div className="login-foot">
          <ShieldCheck size={15} />
          Chỉ dành cho tài khoản Administrator
        </div>
      </section>
    </main>
  );
}
