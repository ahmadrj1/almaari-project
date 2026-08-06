"use client";

export function ProductCardSkeleton() {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="relative aspect-square overflow-hidden bg-gray-100 animate-pulse">
        <div className="h-full w-full bg-gray-200" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="h-4 w-full animate-pulse rounded bg-gray-200 mb-2"></div>
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200"></div>
        <div className="mt-4 h-6 w-1/3 animate-pulse rounded bg-gray-200"></div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="h-8 w-24 animate-pulse rounded bg-gray-200"></div>
          <div className="h-8 flex-1 animate-pulse rounded bg-gray-200 sm:flex-initial sm:w-24"></div>
        </div>
      </div>
    </div>
  );
}
