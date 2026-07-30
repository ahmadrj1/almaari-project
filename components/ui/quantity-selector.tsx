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
    <div className="inline-flex items-center rounded-md border border-gray-200 bg-white">
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        className="flex h-8 w-8 items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-50"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="flex h-8 min-w-[2rem] items-center justify-center text-sm font-medium">
        {value}
      </span>
      <button
        onClick={handleIncrement}
        disabled={value >= max}
        className="flex h-8 w-8 items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
