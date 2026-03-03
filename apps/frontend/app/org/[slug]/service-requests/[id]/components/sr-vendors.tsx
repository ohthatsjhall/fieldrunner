import { useState, useEffect } from 'react';
import { Phone, Globe, Star, Search, Loader2, Info, Check, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { VendorCandidate, VendorSearchResponse } from '@fieldrunner/shared';

const PAGE_SIZE = 5;

function metersToMiles(meters: number): string {
  return (meters / 1609.34).toFixed(1);
}

function formatPhone(phone: string | null, phoneRaw: string | null): string {
  if (phoneRaw) return phoneRaw;
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function formatCategory(cat: string): string {
  return cat
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (score >= 40) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
}

function VendorRow({ candidate: c }: { candidate: VendorCandidate }) {
  const phoneDisplay = formatPhone(c.phone, c.phoneRaw);

  return (
    <TableRow className="cursor-default">
      <TableCell className="text-center font-mono text-sm text-muted-foreground">
        {c.rank}
      </TableCell>

      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="font-medium">{c.name}</span>
          {c.address && (
            <span className="text-xs text-muted-foreground">{c.address}</span>
          )}
          {c.categories && c.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {c.categories.slice(0, 3).map((cat) => (
                <Badge
                  key={cat}
                  variant="outline"
                  className="px-1.5 py-0 text-[10px]"
                >
                  {formatCategory(cat)}
                </Badge>
              ))}
              {c.categories.length > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{c.categories.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </TableCell>

      <TableCell className="text-center">
        {c.rating != null ? (
          <div className="inline-flex items-center gap-1.5">
            <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium">{c.rating.toFixed(1)}</span>
            {c.reviewCount != null && (
              <span className="text-xs text-muted-foreground">
                ({c.reviewCount})
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">&mdash;</span>
        )}
      </TableCell>

      <TableCell className="whitespace-nowrap text-center">
        {c.distanceMeters != null ? (
          <span className="text-sm">
            {metersToMiles(c.distanceMeters)} mi
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">&mdash;</span>
        )}
      </TableCell>

      <TableCell className="text-center">
        <div
          className={cn(
            'mx-auto inline-flex h-7 w-12 items-center justify-center rounded-md text-sm font-semibold',
            getScoreColor(c.score),
          )}
        >
          {Math.round(c.score)}
        </div>
      </TableCell>

      <TableCell className="text-center">
        <div className="inline-flex items-center gap-1">
          <CopyPhoneButton phone={phoneDisplay} name={c.name} />

          {c.email ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" asChild>
                  <a
                    href={`mailto:${c.email}`}
                    aria-label={`Email ${c.name}`}
                  >
                    <Mail className="size-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{c.email}</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled
              aria-label="No email"
            >
              <Mail className="size-4" />
            </Button>
          )}

          {c.website ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon-sm" asChild>
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${c.name} website`}
                  >
                    <Globe className="size-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Visit website</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled
              aria-label="No website"
            >
              <Globe className="size-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function CopyPhoneButton({ phone, name }: { phone: string; name: string }) {
  const [copied, setCopied] = useState(false);

  if (!phone) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        disabled
        aria-label="No phone number"
      >
        <Phone className="size-4" />
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Copy phone number for ${name}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(phone);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch (err) {
              console.warn('[CopyPhoneButton] Clipboard write failed:', err);
            }
          }}
        >
          {copied ? (
            <Check className="size-4 text-green-600" />
          ) : (
            <Phone className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {copied ? 'Copied!' : phone}
      </TooltipContent>
    </Tooltip>
  );
}

export function SrVendors({
  results,
  resultsLoading,
  onReSearch,
  reSearchLoading,
  reSearchError,
}: {
  results: VendorSearchResponse | null;
  resultsLoading: boolean;
  onReSearch: () => void;
  reSearchLoading: boolean;
  reSearchError: string | null;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const candidates = results?.candidates ?? [];
  const visible = candidates.slice(0, visibleCount);
  const hasMoreToShow = visibleCount < candidates.length;

  // Reset visible count when results change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [results?.sessionId]);

  // Loading skeleton while initial fetch is in progress
  if (resultsLoading && !results) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Vendor Search</CardTitle>
            <CardDescription>Loading vendor results&hellip;</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // In-progress state (auto-search running)
  if (results?.status === 'in_progress') {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Vendor Search</CardTitle>
            <CardDescription>
              Searching for local vendors&hellip;
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="mb-3 size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Auto-searching for vendors. This may take a minute.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No results yet — show "Find Vendors" button
  if (!results) {
    return (
      <TooltipProvider>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Vendor Search</CardTitle>
              <CardDescription>
                Find local vendors for this service request
              </CardDescription>
            </div>
            <CardAction>
              <Button onClick={onReSearch} disabled={reSearchLoading}>
                {reSearchLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Searching&hellip;
                  </>
                ) : (
                  <>
                    <Search className="size-4" />
                    Find Vendors
                  </>
                )}
              </Button>
            </CardAction>
          </CardHeader>

          {reSearchError && (
            <CardContent>
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{reSearchError}</p>
              </div>
            </CardContent>
          )}
        </Card>
      </TooltipProvider>
    );
  }

  // Failed state
  if (results.status === 'failed') {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Vendor Search</CardTitle>
            <CardDescription>Search failed</CardDescription>
          </div>
          <CardAction>
            <Button onClick={onReSearch} disabled={reSearchLoading}>
              {reSearchLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Searching&hellip;
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Re-search
                </>
              )}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">
              The vendor search failed. Please try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Completed with results
  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Vendor Search</CardTitle>
            <CardDescription>
              Find local vendors for this service request
            </CardDescription>
          </div>
          <CardAction>
            <Button
              variant="outline"
              onClick={onReSearch}
              disabled={reSearchLoading}
            >
              {reSearchLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Searching&hellip;
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Re-search
                </>
              )}
            </Button>
          </CardAction>
        </CardHeader>

        {reSearchError && (
          <CardContent>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{reSearchError}</p>
            </div>
          </CardContent>
        )}

        {candidates.length > 0 && (
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="cursor-default hover:bg-transparent">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-center">Rating</TableHead>
                  <TableHead className="text-center">Distance</TableHead>
                  <TableHead className="text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-help items-center gap-1">
                          Field Score
                          <Info className="size-3.5 text-muted-foreground" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-64">
                        The Field Score (0&ndash;100) evaluates vendors on
                        proximity to the job site, customer ratings, review
                        volume, trade relevance, availability, and professional
                        credentials like licenses and insurance.
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((c) => (
                  <VendorRow key={c.vendorId} candidate={c} />
                ))}
              </TableBody>
            </Table>
            {hasMoreToShow && (
              <div className="flex justify-center px-4 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                >
                  Show more ({candidates.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </CardContent>
        )}

        {candidates.length === 0 && (
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">No vendors found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try adjusting the search parameters or expanding the radius.
              </p>
            </div>
          </CardContent>
        )}

        <CardFooter className="text-xs text-muted-foreground">
          {results.resultCount}{' '}
          {results.resultCount === 1 ? 'result' : 'results'}
          {results.searchAddress && ` near ${results.searchAddress}`}
          {results.durationMs != null &&
            ` \u00B7 ${(results.durationMs / 1000).toFixed(1)}s`}
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
