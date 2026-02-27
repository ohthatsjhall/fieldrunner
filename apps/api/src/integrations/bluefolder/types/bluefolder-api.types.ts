/**
 * BlueFolder API 2.0 — Complete TypeScript Interfaces
 *
 * These types represent the raw JSON shapes produced by fast-xml-parser
 * when parsing BlueFolder XML responses. All values come over the wire as
 * strings from XML; numeric/boolean coercion depends on parser config.
 *
 * IMPORTANT — fast-xml-parser caveats addressed throughout:
 *  1. Booleans arrive as the literal strings "true" / "false" unless
 *     you enable `parseTrueNumberAndBooleans` in the parser options.
 *  2. Numbers arrive as strings unless the same option is enabled.
 *  3. Empty XML tags (<foo/> or <foo></foo>) produce either `""` or
 *     `undefined` depending on your `allowBooleanAttributes` and
 *     `parseTagValue` settings. We type these as `string | null`.
 *  4. Single-element arrays: when only one child exists, fast-xml-parser
 *     returns an object instead of a one-element array. Use the `isArray`
 *     callback to force arrays for known collection paths. Paths that
 *     require `isArray` are annotated with @isArray.
 *  5. CDATA sections (used in error messages) are extracted as strings
 *     when `processEntities` / `cdataPropName` are configured.
 */

// ---------------------------------------------------------------------------
// 0. XML Parser Configuration Reference
// ---------------------------------------------------------------------------

/**
 * Recommended fast-xml-parser options for BlueFolder responses.
 * Not a runtime type — just a reference for configuring the parser.
 *
 * @example
 * ```ts
 * import { XMLParser } from 'fast-xml-parser';
 *
 * const parser = new XMLParser({
 *   ignoreAttributes: false,
 *   attributeNamePrefix: '@_',
 *   parseTagValue: true,
 *   parseTrueNumberAndBooleans: false, // keep as strings — we coerce manually
 *   isArray: (tagName) => BLUEFOLDER_ARRAY_TAGS.has(tagName),
 *   trimValues: true,
 * });
 * ```
 */
export const BLUEFOLDER_ARRAY_TAGS = new Set([
  'serviceRequest',
  'assignment',
  'laborItem',
  'materialsItem',
  'expenseItem',
  'logEntry',
  'equipmentItem',
  'customField',
  'serviceRequestHistory',
  'serviceRequestFile',
  'serviceRequestAssignment',
  'FieldListValue',
  'userId',
  'user',
]);

// ---------------------------------------------------------------------------
// 1. API Response Envelope
// ---------------------------------------------------------------------------

/** Wrapper for every BlueFolder API response. */
export interface BfApiResponse<T = unknown> {
  response: {
    /** "ok" on success, "fail" on error. Comes from the XML attribute `status`. */
    '@_status': 'ok' | 'fail';
  } & T;
}

/** The error payload inside a failed response. */
export interface BfApiError {
  error: {
    /** Numeric error code as a string (e.g. "429", "500"). Comes from the XML attribute `code`. */
    '@_code': string;
    /**
     * Error message text.
     * May arrive wrapped in CDATA (e.g. rate-limit messages).
     * fast-xml-parser extracts CDATA content as the text value.
     */
    '#text': string;
  };
}

/** Convenience union: either a success response or an error response. */
export type BfApiResult<T> = BfApiResponse<T> | BfApiResponse<BfApiError>;

// ---------------------------------------------------------------------------
// 2. Service Request — Detail (GET /serviceRequests/get.aspx)
// ---------------------------------------------------------------------------

/**
 * Full service request returned from the `get` endpoint.
 * All fields come as strings from XML. Numeric fields are annotated with
 * their semantic type (numeric, decimal, boolean) for coercion guidance.
 */
