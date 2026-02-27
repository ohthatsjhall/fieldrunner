import {
  mapServiceRequestListItem,
  mapServiceRequestDetail,
} from './service-request.mapper';
import type {
  BfServiceRequestListItem,
  BfServiceRequest,
} from '../types/bluefolder-api.types';

function makeListItem(
  overrides: Partial<BfServiceRequestListItem> = {},
): BfServiceRequestListItem {
  return {
    accountManagerId: '10',
    billable: 'true',
    billableTotal: '500.00',
    billingStatus: 'billable',
    costTotal: '300.00',
    customerContactEmail: 'john@acme.com',
    customerContactId: '5',
    customerContactName: 'John Doe',
    customerContactPhone: '555-1234',
    customerContactPhoneMobile: '555-5678',
    customerId: '100',
    customerLocationCity: 'Austin',
    customerLocationCountry: 'US',
    customerLocationId: '50',
    customerLocationName: 'Main Office',
    customerLocationNotes: '',
    customerLocationPostalCode: '78701',
    customerLocationState: 'TX',
    customerLocationStreetAddress: '123 Main St',
    customerLocationZone: 'Zone A',
    customerName: 'Acme Corp',
    dateTimeCreated: '2024-01-15T10:00:00Z',
    dateTimeClosed: '',
    description: 'Fix HVAC unit',
    detailedDescription: 'The HVAC unit on the 3rd floor is not cooling.',
    dueDate: '2024-02-01T00:00:00',
    externalId: 'EXT-123',
    priority: 'High',
    priorityLabel: 'High Priority',
    serviceManagerId: '20',
    serviceRequestId: '1001',
    status: 'In Progress',
    timeOpen_hours: '48.5',
    type: 'Maintenance',
    ...overrides,
  };
}

