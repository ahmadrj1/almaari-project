"use client"

import * as React from "react"

export interface Option {
  label: string
  value: string
}

export interface SortDropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[]
}

export const SortDropdown = React.forwardRef<HTMLSelectElement, SortDropdownProps>(
  ({ className, options, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-[#2979FF] focus:outline-none focus:ring-1 focus:ring-[#2979FF] disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
)
SortDropdown.displayName = "SortDropdown"
