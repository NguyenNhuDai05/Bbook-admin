import { adminApi as api } from "@/repositories/admin-api";
import { invalidateResources, type ResourceQuery } from "@/lib/client";
import type {
  BankApproval,
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
    invalidateResources(prefixes);
  }
}
export const adminService = {
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
      ["admin:recipients:", "admin:applications:", `admin:mua:${id}`],
    ),
  banks: () => query("admin:banks:pending", (signal) => api.banks(signal)),
  reviewBank: (id: string, approve: boolean) =>
    mutate<BankApproval | void>(
      () => (approve ? api.approveBank(id) : api.rejectBank(id)),
      ["admin:banks:", "admin:mua:"],
    ),
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