function makeFullSR(
  overrides: Partial<BfServiceRequest> = {},
): BfServiceRequest {
  return {
    accountManagerId: '10',
    billable: 'true',
    billableTotal: '500.00',
    billableExpensesPrice: '50.00',
    billableLaborHours: '8.5',
    billableLaborPrice: '340.00',
    billableMaterialsPrice: '110.00',
    billToAddressId: '1',
    billToAddressName: 'Billing Office',
    billToCity: 'Austin',
    billToCountry: 'US',
    billToId: '1',
    billToName: 'Acme Corp Billing',
    billToPostalCode: '78701',
    billToState: 'TX',
    billToStreetAddress: '456 Bill St',
    costExpenses: '40.00',
    costLabor: '250.00',
    costMaterials: '80.00',
    costTotal: '370.00',
    createdByUserId: '99',
    customerAction: '',
    customerContactEmail: 'john@acme.com',
    customerContactId: '5',
    customerContactName: 'John Doe',
    customerContactPhone: '555-1234',
    customerContactPhoneMobile: '555-5678',
    customerId: '100',
    customerLocationCity: 'Austin',
    customerLocationCountry: 'US',
    customerLocationId: '50',
    customerLocationName: 'Main Office',
    customerLocationNotes: null,
    customerLocationPostalCode: '78701',
    customerLocationState: 'TX',
    customerLocationStreetAddress: '123 Main St',
    customerLocationZone: 'Zone A',
    customerName: 'Acme Corp',
    dateTimeCreated: '2024-01-15T10:00:00Z',
    dateTimeClosed: '',
    dateTimeExportedForBilling: '',
    description: 'Fix HVAC unit',
    detailedDescription: 'The HVAC unit on the 3rd floor is not cooling.',
    dueDate: '2024-02-01T00:00:00',
    externalId: 'EXT-123',
    linkedToServiceRequestId: '',
    nonBillableExpensesPrice: '0.00',
    nonBillableLaborHours: '0.50',
    nonBillableLaborPrice: '20.00',
    nonBillableMaterialsPrice: '0.00',
    nonBillableTotal: '20.00',
    priority: 'High',
    purchaseOrderNo: 'PO-456',
    referenceNo: 'REF-789',
    requestDetails: '<p>Details here</p>',
    requestVerified: 'true',
    serviceContractId: '',
    serviceManagerId: '20',
    serviceRequestId: '1001',
    sourceName: 'Web',
    sourceId: 'WEB-001',
    sourceType: 'web',
    status: 'In Progress',
    statusLastUpdated: '2024-01-20T14:00:00Z',
    statusAge_hours: '120.5',
    taxCodeId: '',
    taxRate: '0.00',
    type: 'Maintenance',
    assignments: {
      assignment: [
        {
          assignmentId: '200',
          assigneeUserIds: '30,31',
          type: 'Service',
          startDate: '2024-01-16T09:00:00',
          endDate: '2024-01-16T17:00:00',
          allDayEvent: 'false',
          assignmentComment: 'First assignment',
          dateTimeCreated: '2024-01-15T10:30:00Z',
          createdByUserId: '99',
          isComplete: 'false',
          dateTimeCompleted: '',
          completedByUserId: '',
        },
      ],
    },
    customFields: {
      customField: [
        { name: 'Region', value: 'Southwest' },
        { name: 'Building', value: 'Tower A' },
      ],
    },
    labor: {
      laborItem: [
        {
          apptId: '300',
          billable: 'true',
          billingContractId: '',
          billingStatus: 'billable',
          comment: 'Diagnosed issue',
          commentIsPublic: 'true',
          createdByUserId: '30',
          dateTimeCreated: '2024-01-16T10:00:00Z',
          dateWorked: '2024-01-16',
          duration: '4.5',
          id: '400',
          itemDescription: 'HVAC Repair Labor',
          itemId: '10',
          itemIsFlatRate: 'false',
          itemUnitCost: '30.00',
          itemUnitListPrice: '50.00',
          itemUnitPrice: '45.00',
          serviceRequestId: '1001',
          startTime: '09:00 AM',
          taxable: 'false',
          totalCost: '135.00',
          totalPrice: '202.50',
          totalPriceBillable: '202.50',
          userId: '30',
        },
      ],
    },
    materials: {
      materialsItem: [
        {
          apptId: '300',
          billable: 'true',
          billingContractId: '',
          billingStatus: 'billable',
          comment: 'Replacement filter',
          commentIsPublic: 'false',
          createdByUserId: '30',
          dateTimeCreated: '2024-01-16T11:00:00Z',
          dateUsed: '2024-01-16',
          id: '500',
          itemDescription: 'HVAC Filter',
          itemId: '20',
          itemQuantity: '2',
          itemUnitCost: '15.00',
          itemUnitListPrice: '30.00',
          itemUnitPrice: '25.00',
          serviceRequestId: '1001',
          taxable: 'true',
          totalCost: '30.00',
          totalprice: '50.00',
          totalPriceBillable: '50.00',
        },
      ],
    },
    expenses: { expenseItem: [] },
    log: {
      logEntry: [
        {
          comment: 'Started work',
          commentIsPublic: 'true',
          createdByUserId: '30',
          dateTimeCreated: '2024-01-16T09:00:00Z',
          description: 'Technician started on-site',
          entryType: 'comment',
          id: '600',
          serviceRequestId: '1001',
        },
      ],
    },
    equipmentToService: {
      equipmentItem: [
        {
          equipmentId: 'eq-guid-001',
          equipName: 'Rooftop HVAC Unit',
          equipType: 'HVAC',
          externalId: '',
          mfrName: 'Carrier',
          modelNo: 'XR-500',
          serialNo: 'SN-12345',
          nextServiceDate: '2024-06-01',
          refNo: 'HVAC-001',
        },
      ],
    },
    ...overrides,
  };
}

