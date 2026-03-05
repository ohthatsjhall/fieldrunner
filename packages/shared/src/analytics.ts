export interface WeeklySnapshot {
  createdThisWeek: number;
  closedThisWeek: number;
  totalOpen: number;
  inProgress: number;
  avgDaysToClose: number | null;
}

export interface MonthlyVolume {
  month: string;
  created: number;
  resolved: number;
}

export interface MonthlyStageDuration {
  month: string;
  stages: Record<string, number>;
}

export interface MonthlyResolutionRate {
  month: string;
  created: number;
  resolved: number;
  rate: number;
}

export interface MonthlyTimeToClose {
  month: string;
  avgDays: number;
}

export interface AnalyticsDashboardResponse {
  snapshot: WeeklySnapshot;
  ticketVolume: MonthlyVolume[];
  stageDurations: MonthlyStageDuration[];
  resolutionRate: MonthlyResolutionRate[];
  timeToClose: MonthlyTimeToClose[];
}
