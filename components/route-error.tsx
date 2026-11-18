"use client";

import Link from "next/link";
import { useEffect } from "react";

// Shared error boundary. Each route's error.tsx re-exports it, so every segment has one.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main role="alert" className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-zinc-600">
        The page could not be loaded. Your data has not been changed. Try again, or go back to your projects.
        {error.digest ? <span className="block text-xs text-zinc-400">Reference: {error.digest}</span> : null}
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded bg-black px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Try again
        </button>
        <Link
          href="/projects"
          className="rounded border px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Back to projects
        </Link>
      </div>
    </main>
  );
}
