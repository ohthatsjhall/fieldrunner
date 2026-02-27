import type { BfServiceRequestFile } from '../types/bluefolder-api.types';
import type { ServiceRequestFile } from '@fieldrunner/shared';

function toNumber(value: string | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}

function toBool(value: string | undefined | null): boolean {
  return value === 'true' || value === 'True';
}

export function mapServiceRequestFile(
  f: BfServiceRequestFile,
): ServiceRequestFile {
  return {
    serviceRequestFileId: toNumber(f.serviceRequestFileId),
    serviceRequestSignedDocumentId: toNumber(
      f.serviceRequestSignedDocumentId,
    ),
    isExternalLink: toBool(f.isExternalLink),
    isSignedDocument: toBool(f.isSignedDocument),
    fileDescription: f.fileDescription ?? '',
    fileLastModified: f.fileLastModified ?? '',
    fileName: f.fileName ?? '',
    fileSize: toNumber(f.fileSize),
    fileType: f.fileType ?? '',
    isPrivate: toBool(f.private),
    postedOn: f.postedOn ?? '',
    postedBy: f.postedBy ?? '',
    linkUrl: f.linkUrl ?? '',
    documentName: f.documentName ?? '',
    signatureFilePathCustomer: f.signatureFilePath_Customer ?? '',
    signatureFilePathTechnician: f.signatureFilePath_Technician ?? '',
    signatureNameCustomer: f.signatureName_Customer ?? '',
    signatureNameTechnician: f.signatureName_Technician ?? '',
  };
}
