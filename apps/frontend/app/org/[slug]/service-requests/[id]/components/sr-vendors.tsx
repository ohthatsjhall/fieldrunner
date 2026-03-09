import { useState, useRef } from 'react';
import { useOrganization } from '@clerk/nextjs';
import {
  Phone, Globe, Star, Search, Loader2, Info, Check, Mail, RefreshCw,
  MoreHorizontal, UserCheck, Paperclip,
} from 'lucide-react';
import { sanitizeFilename, getCustomField, formatDate, formatCurrency } from './utils/sr-formatting';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
  ServiceRequestDetail,
  VendorCandidate,
  VendorSearchResponse,
  VendorAssignment,
} from '@fieldrunner/shared';

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

const HIDDEN_CATEGORIES = new Set([
  'point_of_interest',
  'establishment',
  'store',
]);

function filterCategories(categories: string[]): string[] {
  return categories.filter((c) => !HIDDEN_CATEGORIES.has(c.toLowerCase()));
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

function buildEmailBody(sr: ServiceRequestDetail, vendorName: string, orgName: string): string {
  const fullAddress = [
    sr.customerLocationStreetAddress,
    sr.customerLocationCity,
    sr.customerLocationState,
    sr.customerLocationPostalCode,
  ].filter(Boolean).join(', ');

  const nteAmount = formatCurrency(getCustomField(sr.customFields, 'NTE', 'NTE Amount'));
  const contactName = sr.serviceManagerName || sr.accountManagerName || null;

  return `Hi ${vendorName},

Please find the attached work order for Job #${sr.serviceRequestId} at ${sr.customerLocationName}.

Job Details:
- Location: ${fullAddress || 'N/A'}
- Description: ${sr.description}
- Expected Completion: ${formatDate(sr.dueDate)}
- NTE Amount: ${nteAmount}

Please review and confirm your availability.${contactName ? ` If you have any questions, contact ${contactName} at ${orgName}.` : ''}

Thank you,
${orgName}`;
}

function buildAttachmentFilename(sr: ServiceRequestDetail): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const customerPart = sr.customerName ? sanitizeFilename(sr.customerName) : 'Report';
  return `WO-${sr.serviceRequestId}-${customerPart}-${dateStr}.pdf`;
}

// ---------------------------------------------------------------------------
// AcceptVendorModal
// ---------------------------------------------------------------------------

