import { Injectable, BadRequestException } from '@nestjs/common';
import { BlueFolderClientService, BlueFolderApiError } from './bluefolder-client.service';
import { OrganizationSettingsService } from '../../org/settings/settings.service';
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

    // serviceRequest is forced to array by isArray parser config
    const sr = Array.isArray(result.serviceRequest)
      ? result.serviceRequest[0]
      : result.serviceRequest;
    return mapServiceRequestDetail(sr);
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
}