export interface BfServiceRequest {
  /** @numeric User ID of the account manager. Empty string if unset. */
  accountManagerId: string;
  /** @boolean "true" or "false". */
  billable: string;
  /** @decimal Total billable amount. */
  billableTotal: string;
  /** @decimal Billable expenses subtotal. */
  billableExpensesPrice: string;
  /** @decimal Total billable labor hours. */
  billableLaborHours: string;
  /** @decimal Billable labor subtotal. */
  billableLaborPrice: string;
  /** @decimal Billable materials subtotal. */
  billableMaterialsPrice: string;
  /** @numeric Bill-to address ID. */
  billToAddressId: string;
  /** Bill-to address name. */
  billToAddressName: string;
  /** Bill-to city. */
  billToCity: string;
  /** Bill-to country. */
  billToCountry: string;
  /** @numeric Bill-to entity ID. */
  billToId: string;
  /** Bill-to entity name. */
  billToName: string;
  /** Bill-to postal code. */
  billToPostalCode: string;
  /** Bill-to state/province. */
  billToState: string;
  /** Bill-to street address. */
  billToStreetAddress: string;
  /** @decimal Cost of expenses. */
  costExpenses: string;
  /** @decimal Cost of labor. */
  costLabor: string;
  /** @decimal Cost of materials. */
  costMaterials: string;
  /** @decimal Total cost. */
  costTotal: string;
  /** @numeric User ID who created the SR. */
  createdByUserId: string;
  /** Customer portal action status. */
  customerAction: string;
  /** Customer contact email. */
  customerContactEmail: string;
  /** @numeric Customer contact ID. */
  customerContactId: string;
  /** Customer contact full name. */
  customerContactName: string;
  /** Customer contact phone. */
  customerContactPhone: string;
  /** Customer contact mobile phone. */
  customerContactPhoneMobile: string;
  /** @numeric Customer ID. */
  customerId: string;
  /** Customer location city. */
  customerLocationCity: string;
  /** Customer location country. */
  customerLocationCountry: string;
  /** @numeric Customer location ID. */
  customerLocationId: string;
  /** Customer location name. */
  customerLocationName: string;
  /** Customer location notes. May be empty string or undefined for self-closing tags. */
  customerLocationNotes: string | null;
  /** Customer location postal code. */
  customerLocationPostalCode: string;
  /** Customer location state/province. */
  customerLocationState: string;
  /** Customer location street address. */
  customerLocationStreetAddress: string;
  /** Customer location zone. */
  customerLocationZone: string;
  /** Customer name. */
  customerName: string;
  /** @datetime ISO 8601 UTC. When the SR was created. */
  dateTimeCreated: string;
  /** @datetime ISO 8601 UTC. When the SR was closed. Empty if still open. */
  dateTimeClosed: string;
  /** @datetime ISO 8601 UTC. When the SR was exported for billing. */
  dateTimeExportedForBilling: string;
  /** Short description (max 100 chars). */
  description: string;
  /** Long/detailed description. */
  detailedDescription: string;
  /** @datetime Due date. NOT UTC — returned in account timezone. */
  dueDate: string;
  /** External identifier. */
  externalId: string;
  /** @numeric Linked parent service request ID. */
  linkedToServiceRequestId: string;
  /** @decimal Non-billable expenses subtotal. */
  nonBillableExpensesPrice: string;
  /** @decimal Non-billable labor hours. */
  nonBillableLaborHours: string;
  /** @decimal Non-billable labor subtotal. */
  nonBillableLaborPrice: string;
  /** @decimal Non-billable materials subtotal. */
  nonBillableMaterialsPrice: string;
  /** @decimal Non-billable total. */
  nonBillableTotal: string;
  /** Priority string (e.g. "Normal", "High"). Max 50 chars. */
  priority: string;
  /** Purchase order number. Max 25 chars. */
  purchaseOrderNo: string;
  /** Reference number. Max 50 chars. */
  referenceNo: string;
  /** Additional request details (HTML or text). */
  requestDetails: string;
  /** @boolean Whether the request has been verified. */
  requestVerified: string;
  /** @numeric Associated service contract ID. */
  serviceContractId: string;
  /** @numeric Service manager user ID. */
  serviceManagerId: string;
  /** @numeric Unique service request ID. This is the primary key. */
  serviceRequestId: string;
  /** Source system name. Max 50 chars. */
  sourceName: string;
  /** Source system ID. Max 50 chars. */
  sourceId: string;
  /** Source type (e.g. "web", "email"). */
  sourceType: string;
  /** Current status string (e.g. "New", "In Progress", "Closed"). Max 50 chars. */
  status: string;
  /** @datetime ISO 8601 UTC. When the status was last changed. */
  statusLastUpdated: string;
  /**
   * @decimal Hours since the last status change.
   * Note the underscore in the XML tag name: <statusAge_hours>.
   */
  statusAge_hours: string;
  /** @numeric Tax code ID. */
  taxCodeId: string;
  /** @decimal Tax rate percentage. */
  taxRate: string;
  /** Service request type. Max 50 chars. */
  type: string;

