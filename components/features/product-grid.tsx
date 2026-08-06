"use client"

import * as React from "react"
import { Product } from "@prisma/client"

type SerializedProduct = Omit<Product, "price"> & { price: number }
import { ProductCard } from "@/components/ui/product-card"
import { SearchBar } from "@/components/ui/search-bar"
import { SortDropdown } from "@/components/ui/sort-dropdown"
import { EmptyState } from "@/components/ui/empty-state"
import { Pagination } from "@/components/ui/pagination"
import { PackageSearch } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ProductGridProps {
  initialProducts: SerializedProduct[]
}

export function ProductGrid({ initialProducts }: ProductGridProps) {
  const [products, setProducts] = React.useState<SerializedProduct[]>(initialProducts)
  const [page, setPage] = React.useState(1)
  const { showToast } = useToast()

  const handleAddToCart = (productId: string) => {
    showToast("success", "Added to cart!")
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<PackageSearch className="h-10 w-10" />}
        title="No products found"
        description="Check back later for new products."
      />
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
        ))}
      </div>
      <Pagination currentPage={page} totalPages={3} onPageChange={setPage} />
    </>
  )
}
