"use client"

import * as React from "react"
import Image from "next/image"
import { Product } from "@prisma/client"
import { Button } from "./button"
import { QuantitySelector } from "./quantity-selector"
import { formatCurrency } from "@/lib/utils"

export type Variant = {
  id: string
  stock: number
  color: { id: string; name: string; hexCode: string }
  size: { id: string; name: string; sortOrder: number }
}

export interface ProductCardProps {
  product: Omit<Product, "price"> & { 
    price: number | { toNumber(): number; toString(): string },
    variants?: Variant[]
  }
  onAddToCart?: (productId: string, variantId: string, quantity: number) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [quantity, setQuantity] = React.useState(1)
  const variants = product.variants || []

  // Extract unique colors and sizes
  const colors = React.useMemo(() => {
    const map = new Map<string, Variant['color']>()
    variants.forEach(v => map.set(v.color.id, v.color))
    return Array.from(map.values())
  }, [variants])

  const sizes = React.useMemo(() => {
    const map = new Map<string, Variant['size']>()
    variants.forEach(v => map.set(v.size.id, v.size))
    return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [variants])

  const [selectedColorId, setSelectedColorId] = React.useState<string>(colors[0]?.id || "")
  const [selectedSizeId, setSelectedSizeId] = React.useState<string>(sizes[0]?.id || "")

  // Find the exact variant based on selected color and size
  const selectedVariant = variants.find(v => v.color.id === selectedColorId && v.size.id === selectedSizeId)
  
  const isOutOfStock = !selectedVariant || selectedVariant.stock <= 0
  const maxStock = selectedVariant?.stock || 0

  // Reset quantity if it exceeds new max stock
  React.useEffect(() => {
    if (quantity > maxStock) {
      setQuantity(Math.max(1, maxStock))
    }
  }, [maxStock, quantity])

  return (
    <div className={`group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow hover:shadow-lg ${isOutOfStock ? "opacity-75" : ""}`}>
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <Image
          src={product.image}
          alt={product.title}
          loading="eager"
          sizes="50vw"
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="rounded-md bg-white/90 px-3 py-1 text-sm font-bold text-red-600">Out of Stock</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-gray-900">
          {product.title}
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Price: <span className="font-bold text-lg text-[#2979FF]">{formatCurrency(product.price)}</span>
        </p>

        {/* Variations */}
        {colors.length > 0 && (
          <div className="mt-3">
            <div className="flex gap-2 flex-wrap">
              {colors.map(color => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColorId(color.id)}
                  title={color.name}
                  className={`w-6 h-6 rounded-full border-2 focus:outline-none transition-all ${
                    selectedColorId === color.id ? "border-[#2979FF] scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color.hexCode, boxShadow: "0 0 0 1px rgba(0,0,0,0.1)" }}
                />
              ))}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="mt-3">
            <div className="flex gap-2 flex-wrap">
              {sizes.map(size => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSizeId(size.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors ${
                    selectedSizeId === size.id
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-900"
                  }`}
                >
                  {size.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-gray-400">
          {isOutOfStock ? "Out of stock" : `${maxStock} in stock`}
        </p>
        
        <div className="mt-2 flex items-center justify-between gap-2">
          <QuantitySelector 
            value={quantity} 
            onChange={setQuantity} 
            min={1} 
            max={maxStock > 0 ? maxStock : 1} 
            disabled={isOutOfStock} 
          />
          <Button
            size="sm"
            onClick={() => {
              if (selectedVariant) {
                onAddToCart?.(product.id, selectedVariant.id, quantity)
              }
            }}
            className="whitespace-nowrap text-[10px] sm:text-xs md:text-sm h-7 sm:h-8 px-2 sm:px-3 flex-1 sm:flex-initial"
            disabled={isOutOfStock}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  )
}
