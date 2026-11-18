import { LoadingRegion, Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <LoadingRegion label="page">
      <Skeleton className="h-8 w-48" />
    </LoadingRegion>
  );
}
