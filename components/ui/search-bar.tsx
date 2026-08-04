"use client"

import * as React from "react"
import { Search } from "lucide-react"

export type SearchBarProps = React.InputHTMLAttributes<HTMLInputElement>

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className={`relative w-full ${className || ""}`}>
        <input
          type="search"
          className="block w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-11 text-sm placeholder:text-gray-400 focus:border-[#2979FF] focus:outline-none focus:ring-1 focus:ring-[#2979FF]"
          ref={ref}
          {...props}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-1">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded bg-[#2979FF] text-white hover:bg-blue-600"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }
)
SearchBar.displayName = "SearchBar"
