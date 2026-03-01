import type { ReactNode } from 'react';
import { Separator } from '@/app/components/ui/separator';
import type { ServiceRequestDetail } from '@fieldrunner/shared';
import { SrDetailsSection } from './sr-details-section';
import { SrCustomerSection } from './sr-customer-section';
import { SrFinancials } from './sr-financials';
import { SrAssignments } from './sr-assignments';
import { SrWorkItems } from './sr-work-items';
import { SrEquipment } from './sr-equipment';
import { SrCustomFields } from './sr-custom-fields';

export function SrOverview({ sr, vendorDebug }: { sr: ServiceRequestDetail; vendorDebug?: ReactNode }) {
  const hasWorkItems =
    sr.labor.length > 0 ||
    sr.materials.length > 0 ||
    sr.expenses.length > 0;
  const hasAssignments = sr.assignments.length > 0;
  const hasEquipment = sr.equipment.length > 0;
  const hasCustomFields = sr.customFields.length > 0;

  return (
    <div className="space-y-6">
      {/* Details + Customer side-by-side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SrDetailsSection sr={sr} />
        <SrCustomerSection sr={sr} />
      </div>

      {/* Assignments first */}
      {hasAssignments && (
        <>
          <Separator />
          <SrAssignments assignments={sr.assignments} />
        </>
      )}

      {/* Financials — hidden when all zeros */}
      <SrFinancials sr={sr} />

      {hasWorkItems && (
        <>
          <Separator />
          <SrWorkItems
            labor={sr.labor}
            materials={sr.materials}
            expenses={sr.expenses}
          />
        </>
      )}

      {hasEquipment && (
        <>
          <Separator />
          <SrEquipment equipment={sr.equipment} />
        </>
      )}

      {vendorDebug && (
        <>
          <Separator />
          {vendorDebug}
        </>
      )}

      {hasCustomFields && (
        <>
          <Separator />
          <SrCustomFields fields={sr.customFields} />
        </>
      )}
    </div>
  );
}
