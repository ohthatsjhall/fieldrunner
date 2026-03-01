import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import type { ServiceRequestDetail } from '@fieldrunner/shared';
import { DescriptionRow } from './description-row';

export function SrDetailsSection({ sr }: { sr: ServiceRequestDetail }) {
  const fields: { label: string; value: React.ReactNode }[] = [
    { label: 'Status', value: sr.status },
    { label: 'Priority', value: sr.priority },
    { label: 'Type', value: sr.type },
    { label: 'Account Manager', value: sr.accountManagerName },
    { label: 'Service Manager', value: sr.serviceManagerName },
    { label: 'Created By', value: sr.createdByUserName },
    {
      label: 'Created',
      value: sr.dateTimeCreated
        ? new Date(sr.dateTimeCreated).toLocaleString()
        : null,
    },
    {
      label: 'Due Date',
      value: sr.dueDate
        ? new Date(sr.dueDate).toLocaleDateString()
        : null,
    },
    {
      label: 'Status Age',
      value: sr.statusAgeHours
        ? `${sr.statusAgeHours.toFixed(1)} hours`
        : null,
    },
    { label: 'Reference #', value: sr.referenceNo },
    { label: 'PO #', value: sr.purchaseOrderNo },
  ];

  const visibleFields = fields.filter((f) => f.value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <dl>
          {visibleFields.map((field, i) => (
            <DescriptionRow
              key={field.label}
              label={field.label}
              value={field.value}
              index={i}
            />
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
