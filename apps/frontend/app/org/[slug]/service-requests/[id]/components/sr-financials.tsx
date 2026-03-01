import type { ServiceRequestDetail } from '@fieldrunner/shared';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function SrFinancials({ sr }: { sr: ServiceRequestDetail }) {
  const totalLaborHours = sr.billableLaborHours + sr.nonBillableLaborHours;

  // Hide entirely when all values are zero
  const hasAnyValue =
    sr.billableTotal > 0 ||
    sr.costTotal > 0 ||
    totalLaborHours > 0 ||
    sr.nonBillableTotal > 0;

  if (!hasAnyValue) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard
        label="Billable Total"
        value={`$${sr.billableTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      />
      <StatCard
        label="Cost Total"
        value={`$${sr.costTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      />
      <StatCard label="Labor Hours" value={`${totalLaborHours.toFixed(1)}h`} />
      <StatCard
        label="Non-Billable"
        value={`$${sr.nonBillableTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      />
    </div>
  );
}
