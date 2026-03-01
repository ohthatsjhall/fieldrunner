import { Button } from '@/app/components/ui/button';
import type { VendorSearchResponse } from '@fieldrunner/shared';

export function SrVendorDebug({
  onSearch,
  loading,
  error,
  result,
}: {
  onSearch: () => void;
  loading: boolean;
  error: string | null;
  result: VendorSearchResponse | null;
}) {
  return (
    <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950/30">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Vendor Sourcing (Debug)
          </h3>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Status is &quot;Assigned&quot; &mdash; find local vendors for this SR
          </p>
        </div>
        <Button
          onClick={onSearch}
          disabled={loading}
          className="bg-amber-600 text-white hover:bg-amber-700"
        >
          {loading ? 'Searching...' : 'Find Vendors'}
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-4 text-xs text-amber-700 dark:text-amber-400">
            <span>Session: {result.sessionId.slice(0, 8)}...</span>
            <span>Status: {result.status}</span>
            <span>Query: &quot;{result.searchQuery}&quot;</span>
            <span>Results: {result.resultCount}</span>
            <span>Duration: {result.durationMs}ms</span>
          </div>

          {result.candidates.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-amber-200 dark:border-amber-800">
                <tr className="text-xs text-amber-700 dark:text-amber-400">
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Name</th>
                  <th className="px-2 py-1">Phone</th>
                  <th className="px-2 py-1">Rating</th>
                  <th className="px-2 py-1">Reviews</th>
                  <th className="px-2 py-1">Score</th>
                  <th className="px-2 py-1">Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 dark:divide-amber-900">
                {result.candidates.map((c) => (
                  <tr
                    key={c.vendorId}
                    className="text-foreground"
                  >
                    <td className="px-2 py-2 font-mono text-xs">{c.rank}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium">{c.name}</div>
                      {c.address && (
                        <div className="text-xs text-muted-foreground">
                          {c.address}
                        </div>
                      )}
                      {c.website && (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          {c.website}
                        </a>
                      )}
                    </td>
                    <td className="px-2 py-2 font-mono text-xs">
                      {c.phoneRaw || '-'}
                    </td>
                    <td className="px-2 py-2">
                      {c.rating?.toFixed(1) ?? '-'}
                    </td>
                    <td className="px-2 py-2">{c.reviewCount ?? '-'}</td>
                    <td className="px-2 py-2 font-mono font-bold">
                      {c.score.toFixed(1)}
                    </td>
                    <td className="px-2 py-2 font-mono text-xs text-muted-foreground">
                      D:{c.scores.distance?.toFixed(0)} R:
                      {c.scores.rating?.toFixed(0)} RC:
                      {c.scores.reviewCount?.toFixed(0)} C:
                      {c.scores.categoryMatch?.toFixed(0)} H:
                      {c.scores.businessHours?.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">No vendors found.</p>
          )}

          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-amber-600 dark:text-amber-400">
              Raw JSON
            </summary>
            <pre className="mt-1 max-h-64 overflow-auto rounded bg-zinc-900 p-3 text-xs text-green-400">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
