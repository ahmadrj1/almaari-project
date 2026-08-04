"use client";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductCardSkeleton } from "../components/ui/product-card-skeleton";

export default function Loading() {
  return (
    <>
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-center md:justify-between">
          <div className="h-8 w-48 animate-pulse rounded-md bg-gray-200 sm:h-9"></div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto">
            <div className="h-10 w-full animate-pulse rounded-md bg-gray-200 sm:w-[300px]"></div>
            <div className="h-10 w-full animate-pulse rounded-md bg-gray-200 sm:w-48"></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