  // -- Nested collections --

  /** @isArray — force array even when only one assignment exists. */
  assignments: {
    assignment: BfAssignmentInline[];
  };
  /** @isArray — force array for customField. */
  customFields: {
    customField: BfCustomFieldValue[];
  };
  /** @isArray — force array for laborItem. */
  labor: {
    laborItem: BfLaborItem[];
  };
  /** @isArray — force array for materialsItem. */
  materials: {
    materialsItem: BfMaterialsItem[];
  };
  /** @isArray — force array for expenseItem. */
  expenses: {
    expenseItem: BfExpenseItem[];
  };
  /** @isArray — force array for logEntry. */
  log: {
    logEntry: BfLogEntry[];
  };
  /** @isArray — force array for equipmentItem. */
  equipmentToService: {
    equipmentItem: BfEquipmentInline[];
  };
}

// ---------------------------------------------------------------------------
// 2a. Nested: Assignment (inline within service request GET response)
// ---------------------------------------------------------------------------

/**
 * Assignment as nested inside a service request GET response.
 * This is a subset of the full standalone assignment shape.
 */
export interface BfAssignmentInline {
  /** @numeric Unique assignment ID. */
  assignmentId: string;
  /**
   * Comma-separated user IDs of assignees.
   * Different from the standalone assignment shape which uses nested <assignedTo><userId>.
   */
  assigneeUserIds: string;
  /** Assignment type. */
  type: string;
  /** @datetime Start date/time. Format: ISO 8601. */
  startDate: string;
  /** @datetime End date/time. Format: ISO 8601. */
  endDate: string;
  /** @boolean "true" or "false". */
  allDayEvent: string;
  /** Comment on the assignment. */
  assignmentComment: string;
  /** @datetime ISO 8601 UTC. When the assignment was created. */
  dateTimeCreated: string;
  /** @numeric User ID who created the assignment. */
  createdByUserId: string;
  /** @boolean "true" or "false". */
  isComplete: string;
  /** @datetime ISO 8601 UTC. When completed. Empty if not completed. */
  dateTimeCompleted: string;
  /** @numeric User ID who completed the assignment. Empty if not completed. */
  completedByUserId: string;
}

// ---------------------------------------------------------------------------
// 2b. Nested: Labor Item
// ---------------------------------------------------------------------------

export interface BfLaborItem {
  /** @numeric Appointment ID associated with this labor entry. */
  apptId: string;
  /** @boolean "true" or "false". */
  billable: string;
  /** @numeric Billing contract ID. */
  billingContractId: string;
  /** "billable", "non-billable", or "contract". */
  billingStatus: string;
  /** Comment text. */
  comment: string;
  /** @boolean Whether the comment is public (customer-visible). */
  commentIsPublic: string;
  /** @numeric User ID who created this entry. */
  createdByUserId: string;
  /** @datetime ISO 8601 UTC. */
  dateTimeCreated: string;
  /** @date Date worked. NOT UTC — account timezone. Format: ISO 8601 date. */
  dateWorked: string;
  /** @decimal Duration in hours (e.g. "1.5" = 1h 30m). */
  duration: string;
  /** @numeric Unique labor item ID. */
  id: string;
  /** Item catalog description. */
  itemDescription: string;
  /** @numeric Item catalog ID. */
  itemId: string;
  /** @boolean Whether the item is flat-rate. */
  itemIsFlatRate: string;
  /** @decimal Unit cost. */
  itemUnitCost: string;
  /** @decimal Unit list price. */
  itemUnitListPrice: string;
  /** @decimal Unit price. */
  itemUnitPrice: string;
  /** @numeric Parent service request ID. */
  serviceRequestId: string;
  /** @time Start time. NOT UTC — account timezone. */
  startTime: string;
  /** @boolean Whether this item is taxable. */
  taxable: string;
  /** @decimal Total cost (duration * unitCost). */
  totalCost: string;
  /** @decimal Total price (duration * unitPrice). */
  totalPrice: string;
  /** @decimal Total billable price (may differ from totalPrice when partially billable). */
  totalPriceBillable: string;
  /** @numeric User ID who performed the labor. */
  userId: string;
}

