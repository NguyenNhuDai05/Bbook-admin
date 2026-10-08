import { adminApi as api } from "@/repositories/admin-api";
import { invalidateResources, type ResourceQuery } from "@/lib/client";
import type {
  BankApproval,
  BankReviewRequest,
  FinancialRequest,
  NotificationRequest,
  RejectionRequest,
} from "@/lib/types";
function query<T>(
  key: string,
  load: ResourceQuery<T>["load"],
  enabled = true,
): ResourceQuery<T> {
  return { key, load, enabled };
}
async function mutate<T>(action: () => Promise<T>, prefixes: string[]) {
  try {
    return await action();
  } finally {
    invalidateResources([
      ...prefixes,
      "admin:work-summary",
      "admin:dashboard:",
    ]);
  }
}
async function mutateStyle<T>(action: () => Promise<T>, prefixes: string[]) {
  const result = await action();
  invalidateResources(prefixes);
  return result;
}
export const adminService = {
  dashboardReviews: (from: string, to: string, rating: number, page: number) =>
    query(`admin:dashboard:reviews:${from}:${to}:${rating}:${page}`, (signal) =>
      api.dashboardReviews(from, to, rating, page, signal),
    ),
  dashboardTransactions: (from: string, to: string, page: number) =>
    query(`admin:dashboard:transactions:${from}:${to}:${page}`, (signal) =>
      api.dashboardTransactions(from, to, page, signal),
    ),
  dashboardTransaction: (id: string) =>
    query(
      `admin:dashboard:transaction:${id}`,
      (signal) => api.dashboardTransaction(id, signal),
      !!id,
    ),
  dashboardReview: (id: string) =>
    query(
      `admin:dashboard:review:${id}`,
      (signal) => api.dashboardReview(id, signal),
      !!id,
    ),
  adminStyles: (page: number, search: string, status: string) =>
    query(`admin:style-catalog:list:${page}:${status}:${search}`, (signal) =>
      api.adminStyles(page, search, status, signal),
    ),
  adminStyle: (id: number) =>
    query(`admin:style-catalog:detail:${id}`, (signal) =>
      api.adminStyle(id, signal),
    ),
  saveAdminStyle: (id: number | null, name: string, description: string) =>
    mutateStyle(
      () => api.saveAdminStyle(id, name, description),
      ["admin:style-catalog:", "admin:styles:"],
    ),
  statusAdminStyle: (id: number, active: boolean) =>
    mutateStyle(
      () => api.statusAdminStyle(id, active),
      ["admin:style-catalog:", "admin:styles:"],
    ),
  dashboard: (from: string, to: string) =>
    query(`admin:dashboard:${from}:${to}`, (signal) =>
      api.dashboard(from, to, signal),
    ),
  applications: (status: string, page = 1, size = 20) =>
    query(`admin:applications:${status}:${page}:${size}`, (signal) =>
      api.applications(status, page, size, signal),
    ),
  mua: (id: string) =>
    query(`admin:mua:${id}`, (signal) => api.mua(id, signal)),
  approveMua: (id: string) =>
    mutate(
      () => api.approveMua(id),
      ["admin:applications:", `admin:mua:${id}`],
    ),
  rejectMua: (id: string, body: RejectionRequest) =>
    mutate(
      () => api.rejectMua(id, body),
      ["admin:applications:", `admin:mua:${id}`],
    ),
  suspendMua: (id: string, suspended: boolean) =>
    mutate(
      () => api.suspendMua(id, suspended),
      ["admin:applications:", `admin:mua:${id}`],
    ),
  activeUser: (id: string, active: boolean) =>
    mutate(
      () => api.activeUser(id, active),
      [
        "admin:users:",
        "admin:recipients:",
        "admin:applications:",
        `admin:mua:${id}`,
      ],
    ),
  users: (search: string, role: string, active: boolean, page: number) =>
    query(`admin:users:${search}:${role}:${active}:${page}`, (signal) =>
      api.users(search, role, active, page, signal),
    ),
  financialSummary: (refund: boolean) =>
    query(`admin:${refund ? "refunds" : "payouts"}:summary`, (signal) =>
      api.financialSummary(refund, signal),
    ),
  banks: (status = "PENDING_ADMIN") =>
    query(`admin:banks:${status}`, (signal) => api.banks(signal, status)),
  reviewBank: (id: string, approve: boolean, body: BankReviewRequest) =>
    mutate<BankApproval | void>(
      () => (approve ? api.approveBank(id, body) : api.rejectBank(id, body)),
      ["admin:banks:", "admin:mua:"],
    ),
  financialQr: api.financialQr,
  moneyList: (refund: boolean, status = "") =>
    query(`admin:${refund ? "refunds" : "payouts"}:list:${status}`, (signal) =>
      api.moneyList(refund, status, signal),
    ),
  money: (id: string, refund: boolean) =>
    query(`admin:${refund ? "refunds" : "payouts"}:detail:${id}`, (signal) =>
      api.money(id, refund, signal),
    ),
  financialAction: (
    id: string,
    refund: boolean,
    action: string,
    body: FinancialRequest,
  ) =>
    mutate(
      () => api.financialAction(id, refund, action, body),
      [`admin:${refund ? "refunds" : "payouts"}:`],
    ),
  campaigns: (page: number) =>
    query(`admin:campaigns:${page}`, (signal) => api.campaigns(page, signal)),
  recipients: (
    search: string,
    role = "",
    page = 1,
    size = 20,
    enabled = true,
  ) =>
    query(
      `admin:recipients:${search}:${role}:${page}:${size}`,
      (signal) => api.recipients(search, role, page, size, signal),
      enabled,
    ),
  notify: (body: NotificationRequest) =>
    mutate(() => api.notify(body), ["admin:campaigns:"]),
  styles: () => query("admin:styles:", (signal) => api.styles(signal)),
  createStyle: (name: string, description: string) =>
    mutate(() => api.createStyle(name, description), ["admin:styles:"]),
  autoComplete: () =>
    mutate(() => api.autoComplete(), ["admin:payouts:", "admin:refunds:"]),
};
