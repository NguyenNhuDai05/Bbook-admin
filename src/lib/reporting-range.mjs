import {
  presetRange,
  shiftDay,
  validRange,
  vietnamToday,
} from "./dashboard-presentation.mjs";

export function reportPreset(preset, today = vietnamToday()) {
  if (preset === "all") return { preset, from: "", to: "" };
  if (preset === "quarter")
    return { preset, from: shiftDay(today, -89), to: today };
  if (!["today", "week", "month", "this-month", "this-year"].includes(preset))
    preset = "month";
  return { preset, ...presetRange(preset, today) };
}

export function readReportRange(
  params,
  { defaultPreset = "month", allowAll = false, today = vietnamToday() } = {},
) {
  const preset = params.get("scope") || defaultPreset;
  const from = params.get("from") || "",
    to = params.get("to") || "";
  if (preset === "all" && allowAll) return reportPreset("all", today);
  if (from || to) {
    if (validRange(from, to))
      return {
        preset: [
          "today",
          "week",
          "month",
          "quarter",
          "this-month",
          "this-year",
          "pick-month",
          "pick-year",
          "custom",
        ].includes(preset)
          ? preset
          : "custom",
        from,
        to,
      };
    return reportPreset(defaultPreset, today);
  }
  return reportPreset(preset === "all" ? "month" : preset, today);
}

export function reviewFilters(params) {
  const rating = Number(params.get("rating") || 0);
  const page = Number(params.get("page") || 1);
  return {
    range: readReportRange(params, { defaultPreset: "all", allowAll: true }),
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 0,
    page: Number.isInteger(page) && page >= 1 && page <= 100000 ? page : 1,
  };
}

export function reviewHref({ range, rating = 0, page = 1 }, id) {
  const query = new URLSearchParams({ scope: range.preset });
  if (range.from && range.to) {
    query.set("from", range.from);
    query.set("to", range.to);
  }
  if (rating) query.set("rating", String(rating));
  if (page > 1) query.set("page", String(page));
  return `/reviews${id ? `/${encodeURIComponent(id)}` : ""}?${query}`;
}
