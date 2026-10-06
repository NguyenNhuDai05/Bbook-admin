// Match the existing Backend's NFKC / whitespace normalization for creation.
export function normalizeStyleName(name) {
  return name.normalize("NFKC").trim().replace(/\s+/gu, " ");
}
export function findExistingStyle(styles, name) {
  const normalized = normalizeStyleName(name).toLowerCase();
  return styles.find(
    (style) =>
      style.name != null &&
      normalizeStyleName(style.name).toLowerCase() === normalized,
  );
}
export function filterStyles(styles, search) {
  const term = search.trim().toLowerCase();
  return styles.filter((style) =>
    (style.name || "").toLowerCase().includes(term),
  );
}
export const STYLE_PAGE_SIZE = 10;
export function stylePagination(total, page) {
  const pages = Math.max(1, Math.ceil(total / STYLE_PAGE_SIZE));
  const current = Math.max(1, Math.min(page, pages));
  return {
    pages,
    current,
    from: total === 0 ? 0 : (current - 1) * STYLE_PAGE_SIZE + 1,
    to: Math.min(current * STYLE_PAGE_SIZE, total),
  };
}
export function stylePageButtons(current, pages) {
  const candidates = [...new Set([1, pages, current - 1, current, current + 1])]
    .filter((x) => x >= 1 && x <= pages)
    .sort((a, b) => a - b);
  const result = [];
  for (const page of candidates) {
    const previous = result.at(-1);
    if (typeof previous === "number" && page - previous > 1) result.push("…");
    result.push(page);
  }
  return result;
}
