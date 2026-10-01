"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Command,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleWarning,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  Landmark,
  RotateCcw,
  X,
} from "lucide-react";
import { sessionService } from "@/services/session-service";
import { useSubmission } from "@/lib/client";
import type { AdminUser } from "@/lib/types";
import { Dashboard, Applications } from "./overview-pages";
import { VerificationDetail } from "./verification-detail";
import { Complaints } from "./complaint-pages";
import { BankAccounts, MoneyList, MoneyDetail } from "./finance-pages";
import {
  Notifications,
  Styles,
  Directory,
  PlannedPage,
  Bookings,
} from "./other-pages";
const groups = [
  {
    label: "",
    items: [{ key: "", label: "Tổng quan", icon: LayoutDashboard }],
  },
  {
    label: "QUẢN LÝ",
    items: [
      { key: "users", label: "Người dùng", icon: Users },
      { key: "muas", label: "Makeup Artist", icon: Sparkles },
      { key: "bookings", label: "Booking", icon: CalendarDays },
      { key: "complaints", label: "Khiếu nại", icon: MessageCircleWarning },
    ],
  },
  {
    label: "XÁC MINH & TÀI CHÍNH",
    items: [
      { key: "verification", label: "Xác minh MUA", icon: ShieldCheck },
      { key: "bank-accounts", label: "Tài khoản nhận tiền", icon: Landmark },
      { key: "payouts", label: "Chi trả MUA", icon: WalletCards },
      { key: "refunds", label: "Hoàn tiền", icon: RotateCcw },
    ],
  },
  {
    label: "NỘI DUNG",
    items: [
      { key: "styles", label: "Phong cách makeup", icon: Sparkles },
      { key: "notifications", label: "Thông báo", icon: Bell },
    ],
  },
  {
    label: "HỆ THỐNG",
    items: [
      { key: "activity", label: "Nhật ký hoạt động", icon: Activity },
      { key: "settings", label: "Cài đặt", icon: Settings },
    ],
  },
];
export interface PageProps {
  base: string;
}
export function AdminApp({
  route,
  user,
}: {
  route: string[];
  user: AdminUser;
}) {
  const [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(""),
    [account, setAccount] = useState(false),
    [logoutBusy, setLogoutBusy] = useState(false),
    [logoutError, setLogoutError] = useState("");
  const key = route[0] || "",
    id = route[1];
  const title =
    groups.flatMap((g) => g.items).find((x) => x.key === key)?.label ||
    "Không tìm thấy";
  const base = "";
  const props = { base };
  const matches = groups
    .flatMap((g) => g.items)
    .filter((x) => x.label.toLowerCase().includes(search.toLowerCase()));
  const logoutSubmission = useSubmission();
  async function logout() {
    if (!logoutSubmission.begin()) return;
    setLogoutBusy(true);
    setLogoutError("");
    try {
      await sessionService.logout();
      // Full navigation clears the authenticated server-rendered tree.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    } catch {
      setLogoutError("Chưa thể đăng xuất. Vui lòng thử lại.");
      setLogoutBusy(false);
      logoutSubmission.end();
    }
  }
  let page;
  if (key === "") page = <Dashboard {...props} />;
  else if (key === "verification" && id)
    page = <VerificationDetail {...props} id={id} />;
  else if (key === "verification") page = <Applications {...props} />;
  else if (key === "muas") page = <Applications {...props} management />;
  else if (key === "bank-accounts") page = <BankAccounts />;
  else if (key === "payouts" || key === "refunds")
    page = id ? (
      <MoneyDetail {...props} id={id} refund={key === "refunds"} />
    ) : (
      <MoneyList {...props} refund={key === "refunds"} />
    );
  else if (key === "notifications") page = <Notifications />;
  else if (key === "styles") page = <Styles />;
  else if (key === "users") page = <Directory />;
  else if (key === "bookings") page = <Bookings {...props} id={id} />;
  else if (key === "complaints") page = <Complaints {...props} id={id} />;
  else if (key === "activity" || key === "settings")
    page = <PlannedPage kind={key} />;
  else
    page = (
      <div className="empty-state">
        <h1>Không tìm thấy trang</h1>
        <Link href={`${base}/`}>Về tổng quan</Link>
      </div>
    );
  return (
    <div className={`admin-shell ${collapsed ? "collapsed" : ""}`}>
      {mobile && (
        <button
          aria-label="Đóng menu"
          className="sidebar-backdrop"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Link className="brand" href={`${base}/`}>
          <span className="brand-mark">b.</span>
          <span className="brand-copy">
            B-Book <small>ADMIN WORKSPACE</small>
          </span>
        </Link>
        <button
          className="collapse-button"
          aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          onClick={() => setCollapsed((x) => !x)}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <nav>
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              {group.label && <div className="nav-label">{group.label}</div>}
              {group.items.map((item) => (
                <Link
                  title={item.label}
                  key={item.key}
                  href={`${base}/${item.key}`}
                  onClick={() => setMobile(false)}
                  className={`nav-item ${key === item.key ? "active" : ""}`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-profile">
          <div className="avatar admin-avatar">
            {user.fullName?.slice(0, 1) || "A"}
          </div>
          <div className="profile-copy">
            <strong>{user.fullName || "Admin"}</strong>
            <small>Administrator</small>
          </div>
          <button
            className="icon-button"
            onClick={logout}
            disabled={logoutBusy}
            aria-label="Đăng xuất"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setMobile(true)}
            aria-label="Mở menu"
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <strong>{title}</strong>
            {id && (
              <>
                <ChevronRight size={13} />
                <span>Chi tiết hồ sơ</span>
              </>
            )}
          </div>
          <div className="global-search">
            <Search size={16} />
            <input
              aria-label="Tìm trang quản trị"
              placeholder="Tìm trang quản trị…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Command size={12} />
            {search && (
              <div className="search-results">
                {matches.length ? (
                  matches.map((item) => (
                    <Link
                      key={item.key}
                      href={`${base}/${item.key}`}
                      onClick={() => setSearch("")}
                    >
                      {item.label}
                      <ArrowUpRight size={14} />
                    </Link>
                  ))
                ) : (
                  <p>Không tìm thấy trang.</p>
                )}
              </div>
            )}
          </div>
          <Link
            className="icon-button"
            href={`${base}/notifications`}
            aria-label="Thông báo"
          >
            <Bell size={19} />
          </Link>
          <div className="account-menu">
            <button
              className="avatar admin-avatar"
              aria-label="Menu tài khoản"
              onClick={() => setAccount((x) => !x)}
            >
              {user.fullName?.slice(0, 1) || "A"}
            </button>
            {account && (
              <div className="account-popover">
                <strong>{user.fullName}</strong>
                <small>{user.email}</small>
                <button
                  className="text-button"
                  onClick={logout}
                  disabled={logoutBusy}
                >
                  <LogOut size={15} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>
        {logoutError && (
          <div className="inline-error" role="alert">
            {logoutError}
            <button
              className="icon-button"
              onClick={() => setLogoutError("")}
              aria-label="Đóng"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <main className="main-content" key={`${key}/${id || ""}`}>
          {page}
        </main>
        <footer className="workspace-footer">
          © {new Date().getFullYear()} B-Book<span>Cổng vận hành nội bộ</span>
        </footer>
      </div>
    </div>
  );
}
