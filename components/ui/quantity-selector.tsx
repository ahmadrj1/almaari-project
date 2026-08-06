"use client"

import * as React from "react"
import { Minus, Plus } from "lucide-react"

export interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

export function QuantitySelector({ value, onChange, min = 1, max = 99 }: QuantitySelectorProps) {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1)
  }

  const handleIncrement = () => {
    if (value < max) onChange(value + 1)
  }

  return (
    <div className="inline-flex items-center gap-0.5 sm:gap-1">
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded border border-[#2979FF] text-[#2979FF] hover:bg-blue-50 disabled:opacity-40"
      >
        <Minus className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
      </button>
      <span className="flex h-6 sm:h-8 min-w-[1.5rem] sm:min-w-[2rem] items-center justify-center rounded border border-gray-200 text-[10px] sm:text-sm font-medium">
        {String(value).padStart(2, "0")}
      </span>
      <button
        onClick={handleIncrement}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded border border-[#2979FF] text-[#2979FF] hover:bg-blue-50 disabled:opacity-40"
      >
        <Plus className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
      </button>
    </div>
  )
}
