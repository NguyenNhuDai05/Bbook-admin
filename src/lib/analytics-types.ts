export interface AnalyticsRange {
  start: string;
  end: string;
  days: number;
  previousStart: string;
  previousEnd: string;
}
export interface AnalyticsKpi {
  value: number | null;
  previous: number | null;
  change: number | null;
}
export interface AnalyticsCampaign {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  sessions: number | null;
  apkClicks: number | null;
  clickRate: number | null;
  // Legacy percentage-scaled field; the UI uses clicksPerSession (no percent).
  clicksPerSession: number | null;
}
export interface AnalyticsReady {
  status: "ready";
  range: AnalyticsRange;
  timezone: string;
  hosts: string[];
  fetchedAt: string;
  kpis: {
    users: AnalyticsKpi;
    sessions: AnalyticsKpi;
    apk: AnalyticsKpi;
    play: AnalyticsKpi;
    newUsers: AnalyticsKpi;
    views: AnalyticsKpi;
    engagementRate: AnalyticsKpi;
    averageEngagementTime: AnalyticsKpi;
  };
  daily: {
    date: string;
    users: number | null;
    sessions: number | null;
    apkClicks: number | null;
  }[];
  sources: { name: string; users: number | null; share: number | null }[];
  traffic: {
    source: string;
    medium: string;
    category: string;
    sessions: number | null;
    users: number | null;
    apkClicks: number | null;
    clicksPerSession: number | null;
  }[];
  availability: Record<
    string,
    { state: "available" | "empty" | "unavailable"; reason: string | null }
  >;
  provisional: boolean;
  empty: boolean;
  campaigns: AnalyticsCampaign[];
  actions: {
    visitors: number | null;
    apkClicks: number | null;
    playClicks: number | null;
    apkUsers: number | null;
    playUsers: number | null;
    apkRate: number | null;
    playRate: number | null;
  };
  pages: { path: string; views: number | null; share: number | null }[];
  warnings: string[];
}
export type AnalyticsResponse =
  AnalyticsReady | { status: "not_connected"; message: string };
