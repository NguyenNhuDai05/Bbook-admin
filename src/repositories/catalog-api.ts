import { request } from "@/lib/client";
import { assertPaged } from "@/lib/contracts.mjs";
import { catalogQuery } from "@/lib/catalog-contracts.mjs";
import type {
  CatalogFilters,
  CatalogSnapshot,
  CatalogStyle,
  CatalogTerm,
  CatalogUsage,
  CatalogWrite,
} from "@/lib/catalog-types";
import type { Paged } from "@/lib/types";
export const catalogPath = (styles: boolean) =>
  styles ? "admin/makeup-styles" : "admin/makeup-catalog/terms";
export const catalogApi = {
  async list(styles: boolean, filters: CatalogFilters, signal: AbortSignal) {
    return assertPaged(
      await request(
        `${catalogPath(styles)}?${catalogQuery(filters)}`,
        "GET",
        undefined,
        signal,
      ),
      styles
        ? ["styleId", "name", "isActive"]
        : ["id", "kind", "key", "label", "version"],
    ) as Paged<CatalogStyle | CatalogTerm>;
  },
  detail: (styles: boolean, id: number, signal: AbortSignal) =>
    request<CatalogStyle | CatalogTerm>(
      `${catalogPath(styles)}/${id}`,
      "GET",
      undefined,
      signal,
    ),
  save: (styles: boolean, id: number | null, body: CatalogWrite) =>
    request<CatalogStyle | CatalogTerm>(
      `${catalogPath(styles)}${id == null ? "" : `/${id}`}`,
      id == null ? "POST" : "PUT",
      body,
    ),
  lifecycle: (
    styles: boolean,
    id: number,
    action: "status" | "archive" | "review",
    body: {
      expectedVersion: number;
      isActive?: boolean;
      status?: string;
      reason?: string;
    },
  ) =>
    request(
      `${catalogPath(styles)}/${id}/${action}`,
      action === "status" ? "PATCH" : "POST",
      body,
    ),
  usage: (styles: boolean, id: number, signal: AbortSignal) =>
    request<CatalogUsage>(
      `${catalogPath(styles)}/${id}/usage`,
      "GET",
      undefined,
      signal,
    ),
  async snapshot(signal: AbortSignal) {
    const result = await request<CatalogSnapshot>(
      "makeup-catalog",
      "GET",
      undefined,
      signal,
    );
    if (
      !result ||
      typeof result.version !== "string" ||
      !Array.isArray(result.styles) ||
      !Array.isArray(result.terms)
    )
      throw new Error("Catalog công khai không đúng định dạng.");
    return result;
  },
  // All pages, including inactive/archived, for labels and preserving existing links.
  async terms(signal: AbortSignal) {
    const terms: CatalogTerm[] = [];
    for (let page = 1; ; page++) {
      const result = assertPaged(
        await request(
          `admin/makeup-catalog/terms?${catalogQuery({ page, pageSize: 100, status: "all" })}`,
          "GET",
          undefined,
          signal,
        ),
        ["id", "kind", "key", "label", "version"],
      ) as Paged<CatalogTerm>;
      terms.push(...result.items);
      if (terms.length >= result.total) return terms;
      if (!result.items.length)
        throw new Error("Phân trang danh mục không hợp lệ. Vui lòng tải lại.");
    }
  },
};
