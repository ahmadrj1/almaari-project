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
      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <h1 className="text-3xl font-bold text-[#2979FF]">Our Products</h1>
          <div className="flex w-full flex-col gap-4 sm:flex-row md:w-auto">
            <SearchBar placeholder="Search products..." />
            <div className="w-full sm:w-48">
              <SortDropdown
                options={[
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
