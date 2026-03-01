import { Badge } from '@/app/components/ui/badge';
import type { ServiceRequestAssignment } from '@fieldrunner/shared';

export function SrAssignments({
  assignments,
}: {
  assignments: ServiceRequestAssignment[];
}) {
  if (assignments.length === 0) return null;

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Assignments ({assignments.length})
      </h3>
      <div className="space-y-3">
        {assignments.map((a) => (
          <div
            key={a.assignmentId}
            className="rounded-lg border border-border p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Assignment #{a.assignmentId}
              </span>
              <Badge variant={a.isComplete ? 'secondary' : 'outline'}>
                {a.isComplete ? 'Complete' : 'Pending'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{a.type}</p>
            {a.assigneeUserNames.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Assigned to: {a.assigneeUserNames.join(', ')}
              </p>
            )}
            {a.assignmentComment && (
              <p className="mt-2 text-sm text-foreground">
                {a.assignmentComment}
              </p>
            )}
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              {a.startDate && (
                <span>Start: {new Date(a.startDate).toLocaleString()}</span>
              )}
              {a.endDate && (
                <span>End: {new Date(a.endDate).toLocaleString()}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
