/**
 * BlueFolder Shared Types — Frontend-Consumable Interfaces
 *
 * These are the distilled, coerced types that the API layer produces
 * after fetching from BlueFolder's XML API and normalizing the data.
 * All numeric fields are actual numbers, booleans are actual booleans,
 * dates are ISO 8601 strings (ready for `new Date()`), and internal
 * BlueFolder billing/costing fields are stripped.
 *
 * The API module is responsible for the coercion from the raw XML-parsed
 * strings (see apps/api/src/bluefolder/types/bluefolder-api.types.ts)
 * into these normalized shapes.
 */

// ---------------------------------------------------------------------------
// Service Request — List Item (summary view)
// ---------------------------------------------------------------------------

export interface ServiceRequestSummary {
  /** Unique BlueFolder service request ID. */
  serviceRequestId: number;
  /** Short description (max 100 chars). */
  description: string;
  /** Detailed description. */
  detailedDescription: string;
  /** Current status (e.g. "New", "In Progress", "Closed"). */
  status: string;
  /** Priority label (e.g. "Normal", "High", "Urgent"). */
  priority: string;
  /** Display-friendly priority label (may differ from priority). */
  priorityLabel: string;
  /** Service request type. */
  type: string;
  /** Whether the SR is billable. */
  billable: boolean;
  /** Total billable amount. */
  billableTotal: number;
  /** Billing status. */
  billingStatus: string;
  /** Total cost. */
  costTotal: number;
  /** External ID for cross-system reference. */
  externalId: string | null;
  /** ISO 8601 date string. When the SR was created. */
  dateTimeCreated: string;
  /** ISO 8601 date string. When the SR was closed. Null if open. */
  dateTimeClosed: string | null;
  /** ISO 8601 date string. Due date. Null if unset. */
  dueDate: string | null;
  /** Hours the SR has been open. */
  timeOpenHours: number;

  // -- Customer --

  /** Customer ID. */
  customerId: number;
  /** Customer display name. */
  customerName: string;

  // -- Customer Contact --

  customerContactId: number;
  customerContactName: string;
  customerContactEmail: string;
  customerContactPhone: string;
  customerContactPhoneMobile: string;

  // -- Customer Location --

  customerLocationId: number;
  customerLocationName: string;
  customerLocationStreetAddress: string;
  customerLocationCity: string;
  customerLocationState: string;
  customerLocationPostalCode: string;
  customerLocationCountry: string;
  customerLocationZone: string;
  customerLocationNotes: string;

  // -- Manager --

  /** Account manager user ID. Null if unassigned. */
  accountManagerId: number | null;
  /** Service manager user ID. Null if unassigned. */
  serviceManagerId: number | null;

  // -- Computed --

  /** True if dueDate is in the past and status is not "Closed". */
  isOverdue: boolean;
  /** True if status represents an open (non-closed) state. */
  isOpen: boolean;
}

// ---------------------------------------------------------------------------
// Service Request — Full Detail
// ---------------------------------------------------------------------------

export interface ServiceRequestDetail extends ServiceRequestSummary {
  /** User ID who created the SR. */
  createdByUserId: number;
  /** ISO 8601. When status was last changed. */
  statusLastUpdated: string | null;
  /** Hours since the last status change. */
  statusAgeHours: number;
  /** Purchase order number. */
  purchaseOrderNo: string;
  /** Reference number. */
  referenceNo: string;
  /** Linked parent service request ID. Null if not linked. */
  linkedToServiceRequestId: number | null;
  /** Source system name. */
  sourceName: string;
  /** Source system identifier. */
  sourceId: string;
  /** Source type (e.g. "web", "email"). */
  sourceType: string;

  // -- Financial summaries --

  billableExpensesPrice: number;
  billableLaborHours: number;
  billableLaborPrice: number;
  billableMaterialsPrice: number;
  nonBillableExpensesPrice: number;
  nonBillableLaborHours: number;
  nonBillableLaborPrice: number;
  nonBillableMaterialsPrice: number;
  nonBillableTotal: number;

  // -- Nested collections --

