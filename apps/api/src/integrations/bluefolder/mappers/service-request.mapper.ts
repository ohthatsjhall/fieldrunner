import type {
  BfServiceRequestListItem,
  BfServiceRequest,
} from '../types/bluefolder-api.types';
import type {
  ServiceRequestSummary,
  ServiceRequestDetail,
  ServiceRequestAssignment,
  LaborItem,
  MaterialsItem,
  ExpenseItem,
  LogEntry,
  EquipmentItem,
  CustomFieldValue,
  BillingStatus,
} from '@fieldrunner/shared';

function toNumber(value: string | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}

function toNumberOrNull(value: string | undefined | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return isNaN(parsed) ? null : parsed;
}

function toBool(value: string | undefined | null): boolean {
  return value === 'true' || value === 'True';
}

function toDateOrNull(value: string | undefined | null): string | null {
  if (!value || value === '') return null;
  return value;
}

function decodeXmlText(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/\r\n?/g, '\n');
}

function ensureArray<T>(value: T[] | T | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function computeIsOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status.toLowerCase() === 'closed') return false;
  return new Date(dueDate) < new Date();
}

function computeIsOpen(status: string): boolean {
  return status.toLowerCase() !== 'closed';
}

export function mapServiceRequestListItem(
  item: BfServiceRequestListItem,
): ServiceRequestSummary {
  const dueDate = toDateOrNull(item.dueDate);
  const status = item.status ?? '';

  return {
    serviceRequestId: toNumber(item.serviceRequestId),
    description: decodeXmlText(item.description),
    detailedDescription: decodeXmlText(item.detailedDescription),
    status,
    priority: item.priority ?? '',
    priorityLabel: item.priorityLabel ?? item.priority ?? '',
    type: item.type ?? '',
    billable: toBool(item.billable),
    billableTotal: toNumber(item.billableTotal),
    billingStatus: item.billingStatus ?? '',
    costTotal: toNumber(item.costTotal),
    externalId: item.externalId || null,
    dateTimeCreated: item.dateTimeCreated ?? '',
    dateTimeClosed: toDateOrNull(item.dateTimeClosed),
    dueDate,
    timeOpenHours: toNumber(item.timeOpen_hours),
    customerId: toNumber(item.customerId),
    customerName: item.customerName ?? '',
    customerContactId: toNumber(item.customerContactId),
    customerContactName: item.customerContactName ?? '',
    customerContactEmail: item.customerContactEmail ?? '',
    customerContactPhone: item.customerContactPhone ?? '',
    customerContactPhoneMobile: item.customerContactPhoneMobile ?? '',
    customerLocationId: toNumber(item.customerLocationId),
    customerLocationName: item.customerLocationName ?? '',
    customerLocationStreetAddress: item.customerLocationStreetAddress ?? '',
    customerLocationCity: item.customerLocationCity ?? '',
    customerLocationState: item.customerLocationState ?? '',
    customerLocationPostalCode: item.customerLocationPostalCode ?? '',
    customerLocationCountry: item.customerLocationCountry ?? '',
    customerLocationZone: item.customerLocationZone ?? '',
    customerLocationNotes: item.customerLocationNotes ?? '',
    accountManagerId: toNumberOrNull(item.accountManagerId),
    accountManagerName: null,
    serviceManagerId: toNumberOrNull(item.serviceManagerId),
    serviceManagerName: null,
    isOverdue: computeIsOverdue(dueDate, status),
    isOpen: computeIsOpen(status),
  };
}

