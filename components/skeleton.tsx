// Loading placeholders. The wrapper is announced to screen readers, and the bars are hidden from them.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-zinc-200 motion-reduce:animate-none ${className}`} />;
}

export function LoadingRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto w-full max-w-6xl px-4 py-8">
      <span className="sr-only">Loading {label}</span>
      {children}
    </div>
  );
}
