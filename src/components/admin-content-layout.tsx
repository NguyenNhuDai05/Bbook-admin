import type { ReactNode } from "react";

const listRoutes = new Set([
  "styles",
  "users",
  "muas",
  "complaints",
  "verification",
  "bank-accounts",
  "payouts",
  "refunds",
  "moderation",
  "notifications",
  "feedback",
]);

export function isAdminListRoute(route: string, id?: string) {
  return !id && listRoutes.has(route);
}

export function AdminContentLayout({
  list,
  children,
}: {
  list: boolean;
  children: ReactNode;
}) {
  return (
    <div className={list ? "admin-list-page" : "admin-scrollable-page"}>
      {children}
    </div>
  );
}
