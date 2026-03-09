import { Injectable, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type {
  AnalyticsDashboardResponse,
  WeeklySnapshot,
  MonthlyVolume,
  MonthlyStageDuration,
  MonthlyResolutionRate,
  MonthlyTimeToClose,
  VendorPerformanceResponse,
  TopVendor,
  RankWinRate,
  CoverageRate,
  VendorMonthlyTrend,
} from '@fieldrunner/shared';
import { DATABASE_CONNECTION } from '../core/database/database.module';
import type { Database } from '../core/database';
import { OrganizationSettingsService } from '../org/settings/settings.service';

const VALID_RANGES = new Set(['7d', '1m', '6m', '1y', 'all']);

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Database,
    private readonly settingsService: OrganizationSettingsService,
  ) {}

  async getDashboard(
    clerkOrgId: string,
    range?: string,
  ): Promise<AnalyticsDashboardResponse> {
    const orgId = await this.settingsService.resolveOrgId(clerkOrgId);
    const cutoff = this.rangeToCutoff(range);

    const [snapshotResult, volumeResult, stageResult, ttcResult] = await Promise.all([
      this.getWeeklySnapshot(orgId),
      this.getTicketVolume(orgId, cutoff),
      this.getStageDurations(orgId, cutoff),
      this.getTimeToClose(orgId, cutoff),
    ]);

    const snapshot = this.parseSnapshot(snapshotResult.rows);
    const ticketVolume = this.parseVolume(volumeResult.rows);
    const stageDurations = this.parseStageDurations(stageResult.rows);
    const resolutionRate = this.deriveResolutionRate(ticketVolume);
    const timeToClose = this.parseTimeToClose(ttcResult.rows);

    return { snapshot, ticketVolume, stageDurations, resolutionRate, timeToClose };
  }

  async getVendorPerformance(
    clerkOrgId: string,
    range?: string,
  ): Promise<VendorPerformanceResponse> {
    const orgId = await this.settingsService.resolveOrgId(clerkOrgId);
    const cutoff = this.rangeToCutoff(range);

    const [topResult, rankResult, coverageResult, trendResult] =
      await Promise.all([
        this.getTopVendors(orgId, cutoff),
        this.getRankWinRates(orgId, cutoff),
        this.getVendorCoverage(orgId, cutoff),
        this.getVendorMonthlyTrends(orgId, cutoff),
      ]);

    return {
      topVendors: this.parseTopVendors(topResult.rows),
      rankWinRates: this.parseRankWinRates(rankResult.rows),
      coverage: this.parseCoverage(coverageResult.rows),
      monthlyTrends: this.parseMonthlyTrends(trendResult.rows),
    };
  }

  private getTopVendors(orgId: string, cutoff: Date | null) {
    const cutoffClause = cutoff
      ? sql`AND va.created_at >= ${cutoff}`
      : sql``;

    return this.db.execute(sql`
      SELECT
        va.vendor_name,
        va.vendor_id,
        COUNT(*)::int AS job_count,
        AVG(sr.billable_total::numeric) AS avg_billable,
        SUM(sr.billable_total::numeric) AS total_billable
      FROM vendor_assignments va
      JOIN service_requests sr ON sr.id = va.service_request_id
      WHERE va.organization_id = ${orgId}
        ${cutoffClause}
      GROUP BY va.vendor_name, va.vendor_id
      ORDER BY job_count DESC
      LIMIT 20
    `);
  }

  private getRankWinRates(orgId: string, cutoff: Date | null) {
    const cutoffClause = cutoff
      ? sql`AND created_at >= ${cutoff}`
      : sql``;

    return this.db.execute(sql`
      SELECT
        rank,
        COUNT(*)::int AS count
      FROM vendor_assignments
      WHERE organization_id = ${orgId}
        AND source = 'ui_accept'
        AND rank IS NOT NULL
        ${cutoffClause}
      GROUP BY rank
      ORDER BY rank
    `);
  }

  private getVendorCoverage(orgId: string, cutoff: Date | null) {
    const cutoffClause = cutoff
      ? sql`AND sr.date_time_closed >= ${cutoff}`
      : sql``;

    return this.db.execute(sql`
      SELECT
        COUNT(*)::int AS total_closed,
        COUNT(va.id)::int AS with_assignment
      FROM service_requests sr
      LEFT JOIN vendor_assignments va ON va.service_request_id = sr.id
      WHERE sr.organization_id = ${orgId}
        AND sr.is_open = false
        ${cutoffClause}
    `);
  }

  private getVendorMonthlyTrends(orgId: string, cutoff: Date | null) {
    const cutoffClause = cutoff
      ? sql`AND va.created_at >= ${cutoff}`
      : sql``;

    return this.db.execute(sql`
      SELECT
        to_char(date_trunc('month', va.created_at), 'Mon YYYY') AS month,
        va.vendor_name,
        COUNT(*)::int AS job_count,
        AVG(sr.billable_total::numeric) AS avg_billable
      FROM vendor_assignments va
      JOIN service_requests sr ON sr.id = va.service_request_id
      WHERE va.organization_id = ${orgId}
        ${cutoffClause}
      GROUP BY date_trunc('month', va.created_at), va.vendor_name
      ORDER BY date_trunc('month', va.created_at)
    `);
  }

  private parseTopVendors(rows: Record<string, unknown>[]): TopVendor[] {
    return rows.map((row) => ({
      vendorName: String(row.vendor_name),
      vendorId: row.vendor_id ? String(row.vendor_id) : null,
      jobCount: Number(row.job_count),
      avgBillable:
        row.avg_billable != null
          ? Math.round(Number(row.avg_billable) * 100) / 100
          : null,
      totalBillable:
        row.total_billable != null
          ? Math.round(Number(row.total_billable) * 100) / 100
          : null,
    }));
  }

  private parseRankWinRates(rows: Record<string, unknown>[]): RankWinRate[] {
    const total = rows.reduce((sum, row) => sum + Number(row.count), 0);
    return rows.map((row) => ({
      rank: Number(row.rank),
      count: Number(row.count),
      percentage:
        total > 0
          ? Math.round((Number(row.count) / total) * 1000) / 10
          : 0,
    }));
  }

  private parseCoverage(rows: Record<string, unknown>[]): CoverageRate {
    const row = rows[0];
    if (!row) {
      return {
        totalClosed: 0,
        withAssignment: 0,
        withoutAssignment: 0,
        coveragePercent: 0,
      };
    }
    const totalClosed = Number(row.total_closed);
    const withAssignment = Number(row.with_assignment);
    return {
      totalClosed,
      withAssignment,
      withoutAssignment: totalClosed - withAssignment,
      coveragePercent:
        totalClosed > 0
          ? Math.round((withAssignment / totalClosed) * 1000) / 10
          : 0,
    };
  }

  private parseMonthlyTrends(
    rows: Record<string, unknown>[],
  ): VendorMonthlyTrend[] {
    return rows.map((row) => ({
      month: String(row.month),
      vendorName: String(row.vendor_name),
      jobCount: Number(row.job_count),
      avgBillable:
        row.avg_billable != null
          ? Math.round(Number(row.avg_billable) * 100) / 100
          : null,
    }));
  }

  private rangeToCutoff(range?: string): Date | null {
    if (!range || !VALID_RANGES.has(range) || range === 'all') return null;

    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '1m':
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      case '6m':
        return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      case '1y':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      default:
        return null;
    }
  }

  private getWeeklySnapshot(orgId: string) {
    return this.db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE date_time_created >= date_trunc('week', now())) AS created_this_week,
        COUNT(*) FILTER (WHERE date_time_closed >= date_trunc('week', now())) AS closed_this_week,
        COUNT(*) FILTER (WHERE is_open = true) AS total_open,
        COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress,
        AVG(EXTRACT(epoch FROM (date_time_closed - date_time_created)) / 86400)
          FILTER (WHERE date_time_closed IS NOT NULL) AS avg_days_to_close
      FROM service_requests
      WHERE organization_id = ${orgId}
    `);
  }

  private getTicketVolume(orgId: string, cutoff: Date | null) {
    if (cutoff) {
      return this.db.execute(sql`
        SELECT
          to_char(month_date, 'Mon YYYY') AS month,
          month_date,
          SUM(CASE WHEN type = 'created' THEN 1 ELSE 0 END) AS created,
          SUM(CASE WHEN type = 'resolved' THEN 1 ELSE 0 END) AS resolved
        FROM (
          SELECT date_trunc('month', date_time_created) AS month_date, 'created' AS type
          FROM service_requests
          WHERE organization_id = ${orgId} AND date_time_created IS NOT NULL
            AND date_time_created >= ${cutoff}
          UNION ALL
          SELECT date_trunc('month', date_time_closed) AS month_date, 'resolved' AS type
          FROM service_requests
          WHERE organization_id = ${orgId} AND date_time_closed IS NOT NULL
            AND date_time_closed >= ${cutoff}
        ) sub
        GROUP BY month_date
        ORDER BY month_date
      `);
    }
    return this.db.execute(sql`
      SELECT
        to_char(month_date, 'Mon YYYY') AS month,
        month_date,
        SUM(CASE WHEN type = 'created' THEN 1 ELSE 0 END) AS created,
        SUM(CASE WHEN type = 'resolved' THEN 1 ELSE 0 END) AS resolved
      FROM (
        SELECT date_trunc('month', date_time_created) AS month_date, 'created' AS type
        FROM service_requests
        WHERE organization_id = ${orgId} AND date_time_created IS NOT NULL
        UNION ALL
        SELECT date_trunc('month', date_time_closed) AS month_date, 'resolved' AS type
        FROM service_requests
        WHERE organization_id = ${orgId} AND date_time_closed IS NOT NULL
      ) sub
      GROUP BY month_date
      ORDER BY month_date
    `);
  }

  private getStageDurations(orgId: string, cutoff: Date | null) {
    if (cutoff) {
      return this.db.execute(sql`
        SELECT
          to_char(date_trunc('month', occurred_at), 'Mon YYYY') AS month,
          from_status,
          AVG(duration_in_status_ms) / 3600000.0 AS avg_hours
        FROM service_request_events
        WHERE organization_id = ${orgId}
          AND from_status IS NOT NULL
          AND duration_in_status_ms > 0
          AND occurred_at >= ${cutoff}
        GROUP BY date_trunc('month', occurred_at), from_status
        ORDER BY date_trunc('month', occurred_at)
      `);
    }
    return this.db.execute(sql`
      SELECT
        to_char(date_trunc('month', occurred_at), 'Mon YYYY') AS month,
        from_status,
        AVG(duration_in_status_ms) / 3600000.0 AS avg_hours
      FROM service_request_events
      WHERE organization_id = ${orgId}
        AND from_status IS NOT NULL
        AND duration_in_status_ms > 0
      GROUP BY date_trunc('month', occurred_at), from_status
      ORDER BY date_trunc('month', occurred_at)
    `);
  }

  private getTimeToClose(orgId: string, cutoff: Date | null) {
    if (cutoff) {
      return this.db.execute(sql`
        SELECT
          to_char(date_trunc('month', date_time_closed), 'Mon YYYY') AS month,
          AVG(EXTRACT(epoch FROM (date_time_closed - date_time_created)) / 86400) AS avg_days
        FROM service_requests
        WHERE organization_id = ${orgId} AND date_time_closed IS NOT NULL
          AND date_time_closed >= ${cutoff}
        GROUP BY date_trunc('month', date_time_closed)
        ORDER BY date_trunc('month', date_time_closed)
      `);
    }
    return this.db.execute(sql`
      SELECT
        to_char(date_trunc('month', date_time_closed), 'Mon YYYY') AS month,
        AVG(EXTRACT(epoch FROM (date_time_closed - date_time_created)) / 86400) AS avg_days
      FROM service_requests
      WHERE organization_id = ${orgId} AND date_time_closed IS NOT NULL
      GROUP BY date_trunc('month', date_time_closed)
      ORDER BY date_trunc('month', date_time_closed)
    `);
  }

  private parseSnapshot(rows: Record<string, unknown>[]): WeeklySnapshot {
    const row = rows[0];
    if (!row) {
      return {
        createdThisWeek: 0,
        closedThisWeek: 0,
        totalOpen: 0,
        inProgress: 0,
        avgDaysToClose: null,
      };
    }
    return {
      createdThisWeek: Number(row.created_this_week),
      closedThisWeek: Number(row.closed_this_week),
      totalOpen: Number(row.total_open),
      inProgress: Number(row.in_progress),
      avgDaysToClose:
        row.avg_days_to_close != null
          ? Math.round(Number(row.avg_days_to_close) * 10) / 10
          : null,
    };
  }

  private parseVolume(rows: Record<string, unknown>[]): MonthlyVolume[] {
    return rows.map((row) => ({
      month: String(row.month),
      created: Number(row.created),
      resolved: Number(row.resolved),
    }));
  }

  private parseStageDurations(rows: Record<string, unknown>[]): MonthlyStageDuration[] {
    const map = new Map<string, Record<string, number>>();
    const order: string[] = [];

    for (const row of rows) {
      const month = String(row.month);
      if (!map.has(month)) {
        map.set(month, {});
        order.push(month);
      }
      map.get(month)![String(row.from_status)] =
        Math.round(Number(row.avg_hours) * 10) / 10;
    }

    return order.map((month) => ({ month, stages: map.get(month)! }));
  }

  private deriveResolutionRate(volume: MonthlyVolume[]): MonthlyResolutionRate[] {
    return volume.map(({ month, created, resolved }) => ({
      month,
      created,
      resolved,
      rate:
        created > 0
          ? Math.round((resolved / created) * 1000) / 10
          : 0,
    }));
  }

  private parseTimeToClose(rows: Record<string, unknown>[]): MonthlyTimeToClose[] {
    return rows.map((row) => ({
      month: String(row.month),
      avgDays: Math.round(Number(row.avg_days) * 10) / 10,
    }));
  }
}
