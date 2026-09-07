'use client';

import { useEffect } from 'react';
import { Button } from '@melbourne-sphere/ui';

/** Route error boundary: a failed request is never presented as "no results" (SRS DIR 006). */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-bold tracking-tight">We couldn’t load this page</h1>
      <p className="mt-3 text-text-muted">The directory service did not respond. Please try again in a moment.{error.digest ? ` Reference: ${error.digest}` : ''}</p>
      <Button className="mt-6" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
