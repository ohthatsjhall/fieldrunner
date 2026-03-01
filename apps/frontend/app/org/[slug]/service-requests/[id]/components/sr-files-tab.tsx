import { Skeleton } from '@/app/components/ui/skeleton';
import { Badge } from '@/app/components/ui/badge';
import type { ServiceRequestFile } from '@fieldrunner/shared';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SrFilesTab({
  files,
  loading,
  error,
}: {
  files: ServiceRequestFile[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="py-4 text-sm text-destructive">{error}</p>;
  }

  if (files.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        No files or attachments.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {files.map((f) => {
        const key =
          f.serviceRequestFileId ||
          f.serviceRequestSignedDocumentId ||
          f.fileName;
        const isLink = f.isExternalLink;
        const isSigned = f.isSignedDocument;

        return (
          <div key={key} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {f.linkUrl ? (
                    <a
                      href={f.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {f.fileName ||
                        f.fileDescription ||
                        f.documentName ||
                        'Download'}
                    </a>
                  ) : (
                    f.fileName ||
                    f.documentName ||
                    f.fileDescription ||
                    'Untitled'
                  )}
                </span>
                {isSigned && (
                  <Badge variant="outline">Signed</Badge>
                )}
                {isLink && <Badge variant="outline">Link</Badge>}
                {f.isPrivate && (
                  <Badge variant="outline">Private</Badge>
                )}
              </div>
              {f.fileSize > 0 && (
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(f.fileSize)}
                </span>
              )}
            </div>
            {f.fileDescription && f.fileDescription !== f.fileName && (
              <p className="mt-1 text-sm text-muted-foreground">
                {f.fileDescription}
              </p>
            )}
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              {f.postedBy && <span>By: {f.postedBy}</span>}
              {f.postedOn && (
                <span>{new Date(f.postedOn).toLocaleString()}</span>
              )}
              {f.fileType &&
                f.fileType !== 'external' &&
                f.fileType !== 'signedDocument' && <span>{f.fileType}</span>}
            </div>
            {isSigned &&
              (f.signatureNameCustomer || f.signatureNameTechnician) && (
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  {f.signatureNameCustomer && (
                    <span>Customer: {f.signatureNameCustomer}</span>
                  )}
                  {f.signatureNameTechnician && (
                    <span>Technician: {f.signatureNameTechnician}</span>
                  )}
                </div>
              )}
          </div>
        );
      })}
    </div>
  );
}
