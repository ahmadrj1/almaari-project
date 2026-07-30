"use client"

import * as React from "react"
import Link from "next/link"
import { User, LogOut, Package } from "lucide-react"

export function UserMenu() {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2979FF] focus:ring-offset-2"
      >
        <User className="h-5 w-5 text-gray-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl border border-gray-100 bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
          <Link
            href="/orders"
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setIsOpen(false)}
          >
            <Package className="mr-3 h-4 w-4 text-gray-400" />
            Orders
          </Link>
          <button
            className="flex w-full items-center px-4 py-2 text-left text-sm text-[#E53935] hover:bg-red-50"
            onClick={() => {
              setIsOpen(false)
              // Handle logout
            }}
          >
            <LogOut className="mr-3 h-4 w-4 text-[#E53935]" />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
