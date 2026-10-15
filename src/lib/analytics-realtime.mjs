import { AnalyticsError } from "./analytics-data.mjs";

export function realtimeRequest(streamId, minutes, timeline = false) {
  return {
    dimensions: timeline ? [{ name: "minutesAgo" }] : [],
    metrics: [{ name: "activeUsers" }],
    minuteRanges: [{ startMinutesAgo: minutes - 1, endMinutesAgo: 0 }],
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

export function parseRealtime(report, timeline = false) {
  if (
    report?.metricHeaders?.length !== 1 ||
    report.metricHeaders[0].name !== "activeUsers" ||
    (timeline &&
      (report.dimensionHeaders?.length !== 1 ||
        report.dimensionHeaders[0].name !== "minutesAgo"))
  )
    throw new AnalyticsError("response");
  const rows = report.rows ?? [];
  if (
    !Array.isArray(rows) ||
    (report.rowCount ?? rows.length) !== rows.length ||
    rows.length > (timeline ? 30 : 1)
  )
    throw new AnalyticsError("response");
  const points = new Map();
  for (const row of rows) {
    const raw = row.metricValues?.[0]?.value;
    if (!/^\d+$/.test(raw ?? "") || !Number.isSafeInteger(Number(raw)))
      throw new AnalyticsError("response");
    const rawMinute = row.dimensionValues?.[0]?.value;
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
        users: points.get(29 - i) ?? 0,
      }))
    : (points.get(0) ?? 0);
}
