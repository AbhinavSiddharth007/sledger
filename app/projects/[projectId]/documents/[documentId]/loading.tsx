import { LoadingRegion, Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="receipt">
      <Skeleton className="mb-6 h-8 w-48" />
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="h-[60vh] w-full" />
        <div className="grid gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
