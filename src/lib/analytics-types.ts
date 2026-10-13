export interface AnalyticsRange {
  start: string;
  end: string;
  days: number;
  previousStart: string;
  previousEnd: string;
}
export interface AnalyticsKpi {
  value: number;
  previous: number;
  change: number | null;
}
export interface AnalyticsCampaign {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  sessions: number;
  apkClicks: number;
  clickRate: number | null;
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
  };
  daily: { date: string; users: number }[];
  sources: { name: string; users: number; share: number | null }[];
  campaigns: AnalyticsCampaign[];
  actions: {
    visitors: number;
    apkClicks: number;
    playClicks: number;
    apkUsers: number;
    playUsers: number;
    apkRate: number | null;
    playRate: number | null;
  };
  pages: { path: string; views: number; share: number | null }[];
  warnings: string[];
}
export type AnalyticsResponse =
  AnalyticsReady | { status: "not_connected"; message: string };