export function mapServiceRequestDetail(
  sr: BfServiceRequest,
): ServiceRequestDetail {
  const dueDate = toDateOrNull(sr.dueDate);
  const status = sr.status ?? '';

  return {
    serviceRequestId: toNumber(sr.serviceRequestId),
    description: decodeXmlText(sr.description),
    detailedDescription: decodeXmlText(sr.detailedDescription),
    status,
    priority: sr.priority ?? '',
    priorityLabel: sr.priority ?? '',
    type: sr.type ?? '',
    billable: toBool(sr.billable),
    billableTotal: toNumber(sr.billableTotal),
    billingStatus: '',
    costTotal: toNumber(sr.costTotal),
    externalId: sr.externalId || null,
    dateTimeCreated: sr.dateTimeCreated ?? '',
    dateTimeClosed: toDateOrNull(sr.dateTimeClosed),
    dueDate,
    timeOpenHours: toNumber(sr.statusAge_hours),
    customerId: toNumber(sr.customerId),
    customerName: sr.customerName ?? '',
    customerContactId: toNumber(sr.customerContactId),
    customerContactName: sr.customerContactName ?? '',
    customerContactEmail: sr.customerContactEmail ?? '',
    customerContactPhone: sr.customerContactPhone ?? '',
    customerContactPhoneMobile: sr.customerContactPhoneMobile ?? '',
    customerLocationId: toNumber(sr.customerLocationId),
    customerLocationName: sr.customerLocationName ?? '',
    customerLocationStreetAddress: sr.customerLocationStreetAddress ?? '',
    customerLocationCity: sr.customerLocationCity ?? '',
    customerLocationState: sr.customerLocationState ?? '',
    customerLocationPostalCode: sr.customerLocationPostalCode ?? '',
    customerLocationCountry: sr.customerLocationCountry ?? '',
    customerLocationZone: sr.customerLocationZone ?? '',
    customerLocationNotes: sr.customerLocationNotes ?? '',
    accountManagerId: toNumberOrNull(sr.accountManagerId),
    accountManagerName: null,
    serviceManagerId: toNumberOrNull(sr.serviceManagerId),
    serviceManagerName: null,
    isOverdue: computeIsOverdue(dueDate, status),
    isOpen: computeIsOpen(status),
    createdByUserId: toNumber(sr.createdByUserId),
    createdByUserName: null,
    statusLastUpdated: toDateOrNull(sr.statusLastUpdated),
    statusAgeHours: toNumber(sr.statusAge_hours),
    purchaseOrderNo: sr.purchaseOrderNo ?? '',
    referenceNo: sr.referenceNo ?? '',
    linkedToServiceRequestId: toNumberOrNull(sr.linkedToServiceRequestId),
    sourceName: sr.sourceName ?? '',
    sourceId: sr.sourceId ?? '',
    sourceType: sr.sourceType ?? '',
    billableExpensesPrice: toNumber(sr.billableExpensesPrice),
    billableLaborHours: toNumber(sr.billableLaborHours),
    billableLaborPrice: toNumber(sr.billableLaborPrice),
    billableMaterialsPrice: toNumber(sr.billableMaterialsPrice),
    nonBillableExpensesPrice: toNumber(sr.nonBillableExpensesPrice),
    nonBillableLaborHours: toNumber(sr.nonBillableLaborHours),
    nonBillableLaborPrice: toNumber(sr.nonBillableLaborPrice),
    nonBillableMaterialsPrice: toNumber(sr.nonBillableMaterialsPrice),
    nonBillableTotal: toNumber(sr.nonBillableTotal),
    assignments: ensureArray(sr.assignments?.assignment).map(
      (a): ServiceRequestAssignment => ({
        assignmentId: toNumber(a.assignmentId),
        assigneeUserIds: String(a.assigneeUserIds ?? '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
          .map(Number),
        assigneeUserNames: [],
        createdByUserName: null,
        completedByUserName: null,
        type: a.type ?? '',
        startDate: toDateOrNull(a.startDate),
        endDate: toDateOrNull(a.endDate),
        allDayEvent: toBool(a.allDayEvent),
        assignmentComment: a.assignmentComment ?? '',
        dateTimeCreated: a.dateTimeCreated ?? '',
        createdByUserId: toNumber(a.createdByUserId),
        isComplete: toBool(a.isComplete),
        dateTimeCompleted: toDateOrNull(a.dateTimeCompleted),
        completedByUserId: toNumberOrNull(a.completedByUserId),
      }),
    ),
    customFields: ensureArray(sr.customFields?.customField).map(
      (cf): CustomFieldValue => ({
        name: cf.name ?? '',
        value: cf.value ?? '',
      }),
    ),
    labor: ensureArray(sr.labor?.laborItem).map(
      (l): LaborItem => ({
        id: toNumber(l.id),
        serviceRequestId: toNumber(l.serviceRequestId),
        userId: toNumber(l.userId),
        userName: null,
        createdByUserName: null,
        dateWorked: l.dateWorked ?? '',
        duration: toNumber(l.duration),
        startTime: l.startTime ?? '',
        billingStatus: (l.billingStatus ?? 'billable') as BillingStatus,
        billable: toBool(l.billable),
        itemDescription: l.itemDescription ?? '',
        itemId: toNumber(l.itemId),
        itemIsFlatRate: toBool(l.itemIsFlatRate),
        itemUnitCost: toNumber(l.itemUnitCost),
        itemUnitListPrice: toNumber(l.itemUnitListPrice),
        itemUnitPrice: toNumber(l.itemUnitPrice),
        totalCost: toNumber(l.totalCost),
        totalPrice: toNumber(l.totalPrice),
        totalPriceBillable: toNumber(l.totalPriceBillable),
        taxable: toBool(l.taxable),
        comment: l.comment ?? '',
        commentIsPublic: toBool(l.commentIsPublic),
        dateTimeCreated: l.dateTimeCreated ?? '',
        createdByUserId: toNumber(l.createdByUserId),
      }),
    ),
    materials: ensureArray(sr.materials?.materialsItem).map(
      (m): MaterialsItem => ({
        id: toNumber(m.id),
        serviceRequestId: toNumber(m.serviceRequestId),
        createdByUserName: null,
        dateUsed: m.dateUsed ?? '',
        quantity: toNumber(m.itemQuantity),
        billingStatus: (m.billingStatus ?? 'billable') as BillingStatus,
        billable: toBool(m.billable),
        itemDescription: m.itemDescription ?? '',
        itemId: toNumber(m.itemId),
        itemUnitCost: toNumber(m.itemUnitCost),
        itemUnitListPrice: toNumber(m.itemUnitListPrice),
        itemUnitPrice: toNumber(m.itemUnitPrice),
        totalCost: toNumber(m.totalCost),
        totalPrice: toNumber(m.totalprice),
        totalPriceBillable: toNumber(m.totalPriceBillable),
        taxable: toBool(m.taxable),
        comment: m.comment ?? '',
        commentIsPublic: toBool(m.commentIsPublic),
        dateTimeCreated: m.dateTimeCreated ?? '',
        createdByUserId: toNumber(m.createdByUserId),
      }),
    ),
    expenses: ensureArray(sr.expenses?.expenseItem).map(
      (e): ExpenseItem => ({
        id: toNumber(e.id),
        serviceRequestId: toNumber(e.serviceRequestId),
        userId: toNumber(e.userId),
        userName: null,
        createdByUserName: null,
        dateUsed: e.dateUsed ?? '',
        quantity: toNumber(e.itemQuantity),
        billingStatus: (e.billingStatus ?? 'billable') as BillingStatus,
        billable: toBool(e.billable),
        itemDescription: e.itemDescription ?? '',
        itemId: toNumber(e.itemId),
        itemUnitCost: toNumber(e.itemUnitCost),
        itemUnitListPrice: toNumber(e.itemUnitListPrice),
        itemUnitPrice: toNumber(e.itemUnitPrice),
        totalCost: toNumber(e.totalCost),
        totalPrice: toNumber(e.totalPrice),
        totalPriceBillable: toNumber(e.totalPriceBillable),
        taxable: toBool(e.taxable),
        comment: e.comment ?? '',
        commentIsPublic: toBool(e.commentIsPublic),
        dateTimeCreated: e.dateTimeCreated ?? '',
        createdByUserId: toNumber(e.createdByUserId),
      }),
    ),
    log: ensureArray(sr.log?.logEntry).map(
      (l): LogEntry => ({
        id: toNumber(l.id),
        serviceRequestId: toNumber(l.serviceRequestId),
        createdByUserName: null,
        entryType: l.entryType ?? '',
        description: l.description ?? '',
        comment: l.comment ?? '',
        commentIsPublic: toBool(l.commentIsPublic),
        dateTimeCreated: l.dateTimeCreated ?? '',
        createdByUserId: toNumber(l.createdByUserId),
      }),
    ),
    equipment: ensureArray(sr.equipmentToService?.equipmentItem).map(
      (e): EquipmentItem => ({
        equipmentId: e.equipmentId ?? '',
        equipName: e.equipName ?? '',
        equipType: e.equipType ?? '',
        externalId: e.externalId || null,
        mfrName: e.mfrName ?? '',
        modelNo: e.modelNo ?? '',
        serialNo: e.serialNo ?? '',
        nextServiceDate: toDateOrNull(e.nextServiceDate),
        refNo: e.refNo ?? '',
      }),
    ),
  };
}
