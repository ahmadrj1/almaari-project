"use client"

import * as React from "react"
import Image from "next/image"
import { Product } from "@prisma/client"
import { Button } from "./button"
import { formatCurrency } from "@/lib/utils"

export interface ProductCardProps {
  product: Product
  onAddToCart?: (productId: string, quantity: number) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <Image
          src={product.image}
          alt={product.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-gray-900">
          {product.title}
        </h3>
        <p className="mt-2 font-semibold text-[#2979FF]">{formatCurrency(product.price)}</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <Button
            size="sm"
            fullWidth
            onClick={() => onAddToCart?.(product.id, 1)}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  )
}
