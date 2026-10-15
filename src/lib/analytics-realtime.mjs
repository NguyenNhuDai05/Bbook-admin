import { AnalyticsError } from "./analytics-data.mjs";

export function realtimeRequest(
  streamId,
  minutes,
  timeline = false,
  metric = "activeUsers",
) {
  if (!["activeUsers", "screenPageViews"].includes(metric))
    throw new AnalyticsError("config");
  return {
    dimensions: timeline ? [{ name: "minutesAgo" }] : [],
    metrics: [{ name: metric }],
    minuteRanges: [
      { name: "recent", startMinutesAgo: minutes - 1, endMinutesAgo: 0 },
    ],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "streamId",
              stringFilter: { matchType: "EXACT", value: streamId },
            },
          },
          {
            filter: {
              fieldName: "platform",
              stringFilter: { matchType: "EXACT", value: "web" },
            },
          },
        ],
      },
    },
    limit: 100,
  };
}

export function parseRealtime(
  report,
  timeline = false,
  metric = "activeUsers",
) {
  if (!["activeUsers", "screenPageViews"].includes(metric))
    throw new AnalyticsError("config");
  if (!report || typeof report !== "object")
    throw new AnalyticsError("response");
  const rows = report.rows ?? [];
  const headers = report.dimensionHeaders ?? [];
  // Protobuf JSON may omit default-valued fields on an empty report. Only
  // accept omitted headers when Google's report discriminator confirms it.
  const confirmedEmpty =
    report.kind === "analyticsData#runRealtimeReport" &&
    Array.isArray(rows) &&
    rows.length === 0 &&
    (report.rowCount ?? 0) === 0;
  const names = Array.isArray(headers)
    ? headers.map((header) => header?.name)
    : [];
  const minuteIndex = names.indexOf("minutesAgo");
  const rangeIndex = names.indexOf("dateRange");
  if (
    (!confirmedEmpty && report.metricHeaders?.length !== 1) ||
    (report.metricHeaders?.length &&
      (report.metricHeaders.length !== 1 ||
        report.metricHeaders[0].name !== metric)) ||
    !Array.isArray(headers) ||
    new Set(names).size !== names.length ||
    names.some(
      (name) => name !== "dateRange" && !(timeline && name === "minutesAgo"),
    ) ||
    (timeline && minuteIndex < 0 && !confirmedEmpty)
  )
    throw new AnalyticsError("response");
  if (
    !Array.isArray(rows) ||
    (report.rowCount ?? rows.length) !== rows.length ||
    rows.length > (timeline ? 30 : 1)
  )
    throw new AnalyticsError("response");
  const points = new Map();
  for (const row of rows) {
    if (
      (row.dimensionValues ?? []).length !== headers.length ||
      row.metricValues?.length !== 1
    )
      throw new AnalyticsError("response");
    if (
      rangeIndex >= 0 &&
      !["recent", "date_range_0"].includes(
        row.dimensionValues[rangeIndex]?.value,
      )
    )
      throw new AnalyticsError("response");
    const raw = row.metricValues?.[0]?.value;
    if (!/^\d+$/.test(raw ?? "") || !Number.isSafeInteger(Number(raw)))
      throw new AnalyticsError("response");
    const rawMinute = row.dimensionValues?.[minuteIndex]?.value;
    if (timeline && !/^\d{1,2}$/.test(rawMinute ?? ""))
      throw new AnalyticsError("response");
    const minute = timeline ? Number(rawMinute) : 0;
    if (
      !Number.isInteger(minute) ||
      minute < 0 ||
      minute > 29 ||
      points.has(minute)
    )
      throw new AnalyticsError("response");
    points.set(minute, Number(raw));
  }
  return timeline
    ? Array.from({ length: 30 }, (_, i) => ({
        minutesAgo: 29 - i,
        [metric === "screenPageViews" ? "views" : "users"]:
          points.get(29 - i) ?? 0,
      }))
    : (points.get(0) ?? 0);
}