function AcceptVendorModal({
  open,
  onOpenChange,
  candidate,
  sr,
  orgName,
  orgImageUrl,
  sessionId,
  onAcceptVendor,
  acceptLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: VendorCandidate;
  sr: ServiceRequestDetail;
  orgName: string;
  orgImageUrl: string | null;
  sessionId: string | null;
  onAcceptVendor: (params: AcceptVendorParams) => void;
  acceptLoading: boolean;
}) {
  const defaultTo = candidate.email ?? '';
  const defaultSubject = `Work Order #${sr.serviceRequestId} - ${sr.customerLocationName} - ${orgName}`;
  const defaultBody = buildEmailBody(sr, candidate.name, orgName);
  const attachmentName = buildAttachmentFilename(sr);

  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  async function handleDownloadPdf() {
    if (downloading) return;
    setDownloading(true);
    setPdfError(null);
    try {
      const { downloadSrPdf } = await import('./pdf/download-sr-pdf');
      await downloadSrPdf({ sr, orgName, orgImageUrl });
    } catch (err) {
      console.error('[AcceptVendorModal] PDF generation failed:', err);
      setPdfError('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dispatch Work Order</DialogTitle>
          <DialogDescription>{candidate.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="dispatch-to" className="text-sm font-medium">To</label>
            <Input
              id="dispatch-to"
              type="email"
              placeholder="vendor@example.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="dispatch-subject" className="text-sm font-medium">Subject</label>
            <Input
              id="dispatch-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="dispatch-body" className="text-sm font-medium">Body</label>
            <Textarea
              id="dispatch-body"
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex w-full items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="size-4 shrink-0 animate-spin" />
            ) : (
              <Paperclip className="size-4 shrink-0" />
            )}
            <span className="truncate">{attachmentName}</span>
          </button>
          {pdfError && <p className="text-sm text-destructive">{pdfError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Discard
          </Button>
          <Button
            disabled={acceptLoading}
            onClick={() => {
              onAcceptVendor({
                vendorId: candidate.vendorId,
                serviceRequestBluefolderId: sr.serviceRequestId,
                searchSessionId: sessionId ?? undefined,
                rank: candidate.rank,
                score: candidate.score,
              });
              onOpenChange(false);
            }}
          >
            {acceptLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending&hellip;
              </>
            ) : (
              'Send'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// CategoryTags
// ---------------------------------------------------------------------------

function CategoryTags({ categories }: { categories: string[] }) {
  const filtered = filterCategories(categories);
  if (filtered.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {filtered.slice(0, 3).map((cat) => (
        <Badge
          key={cat}
          variant="outline"
          className="px-1.5 py-0 text-[10px]"
        >
          {formatCategory(cat)}
        </Badge>
      ))}
      {filtered.length > 3 && (
        <span className="text-[10px] text-muted-foreground">
          +{filtered.length - 3}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VendorRow
// ---------------------------------------------------------------------------

function VendorRow({
  candidate: c,
  onAccept,
  isAccepted,
}: {
  candidate: VendorCandidate;
  onAccept: (candidate: VendorCandidate) => void;
  isAccepted: boolean;
}) {
  const phoneDisplay = formatPhone(c.phone, c.phoneRaw);

  return (
      <TableRow className={cn('cursor-default', isAccepted && 'bg-green-50/50 dark:bg-green-950/20')}>
        <TableCell className="text-center font-mono text-sm text-muted-foreground">
          {c.rank}
        </TableCell>

        <TableCell>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{c.name}</span>
              {isAccepted && (
                <Badge variant="default" className="gap-1 bg-green-600 text-xs hover:bg-green-600">
                  <UserCheck className="size-3" />
                  Accepted
                </Badge>
              )}
            </div>
            {c.address && (
              <span className="text-xs text-muted-foreground">{c.address}</span>
            )}
            {c.categories && c.categories.length > 0 && (
              <CategoryTags categories={c.categories} />
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

        <TableCell className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAccept(c)}>
                <UserCheck className="size-4" />
                Accept Vendor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
  );
}

// ---------------------------------------------------------------------------
// CopyPhoneButton
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// SearchButton / ErrorBanner
// ---------------------------------------------------------------------------

function SearchButton({
  loading,
  onClick,
  label,
  icon: Icon,
  variant = 'default',
}: {
  loading: boolean;
  onClick: () => void;
  label: string;
  icon: typeof Search;
  variant?: 'default' | 'outline';
}) {
  return (
    <Button variant={variant} onClick={onClick} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Searching&hellip;
        </>
      ) : (
        <>
          <Icon className="size-4" />
          {label}
        </>
      )}
    </Button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <CardContent>
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
        <p className="text-sm text-destructive">{message}</p>
      </div>
    </CardContent>
  );
}

// ---------------------------------------------------------------------------
// SrVendors (main export)
// ---------------------------------------------------------------------------

type AcceptVendorParams = {
  vendorId: string;
  serviceRequestBluefolderId: number;
  searchSessionId?: string;
  rank?: number;
  score?: number;
};

export function SrVendors({
  sr,
  results,
  resultsLoading,
  onReSearch,
  reSearchLoading,
  reSearchError,
  assignment,
  onAcceptVendor,
  acceptLoading,
}: {
  sr: ServiceRequestDetail;
  results: VendorSearchResponse | null;
  resultsLoading: boolean;
  onReSearch: () => void;
  reSearchLoading: boolean;
  reSearchError: string | null;
  assignment: VendorAssignment | null;
  onAcceptVendor: (params: AcceptVendorParams) => void;
  acceptLoading: boolean;
}) {
  const { organization } = useOrganization();
  const orgName = organization?.name ?? 'Organization';
  const orgImageUrl = organization?.imageUrl ?? null;

  const [selectedCandidate, setSelectedCandidate] = useState<VendorCandidate | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const prevSessionId = useRef(results?.sessionId);
  if (results?.sessionId !== prevSessionId.current) {
    prevSessionId.current = results?.sessionId;
    setVisibleCount(PAGE_SIZE);
  }
  const candidates = results?.candidates ?? [];
  const visible = candidates.slice(0, visibleCount);
  const hasMoreToShow = visibleCount < candidates.length;

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
              <SearchButton
                loading={reSearchLoading}
                onClick={onReSearch}
                label="Find Vendors"
                icon={Search}
              />
            </CardAction>
          </CardHeader>

          {reSearchError && <ErrorBanner message={reSearchError} />}
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
            <SearchButton
              loading={reSearchLoading}
              onClick={onReSearch}
              label="Re-search"
              icon={RefreshCw}
            />
          </CardAction>
        </CardHeader>
        <ErrorBanner message="The vendor search failed. Please try again." />
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
            <SearchButton
              loading={reSearchLoading}
              onClick={onReSearch}
              label="Re-search"
              icon={RefreshCw}
              variant="outline"
            />
          </CardAction>
        </CardHeader>

        {reSearchError && <ErrorBanner message={reSearchError} />}

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
                  <TableHead className="text-center">Contact</TableHead>
                  <TableHead className="w-16 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((c) => (
                  <VendorRow
                    key={c.vendorId}
                    candidate={c}
                    onAccept={setSelectedCandidate}
                    isAccepted={assignment?.vendorId === c.vendorId}
                  />
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

      {selectedCandidate && (
        <AcceptVendorModal
          open={!!selectedCandidate}
          onOpenChange={(open) => { if (!open) setSelectedCandidate(null); }}
          candidate={selectedCandidate}
          sr={sr}
          orgName={orgName}
          orgImageUrl={orgImageUrl}
          sessionId={results?.sessionId ?? null}
          onAcceptVendor={onAcceptVendor}
          acceptLoading={acceptLoading}
        />
      )}
    </TooltipProvider>
  );
}
