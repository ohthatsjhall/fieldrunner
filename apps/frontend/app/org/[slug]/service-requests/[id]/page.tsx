'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useApiClient } from '@/lib/api-client-browser';
import type { ServiceRequestDetail, ServiceRequestFile } from '@fieldrunner/shared';

type Tab = 'overview' | 'assignments' | 'labor' | 'materials' | 'expenses' | 'equipment' | 'files' | 'history';

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
          : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:hover:text-zinc-300'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
          {count}
        </span>
      )}
    </button>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2">
      <dt className="w-40 shrink-0 text-sm text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100">{value || '-'}</dd>
    </div>
  );
}

function OverviewTab({ sr }: { sr: ServiceRequestDetail }) {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Details</h3>
        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <FieldRow label="Status" value={sr.status} />
          <FieldRow label="Priority" value={sr.priority} />
          <FieldRow label="Type" value={sr.type} />
          <FieldRow label="Created" value={sr.dateTimeCreated ? new Date(sr.dateTimeCreated).toLocaleString() : null} />
          <FieldRow label="Due Date" value={sr.dueDate ? new Date(sr.dueDate).toLocaleDateString() : null} />
          <FieldRow label="Status Age" value={sr.statusAgeHours ? `${sr.statusAgeHours.toFixed(1)} hours` : null} />
          <FieldRow label="Reference #" value={sr.referenceNo} />
          <FieldRow label="PO #" value={sr.purchaseOrderNo} />
        </dl>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Customer</h3>
        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <FieldRow label="Name" value={sr.customerName} />
          <FieldRow label="Contact" value={sr.customerContactName} />
          <FieldRow label="Email" value={sr.customerContactEmail} />
          <FieldRow label="Phone" value={sr.customerContactPhone} />
          <FieldRow label="Location" value={sr.customerLocationName} />
          <FieldRow
            label="Address"
            value={
              [sr.customerLocationStreetAddress, sr.customerLocationCity, sr.customerLocationState, sr.customerLocationPostalCode]
                .filter(Boolean)
                .join(', ') || null
            }
          />
        </dl>

        {sr.customFields.length > 0 && (
          <>
            <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-500">Custom Fields</h3>
            <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sr.customFields.map((cf) => (
                <FieldRow key={cf.name} label={cf.name} value={cf.value} />
              ))}
            </dl>
          </>
        )}
      </div>
    </div>
  );
}

