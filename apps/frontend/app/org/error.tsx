'use client';

import { useEffect } from 'react';

export default function OrgError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[OrgError]', error);

    // Auto-reload after a brief delay — handles transient Clerk SDK
    // initialization errors that occur during the SSO → /org transition.
    const timer = setTimeout(() => {
      window.location.reload();
    }, 1000);

    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-2 text-zinc-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
        Setting up your workspace...
      </div>
    </div>
  );
}
