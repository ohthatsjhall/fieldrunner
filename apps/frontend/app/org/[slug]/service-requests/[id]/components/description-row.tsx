import { cn } from '@/lib/utils';

export function DescriptionRow({
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
