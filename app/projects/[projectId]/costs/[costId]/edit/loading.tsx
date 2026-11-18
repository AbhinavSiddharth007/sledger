import { LoadingRegion, Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="cost form">
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="grid max-w-xl gap-4">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </LoadingRegion>
  );
}