// ---------------------------------------------------------------------------
// 2c. Nested: Materials Item
// ---------------------------------------------------------------------------

export interface BfMaterialsItem {
  /** @numeric Appointment ID. */
  apptId: string;
  /** @boolean */
  billable: string;
  /** @numeric Billing contract ID. */
  billingContractId: string;
  /** "billable", "non-billable", or "contract". */
  billingStatus: string;
  /** Comment text. */
  comment: string;
  /** @boolean */
  commentIsPublic: string;
  /** @numeric */
  createdByUserId: string;
  /** @datetime ISO 8601 UTC. */
  dateTimeCreated: string;
  /** @date Date material was used. NOT UTC. */
  dateUsed: string;
  /** @numeric Unique materials item ID. */
  id: string;
  /** Item catalog description. */
  itemDescription: string;
  /** @numeric Item catalog ID. */
  itemId: string;
  /** @decimal Quantity used. */
  itemQuantity: string;
  /** @decimal Unit cost. */
  itemUnitCost: string;
  /** @decimal Unit list price. */
  itemUnitListPrice: string;
  /** @decimal Unit price. */
  itemUnitPrice: string;
  /** @numeric Parent service request ID. */
  serviceRequestId: string;
  /** @boolean */
  taxable: string;
  /** @decimal */
  totalCost: string;
  /**
   * @decimal Total price.
   * WARNING: The XML tag is lowercase <totalprice> (not camelCase).
   * fast-xml-parser will produce the key "totalprice" — you may need
   * to normalize this to "totalPrice" in post-processing.
   */
  totalprice: string;
  /** @decimal */
  totalPriceBillable: string;
}

// ---------------------------------------------------------------------------
// 2d. Nested: Expense Item
// ---------------------------------------------------------------------------

export interface BfExpenseItem {
  /** @numeric Appointment ID. */
  apptId: string;
  /** @boolean */
  billable: string;
  /** @numeric Billing contract ID. */
  billingContractId: string;
  /** "billable", "non-billable", or "contract". */
  billingStatus: string;
  /** Comment text. */
  comment: string;
  /** @boolean */
  commentIsPublic: string;
  /** @numeric */
  createdByUserId: string;
  /** @datetime ISO 8601 UTC. */
  dateTimeCreated: string;
  /** @date Date the expense was incurred. NOT UTC. */
  dateUsed: string;
  /** @numeric Unique expense item ID. */
  id: string;
  /** Item catalog description. */
  itemDescription: string;
  /** @numeric Item catalog ID. */
  itemId: string;
  /** @decimal Quantity. */
  itemQuantity: string;
  /** @decimal Unit cost. */
  itemUnitCost: string;
  /** @decimal Unit list price. */
  itemUnitListPrice: string;
  /** @decimal Unit price. */
  itemUnitPrice: string;
  /** @numeric Parent service request ID. */
  serviceRequestId: string;
  /** @boolean */
  taxable: string;
  /** @decimal */
  totalCost: string;
  /** @decimal */
  totalPrice: string;
  /** @decimal */
  totalPriceBillable: string;
  /** @numeric User ID who incurred the expense. */
  userId: string;
}

// ---------------------------------------------------------------------------
// 2e. Nested: Log Entry
// ---------------------------------------------------------------------------

export interface BfLogEntry {
  /** Comment text associated with the log entry. */
  comment: string;
  /** @boolean Whether the comment is public. */
  commentIsPublic: string;
  /** @numeric User ID who created the entry. */
  createdByUserId: string;
  /** @datetime ISO 8601 UTC. */
  dateTimeCreated: string;
  /** Human-readable description of what happened. */
  description: string;
  /** Type of log entry (e.g. "comment", "edit", "statusChange", "close"). */
  entryType: string;
  /** @numeric Unique log entry ID. */
  id: string;
  /** @numeric Parent service request ID. */
  serviceRequestId: string;
}

// ---------------------------------------------------------------------------
// 2f. Nested: Equipment (inline within service request)
// ---------------------------------------------------------------------------

