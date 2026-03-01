import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { cn } from '@/lib/utils';
import type { CustomFieldValue } from '@fieldrunner/shared';

export function SrCustomFields({ fields }: { fields: CustomFieldValue[] }) {
  if (fields.length === 0) return null;

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>Custom Fields</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <dl>
            {fields.map((cf, i) => (
              <div
                key={cf.name}
                className={cn(
                  'px-6 py-3 sm:grid sm:grid-cols-3 sm:gap-4',
                  i % 2 === 0 && 'bg-muted/50',
                )}
              >
                <dt className="text-sm/6 font-medium text-foreground">
                  {cf.name}
                </dt>
                <dd className="mt-1 text-sm/6 text-muted-foreground sm:col-span-2 sm:mt-0">
                  {cf.value || '-'}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </section>
  );
}
