import { LoadingRegion, Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="cash flow">
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
      <div className="grid gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </LoadingRegion>
  );
}
