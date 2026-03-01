import type { LogEntry } from '@fieldrunner/shared';

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

export function SrHistoryTab({ log }: { log: LogEntry[] }) {
  if (log.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No history entries.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {log.map((entry) => (
        <div
          key={entry.id}
          className="border-l-2 border-border py-1 pl-4"
        >
          <p className="text-sm text-foreground">
            {stripHtml(entry.description)}
          </p>
          {entry.comment && (
            <p className="mt-1 text-sm text-muted-foreground">
              {stripHtml(entry.comment)}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {entry.createdByUserName && (
              <span className="font-medium">
                {entry.createdByUserName} &middot;{' '}
              </span>
            )}
            {entry.dateTimeCreated
              ? new Date(entry.dateTimeCreated).toLocaleString()
              : ''}
            {' '}
            {entry.entryType}
          </p>
        </div>
      ))}
    </div>
  );
}