describe('mapServiceRequestListItem', () => {
  it('should map all fields correctly', () => {
    const result = mapServiceRequestListItem(makeListItem());

    expect(result.serviceRequestId).toBe(1001);
    expect(result.description).toBe('Fix HVAC unit');
    expect(result.status).toBe('In Progress');
    expect(result.priority).toBe('High');
    expect(result.priorityLabel).toBe('High Priority');
    expect(result.billable).toBe(true);
    expect(result.billableTotal).toBe(500);
    expect(result.costTotal).toBe(300);
    expect(result.customerId).toBe(100);
    expect(result.customerName).toBe('Acme Corp');
    expect(result.timeOpenHours).toBe(48.5);
    expect(result.externalId).toBe('EXT-123');
    expect(result.dateTimeCreated).toBe('2024-01-15T10:00:00Z');
  });

  it('should coerce string numbers to numbers', () => {
    const result = mapServiceRequestListItem(
      makeListItem({ serviceRequestId: '9999', costTotal: '123.45' }),
    );
    expect(result.serviceRequestId).toBe(9999);
    expect(result.costTotal).toBe(123.45);
  });

  it('should coerce string booleans to booleans', () => {
    const resultTrue = mapServiceRequestListItem(
      makeListItem({ billable: 'true' }),
    );
    expect(resultTrue.billable).toBe(true);

    const resultFalse = mapServiceRequestListItem(
      makeListItem({ billable: 'false' }),
    );
    expect(resultFalse.billable).toBe(false);
  });

  it('should handle empty string dates as null', () => {
    const result = mapServiceRequestListItem(
      makeListItem({ dateTimeClosed: '', dueDate: '' }),
    );
    expect(result.dateTimeClosed).toBeNull();
    expect(result.dueDate).toBeNull();
  });

  it('should handle empty external ID as null', () => {
    const result = mapServiceRequestListItem(makeListItem({ externalId: '' }));
    expect(result.externalId).toBeNull();
  });

  it('should handle empty manager IDs as null', () => {
    const result = mapServiceRequestListItem(
      makeListItem({ accountManagerId: '', serviceManagerId: '' }),
    );
    expect(result.accountManagerId).toBeNull();
    expect(result.serviceManagerId).toBeNull();
  });

  it('should rename timeOpen_hours to timeOpenHours', () => {
    const result = mapServiceRequestListItem(
      makeListItem({ timeOpen_hours: '72.3' }),
    );
    expect(result.timeOpenHours).toBe(72.3);
  });

  describe('computed fields', () => {
    it('should set isOpen = true for non-closed status', () => {
      const result = mapServiceRequestListItem(
        makeListItem({ status: 'In Progress' }),
      );
      expect(result.isOpen).toBe(true);
    });

    it('should set isOpen = false for Closed status', () => {
      const result = mapServiceRequestListItem(
        makeListItem({ status: 'Closed' }),
      );
      expect(result.isOpen).toBe(false);
    });

    it('should set isOverdue = true when past due and still open', () => {
      const result = mapServiceRequestListItem(
        makeListItem({
          dueDate: '2020-01-01T00:00:00',
          status: 'In Progress',
        }),
      );
      expect(result.isOverdue).toBe(true);
    });

    it('should set isOverdue = false when past due but closed', () => {
      const result = mapServiceRequestListItem(
        makeListItem({
          dueDate: '2020-01-01T00:00:00',
          status: 'Closed',
        }),
      );
      expect(result.isOverdue).toBe(false);
    });

    it('should set isOverdue = false when no due date', () => {
      const result = mapServiceRequestListItem(makeListItem({ dueDate: '' }));
      expect(result.isOverdue).toBe(false);
    });
  });
});

