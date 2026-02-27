import { Injectable, BadRequestException } from '@nestjs/common';
import { BlueFolderClientService } from './bluefolder-client.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
import { mapServiceRequestListItem, mapServiceRequestDetail } from './mappers';
import type {
  BfServiceRequestListResponse,
  BfServiceRequestGetResponse,
  BfServiceRequestListFilter,
} from './types/bluefolder-api.types';
import type {
  ServiceRequestSummary,
  ServiceRequestDetail,
} from '@fieldrunner/shared';

export interface ServiceRequestStats {
  total: number;
  open: number;
  closed: number;
  overdue: number;
}

@Injectable()
export class BlueFolderService {
  constructor(
    private readonly client: BlueFolderClientService,
    private readonly settingsService: OrganizationSettingsService,
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
    return items.map(mapServiceRequestListItem);
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

    return mapServiceRequestDetail(result.serviceRequest);
  }

  async getStats(clerkOrgId: string): Promise<ServiceRequestStats> {
    const items = await this.listServiceRequests(clerkOrgId);

    return {
      total: items.length,
      open: items.filter((sr) => sr.isOpen).length,
      closed: items.filter((sr) => !sr.isOpen).length,
      overdue: items.filter((sr) => sr.isOverdue).length,
    };
  }
}
