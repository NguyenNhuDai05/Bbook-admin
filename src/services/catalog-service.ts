import { invalidateResources } from "@/lib/client";
import { catalogApi } from "@/repositories/catalog-api";
import type { CatalogFilters } from "@/lib/catalog-types";
const key = "admin:makeup-catalog:";
const query = <T>(
  suffix: string,
  load: (signal: AbortSignal) => Promise<T>,
) => ({ key: key + suffix, load });
export const catalogService = {
  list: (styles: boolean, filters: CatalogFilters) =>
    query(`list:${styles}:${JSON.stringify(filters)}`, (signal) =>
      catalogApi.list(styles, filters, signal),
    ),
  detail: (styles: boolean, id: number) =>
    query(`detail:${styles}:${id}`, (signal) =>
      catalogApi.detail(styles, id, signal),
    ),
  usage: (styles: boolean, id: number) =>
    query(`usage:${styles}:${id}`, (signal) =>
      catalogApi.usage(styles, id, signal),
    ),
  terms: () => query("options", catalogApi.terms),
  snapshot: () => query("snapshot", catalogApi.snapshot),
  async save(...args: Parameters<typeof catalogApi.save>) {
    const result = await catalogApi.save(...args);
    invalidateResources([key, "admin:style-catalog:", "admin:styles:"]);
    return result;
  },
  async lifecycle(...args: Parameters<typeof catalogApi.lifecycle>) {
    const result = await catalogApi.lifecycle(...args);
    invalidateResources([key, "admin:style-catalog:", "admin:styles:"]);
    return result;
  },
};
