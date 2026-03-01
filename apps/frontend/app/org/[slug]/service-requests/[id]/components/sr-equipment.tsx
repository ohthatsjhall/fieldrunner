import { Badge } from '@/app/components/ui/badge';
import type { EquipmentItem } from '@fieldrunner/shared';

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </>
  );
}

export function SrEquipment({ equipment }: { equipment: EquipmentItem[] }) {
  if (equipment.length === 0) return null;

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Equipment ({equipment.length})
      </h3>
      <div className="space-y-3">
        {equipment.map((e) => (
          <div
            key={e.equipmentId}
            className="rounded-lg border border-border p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {e.equipName || 'Unnamed Equipment'}
              </span>
              {e.equipType && (
                <Badge variant="outline">{e.equipType}</Badge>
              )}
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {e.mfrName && (
                <FieldRow label="Manufacturer" value={e.mfrName} />
              )}
              {e.modelNo && <FieldRow label="Model" value={e.modelNo} />}
              {e.serialNo && (
                <FieldRow label="Serial #" value={e.serialNo} />
              )}
              {e.refNo && <FieldRow label="Ref #" value={e.refNo} />}
              {e.nextServiceDate && (
                <FieldRow
                  label="Next Service"
                  value={new Date(e.nextServiceDate).toLocaleDateString()}
                />
              )}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
