import { Injectable, BadRequestException } from '@nestjs/common';
import { BlueFolderClientService, BlueFolderApiError } from './bluefolder-client.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
import { BlueFolderUsersService } from './bluefolder-users.service';
import { mapServiceRequestListItem, mapServiceRequestDetail, mapServiceRequestFile } from './mappers';
import type {
  BfServiceRequestListResponse,
  BfServiceRequestGetResponse,
  BfServiceRequestFilesResponse,
  BfServiceRequestListFilter,
} from './types/bluefolder-api.types';
import type {
  ServiceRequestSummary,
  ServiceRequestDetail,
  ServiceRequestFile,
} from '@fieldrunner/shared';

@Injectable()
export class BlueFolderService {
  constructor(
    private readonly client: BlueFolderClientService,
    private readonly settingsService: OrganizationSettingsService,
    private readonly usersService: BlueFolderUsersService,
  ) {}

  private async getApiKey(clerkOrgId: string): Promise<string> {
    const apiKey = await this.settingsService.getDecryptedApiKey(clerkOrgId);
    if (!apiKey) {
      throw new BadRequestException(
        'BlueFolder API key not configured for this organization',
      );
    }
    return apiKey;
  }

  async listServiceRequests(
    clerkOrgId: string,
    filters: Partial<BfServiceRequestListFilter> = {},
  ): Promise<ServiceRequestSummary[]> {
    const apiKey = await this.getApiKey(clerkOrgId);

    const result = await this.client.request<BfServiceRequestListResponse>(
      'serviceRequests/list.aspx',
      apiKey,
      { listType: 'basic', ...filters },
    );

    const items = result.serviceRequestList?.serviceRequest ?? [];
    const summaries = items.map(mapServiceRequestListItem);

    const organizationId = await this.settingsService.resolveOrgId(clerkOrgId);
    const managerIds = this.collectSummaryUserIds(summaries);
    const userMap = await this.usersService.buildUserMap(organizationId, managerIds);
    this.enrichSummaries(summaries, userMap);

    return summaries;
  }

  async getServiceRequest(
    clerkOrgId: string,
    serviceRequestId: number,
  ): Promise<ServiceRequestDetail> {
    const apiKey = await this.getApiKey(clerkOrgId);

    const result = await this.client.request<BfServiceRequestGetResponse>(
      'serviceRequests/get.aspx',
      apiKey,
      { serviceRequestId: String(serviceRequestId) },
    );

    // serviceRequest is forced to array by isArray parser config
    const sr = Array.isArray(result.serviceRequest)
      ? result.serviceRequest[0]
      : result.serviceRequest;
    const detail = mapServiceRequestDetail(sr);

    const organizationId = await this.settingsService.resolveOrgId(clerkOrgId);
    const userIds = this.collectDetailUserIds(detail);
    const userMap = await this.usersService.buildUserMap(organizationId, userIds);
    this.enrichDetail(detail, userMap);

    return detail;
  }

  async getServiceRequestFiles(
    clerkOrgId: string,
    serviceRequestId: number,
  ): Promise<ServiceRequestFile[]> {
    const apiKey = await this.getApiKey(clerkOrgId);

    try {
      const result = await this.client.request<BfServiceRequestFilesResponse>(
        'serviceRequests/getFiles.aspx',
        apiKey,
        { serviceRequestId: String(serviceRequestId) },
      );

      const files = result.serviceRequestFile ?? [];
      return (Array.isArray(files) ? files : [files]).map(
        mapServiceRequestFile,
      );
    } catch (error) {
      // BlueFolder returns an error (often 404) when no files exist
      if (
        error instanceof BlueFolderApiError &&
        (error.statusCode === 404 || error.code === '404')
      ) {
        return [];
      }
      throw error;
    }
  }

  private collectSummaryUserIds(summaries: ServiceRequestSummary[]): number[] {
    const ids: number[] = [];
    for (const s of summaries) {
      if (s.accountManagerId) ids.push(s.accountManagerId);
      if (s.serviceManagerId) ids.push(s.serviceManagerId);
    }
    return ids;
  }

  private collectDetailUserIds(detail: ServiceRequestDetail): number[] {
    const ids: number[] = [];

    if (detail.accountManagerId) ids.push(detail.accountManagerId);
    if (detail.serviceManagerId) ids.push(detail.serviceManagerId);
    if (detail.createdByUserId) ids.push(detail.createdByUserId);

    for (const a of detail.assignments) {
      ids.push(...a.assigneeUserIds);
      if (a.createdByUserId) ids.push(a.createdByUserId);
      if (a.completedByUserId) ids.push(a.completedByUserId);
    }
    for (const l of detail.labor) {
      if (l.userId) ids.push(l.userId);
      if (l.createdByUserId) ids.push(l.createdByUserId);
    }
    for (const m of detail.materials) {
      if (m.createdByUserId) ids.push(m.createdByUserId);
    }
    for (const e of detail.expenses) {
      if (e.userId) ids.push(e.userId);
      if (e.createdByUserId) ids.push(e.createdByUserId);
    }
    for (const l of detail.log) {
      if (l.createdByUserId) ids.push(l.createdByUserId);
    }

    return ids;
  }

  private enrichSummaries(
    summaries: ServiceRequestSummary[],
    userMap: Map<number, string>,
  ): void {
    const resolve = BlueFolderUsersService.resolveName;
    for (const s of summaries) {
      s.accountManagerName = resolve(userMap, s.accountManagerId);
      s.serviceManagerName = resolve(userMap, s.serviceManagerId);
    }
  }

  private enrichDetail(
    detail: ServiceRequestDetail,
    userMap: Map<number, string>,
  ): void {
    const resolve = BlueFolderUsersService.resolveName;

    detail.accountManagerName = resolve(userMap, detail.accountManagerId);
    detail.serviceManagerName = resolve(userMap, detail.serviceManagerId);
    detail.createdByUserName = resolve(userMap, detail.createdByUserId);

    for (const a of detail.assignments) {
      a.assigneeUserNames = a.assigneeUserIds
        .map((id) => resolve(userMap, id))
        .filter((n): n is string => n !== null);
      a.createdByUserName = resolve(userMap, a.createdByUserId);
      a.completedByUserName = resolve(userMap, a.completedByUserId);
    }
    for (const l of detail.labor) {
      l.userName = resolve(userMap, l.userId);
      l.createdByUserName = resolve(userMap, l.createdByUserId);
    }
    for (const m of detail.materials) {
      m.createdByUserName = resolve(userMap, m.createdByUserId);
    }
    for (const e of detail.expenses) {
      e.userName = resolve(userMap, e.userId);
      e.createdByUserName = resolve(userMap, e.createdByUserId);
    }
    for (const l of detail.log) {
      l.createdByUserName = resolve(userMap, l.createdByUserId);
    }
  }
}
