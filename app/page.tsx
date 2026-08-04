import * as React from "react"
import { prisma } from "@/lib/db"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { SearchBar } from "@/components/ui/search-bar"
import { SortDropdown } from "@/components/ui/sort-dropdown"
import { ProductGrid } from "@/components/features/product-grid"

export default async function HomePage() {
  const raw = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
  })

  const products = raw.map((p) => ({
    ...p,
    price: p.price.toNumber(),
  }))

  return (
    <>
      <Navbar />
      <main className="container mx-auto flex-1 px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold text-[#2979FF] sm:text-3xl">Our Products</h1>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center md:w-auto">
            <SearchBar placeholder="Search by user & order ID" />
            <div className="w-full sm:w-48">
              <SortDropdown
                options={[
                  { label: "Sort by:", value: "" },
                  { label: "Newest", value: "newest" },
                  { label: "Price: Low to High", value: "price_asc" },
                  { label: "Price: High to Low", value: "price_desc" },
                  { label: "Name: A–Z", value: "title_asc" },
                  { label: "Name: Z–A", value: "title_desc" },
                ]}
              />
            </div>
          </div>
        </div>

        <ProductGrid initialProducts={products} />
      </main>
      <Footer />
    </>
  )
}
