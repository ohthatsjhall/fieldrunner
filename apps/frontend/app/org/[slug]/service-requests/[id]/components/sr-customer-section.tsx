import { cn } from '@/lib/utils';
import type { ServiceRequestDetail } from '@fieldrunner/shared';
import { SrMap } from './sr-map';

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

export function SrCustomerSection({ sr }: { sr: ServiceRequestDetail }) {
  const address = [
    sr.customerLocationStreetAddress,
    sr.customerLocationCity,
    sr.customerLocationState,
    sr.customerLocationPostalCode,
  ]
    .filter(Boolean)
    .join(', ');

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: 'Name', value: sr.customerName },
    { label: 'Contact', value: sr.customerContactName },
    { label: 'Email', value: sr.customerContactEmail },
    { label: 'Phone', value: sr.customerContactPhone },
    { label: 'Location', value: sr.customerLocationName },
    { label: 'Address', value: address || null },
  ];

  const visibleFields = fields.filter((f) => f.value);

  if (visibleFields.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="px-6 pt-6 pb-4">
        <div className="font-semibold leading-none">Customer</div>
      </div>
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
      {address && (
        <div className="relative">
          {/* Top gradient — blends map into card */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-card to-transparent" />
          {/* Bottom gradient — blends map into card bottom edge */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-card to-transparent" />
          <SrMap address={address} />
        </div>
      )}
    </div>
  );
}
