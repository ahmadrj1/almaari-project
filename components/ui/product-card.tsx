"use client"

import * as React from "react"
import Image from "next/image"
import { Product } from "@prisma/client"
import { Button } from "./button"
import { QuantitySelector } from "./quantity-selector"
import { formatCurrency } from "@/lib/utils"

export interface ProductCardProps {
  product: Omit<Product, "price"> & { price: number | { toNumber(): number; toString(): string } }
  onAddToCart?: (productId: string, quantity: number) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [quantity, setQuantity] = React.useState(1)

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <Image
          src={product.image}
          alt={product.title}
          loading="eager"
          sizes="50vw"
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-gray-900">
          {product.title}
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Price: <span className="font-bold text-lg text-[#2979FF]">{formatCurrency(product.price)}</span>
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <QuantitySelector value={quantity} onChange={setQuantity} min={1} max={product.stock ?? 99} />
          <Button
            size="sm"
            onClick={() => onAddToCart?.(product.id, quantity)}
            className="whitespace-nowrap text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 px-2 sm:px-3 flex-1 sm:flex-initial"
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  )
}
