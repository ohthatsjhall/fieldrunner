import { createElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import type { ServiceRequestDetail } from '@fieldrunner/shared';
import { SrPdfDocument } from './sr-pdf-document';
import { sanitizeFilename } from '../utils/sr-formatting';

interface DownloadSrPdfParams {
  sr: ServiceRequestDetail;
  orgName: string;
  orgImageUrl: string | null;
}

async function fetchLogoAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[fetchLogoAsDataUri] HTTP ${res.status} for ${url}`);
      return null;
    }
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[fetchLogoAsDataUri] Failed to fetch logo:', err);
    return null;
  }
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
  const filename = `WO-${sr.serviceRequestId}-${customerPart}-${dateStr}.pdf`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