export interface BfEquipmentInline {
  /** @guid Unique equipment ID (GUID string). */
  equipmentId: string;
  /** Equipment name. */
  equipName: string;
  /** Equipment type. */
  equipType: string;
  /** External ID for the equipment. */
  externalId: string;
  /** Manufacturer name. */
  mfrName: string;
  /** Model number. */
  modelNo: string;
  /** Serial number. */
  serialNo: string;
  /** @date Next scheduled service date. NOT UTC. */
  nextServiceDate: string;
  /** Reference number. */
  refNo: string;
}

// ---------------------------------------------------------------------------
// 2g. Custom Field Value (name/value pair in responses)
// ---------------------------------------------------------------------------

export interface BfCustomFieldValue {
  /** Custom field name. */
  name: string;
  /**
   * Custom field value as string.
   * Regardless of the field's data type (date, number, boolean, list),
   * values are always returned as strings.
   */
  value: string;
}

// ---------------------------------------------------------------------------
// 3. Service Request List (GET /serviceRequests/list.aspx — basic)
// ---------------------------------------------------------------------------

/**
 * Service request shape in the basic list response.
 * Fewer fields than the full GET response — no nested collections.
 */
export interface BfServiceRequestListItem {
  /** @numeric Account manager user ID. */
  accountManagerId: string;
  /** @boolean "true" or "false". */
  billable: string;
  /** @decimal Total billable amount. */
  billableTotal: string;
  /** Billing status string. */
  billingStatus: string;
  /** @decimal Total cost. */
  costTotal: string;
  /** Customer contact email. */
  customerContactEmail: string;
  /** @numeric Customer contact ID. */
  customerContactId: string;
  /** Customer contact full name. */
  customerContactName: string;
  /** Customer contact phone. */
  customerContactPhone: string;
  /** Customer contact mobile phone. */
  customerContactPhoneMobile: string;
  /** @numeric Customer ID. */
  customerId: string;
  /** Customer location city. */
  customerLocationCity: string;
  /** Customer location country. */
  customerLocationCountry: string;
  /** @numeric Customer location ID. */
  customerLocationId: string;
  /** Customer location name. */
  customerLocationName: string;
  /** Customer location notes. */
  customerLocationNotes: string;
  /** Customer location postal code. */
  customerLocationPostalCode: string;
  /** Customer location state/province. */
  customerLocationState: string;
  /** Customer location street address. */
  customerLocationStreetAddress: string;
  /** Customer location zone. */
  customerLocationZone: string;
  /** Customer name. */
  customerName: string;
  /** @datetime ISO 8601 UTC. */
  dateTimeCreated: string;
  /** @datetime ISO 8601 UTC. Empty if still open. */
  dateTimeClosed: string;
  /** Short description (max 100 chars). */
  description: string;
  /** Detailed description. */
  detailedDescription: string;
  /** @datetime Due date. NOT UTC. */
  dueDate: string;
  /** External identifier. */
  externalId: string;
  /** Priority string. */
  priority: string;
  /** Display label for priority (may differ from the raw priority value). */
  priorityLabel: string;
  /** @numeric Service manager user ID. */
  serviceManagerId: string;
  /** @numeric Unique service request ID. */
  serviceRequestId: string;
  /** Current status string. */
  status: string;
  /**
   * @decimal Hours the SR has been open.
   * Note the underscore: the XML tag is <timeOpen_hours>.
   */
  timeOpen_hours: string;
  /** Service request type. */
  type: string;
}

/** Envelope for the list response. */
export interface BfServiceRequestListResponse {
  serviceRequestList: {
    /** @isArray — force array in parser config. */
    serviceRequest: BfServiceRequestListItem[];
  };
}

/** Envelope for the single-get response.
 * Note: serviceRequest is forced to array by isArray parser config
 * (BLUEFOLDER_ARRAY_TAGS includes 'serviceRequest' for the list endpoint). */
export interface BfServiceRequestGetResponse {
  serviceRequest: BfServiceRequest[];
}

// ---------------------------------------------------------------------------
// 4. Service Request History (GET /serviceRequests/getHistory.aspx)
// ---------------------------------------------------------------------------