function AssignmentsTab({ sr }: { sr: ServiceRequestDetail }) {
  if (sr.assignments.length === 0) {
    return <p className="py-4 text-sm text-zinc-500">No assignments.</p>;
  }

  return (
    <div className="space-y-3">
      {sr.assignments.map((a) => (
        <div key={a.assignmentId} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Assignment #{a.assignmentId}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.isComplete ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
              {a.isComplete ? 'Complete' : 'Pending'}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{a.type}</p>
          {a.assignmentComment && <p className="mt-2 text-sm">{a.assignmentComment}</p>}
          <div className="mt-2 flex gap-4 text-xs text-zinc-500">
            {a.startDate && <span>Start: {new Date(a.startDate).toLocaleString()}</span>}
            {a.endDate && <span>End: {new Date(a.endDate).toLocaleString()}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function LaborTab({ sr }: { sr: ServiceRequestDetail }) {
  if (sr.labor.length === 0) {
    return <p className="py-4 text-sm text-zinc-500">No labor entries.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-zinc-200 dark:border-zinc-800">
        <tr>
          <th className="px-4 py-2 font-medium text-zinc-500">Date</th>
          <th className="px-4 py-2 font-medium text-zinc-500">Description</th>
          <th className="px-4 py-2 font-medium text-zinc-500">Duration</th>
          <th className="px-4 py-2 text-right font-medium text-zinc-500">Total</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {sr.labor.map((l) => (
          <tr key={l.id}>
            <td className="px-4 py-2">{l.dateWorked}</td>
            <td className="px-4 py-2">{l.itemDescription}</td>
            <td className="px-4 py-2">{l.duration}h</td>
            <td className="px-4 py-2 text-right">${l.totalPrice.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MaterialsTab({ sr }: { sr: ServiceRequestDetail }) {
  if (sr.materials.length === 0) {
    return <p className="py-4 text-sm text-zinc-500">No materials.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-zinc-200 dark:border-zinc-800">
        <tr>
          <th className="px-4 py-2 font-medium text-zinc-500">Date</th>
          <th className="px-4 py-2 font-medium text-zinc-500">Description</th>
          <th className="px-4 py-2 font-medium text-zinc-500">Qty</th>
          <th className="px-4 py-2 text-right font-medium text-zinc-500">Total</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {sr.materials.map((m) => (
          <tr key={m.id}>
            <td className="px-4 py-2">{m.dateUsed}</td>
            <td className="px-4 py-2">{m.itemDescription}</td>
            <td className="px-4 py-2">{m.quantity}</td>
            <td className="px-4 py-2 text-right">${m.totalPrice.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ExpensesTab({ sr }: { sr: ServiceRequestDetail }) {
  if (sr.expenses.length === 0) {
    return <p className="py-4 text-sm text-zinc-500">No expenses.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-zinc-200 dark:border-zinc-800">
        <tr>
          <th className="px-4 py-2 font-medium text-zinc-500">Date</th>
          <th className="px-4 py-2 font-medium text-zinc-500">Description</th>
          <th className="px-4 py-2 font-medium text-zinc-500">Qty</th>
          <th className="px-4 py-2 text-right font-medium text-zinc-500">Total</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {sr.expenses.map((e) => (
          <tr key={e.id}>
            <td className="px-4 py-2">{e.dateUsed}</td>
            <td className="px-4 py-2">{e.itemDescription}</td>
            <td className="px-4 py-2">{e.quantity}</td>
            <td className="px-4 py-2 text-right">${e.totalPrice.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EquipmentTab({ sr }: { sr: ServiceRequestDetail }) {
  if (sr.equipment.length === 0) {
    return <p className="py-4 text-sm text-zinc-500">No equipment.</p>;
  }

  return (
    <div className="space-y-3">
      {sr.equipment.map((e) => (
        <div key={e.equipmentId} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{e.equipName || 'Unnamed Equipment'}</span>
            {e.equipType && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {e.equipType}
              </span>
            )}
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {e.mfrName && <FieldRow label="Manufacturer" value={e.mfrName} />}
            {e.modelNo && <FieldRow label="Model" value={e.modelNo} />}
            {e.serialNo && <FieldRow label="Serial #" value={e.serialNo} />}
            {e.refNo && <FieldRow label="Ref #" value={e.refNo} />}
            {e.nextServiceDate && <FieldRow label="Next Service" value={new Date(e.nextServiceDate).toLocaleDateString()} />}
          </dl>
        </div>
      ))}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FilesTab({
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
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="py-4 text-sm text-red-600">{error}</p>;
  }

  if (files.length === 0) {
    return <p className="py-4 text-sm text-zinc-500">No files or attachments.</p>;
  }

  return (
    <div className="space-y-3">
      {files.map((f) => {
        const key = f.serviceRequestFileId || f.serviceRequestSignedDocumentId || f.fileName;
        const isLink = f.isExternalLink;
        const isSigned = f.isSignedDocument;

        return (
          <div key={key} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {f.linkUrl ? (
                    <a href={f.linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline dark:text-blue-400">
                      {f.fileName || f.fileDescription || f.documentName || 'Download'}
                    </a>
                  ) : (
                    f.fileName || f.documentName || f.fileDescription || 'Untitled'
                  )}
                </span>
                {isSigned && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    Signed Document
                  </span>
                )}
                {isLink && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Link
                  </span>
                )}
                {f.isPrivate && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    Private
                  </span>
                )}
              </div>
              {f.fileSize > 0 && (
                <span className="text-xs text-zinc-500">{formatFileSize(f.fileSize)}</span>
              )}
            </div>
            {f.fileDescription && f.fileDescription !== f.fileName && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{f.fileDescription}</p>
            )}
            <div className="mt-2 flex gap-4 text-xs text-zinc-500">
              {f.postedBy && <span>By: {f.postedBy}</span>}
              {f.postedOn && <span>{new Date(f.postedOn).toLocaleString()}</span>}
              {f.fileType && f.fileType !== 'external' && f.fileType !== 'signedDocument' && (
                <span>{f.fileType}</span>
              )}
            </div>
            {isSigned && (f.signatureNameCustomer || f.signatureNameTechnician) && (
              <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                {f.signatureNameCustomer && <span>Customer: {f.signatureNameCustomer}</span>}
                {f.signatureNameTechnician && <span>Technician: {f.signatureNameTechnician}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab({ sr }: { sr: ServiceRequestDetail }) {
  if (sr.log.length === 0) {
    return <p className="py-4 text-sm text-zinc-500">No history entries.</p>;
  }

  return (
    <div className="space-y-3">
      {sr.log.map((entry) => (
        <div key={entry.id} className="border-l-2 border-zinc-200 py-1 pl-4 dark:border-zinc-700">
          <p className="text-sm text-zinc-900 dark:text-zinc-100">{entry.description}</p>
          {entry.comment && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{entry.comment}</p>
          )}
          <p className="mt-1 text-xs text-zinc-400">
            {entry.dateTimeCreated ? new Date(entry.dateTimeCreated).toLocaleString() : ''}
            {' '}{entry.entryType}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function ServiceRequestDetailPage() {
  const params = useParams<{ slug: string; id: string }>();
  const { isLoaded } = useAuth();
  const { apiFetch } = useApiClient();

  const [sr, setSr] = useState<ServiceRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [files, setFiles] = useState<ServiceRequestFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [filesFetched, setFilesFetched] = useState(false);

  useEffect(() => {
    if (!isLoaded || !params.id) return;

    async function fetchDetail() {
      setLoading(true);
      try {
        const data = await apiFetch<ServiceRequestDetail>(
          `/bluefolder/service-requests/${params.id}`,
        );
        setSr(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load service request');
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [isLoaded, params.id, apiFetch]);

  const fetchFiles = useCallback(async () => {
    if (filesFetched || filesLoading || !params.id) return;
    setFilesLoading(true);
    try {
      const data = await apiFetch<ServiceRequestFile[]>(
        `/bluefolder/service-requests/${params.id}/files`,
      );
      setFiles(data);
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setFilesLoading(false);
      setFilesFetched(true);
    }
  }, [filesFetched, filesLoading, params.id, apiFetch]);

  useEffect(() => {
    if (activeTab === 'files') fetchFiles();
  }, [activeTab, fetchFiles]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-96 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-64 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    );
  }

  if (error || !sr) {
    return (
      <div className="space-y-4">
        <Link
          href={`/org/${params.slug}`}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Back to Dashboard
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-400">{error || 'Service request not found'}</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'assignments', label: 'Assignments', count: sr.assignments.length },
    { key: 'labor', label: 'Labor', count: sr.labor.length },
    { key: 'materials', label: 'Materials', count: sr.materials.length },
    { key: 'expenses', label: 'Expenses', count: sr.expenses.length },
    { key: 'equipment', label: 'Equipment', count: sr.equipment.length },
    { key: 'files', label: 'Files', count: filesFetched ? files.length : undefined },
    { key: 'history', label: 'History', count: sr.log.length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/org/${params.slug}`}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Back to Dashboard
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold">SR #{sr.serviceRequestId}</h1>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              sr.isOpen
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}
          >
            {sr.status}
          </span>
          {sr.isOverdue && (
            <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              Overdue
            </span>
          )}
        </div>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">{sr.description}</p>
        {sr.detailedDescription && (
          <p className="mt-2 whitespace-pre-line text-sm text-zinc-500 dark:text-zinc-400">{sr.detailedDescription}</p>
        )}
      </div>

      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <TabButton
              key={tab.key}
              active={activeTab === tab.key}
              label={tab.label}
              count={tab.count}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        {activeTab === 'overview' && <OverviewTab sr={sr} />}
        {activeTab === 'assignments' && <AssignmentsTab sr={sr} />}
        {activeTab === 'labor' && <LaborTab sr={sr} />}
        {activeTab === 'materials' && <MaterialsTab sr={sr} />}
        {activeTab === 'expenses' && <ExpensesTab sr={sr} />}
        {activeTab === 'equipment' && <EquipmentTab sr={sr} />}
        {activeTab === 'files' && <FilesTab files={files} loading={filesLoading} error={filesError} />}
        {activeTab === 'history' && <HistoryTab sr={sr} />}
      </div>
    </div>
  );
}
