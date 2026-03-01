import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { cn } from '@/lib/utils';
import type { ServiceRequestDetail } from '@fieldrunner/shared';

function DescriptionRow({
  label,
  value,
  index,
}: {
  label: string;
  value: React.ReactNode;
  index: number;
}) {
  if (!value) return null;

  return (
    <div
      className={cn(
        'px-6 py-3 sm:grid sm:grid-cols-3 sm:gap-4',
        index % 2 === 0 && 'bg-muted/50',
      )}
    >
      <dt className="text-sm/6 font-medium text-foreground">{label}</dt>
      <dd className="mt-1 text-sm/6 text-muted-foreground sm:col-span-2 sm:mt-0">
        {value}
      </dd>
    </div>
  );
}

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

  // Filter to only rows that have values
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
