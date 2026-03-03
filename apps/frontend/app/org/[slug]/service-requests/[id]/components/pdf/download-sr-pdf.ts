import { createElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import type { ServiceRequestDetail } from '@fieldrunner/shared';
import { SrPdfDocument } from './sr-pdf-document';

interface DownloadSrPdfParams {
  sr: ServiceRequestDetail;
  orgName: string;
  orgImageUrl: string | null;
}

async function fetchLogoAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export async function downloadSrPdf({ sr, orgName, orgImageUrl }: DownloadSrPdfParams): Promise<void> {
  const logoDataUri = orgImageUrl ? await fetchLogoAsDataUri(orgImageUrl) : null;

  const generatedAt = new Date().toLocaleDateString();

  const doc = createElement(SrPdfDocument, {
    sr,
    orgName,
    orgImageUrl: logoDataUri,
    generatedAt,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await pdf(doc as any).toBlob();
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const customerPart = sr.customerName ? sanitizeFilename(sr.customerName) : 'Report';
  const filename = `SR-${sr.serviceRequestId}-${customerPart}-${dateStr}.pdf`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
