// -- Branded type utility --
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

// -- Union types --
export type VendorSource = 'google_places' | 'buildzoom';

export type ServiceRequestStatus =
  | 'New'
  | 'Proposed'
  | 'Assigned'
  | 'In Progress'
  | 'Job Costing'
  | 'Work Complete'
  | 'Waiting On Invoice'
  | 'WO Needs Fix'
  | 'Cancelled'
  | 'Closed';

export type ValidEmail = Brand<string, 'ValidEmail'>;

export type User = {
  id: string;
  clerkId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  imageUrl: string | null;
  hasImage: boolean | null;
  username: string | null;
  passwordEnabled: boolean | null;
  twoFactorEnabled: boolean | null;
  banned: boolean | null;
  locked: boolean | null;
  externalId: string | null;
  publicMetadata: Record<string, unknown> | null;
  privateMetadata: Record<string, unknown> | null;
  unsafeMetadata: Record<string, unknown> | null;
  lastSignInAt: Date | null;
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type Organization = {
  id: string;
  clerkId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  hasImage: boolean | null;
  createdBy: string | null;
  maxAllowedMemberships: number | null;
  membersCount: number | null;
  pendingInvitationsCount: number | null;
  adminDeleteEnabled: boolean | null;
  publicMetadata: Record<string, unknown> | null;
  privateMetadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type OrganizationMembership = {
  id: string;
  clerkId: string;
  organizationId: string;
  userId: string;
  role: string;
  roleName: string | null;
  permissions: string[] | null;
  publicMetadata: Record<string, unknown> | null;
  privateMetadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type OrganizationInvitation = {
  id: string;
  clerkId: string;
  organizationId: string;
  emailAddress: string;
  role: string;
  roleName: string | null;
  status: string;
  expiresAt: Date | null;
  userId: string | null;
  publicMetadata: Record<string, unknown> | null;
  privateMetadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type OrganizationDomain = {
  id: string;
  clerkId: string;
  organizationId: string;
  name: string;
  enrollmentMode: string | null;
  affiliationEmailAddress: string | null;
  verification: Record<string, unknown> | null;
  totalPendingInvitations: number | null;
  totalPendingSuggestions: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type Role = {
  id: string;
  clerkId: string;
  key: string;
  name: string;
  description: string | null;
  isCreatorEligible: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type Permission = {
  id: string;
  clerkId: string;
  key: string;
  name: string;
  description: string | null;
  type: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type RolePermission = {
  roleId: string;
  permissionId: string;
};

export type OrganizationSettings = {
  id: string;
  organizationId: string;
  bluefolderApiKeyHint: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceRequest = {
  id: string;
  organizationId: string;
  bluefolderId: number;
  description: string;
  status: string;
  priority: string;
  priorityLabel: string;
  type: string;
  customerName: string;
  customerId: number | null;
  assigneeName: string | null;
  isOpen: boolean;
  isOverdue: boolean;
  billableTotal: string | null;
  costTotal: string | null;
  dateTimeCreated: Date | null;
  dateTimeClosed: Date | null;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceRequestStats = {
  newCount: number;
  inProgress: number;
  assigned: number;
  open: number;
};

export type BlueFolderUser = {
  id: string;
  organizationId: string;
  bluefolderId: number;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  userName: string | null;
  userType: string | null;
  inactive: boolean;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type TradeCategory = {
  id: string;
  organizationId: string;
  name: string;
  searchQueries: string[];
  googlePlacesType: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Vendor = {
  id: string;
  organizationId: string;
  name: string;
  phone: string | null;
  phoneRaw: string | null;
  address: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  website: string | null;
  email: ValidEmail | null;
  googlePlaceId: string | null;
  rating: string | null;
  reviewCount: number | null;
  categories: string[] | null;
  sourceCount: number;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type VendorSourceRecord = {
  id: string;
  vendorId: string;
  source: VendorSource;
  sourceId: string;
  rawData: Record<string, unknown> | null;
  name: string | null;
  address: string | null;
  phone: string | null;
  rating: string | null;
  reviewCount: number | null;
  website: string | null;
  email: ValidEmail | null;
  types: string[] | null;
  businessHours: Record<string, unknown> | null;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type VendorSearchSession = {
  id: string;
  organizationId: string;
  serviceRequestId: string | null;
  tradeCategoryId: string | null;
  searchQuery: string;
  searchAddress: string;
  searchLatitude: string | null;
  searchLongitude: string | null;
  searchRadiusMeters: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  resultCount: number;
  sources: Record<string, number> | null;
  pendingProfileUrls: string[] | null;
  errorMessage: string | null;
  durationMs: number | null;
  initiatedBy: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type VendorSearchResult = {
  id: string;
  searchSessionId: string;
  vendorId: string;
  rank: number;
  score: string;
  distanceScore: string | null;
  ratingScore: string | null;
  reviewCountScore: string | null;
  categoryMatchScore: string | null;
  businessHoursScore: string | null;
  credentialScore: string | null;
  distanceMeters: string | null;
  createdAt: Date;
};
