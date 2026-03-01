import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import type {
  LaborItem,
  MaterialsItem,
  ExpenseItem,
} from '@fieldrunner/shared';

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {title} ({count})
    </h3>
  );
}

function LaborTable({ items }: { items: LaborItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="cursor-default bg-muted/50 hover:bg-muted/50">
          <TableHead>Date</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((l) => (
          <TableRow key={l.id} className="cursor-default">
            <TableCell>{l.dateWorked}</TableCell>
            <TableCell>{l.userName || '-'}</TableCell>
            <TableCell>{l.itemDescription}</TableCell>
            <TableCell>{l.duration}h</TableCell>
            <TableCell className="text-right">
              ${l.totalPrice.toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MaterialsTable({ items }: { items: MaterialsItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="cursor-default bg-muted/50 hover:bg-muted/50">
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((m) => (
          <TableRow key={m.id} className="cursor-default">
            <TableCell>{m.dateUsed}</TableCell>
            <TableCell>{m.itemDescription}</TableCell>
            <TableCell>{m.quantity}</TableCell>
            <TableCell className="text-right">
              ${m.totalPrice.toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ExpensesTable({ items }: { items: ExpenseItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="cursor-default bg-muted/50 hover:bg-muted/50">
          <TableHead>Date</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((e) => (
          <TableRow key={e.id} className="cursor-default">
            <TableCell>{e.dateUsed}</TableCell>
            <TableCell>{e.userName || '-'}</TableCell>
            <TableCell>{e.itemDescription}</TableCell>
            <TableCell>{e.quantity}</TableCell>
            <TableCell className="text-right">
              ${e.totalPrice.toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function SrWorkItems({
  labor,
  materials,
  expenses,
}: {
  labor: LaborItem[];
  materials: MaterialsItem[];
  expenses: ExpenseItem[];
}) {
  const hasLabor = labor.length > 0;
  const hasMaterials = materials.length > 0;
  const hasExpenses = expenses.length > 0;

  if (!hasLabor && !hasMaterials && !hasExpenses) return null;

  return (
    <div className="space-y-6">
      {hasLabor && (
        <section>
          <SectionHeader title="Labor" count={labor.length} />
          <LaborTable items={labor} />
        </section>
      )}

      {hasMaterials && (
        <section>
          <SectionHeader title="Materials" count={materials.length} />
          <MaterialsTable items={materials} />
        </section>
      )}

      {hasExpenses && (
        <section>
          <SectionHeader title="Expenses" count={expenses.length} />
          <ExpensesTable items={expenses} />
        </section>
      )}
    </div>
  );
}
