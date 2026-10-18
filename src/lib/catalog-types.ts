export type TermKind =
  | "occasion"
  | "intensity"
  | "color-tone"
  | "effect"
  | "occasion-group"
  | "effect-group";
export interface CatalogTerm {
  id: number;
  kind: TermKind;
  key: string;
  label: string;
  description: string | null;
  groupId: number | null;
  broaderTermId: number | null;
  sortOrder: number;
  isActive: boolean;
  archivedAt: string | null;
  version: number;
}
export interface CatalogStyle {
  styleId: number;
  name: string | null;
  description: string | null;
  key: string | null;
  sortOrder: number;
  source: string;
  reviewStatus: string;
  isActive: boolean;
  archivedAt: string | null;
  version: number;
  metadata?: CatalogTerm[] | null;
}
export interface CatalogUsage {
  muaCount: number;
  serviceCount: number;
  portfolioCount: number | null;
  styleMetadataCount: number;
  childTermCount: number;
  portfolioUsage: string;
}
export interface CatalogSnapshot {
  version: string;
  styles: unknown[];
  terms: CatalogTerm[];
}
export interface CatalogFilters {
  page: number;
  search: string;
  status: string;
  source?: string;
  reviewStatus?: string;
  kind?: TermKind;
  groupId?: number;
}
export interface CatalogWrite {
  name?: string;
  label?: string;
  description: string;
  key?: string;
  kind?: TermKind;
  sortOrder: number;
  groupId?: number | null;
  broaderTermId?: number | null;
  metadataTermIds?: number[];
  expectedVersion?: number;
}