describe('mapServiceRequestDetail', () => {
  it('should map all base fields', () => {
    const result = mapServiceRequestDetail(makeFullSR());

    expect(result.serviceRequestId).toBe(1001);
    expect(result.createdByUserId).toBe(99);
    expect(result.statusAgeHours).toBe(120.5);
    expect(result.purchaseOrderNo).toBe('PO-456');
    expect(result.referenceNo).toBe('REF-789');
    expect(result.sourceName).toBe('Web');
  });

  it('should rename statusAge_hours to statusAgeHours', () => {
    const result = mapServiceRequestDetail(
      makeFullSR({ statusAge_hours: '200.75' }),
    );
    expect(result.statusAgeHours).toBe(200.75);
  });

  it('should handle empty linkedToServiceRequestId as null', () => {
    const result = mapServiceRequestDetail(
      makeFullSR({ linkedToServiceRequestId: '' }),
    );
    expect(result.linkedToServiceRequestId).toBeNull();
  });

  it('should map financial fields', () => {
    const result = mapServiceRequestDetail(makeFullSR());
    expect(result.billableExpensesPrice).toBe(50);
    expect(result.billableLaborHours).toBe(8.5);
    expect(result.billableLaborPrice).toBe(340);
    expect(result.billableMaterialsPrice).toBe(110);
    expect(result.nonBillableLaborHours).toBe(0.5);
    expect(result.nonBillableTotal).toBe(20);
  });

  describe('nested collections', () => {
    it('should map assignments with parsed user IDs', () => {
      const result = mapServiceRequestDetail(makeFullSR());
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0].assignmentId).toBe(200);
      expect(result.assignments[0].assigneeUserIds).toEqual([30, 31]);
      expect(result.assignments[0].isComplete).toBe(false);
      expect(result.assignments[0].completedByUserId).toBeNull();
    });

    it('should map custom fields', () => {
      const result = mapServiceRequestDetail(makeFullSR());
      expect(result.customFields).toHaveLength(2);
      expect(result.customFields[0].name).toBe('Region');
      expect(result.customFields[0].value).toBe('Southwest');
    });

    it('should map labor items', () => {
      const result = mapServiceRequestDetail(makeFullSR());
      expect(result.labor).toHaveLength(1);
      expect(result.labor[0].id).toBe(400);
      expect(result.labor[0].duration).toBe(4.5);
      expect(result.labor[0].billable).toBe(true);
    });

    it('should map materials with lowercase totalprice fix', () => {
      const result = mapServiceRequestDetail(makeFullSR());
      expect(result.materials).toHaveLength(1);
      expect(result.materials[0].totalPrice).toBe(50);
      expect(result.materials[0].quantity).toBe(2);
    });

    it('should map empty expenses as empty array', () => {
      const result = mapServiceRequestDetail(makeFullSR());
      expect(result.expenses).toEqual([]);
    });

    it('should map log entries', () => {
      const result = mapServiceRequestDetail(makeFullSR());
      expect(result.log).toHaveLength(1);
      expect(result.log[0].entryType).toBe('comment');
    });

    it('should map equipment', () => {
      const result = mapServiceRequestDetail(makeFullSR());
      expect(result.equipment).toHaveLength(1);
      expect(result.equipment[0].equipName).toBe('Rooftop HVAC Unit');
      expect(result.equipment[0].serialNo).toBe('SN-12345');
    });

    it('should handle empty equipment externalId as null', () => {
      const result = mapServiceRequestDetail(makeFullSR());
      expect(result.equipment[0].externalId).toBeNull();
    });

    it('should handle undefined nested collections gracefully', () => {
      const sr = makeFullSR();
      // Simulate missing collections (undefined from XML parser)
      const loose = sr as Record<string, unknown>;
      loose.assignments = undefined;
      loose.labor = undefined;
      loose.materials = undefined;
      loose.expenses = undefined;
      loose.log = undefined;
      loose.equipmentToService = undefined;
      loose.customFields = undefined;

      const result = mapServiceRequestDetail(sr);
      expect(result.assignments).toEqual([]);
      expect(result.labor).toEqual([]);
      expect(result.materials).toEqual([]);
      expect(result.expenses).toEqual([]);
      expect(result.log).toEqual([]);
      expect(result.equipment).toEqual([]);
      expect(result.customFields).toEqual([]);
    });
  });
});