export interface BfServiceRequestHistoryEntry {
  /** @numeric Unique history entry ID. */
  id: string;
  /** @numeric Service request ID. */
  serviceRequestId: string;
  /** Comment text. May be empty. */
  comment: string;
  /** @boolean "true" or "false". */
  commentIsPublic: string;
  /** Human-readable description of the history event. */
  description: string;
  /** @datetime When the entry was created. */
  entryDate: string;
  /** Entry type (e.g. "comment", "edit", "close", "statusChange"). */
  entryType: string;
  /** @boolean Whether the entry is private (not visible to customers). */
  private: string;
  /** @numeric User ID who created the entry. May be empty if system-generated. */
  userId: string;
  /** User full name. May be empty if system-generated. */
  userName: string;
}

export interface BfServiceRequestHistoryResponse {
  serviceRequestHistoryList: {
    /** @isArray */
    serviceRequestHistory: BfServiceRequestHistoryEntry[];
  };
}

// ---------------------------------------------------------------------------
// 5. Service Request Files (GET /serviceRequests/getFiles.aspx)
// ---------------------------------------------------------------------------

export interface BfServiceRequestFile {
  /** @numeric Unique file ID. 0 for signed documents. */
  serviceRequestFileId: string;
  /** @numeric Unique signed document ID. 0 for regular files/links. */
  serviceRequestSignedDocumentId: string;
  /** @boolean "true" for external links, "false" for files/signed docs. */
  isExternalLink: string;
  /** @boolean "true" for signed documents, "false" for files/links. */
  isSignedDocument: string;
  /** Description/tag for the file, link, or signed document. */
  fileDescription: string;
  /** @datetime Last modification date and time. */
  fileLastModified: string;
  /** Filename. May be a URL for links, physical filename, or empty. */
  fileName: string;
  /** @numeric File size in bytes. 0 for links and signed documents. */
  fileSize: string;
  /** MIME type (e.g. "image/jpeg"), "external", or "signedDocument". */
  fileType: string;
  /** @boolean "true" if not visible on customer portal. */
  private: string;
  /** @datetime When the item was posted. */
  postedOn: string;
  /** Name of the user who posted the item. */
  postedBy: string;
  /** URL to the file or link. Blank for signed documents. */
  linkUrl: string;
  /** Document name. May be blank. */
  documentName: string;
  /** URL to the customer's signature image. */
  signatureFilePath_Customer: string;
  /** URL to the technician's signature image. */
  signatureFilePath_Technician: string;
  /** Printed name of the customer signer. */
  signatureName_Customer: string;
  /** Printed name of the technician signer. */
  signatureName_Technician: string;
}

export interface BfServiceRequestFilesResponse {
  /** @isArray */
  serviceRequestFile: BfServiceRequestFile[];
}

// ---------------------------------------------------------------------------
// 6. Service Request Custom Fields Definition
//    (GET /serviceRequests/getCustomFields.aspx)
// ---------------------------------------------------------------------------

export interface BfCustomFieldDefinition {
  /**
   * @numeric Display order (sorting weight).
   * Note: PascalCase in the XML response: <DisplayOrder>.
   */
  DisplayOrder: string;
  /**
   * Data type name (e.g. "Text", "Number", "Date", "Boolean", "List").
   * PascalCase: <FieldDataType>.
   */
  FieldDataType: string;
  /**
   * @numeric Unique field ID.
   * PascalCase: <FieldId>.
   */
  FieldId: string;
  /**
   * List of allowed values for "List" type fields.
   * PascalCase: <FieldListValues>.
   * Contains <FieldListValue> children.
   * @isArray — force FieldListValue to be an array.
   */
  FieldListValues: {
    FieldListValue: string[];
  };
  /**
   * Field display name.
   * PascalCase: <FieldName>.
   */
  FieldName: string;
  /**
   * @boolean Whether the field is required.
   * PascalCase: <FieldRequired>.
   */
  FieldRequired: string;
}

export interface BfCustomFieldsDefinitionResponse {
  customFields: {
    /** @isArray */
    customField: BfCustomFieldDefinition[];
  };
}

// ---------------------------------------------------------------------------
// 7. Standalone Assignment (GET /serviceRequests/getAssignment.aspx)
// ---------------------------------------------------------------------------

/**
 * Full assignment shape from the standalone get/list endpoints.
 * Different from BfAssignmentInline: uses nested assignedTo with userId
 * array, and includes assignmentToken + completionComment.
 */