  assignments: ServiceRequestAssignment[];
  customFields: CustomFieldValue[];
  labor: LaborItem[];
  materials: MaterialsItem[];
  expenses: ExpenseItem[];
  log: LogEntry[];
  equipment: EquipmentItem[];
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

export interface ServiceRequestAssignment {
  assignmentId: number;
  /** User IDs assigned. Normalized from comma-separated or nested formats. */
  assigneeUserIds: number[];
  type: string;
  /** ISO 8601. */
  startDate: string | null;
  /** ISO 8601. */
  endDate: string | null;
  allDayEvent: boolean;
  assignmentComment: string;
  /** ISO 8601. */
  dateTimeCreated: string;
  createdByUserId: number;
  isComplete: boolean;
  /** ISO 8601. Null if not completed. */
  dateTimeCompleted: string | null;
  /** Null if not completed. */
  completedByUserId: number | null;
}

// ---------------------------------------------------------------------------
// Labor Item
// ---------------------------------------------------------------------------

export interface LaborItem {
  id: number;
  serviceRequestId: number;
  userId: number;
  /** ISO 8601 date. */
  dateWorked: string;
  /** Duration in hours. */
  duration: number;
  /** Start time string (e.g. "09:00 AM"). */
  startTime: string;
  billingStatus: BillingStatus;
  billable: boolean;
  itemDescription: string;
  itemId: number;
  itemIsFlatRate: boolean;
  itemUnitCost: number;
  itemUnitListPrice: number;
  itemUnitPrice: number;
  totalCost: number;
  totalPrice: number;
  totalPriceBillable: number;
  taxable: boolean;
  comment: string;
  commentIsPublic: boolean;
  /** ISO 8601 UTC. */
  dateTimeCreated: string;
  createdByUserId: number;
}

// ---------------------------------------------------------------------------
// Materials Item
// ---------------------------------------------------------------------------

export interface MaterialsItem {
  id: number;
  serviceRequestId: number;
  /** ISO 8601 date. */
  dateUsed: string;
  quantity: number;
  billingStatus: BillingStatus;
  billable: boolean;
  itemDescription: string;
  itemId: number;
  itemUnitCost: number;
  itemUnitListPrice: number;
  itemUnitPrice: number;
  totalCost: number;
  /** Normalized from the lowercase XML tag "totalprice". */
  totalPrice: number;
  totalPriceBillable: number;
  taxable: boolean;
  comment: string;
  commentIsPublic: boolean;
  /** ISO 8601 UTC. */
  dateTimeCreated: string;
  createdByUserId: number;
}

// ---------------------------------------------------------------------------
// Expense Item
// ---------------------------------------------------------------------------

export interface ExpenseItem {
  id: number;
  serviceRequestId: number;
  userId: number;
  /** ISO 8601 date. */
  dateUsed: string;
  quantity: number;
  billingStatus: BillingStatus;
  billable: boolean;
  itemDescription: string;
  itemId: number;
  itemUnitCost: number;
  itemUnitListPrice: number;
  itemUnitPrice: number;
  totalCost: number;
  totalPrice: number;
  totalPriceBillable: number;
  taxable: boolean;
  comment: string;
  commentIsPublic: boolean;
  /** ISO 8601 UTC. */
  dateTimeCreated: string;
  createdByUserId: number;
}

// ---------------------------------------------------------------------------
// Log Entry
// ---------------------------------------------------------------------------

export interface LogEntry {
  id: number;
  serviceRequestId: number;
  /** Log entry type (e.g. "comment", "edit", "statusChange", "close"). */
  entryType: string;
  description: string;
  comment: string;
  commentIsPublic: boolean;
  /** ISO 8601 UTC. */
  dateTimeCreated: string;
  createdByUserId: number;
}

// ---------------------------------------------------------------------------
// Equipment (as referenced on a service request)
// ---------------------------------------------------------------------------

export interface EquipmentItem {
  /** GUID string. */
  equipmentId: string;
  equipName: string;
  equipType: string;
  externalId: string | null;
  mfrName: string;
  modelNo: string;
  serialNo: string;
  /** ISO 8601 date or null. */
  nextServiceDate: string | null;
  refNo: string;
}

// ---------------------------------------------------------------------------
// Custom Field Value (on a service request)
// ---------------------------------------------------------------------------

export interface CustomFieldValue {
  name: string;
  /** Always a string. Consumers should parse based on the field definition's data type. */
  value: string;
}

// ---------------------------------------------------------------------------
// Service Request History Entry
// ---------------------------------------------------------------------------

export interface ServiceRequestHistoryEntry {
  id: number;
  serviceRequestId: number;
  comment: string;
  commentIsPublic: boolean;
  description: string;
  /** ISO 8601 date. */
  entryDate: string;
  entryType: string;
  /** True if the entry is private (not visible to customers). */
  isPrivate: boolean;
  userId: number | null;
  userName: string;
}

// ---------------------------------------------------------------------------
// Service Request File
// ---------------------------------------------------------------------------

export interface ServiceRequestFile {
  serviceRequestFileId: number;
  serviceRequestSignedDocumentId: number;
  isExternalLink: boolean;
  isSignedDocument: boolean;
  fileDescription: string;
  /** ISO 8601 date. */
  fileLastModified: string;
  fileName: string;
  /** File size in bytes. */
  fileSize: number;
  /** MIME type, "external", or "signedDocument". */
  fileType: string;
  /** True if not visible on customer portal. */
  isPrivate: boolean;
  /** ISO 8601 date. */
  postedOn: string;
  postedBy: string;
  linkUrl: string;
  documentName: string;
  signatureFilePathCustomer: string;
  signatureFilePathTechnician: string;
  signatureNameCustomer: string;
  signatureNameTechnician: string;
}

// ---------------------------------------------------------------------------
// Custom Field Definition
// ---------------------------------------------------------------------------

export interface CustomFieldDefinition {
  fieldId: number;
  fieldName: string;
  fieldDataType: 'Text' | 'Number' | 'Date' | 'Boolean' | 'List' | string;
  fieldRequired: boolean;
  displayOrder: number;
  /** Allowed values for "List" type fields. Empty array for other types. */
  fieldListValues: string[];
}

// ---------------------------------------------------------------------------
// Billing Status Union
// ---------------------------------------------------------------------------

export type BillingStatus = 'billable' | 'non-billable' | 'contract';
