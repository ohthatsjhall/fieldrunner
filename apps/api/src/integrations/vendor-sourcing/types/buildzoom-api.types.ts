/** License object nested inside a contractor result */
export type BuildZoomLicense = {
  licenseNumber: string;
  licenseStatus: string;
  licenseCity: string;
  licenseType: string;
  licenseBusinessType: string;
  licenseVerificationDate: string;
  licenseVerificationLink: string;
};

/** Permit object nested inside a contractor result */
export type BuildZoomPermit = {
  header: string;
  address: string;
  date: string;
  description: string;
  valuation: string;
  permitNumber: string;
  status: string;
  fee: string;
  permitType: string;
  buildingType: string;
};

/** Employee object nested inside a contractor result */
export type BuildZoomEmployee = {
  name: string;
  title: string;
};

/**
 * A single contractor from the BuildZoom profile page.
 *
 * These fields serve dual purpose:
 * 1. TypeScript type for downstream mapper/scoring
 * 2. Target shape for Firecrawl JSON extraction schema
 *
 * The `[key: string]: unknown` index signature allows extra LLM-extracted fields.
 */
export type BuildZoomContractor = {
  url: string;
  contractorName: string;
  description?: string | null;
  location?: string | null;
  phoneNumber?: string | null;
  fullAddress?: string | null;
  bzScore?: string | null;

  numberOfProjects?: number | null;
  totalPermittedProjects?: number | null;
  totalProjectsLastXYears?: number | null;
  totalProjectsYears?: number | null;
  typicalPermitValue?: string | null;

  insurer?: string | null;
  insuredAmount?: string | null;

  reviewsCount?: number | null;
  email?: string | null;

  licenses?: BuildZoomLicense[];
  employees?: BuildZoomEmployee[];
  servicesOffered?: string[];
  permits?: BuildZoomPermit[];

  [key: string]: unknown;
};