export interface BfAssignment {
  /** @numeric */
  assignmentId: string;
  /** Unique token for the assignment. */
  assignmentToken: string;
  /** @numeric Parent service request ID. */
  serviceRequestId: string;
  /** Nested assigned-to user IDs. */
  assignedTo: {
    /** @isArray — force array even for single user. */
    userId: string[];
  };
  /** Assignment comment/notes. */
  assignmentComment: string;
  /** @datetime ISO 8601. */
  startDate: string;
  /** @datetime ISO 8601. */
  endDate: string;
  /** @boolean */
  allDayEvent: string;
  /** @datetime ISO 8601 UTC. */
  dateTimeCreated: string;
  /** @numeric */
  createdByUserId: string;
  /** @boolean */
  isComplete: string;
  /** @datetime ISO 8601 UTC. Empty if not completed. */
  dateTimeCompleted: string;
  /** @numeric Empty if not completed. */
  completedByUserId: string;
  /** Comment added at completion time. */
  completionComment: string;
}

export interface BfAssignmentGetResponse {
  serviceRequestAssignment: BfAssignment;
}

export interface BfAssignmentListResponse {
  /** @isArray */
  serviceRequestAssignment: BfAssignment[];
}

// ---------------------------------------------------------------------------
// 8. Request Body Interfaces — List Filters
// ---------------------------------------------------------------------------

/**
 * Filters for the service request list endpoint.
 * All values are sent as strings in XML. Optional fields can be omitted.
 */
export interface BfServiceRequestListFilter {
  /** "basic" or "full". */
  listType: 'basic' | 'full';
  /** Filter by customer ID. */
  customerId?: string;
  /**
   * Filter by customer name.
   * Supports an exactMatch attribute. In the XML request this is an attribute:
   *   <customerName exactMatch="true">Acme Corp</customerName>
   */
  customerName?: {
    '@_exactMatch'?: 'true' | 'false';
    '#text': string;
  };
  /**
   * Date range filter.
   * The dateField attribute must be "dateTimeCreated" or "dateTimeClosed".
   * Dates should be formatted as "MM-DD-YYYY HH:MM AM/PM".
   */
  dateRange?: {
    '@_dateField': 'dateTimeCreated' | 'dateTimeClosed';
    startDate: string;
    endDate: string;
  };
  /** Filter by equipment ID (GUID). */
  equipmentId?: string;
  /** Filter by status. Use "open" for all non-closed SRs. */
  status?: string;
  /** Filter by billing status. */
  billingStatus?: string;
  /** Filter by invoice number. */
  invoiceNo?: string;
  /** Filter by reference number. */
  referenceNo?: string;
}

/**
 * Filters for the assignment list endpoint.
 */
export interface BfAssignmentListFilter {
  /** Filter to a single service request. */
  serviceRequestId?: string;
  /** Filter to a single customer. */
  customerId?: string;
  /** Start of date range. Format: YYYY.MM.DD HH:MM AM. */
  dateRangeStart?: string;
  /** End of date range. Format: YYYY.MM.DD HH:MM AM. */
  dateRangeEnd?: string;
  /**
   * What date field to filter by:
   *  - "created" = dateTimeCreated
   *  - "completed" = dateTimeCompleted
   *  - "scheduled" = scheduled start/end (default)
   */
  dateRangeType?: 'created' | 'completed' | 'scheduled';
  /** Filter to specific assigned user(s). */
  assignedTo?: {
    /** @isArray */
    userId: string[];
  };
}

// ---------------------------------------------------------------------------
// 9. Billing Status Enum
// ---------------------------------------------------------------------------

export type BfBillingStatus = 'billable' | 'non-billable' | 'contract';

// ---------------------------------------------------------------------------
// 10. User (GET /users/list.aspx)
// ---------------------------------------------------------------------------

export interface BfUser {
  /** @numeric BlueFolder user ID. */
  userId: string;
  /** User's first name. */
  firstName: string;
  /** User's last name. */
  lastName: string;
  /** Display name (typically "First Last"). */
  displayName: string;
  /** @boolean "true" or "false". Whether the user is inactive. */
  inactive: string;
  /** Login username. */
  userName: string;
  /** User type (e.g. "Admin", "Tech"). */
  userType: string;
}

export interface BfUserListResponse {
  /** @isArray — user elements are direct children of <response>, no wrapper. */
  user: BfUser[];
}
